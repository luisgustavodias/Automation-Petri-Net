import { PetriNet } from "./PetriNet.js"
import { 
    AGenericPetriElement, 
    PetriPlace, 
    PetriTrans, 
    PetriArc
} from "./PNElements.js"
import { ArcType, PEId, PetriNetData, PlaceType } from "./PNData.js"
import { InputValues, InputWindow } from "./InputWindow.js"
import { createCircle, setCircleCenter } from "./utils/SVGElement/Circle.js"
import Vector from "./utils/Vector.js"

const FIRE_TRANS_ANIMATION_TIME = 1500
const STEP_INTERVAL_TIME = 250
const TRANS_ENABLE_COLOR = '#04c200'
const TRANS_FIRE_COLOR = 'red'

type PlaceMarks = {[id: string]: number}

interface LogicalPetriArc {
    placeId: string
    arcType: ArcType
    weight: number
}

type ArcsByTrans = {[transId: string]: LogicalPetriArc[]}
type GuardFunc = (...args: number[]) => boolean


class LogicalNet {
    readonly placeMarks: PlaceMarks
    readonly placeTypes: {[transId: string]: PlaceType}
    readonly arcsByTrans: ArcsByTrans
    readonly transOrder: string[]
    readonly transState: {[transId: string]: boolean}
    readonly transGuards: {[transId: string]: string}
    readonly transGuardFuncs: {[transId: string]: GuardFunc}
    private readonly inputValues: Map<string, number> //InputValues

    constructor(netData: PetriNetData, inputValues: InputValues) {
        this.placeMarks = {}
        this.placeTypes = {}
        netData.places.forEach((place) => { 
            this.placeMarks[place.id] = parseInt(place.initialMark) 
            this.placeTypes[place.id] = place.placeType
        })

        this.inputValues = new Map()
        for (const inputName in inputValues) {
            this.inputValues.set(inputName, inputValues[inputName])
        }

        // trasitions.sort((a, b) => a.priority - b.priority)
        this.transOrder = []
        this.transGuardFuncs = {}
        netData.transitions.forEach((trans) => { 
            this.transOrder.push(trans.id)
            
            if (trans.guard) {
                this.transGuardFuncs[trans.id] = this.createGuardFunc(
                    trans.guard, [...this.inputValues.keys()]
                )
            } else {
                this.transGuardFuncs[trans.id] = (...args) => true
            }
        })

        this.arcsByTrans = {}
        netData.arcs.forEach(arc => {
            if (!(arc.transId in this.arcsByTrans))
                this.arcsByTrans[arc.transId] = []

            this.arcsByTrans[arc.transId].push({
                placeId: arc.placeId,
                arcType: arc.arcType,
                weight: parseInt(arc.weight)
            })
        })

        this.transState = Object.fromEntries(netData.transitions.map(
            trans => [trans.id, false]
        ))


    }

    createGuardFunc(guard: string, inputNames: string[]): GuardFunc {
        const decodedGuard = guard
            .replaceAll(/(?<=(\)|\s))and(?=(\(|\s))/gi, '&&')
            .replaceAll(/(?<=(\)|\s))or(?=(\(|\s))/gi, '||')
            .replaceAll(/(?<=(\(|\)|\s|^))not(?=(\(|\s))/gi, '!')
        return eval(`(${inputNames.join(',')}) => ${decodedGuard}`)
    }

    updateInputValues(inputValues: InputValues) {
        for (const inputName in inputValues) {
            this.inputValues.set(inputName, inputValues[inputName])
        }
    }

    checkTrans(transId: string) {
        for (const arc of this.arcsByTrans[transId]) {
            if (arc.arcType === "Input" || arc.arcType === "Test") {
                if (this.placeMarks[arc.placeId] < arc.weight)
                    return false
            } 
            else if (arc.arcType === "Inhibitor") {
                if (this.placeMarks[arc.placeId] >= arc.weight)
                    return false
            }
            else if (arc.arcType === "Output" && 
                    this.placeTypes[arc.placeId] === "BOOL") {
                if (this.placeMarks[arc.placeId] === 1)
                    return false
            } 
        }
        
        if (!this.transGuardFuncs[transId](...this.inputValues.values()))
            return false

        return true
    }

    getEnabledTransitions() {
        return this.transOrder.filter(transId => this.transState[transId])
    }

    fireTransResult(transId: string) {
        const result: PlaceMarks = {}
        for (const arc of this.arcsByTrans[transId]) {
            if (arc.arcType === "Input") {
                result[arc.placeId] = this.placeMarks[arc.placeId] 
                    - arc.weight
            }
            if (arc.arcType === "Output") {
                result[arc.placeId] = this.placeMarks[arc.placeId] 
                    + arc.weight
            }
        }
        
        return result
    }

    updateTransState() {
        for (const transId in this.transState) {
            this.transState[transId] = this.checkTrans(transId)
        }
    }

    updatePlaceMarks(marksToUpdate: PlaceMarks) {
        Object.assign(this.placeMarks, marksToUpdate)
    }
}

interface TokenAnimStep {
    startPoint: Vector
    velocity: Vector
    endTime: number
}

class TokenAnimation {
    private readonly animSteps: TokenAnimStep[]
    private readonly token: SVGCircleElement
    private currentStep: number

    constructor(pathPoints: Vector[]) {
        const segmentsDistVect = []
        for (let i = 1; i < pathPoints.length; i++)
            segmentsDistVect.push(pathPoints[i].sub(pathPoints[i-1]))

        const totalLength = segmentsDistVect.map(v => v.mag()).reduce(
            (a, b) => a + b, 0
        )

        const animDuration = FIRE_TRANS_ANIMATION_TIME/2
        
        this.animSteps = []

        for (let i = 0; i < segmentsDistVect.length; i++) {
            const distVect = segmentsDistVect[i]
            const stepEndTime = distVect.mag()*animDuration/totalLength
            let endTime = stepEndTime
            if (i > 0)
                endTime += this.animSteps[i-1].endTime

            this.animSteps.push({
                startPoint: pathPoints[i],
                velocity: distVect.mul(1/stepEndTime),
                endTime: endTime 
            })
        }

        this.token = createCircle(this.animSteps[0].startPoint, 2)
        this.currentStep = null
    }

    start() {
        this.currentStep = 0
        document.getElementById('IEs').appendChild(this.token)  
        setCircleCenter(this.token, this.animSteps[0].startPoint)    
    }

    update(t: number) {
        if (t > this.animSteps[this.currentStep].endTime)
            this.currentStep++

        const currentStep = this.animSteps[this.currentStep]
        let stepTime
        if (this.currentStep === 0) 
            stepTime = t
        else
            stepTime = t - this.animSteps[this.currentStep - 1].endTime

        setCircleCenter(
            this.token,
            currentStep.startPoint.add(currentStep.velocity.mul(stepTime))
        )
    }

    stop() {
        this.token.remove()
        this.currentStep = null
    }
}

class Simulator {
    private currentNet: PetriNet
    private playing: boolean
    private stoping: boolean
    private logicalNet: LogicalNet
    private inputWindow: InputWindow
    private tokenAnimByArc: {[arcId: PEId]: TokenAnimation}

    constructor(net: PetriNet) {
        this.currentNet = net
        this.playing = false
        this.stoping = false
        this.logicalNet = null
        this.inputWindow = new InputWindow()
    }

    private updatePlaceMarks(marksToUpdate: PlaceMarks) {
        for (const placeId in marksToUpdate) {
            const place = <PetriPlace>this.currentNet.getGenericPE(placeId)
            place.mark = marksToUpdate[placeId]
        }
    }

    private setTransColor(trans: PetriTrans, color: string) {
        trans.svgElement.children[0].setAttribute('stroke', color)
    }

    private enableTrans(id: string) {
        const trans = <PetriTrans>this.currentNet.getGenericPE(id)
        this.setTransColor(trans, TRANS_ENABLE_COLOR)
    }

    private disableTrans(id: string) {
        const trans = <PetriTrans>this.currentNet.getGenericPE(id)
        this.setTransColor(trans, 'black')
    }

    private updateTransitions() {
        for (const transId in this.logicalNet.transState) {
            if (this.logicalNet.transState[transId]) {
                this.enableTrans(transId)
            } else {
                this.disableTrans(transId)
            }
        }
    }

    private animateTokens(arcs: PetriArc[]) {
        const animDuration = FIRE_TRANS_ANIMATION_TIME/2
        let startTime = null
        const animations = arcs.map(arc => this.tokenAnimByArc[arc.id])
        animations.forEach(anim => anim.start())

        function animFunc(timestamp: number) {
            if (!startTime) { startTime = timestamp }

            const t = (timestamp - startTime)
            if (t > animDuration) {
                animations.forEach(anim => anim.stop())
                return
            }

            for (const anim of animations)
                anim.update(t)

            requestAnimationFrame(animFunc) 
        }

        requestAnimationFrame(animFunc)
    }

    private fireTrans(transId: string, marksToUpdate: PlaceMarks) {
        const trans = <PetriTrans>this.currentNet.getGenericPE(transId)
        const inputArcs = []
        const outputArcs = []
        for (const arcId of trans.connectedArcs) {
            const arc = <PetriArc>this.currentNet.getGenericPE(arcId)
            if (arc.arcType === 'Input')
                inputArcs.push(arc)
            else if (arc.arcType === 'Output') 
                outputArcs.push(arc)
        }
        
        for (const arc of inputArcs) {
            const place = <PetriPlace>this.currentNet
                    .getGenericPE(arc.placeId)
            place.mark = marksToUpdate[arc.placeId]
        }

        this.setTransColor(trans, TRANS_FIRE_COLOR)
        this.animateTokens(inputArcs)

        setTimeout(() => {
            this.animateTokens(outputArcs)
        }, FIRE_TRANS_ANIMATION_TIME/2)
        setTimeout(() => {
            this.logicalNet.updatePlaceMarks(marksToUpdate)
            this.logicalNet.updateTransState()
            this.updatePlaceMarks(marksToUpdate)
            this.updateTransitions()

            if (this.playing) {
                setTimeout(() => {this._step()}, STEP_INTERVAL_TIME)
            }
        }, FIRE_TRANS_ANIMATION_TIME)
    }

    private restartNet() {
        for (const placeId in this.logicalNet.placeMarks) {
            const place = <PetriPlace>this.currentNet.getGenericPE(placeId)
            place.mark = parseInt(place.initialMark)
        }
        for (const transId in this.logicalNet.arcsByTrans) {
            this.disableTrans(transId)
        }
    }

    private init(net: PetriNet) {
        this.currentNet = net
        this.inputWindow.open(this.currentNet.inputs)
        const netData = this.currentNet.getNetData()
        this.logicalNet = new LogicalNet(
            netData, this.inputWindow.readInputs()
        )
        this.tokenAnimByArc = Object.fromEntries(
            netData.arcs.filter(
                arcData => ['Input', 'Output'].includes(arcData.arcType)
            ).map(arcData => {
                const arc = <PetriArc>net.getGenericPE(arcData.id)
                return [arc.id, new TokenAnimation(arc.getArcPath())]
            }
        ))
        this.logicalNet.updateTransState()
        this.restartNet()
        document.getElementById('simulating-text').style.display = 'block'
    }

    start(net: PetriNet) {
        if (!this.logicalNet) {
            console.log('not locicalNet')
            this.init(net)
        } 
        this.playing = true
        this._step()
    }

    pause() {
        this.playing = false
    }

    restart(net: PetriNet) {
        this.init(net)
    }

    private _stop() {
        this.restartNet()
        this.logicalNet = null
        this.playing = false
        this.stoping = true
        this.inputWindow.close()
        document.getElementById('simulating-text').style.display = 'none'

        this.stoping = false
    }

    stop() {
        if (this.logicalNet && !this.stoping) {
            this.stoping = true
        }
    }

    private _step() {
        this.logicalNet.updateInputValues(this.inputWindow.readInputs())
        const enabledTransitions = this.logicalNet.getEnabledTransitions()

        if (this.stoping) {
            this._stop()
            return
        }

        if (!enabledTransitions.length) {
            this.logicalNet.updateTransState()
            setTimeout(() => { 
                if (this.playing) {
                    this._step()
                } 
            }, STEP_INTERVAL_TIME)

            return
        } 

        this.fireTrans(
            enabledTransitions[0],
            this.logicalNet.fireTransResult(
                enabledTransitions[0]
            )
        )
    }

    step(net: PetriNet) {
        if (!this.logicalNet) {
            this.init(net)
        } 
        this._step()
    }
}

function createSimulator(
    net: PetriNet, 
    startSimObserver: () => PetriNet,
    stopSimObserver: VoidFunction 
) {
    const simulator = new Simulator(net)

    document.getElementById('step-button').onclick = 
        () => { 
            simulator.step(startSimObserver())
        }
    
    document.getElementById('start-button').onclick = 
        () => { 
            simulator.start(startSimObserver())
        }

    document.getElementById('pause-button').onclick = 
        () => { simulator.pause() }

    document.getElementById('restart-button').onclick = 
        () => { 
            simulator.restart(startSimObserver())
        }

    document.getElementById('stop-button').onclick = 
        () => { 
            simulator.stop()
            stopSimObserver()
        }

    return simulator
}

export { Simulator, createSimulator }