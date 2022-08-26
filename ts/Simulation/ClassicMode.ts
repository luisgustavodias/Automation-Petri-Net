import { LogicalTrans } from "../LogigalNet";
import { SimulationBaseMode } from "./BaseMode.js";
import { delay } from "./SimulationGraphics.js";

export class SimulationClassicMode extends SimulationBaseMode {
    private transitionToFire: LogicalTrans | null;

    async update() {
        this.updateInputValues()

        if (this.transitionToFire) {
            this.transitionToFire.fire()
            await this.graphics.fireTrans(this.transitionToFire)
        }
        
        this.transitionToFire = null

        for (const trans of this.net.transInOrder) {
            this.updateTrans(trans)
            this.graphics.debugTrans(trans)
            if (trans.isEnable() && !this.transitionToFire) {
                this.transitionToFire = trans
            }
        }

        this.updateSimTime()
        await delay(50)
    }
}