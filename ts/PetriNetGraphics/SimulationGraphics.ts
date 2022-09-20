import { PetriNet } from "./PetriNet.js"
import { 
    PetriPlace, 
    PetriTrans, 
    PetriArc
} from "./PetriNetElements.js"
import { PEId } from "../PNData.js"
import { createCircle, setCircleCenter } from "../utils/SVGElement/Circle.js"
import Vector from "../utils/Vector.js"
import { LogicalNet, LogicalPetriArc, LogicalTrans } from "../LogicalNet.js"
import { delay } from "../utils/utils.js"

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
        this.currentStep = -1
    }

    start() {
        this.currentStep = 0;

        (<HTMLElement>document.getElementById('IEs'))
            .appendChild(this.token)  
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
        this.currentStep = -1
    }
}

export class SimulationGraphics {
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

    updatePlaceMark = (placeId: PEId, mark: number) => {
        const place = <PetriPlace>this.net.getGenericPE(placeId)
        place.mark = mark
    }

    updatePlaceMarks = (marksToUpdate: PlaceMarks) => {
        for (const placeId in marksToUpdate) {
            const place = <PetriPlace>this.net.getGenericPE(placeId)
            place.mark = marksToUpdate[placeId]
        }
    }

    resetArcColor = (arc: LogicalPetriArc) => {
        const arcGraphics = <PetriArc>this.net.getGenericPE(arc.id)
        arcGraphics.setArcColor('black')
    }

    setTransColor = (trans: PetriTrans, color: string) => {
        trans.svgElement.children[0].setAttribute('fill', color)
    }

    enableTrans = (id: string) => {
        const trans = <PetriTrans>this.net.getGenericPE(id)
        this.setTransColor(trans, TRANS_ENABLE_COLOR)
    }

    disableTrans = (trans: LogicalTrans) => {
        const transGraphics = <PetriTrans>this.net.getGenericPE(trans.id)
        this.setTransColor(transGraphics, 'black')
    }

    private async animateTokens(arcs: LogicalPetriArc[]) {
        const animDuration = FIRE_TRANS_ANIMATION_TIME/2
        let startTime: number | null = null
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

        await delay(animDuration)
    }

    async fireTrans(trans: LogicalTrans) {
        const transGraphics = <PetriTrans>this.net
            .getGenericPE(trans.id)
        
        for (const arc of trans.inputsArcs) {
            const placeGraphics = <PetriPlace>this.net
                .getGenericPE(arc.place.id)
            
            placeGraphics.mark -= arc.weight
        }
        
        this.setTransColor(transGraphics, TRANS_FIRE_COLOR)
        await this.animateTokens(trans.inputsArcs)
        await this.animateTokens(trans.outputsArcs)

        for (const arc of trans.outputsArcs) {
            const placeGraphics = <PetriPlace>this.net
                .getGenericPE(arc.place.id)
            
            placeGraphics.mark += arc.weight
        }
        this.disableTrans(trans)
    }

    displayTime = (time: number) => {
        (<HTMLElement>document.getElementById('simulation-time'))
            .innerHTML = time.toFixed(2)
    }

    setTransGuardColor = (id: PEId, color: string) => {
        const trans = <PetriTrans>this.net.getGenericPE(id)
        trans.svgElement.children[3].setAttribute('fill', color)
    }

    debugArc = (arc: LogicalPetriArc) => {
        const arcGraphics = <PetriArc>this.net.getGenericPE(arc.id)

        arcGraphics.setArcColor(
            arc.isEnable() ? 'green' : 'red'
        )
    }

    debugGuard = (trans: LogicalTrans) => {
        this.setTransGuardColor(
            trans.id, trans.isGuardEnable() ? 'green' : 'red'
        )
    }

    debugTrans = (trans: LogicalTrans) => {
        const transGraphics = <PetriTrans>this.net
            .getGenericPE(trans.id)
        if (trans.isEnable()) 
            this.setTransColor(transGraphics, 'green')
        else if (trans.isWaitingDelay())
            this.setTransColor(transGraphics, 'orange')
        else
            this.setTransColor(transGraphics, 'black')
    }

    resetDebugTrans = (trans: LogicalTrans) => {
        
    }
}