const FIRE_TRANS_ANIMATION_TIME = 1000;
const TRANS_ENABLE_COLOR = '#04c200';
const TRANS_FIRE_COLOR = 'red';
class LogicalSimulator {
    constructor(placeMarks, arcsBytrans) {
        this.placeMarks = placeMarks;
        this.arcsByTrans = arcsBytrans;
        console.log(placeMarks);
        console.log(arcsBytrans);
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
    upadatePlaceMarks(marksToUpdate) {
        Object.assign(this.placeMarks, marksToUpdate);
    }
    step() {
        const enabledTransitions = Object.keys(this.arcsByTrans)
            .filter(transId => this.checkTrans(transId));
        if (!enabledTransitions.length) {
            return {
                enabledTransitions: [],
                transToFire: null,
                marksToUpdate: null
            };
        }
        const marksToUpdate = this.fireTransResult(enabledTransitions[0]);
        this.upadatePlaceMarks(marksToUpdate);
        return {
            enabledTransitions: enabledTransitions,
            transToFire: enabledTransitions[0],
            marksToUpdate: marksToUpdate
        };
    }
}
class Simulator {
    constructor(net) {
        this.net = net;
        this.playing = false;
        this.simulator = null;
    }
    init() {
        const placeMarks = {};
        const places = this.filterNetElementsByType('place');
        places.forEach((place) => {
            placeMarks[place.id] = parseInt(place.initialMark);
        });
        const arcsByTrans = {};
        const trasitions = this.filterNetElementsByType('trans');
        trasitions.forEach((trans) => {
            arcsByTrans[trans.id] = trans.connectedArcs.map((arcId) => {
                const arc = this.net.elements[arcId];
                return {
                    placeId: arc.placeId,
                    arcType: arc.arcType,
                    weight: parseInt(arc.weight)
                };
            });
        });
        this.simulator = new LogicalSimulator(placeMarks, arcsByTrans);
        this.updatePlaceMarks(placeMarks);
    }
    filterNetElementsByType(PEType) {
        return Object.values(this.net.elements).filter((ele) => ele.PEType === PEType);
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
    fireTrans(transId, marksToUpdate) {
        const trans = this.net.elements[transId];
        this.setTransColor(trans, TRANS_FIRE_COLOR);
        setTimeout(() => {
            this.disableTrans(transId);
            this.updatePlaceMarks(marksToUpdate);
            if (this.playing) {
                this._step();
            }
        }, FIRE_TRANS_ANIMATION_TIME);
    }
    start() {
        if (!this.simulator) {
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
    _step() {
        const stepResult = this.simulator.step();
        console.log(stepResult);
        stepResult.enabledTransitions.forEach(transId => {
            this.enableTrans(transId);
        });
        if (stepResult.transToFire) {
            this.fireTrans(stepResult.transToFire, stepResult.marksToUpdate);
        }
    }
    step() {
        if (!this.simulator) {
            this.init();
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
