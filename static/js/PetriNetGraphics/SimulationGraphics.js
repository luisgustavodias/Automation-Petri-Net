import { createCircle, setCircleCenter } from "../utils/SVGElement/Circle.js";
import { delay } from "../utils/utils.js";
const FIRE_TRANS_ANIMATION_TIME = 1500;
const FIRE_TRANS_INTERVAL = 200;
const SIM_CYCLE_INTERVAL = 0.01;
const STEP_INTERVAL = 200;
const TRANS_ENABLE_COLOR = '#04c200';
const TRANS_FIRE_COLOR = 'red';
class TokenAnimation {
    animSteps;
    token;
    currentStep;
    constructor(pathPoints) {
        const segmentsDistVect = [];
        for (let i = 1; i < pathPoints.length; i++)
            segmentsDistVect.push(pathPoints[i].sub(pathPoints[i - 1]));
        const totalLength = segmentsDistVect.map(v => v.mag()).reduce((a, b) => a + b, 0);
        const animDuration = FIRE_TRANS_ANIMATION_TIME / 2;
        this.animSteps = [];
        for (let i = 0; i < segmentsDistVect.length; i++) {
            const distVect = segmentsDistVect[i];
            const stepEndTime = distVect.mag() * animDuration / totalLength;
            let endTime = stepEndTime;
            if (i > 0)
                endTime += this.animSteps[i - 1].endTime;
            this.animSteps.push({
                startPoint: pathPoints[i],
                velocity: distVect.mul(1 / stepEndTime),
                endTime: endTime
            });
        }
        this.token = createCircle(this.animSteps[0].startPoint, 2);
        this.currentStep = -1;
    }
    start() {
        this.currentStep = 0;
        document.getElementById('IEs')
            .appendChild(this.token);
        setCircleCenter(this.token, this.animSteps[0].startPoint);
    }
    update(t) {
        if (t > this.animSteps[this.currentStep].endTime)
            this.currentStep++;
        const currentStep = this.animSteps[this.currentStep];
        let stepTime;
        if (this.currentStep === 0)
            stepTime = t;
        else
            stepTime = t - this.animSteps[this.currentStep - 1].endTime;
        setCircleCenter(this.token, currentStep.startPoint.add(currentStep.velocity.mul(stepTime)));
    }
    stop() {
        this.token.remove();
        this.currentStep = -1;
    }
}
export class SimulationGraphics {
    net;
    tokenAnimByArc;
    constructor(net) {
        this.net = net;
        this.tokenAnimByArc = Object.fromEntries(net.getNetData().arcs.filter(arcData => ['Input', 'Output'].includes(arcData.arcType)).map(arcData => {
            const arc = net.getGenericPE(arcData.id);
            return [arc.id, new TokenAnimation(arc.getArcPath())];
        }));
    }
    updatePlaceMark = (placeId, mark) => {
        const place = this.net.getGenericPE(placeId);
        place.mark = mark;
    };
    updatePlaceMarks = (marksToUpdate) => {
        for (const placeId in marksToUpdate) {
            const place = this.net.getGenericPE(placeId);
            place.mark = marksToUpdate[placeId];
        }
    };
    resetArcColor = (arc) => {
        const arcGraphics = this.net.getGenericPE(arc.id);
        arcGraphics.setArcColor('black');
    };
    setTransColor = (trans, color) => {
        trans.svgElement.children[0].setAttribute('fill', color);
    };
    enableTrans = (id) => {
        const trans = this.net.getGenericPE(id);
        this.setTransColor(trans, TRANS_ENABLE_COLOR);
    };
    disableTrans = (trans) => {
        const transGraphics = this.net.getGenericPE(trans.id);
        this.setTransColor(transGraphics, 'black');
    };
    async animateTokens(arcs) {
        const animDuration = FIRE_TRANS_ANIMATION_TIME / 2;
        let startTime = null;
        const animations = arcs.map(arc => this.tokenAnimByArc[arc.id]);
        animations.forEach(anim => anim.start());
        function animFunc(timestamp) {
            if (!startTime) {
                startTime = timestamp;
            }
            const t = (timestamp - startTime);
            if (t > animDuration) {
                animations.forEach(anim => anim.stop());
                return;
            }
            for (const anim of animations)
                anim.update(t);
            requestAnimationFrame(animFunc);
        }
        requestAnimationFrame(animFunc);
        await delay(animDuration);
    }
    async fireTrans(trans) {
        const transGraphics = this.net
            .getGenericPE(trans.id);
        for (const arc of trans.inputsArcs) {
            const placeGraphics = this.net
                .getGenericPE(arc.place.id);
            placeGraphics.mark -= arc.weight;
        }
        this.setTransColor(transGraphics, TRANS_FIRE_COLOR);
        await this.animateTokens(trans.inputsArcs);
        await this.animateTokens(trans.outputsArcs);
        for (const arc of trans.outputsArcs) {
            const placeGraphics = this.net
                .getGenericPE(arc.place.id);
            placeGraphics.mark += arc.weight;
        }
        this.disableTrans(trans);
    }
    displayTime = (time) => {
        document.getElementById('simulation-time')
            .innerHTML = time.toFixed(2);
    };
    setTransGuardColor = (id, color) => {
        const trans = this.net.getGenericPE(id);
        trans.svgElement.children[3].setAttribute('fill', color);
    };
    debugArc = (arc) => {
        const arcGraphics = this.net.getGenericPE(arc.id);
        arcGraphics.setArcColor(arc.isEnable() ? 'green' : 'red');
    };
    debugGuard = (trans) => {
        this.setTransGuardColor(trans.id, trans.isGuardEnable() ? 'green' : 'red');
    };
    debugTrans = (trans) => {
        const transGraphics = this.net
            .getGenericPE(trans.id);
        if (trans.isEnable())
            this.setTransColor(transGraphics, 'green');
        else if (trans.isWaitingDelay())
            this.setTransColor(transGraphics, 'orange');
        else
            this.setTransColor(transGraphics, 'black');
    };
    resetDebugTrans = (trans) => {
    };
}
