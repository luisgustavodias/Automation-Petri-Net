import { SimulationBaseMode } from "./BaseMode.js";
import { delay } from "./SimulationGraphics.js";
export class SimulationVisObjMode extends SimulationBaseMode {
    enebledTransitions = [];
    async update() {
        this.updateInputValues();
        const animations = [];
        for (const trans of this.enebledTransitions) {
            if (trans.checkArcs()) {
                trans.fire();
                animations.push(this.graphics.fireTrans(trans));
            }
        }
        await Promise.all(animations);
        this.enebledTransitions = [];
        for (const trans of this.net.transInOrder) {
            this.updateTrans(trans);
            this.graphics.debugTrans(trans);
            if (trans.isEnable()) {
                this.enebledTransitions.push(trans);
            }
        }
        this.updateSimTime();
        await delay(50);
    }
}
