
type ChangeObserver = (attr: string, val: string) => void
type PEData = any// {[attrName: string]: string}

class ElementPropertyWindow {
    private idPrefix: string
    private _attrNames: string[]
    private propertyWindow: HTMLElement
    private changeObserver: ChangeObserver

    constructor(PEType: string, attrNames: string[]) {
        this.propertyWindow = document.getElementById('pw-' + PEType)
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
        // this.changeObserver = null
        this.propertyWindow.style.display = "none";
    }
}

const attrNames = {
    place: ["name", "placeType", "initialMark"],
    trans: ["name", "time", "guard"],
    arc: ["arcType", "weight"]
}

class PropertyWindow {
    private currentEPW: ElementPropertyWindow
    private elePropWindows: {[PEType: string]: ElementPropertyWindow}

    constructor() {
        this.currentEPW = null
        this.elePropWindows = {}
        for(const PEType in attrNames) {
            const ePW = new ElementPropertyWindow(
                PEType,
                attrNames[PEType]
            )
            for(const attrName of attrNames[PEType]) {
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