import { SimulationBaseMode } from "./BaseMode.js";
import { delay } from "../utils/utils.js";
export class SimulationAutomationMode extends SimulationBaseMode {
    async update() {
        this.updateInputValues();
        for (const trans of this.net.transInOrder) {
            this.updateTrans(trans);
            this.graphics.debugTrans(trans);
            if (this.net.simConfig.guardDebug)
                this.graphics.debugGuard(trans);
            if (this.net.simConfig.arcDebug)
                trans.getArcs().forEach(this.graphics.debugArc);
            if (trans.isEnable()) {
                await this.graphics.fireTrans(trans);
                trans.fire();
            }
            if (this.net.simConfig.arcDebug)
                trans.getArcs().forEach(this.graphics.resetArcColor);
        }
        this.updateSimTime();
        await delay(50);
    }
}
