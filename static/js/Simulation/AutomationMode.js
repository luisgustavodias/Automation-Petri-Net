import { SimulationBaseMode } from "./BaseMode.js";
import { delay } from "./SimulationGraphics.js";
export class SimulationAutomationMode extends SimulationBaseMode {
    async update() {
        this.updateInputValues();
        for (const trans of this.net.transInOrder) {
            this.updateTrans(trans);
            this.graphics.debugTrans(trans);
            if (trans.isEnable()) {
                await this.graphics.fireTrans(trans);
                trans.fire();
            }
        }
        this.updateSimTime();
        await delay(50);
    }
}
