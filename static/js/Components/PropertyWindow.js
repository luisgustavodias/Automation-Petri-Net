class ElementPropertyWindow {
    idPrefix;
    _attrNames;
    propertyWindow;
    changeObserver;
    constructor(PEType, attrNames) {
        this.propertyWindow = document.getElementById('pw-' + PEType);
        this.idPrefix = "pw-" + PEType;
        this._attrNames = attrNames;
        this.changeObserver = null;
    }
    getInputElement(attrName) {
        return document.getElementById(this.idPrefix + '-' + attrName);
    }
    change(attrName) {
        if (!this.changeObserver)
            throw "No changeObserver";
        this.changeObserver(attrName, this.getInputElement(attrName).value);
    }
    open(changeObserver, data) {
        this.changeObserver = changeObserver;
        this.propertyWindow.style.display = "block";
        for (const attrName of this._attrNames) {
            let inputElement = this.getInputElement(attrName);
            inputElement.value = data[attrName];
        }
    }
    close() {
        this.propertyWindow.style.display = "none";
    }
}
const attrNamesByType = {
    place: ["name", "placeType", "initialMark"],
    trans: ["name", "delay", "guard"],
    arc: ["arcType", "weight"]
};
class PropertyWindow {
    currentEPW;
    elePropWindows;
    constructor() {
        this.currentEPW = null;
        this.elePropWindows = {};
        for (const [PEType, attrNames] of Object.entries(attrNamesByType)) {
            const ePW = new ElementPropertyWindow(PEType, attrNames);
            for (const attrName of attrNames) {
                let inputElement = ePW.getInputElement(attrName);
                inputElement.addEventListener('change', evt => {
                    ePW.change(attrName);
                });
            }
            this.elePropWindows[PEType] = ePW;
        }
    }
    open(PEType, changeObserver, data) {
        this.currentEPW = this.elePropWindows[PEType];
        this.currentEPW.open(changeObserver, data);
        console.log(this.currentEPW);
    }
    close() {
        console.log(this.currentEPW);
        if (this.currentEPW) {
            this.currentEPW.close();
            this.currentEPW = null;
        }
    }
}
export { PropertyWindow };
