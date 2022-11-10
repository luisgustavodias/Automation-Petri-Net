import { LogicalTrans } from "../LogicalNet";
import { SimulationBaseMode } from "./BaseMode.js";
import { delay, shuffle } from "../utils/utils.js";

export class SimulationClassicMode extends SimulationBaseMode {
    private transitionToFire: LogicalTrans | null = null;

    async update() {
        if (this.transitionToFire) {
            this.transitionToFire.fire()
            await this.graphics.fireTrans(this.transitionToFire)
        }
        
        this.transitionToFire = null
        this.updateInputValues()
        const transInOrder = 
            this.net.simConfig.priorityMode === "random" ?
            shuffle(this.net.transInOrder) :
            this.net.transInOrder

        for (const trans of transInOrder) {
            this.updateTrans(trans)
            this.graphics.debugTrans(trans)
            if (this.net.simConfig.guardDebug)
                this.graphics.debugGuard(trans)
            if (trans.isEnable() && !this.transitionToFire) {
                this.transitionToFire = trans
            }
        }

        if (this.net.simConfig.arcDebug)
            Object.values(this.net.arcs).forEach(this.graphics.debugArc)

        this.updateSimTime()
        await delay(50)
    }
}