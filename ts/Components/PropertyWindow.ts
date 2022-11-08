
type ChangeObserver = (attr: string, val: string) => void
type PEData = any// {[attrName: string]: string}

class ElementPropertyWindow {
    private idPrefix: string
    private _attrNames: string[]
    private propertyWindow: HTMLElement
    private changeObserver: ChangeObserver | null

    constructor(PEType: string, attrNames: string[]) {
        this.propertyWindow = <HTMLElement>document.getElementById('pw-' + PEType)
        this.idPrefix = "pw-" + PEType
        this._attrNames = attrNames
        this.changeObserver = null
    }

    getInputElement(attrName: string) {
        return <HTMLFormElement>document.getElementById(
            this.idPrefix + '-' + attrName
        )
    }

    change(attrName: string) {
        if (!this.changeObserver)
            throw "No changeObserver"

        this.changeObserver(
            attrName,
            this.getInputElement(attrName).value
        )
    }

    open(changeObserver: ChangeObserver, data: PEData) {
        this.changeObserver = changeObserver
        this.propertyWindow.style.display = "block";
        for(const attrName of this._attrNames) {
            let inputElement = this.getInputElement(attrName)
            inputElement.value = data[attrName]
        }
    }

    close() {
        this.propertyWindow.style.display = "none";
    }
}

const attrNamesByType = {
    place: ["name", "placeType", "initialMark"],
    trans: ["name", "delay", "guard", "priority"],
    arc: ["arcType", "weight"]
}

class PropertyWindow {
    private currentEPW: ElementPropertyWindow | null
    private elePropWindows: {[PEType: string]: ElementPropertyWindow}

    constructor() {
        this.currentEPW = null
        this.elePropWindows = {}
        for(const [PEType, attrNames] of Object.entries(attrNamesByType)) {
            const ePW = new ElementPropertyWindow(
                PEType,
                attrNames
            )
            for(const attrName of attrNames) {
                let inputElement = ePW.getInputElement(attrName)
                inputElement.addEventListener('change', evt => { 
                    ePW.change(attrName) 
                })
            }
            this.elePropWindows[PEType] = ePW
        }
    }

    open(PEType: string, changeObserver: ChangeObserver, data: PEData) {
        this.currentEPW = this.elePropWindows[PEType]
        this.currentEPW.open(changeObserver, data)
        console.log(this.currentEPW)
    }

    close() {
        console.log(this.currentEPW)
        if (this.currentEPW) {
            this.currentEPW.close()
            this.currentEPW = null
        }
    }
}

export { PropertyWindow }