import { createCircle, setCircleCenter } from "./utils/Circle.js";
const FIRE_TRANS_ANIMATION_TIME = 1500;
const STEP_INTERVAL_TIME = 250;
const TRANS_ENABLE_COLOR = '#04c200';
const TRANS_FIRE_COLOR = 'red';
function filterNetElementsByType(net, PEType) {
    return Object.values(net.elements).filter((ele) => ele.PEType === PEType);
}
class LogicalNet {
    constructor(net) {
        const places = filterNetElementsByType(net, 'place');
        this.placeMarks = {};
        places.forEach((place) => {
            this.placeMarks[place.id] = parseInt(place.initialMark);
        });
        const trasitions = filterNetElementsByType(net, 'trans');
        // trasitions.sort((a, b) => a.priority - b.priority)
        this.transOrder = [];
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
        });
        this.transState = Object.fromEntries(trasitions.map(trans => [trans.id, false]));
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
    constructor(net) {
        this.net = net;
        this.playing = false;
        this.logicalNet = null;
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
    start() {
        if (!this.logicalNet) {
            this.restart();
        }
        this.playing = true;
        this._step();
    }
    pause() {
        this.playing = false;
    }
    restart() {
        this.logicalNet = new LogicalNet(this.net);
        this.logicalNet.updateTransState();
    }
    _step() {
        const enabledTransitions = this.logicalNet.getEnabledTransitions();
        if (enabledTransitions.length) {
            this.fireTrans(enabledTransitions[0], this.logicalNet.fireTransResult(enabledTransitions[0]));
        }
        else {
            this.logicalNet.updateTransState();
            setTimeout(() => {
                if (this.playing) {
                    this._step();
                }
            }, STEP_INTERVAL_TIME);
        }
    }
    step() {
        if (!this.logicalNet) {
            this.restart();
        }
        this._step();
    }
}
function createSimulator(net) {
    const simulator = new Simulator(net);
    document.getElementById('step-button').onclick =
        _ => { simulator.step(); };
    document.getElementById('play-button').onclick =
        _ => { simulator.start(); };
    document.getElementById('pause-button').onclick =
        _ => { simulator.pause(); };
    document.getElementById('restart-button').onclick =
        _ => { simulator.restart(); };
    return simulator;
}
export { Simulator, createSimulator };
