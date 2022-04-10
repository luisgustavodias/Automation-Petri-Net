import { PetriNet } from "./PetriNet.js"
import { 
    AGenericPetriElement, 
    PetriPlace, 
    PetriTrans, 
    PetriArc,
    ArcType
} from "./PNElements.js"
import { InputValues, InputWindow } from "./InputWindow.js"
import { createCircle, setCircleCenter } from "./utils/Circle.js"
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

function filterNetElementsByType(net: PetriNet, PEType: string) {
    return Object.values(net.elements).filter(
        (ele) => ele.PEType === PEType
    )
}

class LogicalNet {
    readonly placeMarks: PlaceMarks
    readonly arcsByTrans: ArcsByTrans
    readonly transOrder: string[]
    readonly transState: {[transId: string]: boolean}
    readonly transGuards: {[transId: string]: string}
    readonly transGuardFuncs: {[transId: string]: GuardFunc}
    private readonly inputValues: Map<string, number> //InputValues

    constructor(net: PetriNet, inputValues: InputValues) {
        const places = <PetriPlace[]>filterNetElementsByType(
            net, 'place'
        )

        this.placeMarks = {}
        places.forEach((place) => { 
            this.placeMarks[place.id] = parseInt(place.initialMark) 
        })

        const trasitions = <PetriTrans[]>filterNetElementsByType(
            net, 'trans'
        )
        
        this.inputValues = new Map()
        for (const inputName in inputValues) {
            this.inputValues.set(inputName, inputValues[inputName])
        }

        // trasitions.sort((a, b) => a.priority - b.priority)
        this.transOrder = []
        this.transGuardFuncs = {}
        this.arcsByTrans = {}
        trasitions.forEach((trans) => { 
            this.arcsByTrans[trans.id] = trans.connectedArcs.map(
                (arcId) => {
                    const arc = <PetriArc>net.elements[arcId]
                    return {
                        placeId: arc.placeId,
                        arcType: arc.arcType,
                        weight: parseInt(arc.weight)
                    }
                }
            )
            this.transOrder.push(trans.id)
            
            if (trans.guard) {
                this.transGuardFuncs[trans.id] = this.createGuardFunc(
                    trans.guard, [...this.inputValues.keys()]
                )
            } else {
                this.transGuardFuncs[trans.id] = (...args) => true
            }
        })

        this.transState = Object.fromEntries(trasitions.map(
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
                if (this.placeMarks[arc.placeId] < arc.weight) {
                    return false
                }
            } 
            else if (arc.arcType === "Inhibitor") {
                if (this.placeMarks[arc.placeId] >= arc.weight) {
                    return false
                }
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

class Simulator {
    private net: PetriNet
    private playing: boolean
    private logicalNet: LogicalNet
    private inputWindow: InputWindow

    constructor(net: PetriNet) {
        this.net = net
        this.playing = false
        this.logicalNet = null
        this.inputWindow = null
    }

    private updatePlaceMarks(marksToUpdate: PlaceMarks) {
        for (const placeId in marksToUpdate) {
            const place = <PetriPlace>this.net.elements[placeId]
            place.mark = String(marksToUpdate[placeId])
        }
    }

    private setTransColor(trans: PetriTrans, color: string) {
        trans.svgElement.children[0].setAttribute('stroke', color)
    }

    private setArcColor(arc: PetriArc, color: string) {
        arc.svgElement.children[0].setAttribute('stroke', color)
        arc.svgElement.children[1].setAttribute('fill', color)
        arc.svgElement.children[2].setAttribute('stroke', color)
    }

    private enableTrans(id: string) {
        const trans = <PetriTrans>this.net.elements[id]
        this.setTransColor(trans, TRANS_ENABLE_COLOR)
    }

    private disableTrans(id: string) {
        const trans = <PetriTrans>this.net.elements[id]
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

    private newTokenAnimation(arc: PetriArc) {
        const place = <PetriPlace>this.net.elements[arc.placeId]
        const trans = <PetriTrans>this.net.elements[arc.transId]
        const placePos = place.position
        const transPos = trans.position

        let startPoint: Vector, v: Vector
        if (arc.arcType === 'Input') {
            startPoint = placePos
            v = transPos.sub(placePos)
        } else if (arc.arcType === 'Output') {
            startPoint = transPos
            v = placePos.sub(transPos)
        } else {
            throw `Can't create a animation to a ${arc.arcType} arc.`
        }

        const animDuration = FIRE_TRANS_ANIMATION_TIME/2
        const vel = v.mul(1/animDuration)

        const token = createCircle(startPoint, 2)
        document.getElementById('IEs').appendChild(token)

        let startTime = null;

        function animFunc(timestamp: number) {
            if (!startTime) { startTime = timestamp }

            const t = (timestamp - startTime)
            if (t > animDuration) {
                token.remove()
                return
            }

            setCircleCenter(
                token,
                startPoint.add(vel.mul(t))
            )
            requestAnimationFrame(animFunc) 
        }

        requestAnimationFrame(animFunc)
    }

    private fireTrans(transId: string, marksToUpdate: PlaceMarks) {
        const trans = <PetriTrans>this.net.elements[transId]
        this.setTransColor(trans, TRANS_FIRE_COLOR)
        for (const arcId of trans.connectedArcs) {
            const arc = <PetriArc>this.net.elements[arcId]
            if (arc.arcType === 'Input') {
                this.newTokenAnimation(arc)
                const place = <PetriPlace>this.net.elements[arc.placeId]
                place.mark = String(marksToUpdate[arc.placeId])
            }
        }
        setTimeout(() => {
            for (const arcId of trans.connectedArcs) {
                const arc = <PetriArc>this.net.elements[arcId]
                if (arc.arcType === 'Output') {
                    this.newTokenAnimation(arc)
                }
            }
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

    start() {
        if (!this.logicalNet) {
            this.restart()
        } 
        this.playing = true
        this._step()
    }

    pause() {
        this.playing = false
    }

    restart() {
        this.inputWindow = new InputWindow(this.net.inputs)
        this.logicalNet = new LogicalNet(
            this.net, this.inputWindow.readInputs()
        )
        this.logicalNet.updateTransState()
    }

    private _step() {
        this.logicalNet.updateInputValues(this.inputWindow.readInputs())
        const enabledTransitions = this.logicalNet.getEnabledTransitions()

        if (enabledTransitions.length) {
            this.fireTrans(
                enabledTransitions[0],
                this.logicalNet.fireTransResult(
                    enabledTransitions[0]
                )
            )
        } else {
            this.logicalNet.updateTransState()
            setTimeout(() => { 
                if (this.playing) {
                    this._step()
                } 
            }, STEP_INTERVAL_TIME)
        }
    }

    step() {
        if (!this.logicalNet) {
            this.restart()
        } 
        this._step()
    }
}

function createSimulator(net: PetriNet) {
    const simulator = new Simulator(net)

    document.getElementById('step-button').onclick = 
        _ => { simulator.step() }
    
    document.getElementById('play-button').onclick = 
        _ => { simulator.start() }

    document.getElementById('pause-button').onclick = 
        _ => { simulator.pause() }

    document.getElementById('restart-button').onclick = 
        _ => { simulator.restart() }

    return simulator
}

export { Simulator, createSimulator }