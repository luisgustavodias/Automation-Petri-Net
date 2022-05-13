import { InputWindow } from "./InputWindow.js";
import { createCircle, setCircleCenter } from "./utils/SVGElement/Circle.js";
const FIRE_TRANS_ANIMATION_TIME = 1500;
const STEP_INTERVAL_TIME = 250;
const TRANS_ENABLE_COLOR = '#04c200';
const TRANS_FIRE_COLOR = 'red';
class LogicalNet {
    placeMarks;
    placeTypes;
    arcsByTrans;
    transOrder;
    transState;
    transGuards;
    transGuardFuncs;
    inputValues; //InputValues
    constructor(netData, inputValues) {
        this.placeMarks = {};
        this.placeTypes = {};
        netData.places.forEach((place) => {
            this.placeMarks[place.id] = parseInt(place.initialMark);
            this.placeTypes[place.id] = place.placeType;
        });
        this.inputValues = new Map();
        for (const inputName in inputValues) {
            this.inputValues.set(inputName, inputValues[inputName]);
        }
        // trasitions.sort((a, b) => a.priority - b.priority)
        this.transOrder = [];
        this.transGuardFuncs = {};
        netData.transitions.forEach((trans) => {
            this.transOrder.push(trans.id);
            if (trans.guard) {
                this.transGuardFuncs[trans.id] = this.createGuardFunc(trans.guard, [...this.inputValues.keys()]);
            }
            else {
                this.transGuardFuncs[trans.id] = (...args) => true;
            }
        });
        this.arcsByTrans = {};
        netData.arcs.forEach(arc => {
            if (!(arc.transId in this.arcsByTrans))
                this.arcsByTrans[arc.transId] = [];
            this.arcsByTrans[arc.transId].push({
                placeId: arc.placeId,
                arcType: arc.arcType,
                weight: parseInt(arc.weight)
            });
        });
        this.transState = Object.fromEntries(netData.transitions.map(trans => [trans.id, false]));
    }
    createGuardFunc(guard, inputNames) {
        const decodedGuard = guard
            .replaceAll(/(?<=(\)|\s))and(?=(\(|\s))/gi, '&&')
            .replaceAll(/(?<=(\)|\s))or(?=(\(|\s))/gi, '||')
            .replaceAll(/(?<=(\(|\)|\s|^))not(?=(\(|\s))/gi, '!');
        return eval(`(${inputNames.join(',')}) => ${decodedGuard}`);
    }
    updateInputValues(inputValues) {
        for (const inputName in inputValues) {
            this.inputValues.set(inputName, inputValues[inputName]);
        }
    }
    checkTrans(transId) {
        for (const arc of this.arcsByTrans[transId]) {
            if (arc.arcType === "Input" || arc.arcType === "Test") {
                if (this.placeMarks[arc.placeId] < arc.weight)
                    return false;
            }
            else if (arc.arcType === "Inhibitor") {
                if (this.placeMarks[arc.placeId] >= arc.weight)
                    return false;
            }
            else if (arc.arcType === "Output" &&
                this.placeTypes[arc.placeId] === "BOOL") {
                if (this.placeMarks[arc.placeId] === 1)
                    return false;
            }
        }
        if (!this.transGuardFuncs[transId](...this.inputValues.values()))
            return false;
        return true;
    }
    getEnabledTransitions() {
        return this.transOrder.filter(transId => this.transState[transId]);
    }
    fireTransResult(transId) {
        const inputsToUpdate = {};
        const outputsToUpdate = {};
        for (const arc of this.arcsByTrans[transId]) {
            if (arc.arcType === "Input") {
                inputsToUpdate[arc.placeId] = this.placeMarks[arc.placeId]
                    - arc.weight;
            }
            if (arc.arcType === "Output") {
                if (arc.placeId in inputsToUpdate)
                    outputsToUpdate[arc.placeId] = inputsToUpdate[arc.placeId]
                        + arc.weight;
                else
                    outputsToUpdate[arc.placeId] = this.placeMarks[arc.placeId]
                        + arc.weight;
            }
        }
        return { inputsToUpdate: inputsToUpdate, outputsToUpdate: outputsToUpdate };
    }
    updateTransState() {
        for (const transId in this.transState) {
            this.transState[transId] = this.checkTrans(transId);
        }
    }
    updatePlaceMarks(marksToUpdate) {
        Object.assign(this.placeMarks, marksToUpdate);
    }
}
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
        this.currentStep = null;
    }
    start() {
        this.currentStep = 0;
        document.getElementById('IEs').appendChild(this.token);
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
        this.currentStep = null;
    }
}
var SimState;
(function (SimState) {
    SimState[SimState["Running"] = 0] = "Running";
    SimState[SimState["Pausing"] = 1] = "Pausing";
    SimState[SimState["Paused"] = 2] = "Paused";
    SimState[SimState["Stopping"] = 3] = "Stopping";
    SimState[SimState["Stopped"] = 4] = "Stopped";
})(SimState || (SimState = {}));
class Simulator {
    currentNet;
    state;
    logicalNet;
    inputWindow;
    tokenAnimByArc;
    constructor(net) {
        this.currentNet = net;
        this.state = SimState.Stopped;
        this.logicalNet = null;
        this.inputWindow = new InputWindow();
    }
    updatePlaceMarks(marksToUpdate) {
        for (const placeId in marksToUpdate) {
            const place = this.currentNet.getGenericPE(placeId);
            place.mark = marksToUpdate[placeId];
        }
    }
    setTransColor(trans, color) {
        trans.svgElement.children[0].setAttribute('stroke', color);
    }
    enableTrans(id) {
        const trans = this.currentNet.getGenericPE(id);
        this.setTransColor(trans, TRANS_ENABLE_COLOR);
    }
    disableTrans(id) {
        const trans = this.currentNet.getGenericPE(id);
        this.setTransColor(trans, 'black');
    }
    updateTransitions() {
        for (const transId in this.logicalNet.transState) {
            if (this.logicalNet.transState[transId]) {
                this.enableTrans(transId);
            }
            else {
                this.disableTrans(transId);
            }
        }
    }
    animateTokens(arcs) {
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
    }
    fireTrans(transId, marksToUpdate) {
        const trans = this.currentNet.getGenericPE(transId);
        const inputArcs = [];
        const outputArcs = [];
        for (const arcId of trans.connectedArcs) {
            const arc = this.currentNet.getGenericPE(arcId);
            if (arc.arcType === 'Input')
                inputArcs.push(arc);
            else if (arc.arcType === 'Output')
                outputArcs.push(arc);
        }
        for (const arc of inputArcs) {
            const place = this.currentNet
                .getGenericPE(arc.placeId);
            place.mark = marksToUpdate.inputsToUpdate[arc.placeId];
        }
        this.setTransColor(trans, TRANS_FIRE_COLOR);
        this.animateTokens(inputArcs);
        setTimeout(() => {
            this.animateTokens(outputArcs);
        }, FIRE_TRANS_ANIMATION_TIME / 2);
        setTimeout(() => {
            this.logicalNet.updatePlaceMarks(marksToUpdate.inputsToUpdate);
            this.logicalNet.updatePlaceMarks(marksToUpdate.outputsToUpdate);
            this.updatePlaceMarks(marksToUpdate.outputsToUpdate);
            this.disableTrans(trans.id);
        }, FIRE_TRANS_ANIMATION_TIME);
    }
    restartNet() {
        for (const placeId in this.logicalNet.placeMarks) {
            const place = this.currentNet.getGenericPE(placeId);
            place.mark = parseInt(place.initialMark);
        }
        for (const transId in this.logicalNet.arcsByTrans) {
            this.disableTrans(transId);
        }
    }
    init(net) {
        this.currentNet = net;
        this.inputWindow.open(this.currentNet.inputs);
        const netData = this.currentNet.getNetData();
        this.logicalNet = new LogicalNet(netData, this.inputWindow.readInputs());
        this.tokenAnimByArc = Object.fromEntries(netData.arcs.filter(arcData => ['Input', 'Output'].includes(arcData.arcType)).map(arcData => {
            const arc = net.getGenericPE(arcData.id);
            return [arc.id, new TokenAnimation(arc.getArcPath())];
        }));
        this.logicalNet.updateTransState();
        this.restartNet();
        this.state = SimState.Paused;
    }
    _pause() {
        this.state = SimState.Paused;
        document.getElementById('simulating-text')
            .innerHTML = 'Paused';
    }
    _stop() {
        this.restartNet();
        this.logicalNet = null;
        this.state = SimState.Stopped;
        this.inputWindow.close();
        document.getElementById('simulating-text')
            .innerHTML = '';
    }
    _step = () => {
        if (this.state !== SimState.Running) {
            if (this.state === SimState.Stopping)
                this._stop();
            if (this.state === SimState.Pausing)
                this._pause();
            return;
        }
        this.logicalNet.updateInputValues(this.inputWindow.readInputs());
        this.logicalNet.updateTransState();
        this.updateTransitions();
        const enabledTransitions = this.logicalNet.getEnabledTransitions();
        if (!enabledTransitions.length) {
            setTimeout(this._step, STEP_INTERVAL_TIME);
            return;
        }
        this.fireTrans(enabledTransitions[0], this.logicalNet.fireTransResult(enabledTransitions[0]));
        setTimeout(this._step, FIRE_TRANS_ANIMATION_TIME
            + STEP_INTERVAL_TIME);
    };
    start(net) {
        if (this.state === SimState.Stopped) {
            this.init(net);
            this.state = SimState.Running;
            this._step();
            document.getElementById('simulating-text')
                .innerHTML = 'Simulating...';
        }
        else if (this.state === SimState.Paused) {
            this.state = SimState.Running;
            this._step();
            document.getElementById('simulating-text')
                .innerHTML = 'Simulating...';
        }
    }
    pause() {
        if (this.state === SimState.Running)
            this.state = SimState.Pausing;
    }
    restart(net) {
        if (this.state !== SimState.Stopped)
            this.init(net);
    }
    stop() {
        if (this.state !== SimState.Stopped) {
            if (this.state === SimState.Paused)
                this._stop();
            else
                this.state = SimState.Stopping;
        }
    }
    step(net) {
        this.start(net);
        this.state = SimState.Pausing;
    }
}
function createSimulator(net, startSimObserver, stopSimObserver) {
    const simulator = new Simulator(net);
    document.getElementById('step-button').onclick =
        () => {
            simulator.step(startSimObserver());
        };
    document.getElementById('start-button').onclick =
        () => {
            simulator.start(startSimObserver());
        };
    document.getElementById('pause-button').onclick =
        () => { simulator.pause(); };
    document.getElementById('restart-button').onclick =
        () => {
            simulator.restart(startSimObserver());
        };
    document.getElementById('stop-button').onclick =
        () => {
            simulator.stop();
            stopSimObserver();
        };
    return simulator;
}
export { Simulator, createSimulator };
