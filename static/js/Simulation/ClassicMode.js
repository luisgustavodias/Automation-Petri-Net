import { SimulationBaseMode } from "./BaseMode.js";
import { delay } from "./SimulationGraphics.js";
export class SimulationClassicMode extends SimulationBaseMode {
    transitionToFire;
    async update() {
        if (this.transitionToFire) {
            this.transitionToFire.fire();
            await this.graphics.fireTrans(this.transitionToFire);
        }
        this.transitionToFire = null;
        this.updateInputValues();
        for (const trans of this.net.transInOrder) {
            this.updateTrans(trans);
            this.graphics.debugTrans(trans);
            if (this.net.simConfig.guardDebug)
                this.graphics.debugGuard(trans);
            if (trans.isEnable() && !this.transitionToFire) {
                this.transitionToFire = trans;
            }
        }
        if (this.net.simConfig.arcDebug)
            Object.values(this.net.arcs).forEach(this.graphics.debugArc);
        this.updateSimTime();
        await delay(50);
    }
}
