import { InputWindow } from "./InputWindow.js";
import { createCircle, setCircleCenter } from "./utils/Circle.js";
const FIRE_TRANS_ANIMATION_TIME = 1500;
const STEP_INTERVAL_TIME = 250;
const TRANS_ENABLE_COLOR = '#04c200';
const TRANS_FIRE_COLOR = 'red';
function filterNetElementsByType(net, PEType) {
    return Object.values(net.elements).filter((ele) => ele.PEType === PEType);
}
class LogicalNet {
    placeMarks;
    arcsByTrans;
    transOrder;
    transState;
    transGuards;
    transGuardFuncs;
    inputValues; //InputValues
    constructor(net, inputValues) {
        const places = filterNetElementsByType(net, 'place');
        this.placeMarks = {};
        places.forEach((place) => {
            this.placeMarks[place.id] = parseInt(place.initialMark);
        });
        const trasitions = filterNetElementsByType(net, 'trans');
        this.inputValues = new Map();
        for (const inputName in inputValues) {
            this.inputValues.set(inputName, inputValues[inputName]);
        }
        // trasitions.sort((a, b) => a.priority - b.priority)
        this.transOrder = [];
        this.transGuardFuncs = {};
        this.arcsByTrans = {};
        trasitions.forEach((trans) => {
            this.arcsByTrans[trans.id] = trans.connectedArcs.map((arcId) => {
                const arc = net.elements[arcId];
                return {
                    placeId: arc.placeId,
                    arcType: arc.arcType,
                    weight: parseInt(arc.weight)
                };
            });
            this.transOrder.push(trans.id);
            if (trans.guard) {
                this.transGuardFuncs[trans.id] = this.createGuardFunc(trans.guard, [...this.inputValues.keys()]);
            }
            else {
                this.transGuardFuncs[trans.id] = (...args) => true;
            }
        });
        this.transState = Object.fromEntries(trasitions.map(trans => [trans.id, false]));
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
                if (this.placeMarks[arc.placeId] < arc.weight) {
                    return false;
                }
            }
            else if (arc.arcType === "Inhibitor") {
                if (this.placeMarks[arc.placeId] >= arc.weight) {
                    return false;
                }
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
        const result = {};
        for (const arc of this.arcsByTrans[transId]) {
            if (arc.arcType === "Input") {
                result[arc.placeId] = this.placeMarks[arc.placeId]
                    - arc.weight;
            }
            if (arc.arcType === "Output") {
                result[arc.placeId] = this.placeMarks[arc.placeId]
                    + arc.weight;
            }
        }
        return result;
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
class Simulator {
    net;
    playing;
    stoping;
    logicalNet;
    inputWindow;
    constructor(net) {
        this.net = net;
        this.playing = false;
        this.stoping = false;
        this.logicalNet = null;
        this.inputWindow = new InputWindow();
    }
    updatePlaceMarks(marksToUpdate) {
        for (const placeId in marksToUpdate) {
            const place = this.net.elements[placeId];
            place.mark = String(marksToUpdate[placeId]);
        }
    }
    setTransColor(trans, color) {
        trans.svgElement.children[0].setAttribute('stroke', color);
    }
    setArcColor(arc, color) {
        arc.svgElement.children[0].setAttribute('stroke', color);
        arc.svgElement.children[1].setAttribute('fill', color);
        arc.svgElement.children[2].setAttribute('stroke', color);
    }
    enableTrans(id) {
        const trans = this.net.elements[id];
        this.setTransColor(trans, TRANS_ENABLE_COLOR);
    }
    disableTrans(id) {
        const trans = this.net.elements[id];
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
    newTokenAnimation(arc) {
        const place = this.net.elements[arc.placeId];
        const trans = this.net.elements[arc.transId];
        const placePos = place.position;
        const transPos = trans.position;
        let startPoint, v;
        if (arc.arcType === 'Input') {
            startPoint = placePos;
            v = transPos.sub(placePos);
        }
        else if (arc.arcType === 'Output') {
            startPoint = transPos;
            v = placePos.sub(transPos);
        }
        else {
            throw `Can't create a animation to a ${arc.arcType} arc.`;
        }
        const animDuration = FIRE_TRANS_ANIMATION_TIME / 2;
        const vel = v.mul(1 / animDuration);
        const token = createCircle(startPoint, 2);
        document.getElementById('IEs').appendChild(token);
        let startTime = null;
        function animFunc(timestamp) {
            if (!startTime) {
                startTime = timestamp;
            }
            const t = (timestamp - startTime);
            if (t > animDuration) {
                token.remove();
                return;
            }
            setCircleCenter(token, startPoint.add(vel.mul(t)));
            requestAnimationFrame(animFunc);
        }
        requestAnimationFrame(animFunc);
    }
    fireTrans(transId, marksToUpdate) {
        const trans = this.net.elements[transId];
        this.setTransColor(trans, TRANS_FIRE_COLOR);
        for (const arcId of trans.connectedArcs) {
            const arc = this.net.elements[arcId];
            if (arc.arcType === 'Input') {
                this.newTokenAnimation(arc);
                const place = this.net.elements[arc.placeId];
                place.mark = String(marksToUpdate[arc.placeId]);
            }
        }
        setTimeout(() => {
            for (const arcId of trans.connectedArcs) {
                const arc = this.net.elements[arcId];
                if (arc.arcType === 'Output') {
                    this.newTokenAnimation(arc);
                }
            }
        }, FIRE_TRANS_ANIMATION_TIME / 2);
        setTimeout(() => {
            this.logicalNet.updatePlaceMarks(marksToUpdate);
            this.logicalNet.updateTransState();
            this.updatePlaceMarks(marksToUpdate);
            this.updateTransitions();
            if (this.playing) {
                setTimeout(() => { this._step(); }, STEP_INTERVAL_TIME);
            }
        }, FIRE_TRANS_ANIMATION_TIME);
    }
    restartNet() {
        for (const placeId in this.logicalNet.placeMarks) {
            const place = this.net.elements[placeId];
            place.mark = place.initialMark;
        }
        for (const transId in this.logicalNet.arcsByTrans) {
            this.disableTrans(transId);
        }
    }
    init() {
        this.inputWindow.open(this.net.inputs);
        this.logicalNet = new LogicalNet(this.net, this.inputWindow.readInputs());
        this.logicalNet.updateTransState();
        this.restartNet();
        document.getElementById('simulating-text').style.display = 'block';
    }
    start() {
        if (!this.logicalNet) {
            console.log('not locicalNet');
            this.init();
        }
        this.playing = true;
        this._step();
    }
    pause() {
        this.playing = false;
    }
    restart() {
        this.init();
    }
    _stop() {
        this.restartNet();
        this.logicalNet = null;
        this.playing = false;
        this.stoping = true;
        this.inputWindow.close();
        document.getElementById('simulating-text').style.display = 'none';
        this.stoping = false;
    }
    stop() {
        if (this.logicalNet && !this.stoping) {
            this.stoping = true;
        }
    }
    _step() {
        this.logicalNet.updateInputValues(this.inputWindow.readInputs());
        const enabledTransitions = this.logicalNet.getEnabledTransitions();
        if (this.stoping) {
            this._stop();
            return;
        }
        if (!enabledTransitions.length) {
            this.logicalNet.updateTransState();
            setTimeout(() => {
                if (this.playing) {
                    this._step();
                }
            }, STEP_INTERVAL_TIME);
            return;
        }
        this.fireTrans(enabledTransitions[0], this.logicalNet.fireTransResult(enabledTransitions[0]));
    }
    step() {
        if (!this.logicalNet) {
            this.init();
        }
        this._step();
    }
}
function createSimulator(net, startSimObserver, stopSimObserver) {
    const simulator = new Simulator(net);
    document.getElementById('step-button').onclick =
        () => {
            simulator.step();
            startSimObserver();
        };
    document.getElementById('start-button').onclick =
        () => {
            simulator.start();
            startSimObserver();
        };
    document.getElementById('pause-button').onclick =
        () => { simulator.pause(); };
    document.getElementById('restart-button').onclick =
        () => {
            simulator.restart();
            startSimObserver();
        };
    document.getElementById('stop-button').onclick =
        () => {
            simulator.stop();
            stopSimObserver();
        };
    return simulator;
}
export { Simulator, createSimulator };
