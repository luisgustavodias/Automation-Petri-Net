import { SimulationBaseMode } from "./BaseMode.js";
import { delay } from "./SimulationGraphics.js";
export class SimulationVisObjMode extends SimulationBaseMode {
    enebledTransitions = [];
    async update() {
        const animations = [];
        for (const trans of this.enebledTransitions) {
            if (trans.checkArcs()) {
                trans.fire();
                animations.push(this.graphics.fireTrans(trans));
            }
        }
        await Promise.all(animations);
        this.enebledTransitions = [];
        this.updateInputValues();
        for (const trans of this.net.transInOrder) {
            this.updateTrans(trans);
            this.graphics.debugTrans(trans);
            if (this.net.simConfig.guardDebug)
                this.graphics.debugGuard(trans);
            if (trans.isEnable())
                this.enebledTransitions.push(trans);
        }
        if (this.net.simConfig.arcDebug)
            Object.values(this.net.arcs).forEach(this.graphics.debugArc);
        this.updateSimTime();
        await delay(50);
    }
}
