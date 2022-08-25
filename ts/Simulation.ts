import { PetriNet } from "./PetriNet.js"
import { 
    PetriPlace, 
    PetriTrans, 
    PetriArc
} from "./PNElements.js"
import { PEId, SimConfig } from "./PNData.js"
import { InputWindow } from "./InputWindow.js"
import { createCircle, setCircleCenter } from "./utils/SVGElement/Circle.js"
import Vector from "./utils/Vector.js"
import { LogicalNet, LogicalPetriArc, LogicalTrans } from "./LogigalNet.js"

const FIRE_TRANS_ANIMATION_TIME = 1500
const FIRE_TRANS_INTERVAL = 200
const SIM_CYCLE_INTERVAL = 0.01
const STEP_INTERVAL = 200
const TRANS_ENABLE_COLOR = '#04c200'
const TRANS_FIRE_COLOR = 'red'

type PlaceMarks = {[id: string]: number}

interface TokenAnimStep {
    startPoint: Vector
    velocity: Vector
    endTime: number
}

enum SimState {
    Running,
    Pausing,
    Paused,
    Stepping,
    Stopping,
    Stopped
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


class SimulationGraphics {
    private readonly net: PetriNet
    private readonly tokenAnimByArc: {[arcId: PEId]: TokenAnimation}

    constructor(net: PetriNet) {
        this.net = net
        this.tokenAnimByArc = Object.fromEntries(
            net.getNetData().arcs.filter(
                arcData => ['Input', 'Output'].includes(arcData.arcType)
            ).map(arcData => {
                const arc = <PetriArc>net.getGenericPE(arcData.id)
                return [arc.id, new TokenAnimation(arc.getArcPath())]
            }
        ))
    }

    updatePlaceMarks(marksToUpdate: PlaceMarks) {
        for (const placeId in marksToUpdate) {
            const place = <PetriPlace>this.net.getGenericPE(placeId)
            place.mark = marksToUpdate[placeId]
        }
    }

    setTransColor(trans: PetriTrans, color: string) {
        trans.svgElement.children[0].setAttribute('fill', color)
    }

    enableTrans(id: string) {
        const trans = <PetriTrans>this.net.getGenericPE(id)
        this.setTransColor(trans, TRANS_ENABLE_COLOR)
    }

    disableTrans(id: string) {
        const trans = <PetriTrans>this.net.getGenericPE(id)
        this.setTransColor(trans, 'black')
    }

    private animateTokens(arcs: PEId[]) {
        const animDuration = FIRE_TRANS_ANIMATION_TIME/2
        let startTime = null
        const animations = arcs.map(arcId => this.tokenAnimByArc[arcId])
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

    fireTrans(trans: LogicalTrans) {
        const transGraphics = <PetriTrans>this.net
            .getGenericPE(trans.id)
        
        const inputArcIds = []
        for (const arc of trans.inputsArcs) {
            const placeGraphics = <PetriPlace>this.net
                .getGenericPE(arc.place.id)
            
            placeGraphics.mark -= arc.weight
            inputArcIds.push(arc.id)
        }
        
        this.setTransColor(transGraphics, TRANS_FIRE_COLOR)
        this.animateTokens(inputArcIds)

        setTimeout(() => {
            this.animateTokens(trans.outputsArcs.map(arc => arc.id))
        }, FIRE_TRANS_ANIMATION_TIME/2)
        setTimeout(() => {
            for (const arc of trans.outputsArcs) {
                const placeGraphics = <PetriPlace>this.net
                    .getGenericPE(arc.place.id)
                
                placeGraphics.mark += arc.weight
            }
            this.disableTrans(trans.id)
        }, FIRE_TRANS_ANIMATION_TIME)
    }

    displayTime(time: number) {
        document.getElementById('simulation-time').innerHTML = time
                .toFixed(2)
    }

    setTransGuardColor(id: PEId, color: string) {
        const trans = <PetriTrans>this.net.getGenericPE(id)
        trans.svgElement.children[3].setAttribute('fill', color)
    }

    debugArc(arc: LogicalPetriArc) {
        const arcGraphics = <PetriArc>this.net.getGenericPE(arc.id)

        arcGraphics.setArcColor(
            arc.isEnable() ? 'green' : 'red'
        )
    }

    debugGuard(trans: LogicalTrans) {
        this.setTransGuardColor(
            trans.id, trans.isGuardEnable() ? 'green' : 'red'
        )
    }

    debugTrans(trans: LogicalTrans) {
        const transGraphics = <PetriTrans>this.net
            .getGenericPE(trans.id)
        if (trans.isEnable()) 
            this.setTransColor(transGraphics, 'green')
        else if (trans.isWaitingDelay())
            this.setTransColor(transGraphics, 'orange')
        else
            this.setTransColor(transGraphics, 'black')
    }

    restartNet() {
        for (const element of this.net.getAllGenericPEs()) {
            if (element instanceof PetriPlace) {
                element.mark = parseInt(element.initialMark || "0")
            } else if (element instanceof PetriTrans) {
                this.setTransColor(element, "black")
            } else if (element instanceof PetriArc) {
                element.setArcColor('black')
            }
        }
    }
}

class Simulator {
    private graphics: SimulationGraphics
    private state: SimState
    private logicalNet: LogicalNet
    private simConfig: SimConfig
    private inputWindow: InputWindow

    constructor() { 
        this.state = SimState.Stopped
        this.graphics = null
        this.logicalNet = null
        this.inputWindow = new InputWindow()
    }

    private restartNet() {
        this.logicalNet.restart()
        this.graphics.restartNet()
    }

    private init(net: PetriNet) {
        this.graphics = new SimulationGraphics(net);
        this.inputWindow.open(net.inputs)
        this.logicalNet = new LogicalNet(
            net.getNetData(), 
            SIM_CYCLE_INTERVAL, 
            () => this.inputWindow.readInputs()
        )
        this.simConfig = net.simConfig
        this.restartNet()
        this.state = SimState.Paused
    }

    private _pause() {
        this.state = SimState.Paused
        document.getElementById('simulating-text')
            .innerHTML = 'Paused'
    }

    private _stop() {
        this.restartNet()
        this.logicalNet = null
        this.state = SimState.Stopped
        this.inputWindow.close()
        document.getElementById('simulating-text')
            .innerHTML = ''
        document.getElementById('simulation-time')
            .innerHTML = ''
    }

    private classic_mode_update = () => {
        if (this.simConfig.arcDebug) {
            for (const arc of Object.values(this.logicalNet.arcs))
                this.graphics.debugArc(arc)
        }
        
        if (this.simConfig.guardDebug) {
            for (const trans of this.logicalNet.transInOrder) 
                this.graphics.debugGuard(trans)
        }

        for (const trans of this.logicalNet.transInOrder) 
            this.graphics.debugTrans(trans)

        this.graphics.displayTime(this.logicalNet.getSimulationTime())

        let timeout = STEP_INTERVAL
        if (this.logicalNet.transitionsToFire.length) 
            timeout += FIRE_TRANS_ANIMATION_TIME

        for (const trans of this.logicalNet.transitionsToFire)
            this.graphics.fireTrans(trans)

        this.logicalNet.step()

        if (this.state === SimState.Stepping) {
            this._pause()
            return
        }

        setTimeout(this.update, timeout)
    }

    private automation_mode_update() {
        const stepResult = this.logicalNet.update()
        let timeout = 0;

        if (this.simConfig.guardDebug) {
            this.graphics.debugGuard(stepResult.currentTrans)
        }
        this.graphics.debugTrans(stepResult.currentTrans)

        if (stepResult.currentTrans.isEnable()) {
            this.graphics.fireTrans(
                stepResult.currentTrans
            )
            timeout = FIRE_TRANS_ANIMATION_TIME 
                + FIRE_TRANS_INTERVAL
        }
        
        if (stepResult.isLastTrans) {
            if (this.state === SimState.Stepping) {
                this._pause()
                return
            }
            timeout += STEP_INTERVAL
        }

        setTimeout(this.update, timeout)
    }

    private update = () => {
        if (this.state === SimState.Stopping) {
            this._stop()
            return
        }
        if (this.state === SimState.Pausing) {
            this._pause()
            return
        }

        this.graphics.displayTime(
            this.logicalNet.getSimulationTime()
        )

        if (this.simConfig.simMode === "Automation")
            this.automation_mode_update()
        else if (this.simConfig.simMode === "Classic")
            this.classic_mode_update()
    }

    start(net: PetriNet) {
        if (this.state === SimState.Stopped) {
            this.init(net)
            this.state = SimState.Running
            this.update()
            document.getElementById('simulating-text')
                .innerHTML = 'Simulating...'
        } else if (this.state === SimState.Paused) {
            this.state = SimState.Running
            this.update()
            document.getElementById('simulating-text')
                .innerHTML = 'Simulating...'
        }
    }

    pause() {
        if (this.state === SimState.Running)
            this.state = SimState.Pausing
    }

    restart(net: PetriNet) {
        if (this.state !== SimState.Stopped)
            this.init(net)
    }

    stop() {
        if (this.state !== SimState.Stopped) {
            if (this.state === SimState.Paused)
                this._stop()
            else
                this.state = SimState.Stopping
        }
    }

    step(net: PetriNet) {
        this.start(net)
        this.state = SimState.Stepping
    }

    debugStep(net: PetriNet) {
        this.start(net)
        this.state = SimState.Pausing
    }
}

function createSimulator(
    startSimObserver: () => PetriNet,
    stopSimObserver: VoidFunction 
) {
    const simulator = new Simulator()

    document.getElementById('step-button').onclick = 
        () => { 
            simulator.step(startSimObserver())
        }

    document.getElementById('debug-button').onclick = 
    () => { 
        simulator.debugStep(startSimObserver())
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