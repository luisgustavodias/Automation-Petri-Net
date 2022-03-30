class propertyChanges {
    constructor(element, initialValues, currentValues) {
        this.element = element;
        this.initialValues = initialValues;
        this.currentValues = currentValues;
    }
    setProps(props) {
        for (let propertyName in props) {
            this.element[propertyName] = props[propertyName];
        }
    }
    undo() {
        this.setProps(this.initialValues);
    }
    redo() {
        this.setProps(this.currentValues);
    }
}
class ElementPropertiesWindow {
    constructor(PNElementName, propertyNames) {
        this.propertyWindow = document.getElementById('pw-' + PNElementName);
        this.propertyNames = propertyNames;
        this.element = null;
        this.idPrefix = "pw-" + PNElementName;
        this.initialValues = {};
    }
    open() {
        this.propertyWindow.style.display = "block";
    }
    close() {
        this.propertyWindow.style.display = "none";
    }
    show(element) {
        this.open();
        this.element = element;
        this.initialValues = {};
        for (let propertyName of this.propertyNames) {
            let input = document.getElementById(this.idPrefix + '-' + propertyName);
            input.value = element[propertyName];
            this.initialValues[propertyName] = element[propertyName];
        }
    }
    resumeChanges() {
        let currentValues = {};
        for (let propertyName of this.propertyNames) {
            currentValues[propertyName] = this.element[propertyName];
        }
        return new propertyChanges(this.element, this.initialValues, currentValues);
    }
    change(evt) {
        let attr = evt.target.id.split('-').pop();
        if (evt.target.value !== this.element[attr]) {
            this.element[attr] = evt.target.value;
        }
    }
}
const propertyNames = {
    place: ["name", "type", "initialMark"],
    trans: ["name", "time", "guard"],
    arc: ["type", "weight"]
};
class PropertyWindow {
    constructor() {
        this.windows = {};
        for (let key in propertyNames) {
            this.windows[key] = new ElementPropertiesWindow(key, propertyNames[key]);
        }
        this.current = null;
    }
    show(element) {
        this.current = this.windows[element.PNElementType];
        this.current.show(element);
    }
    close() {
        if (this.current) {
            this.current.close();
            this.current = null;
        }
    }
    resumeChanges() {
        if (this.current) {
            return this.current.resumeChanges();
        }
    }
}
export var propertyWindow = new PropertyWindow();
for (let windowName in propertyWindow.windows) {
    let window = propertyWindow.windows[windowName];
    for (let propertyName of window.propertyNames) {
        document.getElementById(window.idPrefix + "-" + propertyName)
            .addEventListener('blur', focusOut);
    }
}
function focusOut(evt) {
    if (propertyWindow.current) {
        propertyWindow.current.change(evt);
    }
}
