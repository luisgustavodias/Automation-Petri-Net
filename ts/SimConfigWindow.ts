import { SimConfig, SimMode } from "./PNData"

export class SimConfigWindow {
    private readonly modal: HTMLDivElement
    private readonly inputElements: {
        simMode: HTMLSelectElement
        arcDebug: HTMLInputElement
        guardDebug: HTMLInputElement
    }
    private saveObserver: (config: SimConfig) => void
    
    constructor() {
        this.modal = document.
            getElementById('sim-config-modal') as HTMLDivElement
        
        this.inputElements = {
            simMode: <HTMLSelectElement>document.getElementById('simMode'),
            arcDebug: <HTMLInputElement>document.getElementById('arcDebug'),
            guardDebug: <HTMLInputElement>document.getElementById('guardDebug')
        }

        this.modal.querySelector<HTMLSpanElement>('.modal-close')
            .onclick = () => { this.close() }
        this.modal.querySelector<HTMLSpanElement>('#sim-config-cancel')
            .onclick = () => { this.close() }
        this.modal.querySelector<HTMLSpanElement>('#sim-config-save')
            .onclick = () => { this.saveConfig() }
    }

    open(config: SimConfig, saveObserver: (config: SimConfig) => void) {
        this.inputElements.simMode.value = config.simMode
        this.inputElements.arcDebug.checked = config.arcDebug
        this.inputElements.guardDebug.checked = config.guardDebug
        this.saveObserver = saveObserver
        this.modal.style.display = "block"
    }

    close() {
        this.modal.style.display = "none";
    }

    saveConfig() {
        this.saveObserver(this.getConfig())
        this.close()
    }

    getConfig(): SimConfig {
        const simModeEle = <HTMLSelectElement>document.getElementById('simMode')
        const arcDebugEle = <HTMLInputElement>document.getElementById('arcDebug')
        const guardDebugEle = <HTMLInputElement>document.getElementById('guardDebug')
        
        return {
            simMode: <SimMode>this.inputElements.simMode.value,
            arcDebug: this.inputElements.arcDebug.checked,
            guardDebug: this.inputElements.guardDebug.checked
        }
    }
}