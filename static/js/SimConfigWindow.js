export class SimConfigWindow {
    modal;
    inputElements;
    saveObserver;
    constructor() {
        this.modal = document.
            getElementById('sim-config-modal');
        this.inputElements = {
            simMode: document.getElementById('simMode'),
            arcDebug: document.getElementById('arcDebug'),
            guardDebug: document.getElementById('guardDebug')
        };
        this.modal.querySelector('.modal-close')
            .onclick = () => { this.close(); };
        this.modal.querySelector('#sim-config-cancel')
            .onclick = () => { this.close(); };
        this.modal.querySelector('#sim-config-save')
            .onclick = () => { this.saveConfig(); };
    }
    open(config, saveObserver) {
        this.inputElements.simMode.value = config.simMode;
        this.inputElements.arcDebug.checked = config.arcDebug;
        this.inputElements.guardDebug.checked = config.guardDebug;
        this.saveObserver = saveObserver;
        this.modal.style.display = "block";
    }
    close() {
        this.modal.style.display = "none";
    }
    saveConfig() {
        this.saveObserver(this.getConfig());
        this.close();
    }
    getConfig() {
        const simModeEle = document.getElementById('simMode');
        const arcDebugEle = document.getElementById('arcDebug');
        const guardDebugEle = document.getElementById('guardDebug');
        return {
            simMode: this.inputElements.simMode.value,
            arcDebug: this.inputElements.arcDebug.checked,
            guardDebug: this.inputElements.guardDebug.checked
        };
    }
}
