import { PetriPlace, PetriTrans, PetriArc } from "./PNElements.js";
import { undoRedoManager } from "./UndoRedoHandler.js";
export var svg = document.getElementById('my-svg');
const models = {
    'place': document.getElementById('place-model'),
    'trans': document.getElementById('trans-model'),
    'arc': document.getElementById('arc-model')
};
export class PetriNet {
    constructor() {
        this.elements = {};
        this.inputs = [];
        this.simMode = 1;
        this.preScript = "";
        this.placeNumber = 1;
        this.transNumber = 1;
        this._nextId = 1;
        this._grid = false;
        this.metadata = { fileName: '', filePath: '' };
    }
    get grid() {
        return this._grid;
    }
    set grid(val) {
        if (val) {
            document.getElementById('svg-background').setAttribute('fill', 'url(#grid-pattern)');
        }
        else {
            document.getElementById('svg-background').setAttribute('fill', 'white');
        }
        this._grid = val;
    }
    getClone(model) {
        let ele = model.cloneNode(true);
        ele.id = PETRI_ELEMENT_ID_PREFIX + this._nextId++;
        for (let i = 0; i < ele.children.length; i++) {
            ele.children[i].setAttribute('pe-parent', ele.id);
            for (let j = 0; j < ele.children[i].children.length; j++) {
                ele.children[i].children[j].setAttribute('pe-parent', ele.id);
            }
        }
        return ele;
    }
    addGenericPetriElement(petriElement) {
        svg.children[2].appendChild(petriElement._element);
        this.elements[petriElement.id] = petriElement;
        if (petriElement.PNElementType === 'arc') {
            let arc = petriElement;
            arc.place.arcs.push(arc.id);
            arc.trans.arcs.push(arc.id);
        }
    }
    createSVGElement(model) {
        let ele = model.cloneNode(true);
        ele.id = PETRI_ELEMENT_ID_PREFIX + this._nextId++;
        for (let i = 0; i < ele.children.length; i++) {
            ele.children[i].setAttribute('pe-parent', ele.id);
            for (let j = 0; j < ele.children[i].children.length; j++) {
                ele.children[i].children[j].setAttribute('pe-parent', ele.id);
            }
        }
        return ele;
    }
    createPetriElement(model, coord, createElement) {
        let ele = this.createSVGElement(model);
        let petriElement = createElement(ele);
        this.addGenericPetriElement(petriElement);
        petriElement.setPosition(coord);
        return petriElement;
    }
    createPlace(coord) {
        let place = this.createPetriElement(models.place, coord, (ele) => { return new PetriPlace(ele); });
        place.name = PLACE_DEFAULT_NAME_PREFIX + this.placeNumber++;
    }
    createTrans(coord) {
        let trans = this.createPetriElement(models.trans, coord, (ele) => { return new PetriTrans(ele); });
        trans.name = TRANS_DEFAULT_NAME_PREFIX + this.transNumber++;
    }
    createArc(placeId, transId, type) {
        let ele = this.createSVGElement(models.arc);
        let place = this.elements[placeId];
        let trans = this.elements[transId];
        let arc = new PetriArc(ele, place, trans, type);
        this.addGenericPetriElement(arc);
    }
}
const PLACE_GROUP_INDEX = 2, TRANS_GROUP_INDEX = 2, ARC_GROUP_INDEX = 2;
const PETRI_ELEMENT_ID_PREFIX = "PE", PLACE_DEFAULT_NAME_PREFIX = "p", TRANS_DEFAULT_NAME_PREFIX = "t";
// class CreateElementChange implements Change {
//     elementId: string
//     constructor(elementId: string) {
//         this.elementId = elementId
//     }
//     undo() {
//         PNManager.removeElement(this.elementId)
//     }
//     redo() {
//         PNManager.recoveryElement(this.elementId)
//     }
// }
class RemoveElementChange {
    constructor(elementId) {
        this.elementId = elementId;
    }
    undo() {
        PNManager.recoveryElement(this.elementId);
    }
    redo() {
        PNManager.removeElement(this.elementId);
    }
}
class PetriNetManager {
    constructor() {
        this.net = new PetriNet();
        this.removedElements = {};
    }
    _removeElement(elementId) {
        if (this.net.elements[elementId].PNElementType !== 'arc') {
            let ele = this.net.elements[elementId];
            for (let arcId of ele.arcs) {
                this.removeElement(arcId);
            }
        }
        this.net.elements[elementId].remove();
        this.removedElements[elementId] = this.net.elements[elementId];
        delete this.net.elements[elementId];
    }
    removeElement(elementId) {
        this._removeElement(elementId);
        undoRedoManager.registryChange(new RemoveElementChange(elementId));
    }
    recoveryElement(elementId) {
        this.net.addGenericPetriElement(this.removedElements[elementId]);
        delete this.removedElements[elementId];
    }
    loadNet(netData) {
        console.log("Loading Data");
        svg.innerHTML = netData.svg.innerHTML;
        svg.viewBox.baseVal.x = netData.svg.viewBox.x;
        svg.viewBox.baseVal.y = netData.svg.viewBox.y;
        svg.viewBox.baseVal.width = netData.svg.viewBox.width;
        svg.viewBox.baseVal.height = netData.svg.viewBox.height;
        this.net.inputs = netData.net.inputs;
        this.net.simMode = netData.net.simMode;
        this.net.preScript = netData.net.preScript;
        this.net.placeNumber = netData.net.placeNumber;
        this.net.transNumber = netData.net.transNumber;
        this.net._nextId = netData.net._nextId;
        this.net.metadata = netData.net.metadata;
        this.net.elements = {};
        for (let elementId in netData.net.elements) {
            let savedElement = netData.net.elements[elementId];
            console.log(savedElement);
            if (savedElement.PNElementType === "place") {
                let place = new PetriPlace(document.getElementById(elementId));
                place.name = savedElement.name;
                place.arcs = savedElement.arcs;
                place.initialMark = savedElement.initialMark;
                this.net.elements[elementId] = place;
                console.log(place);
            }
            else if (savedElement.PNElementType === "trans") {
                let trans = new PetriTrans(document.getElementById(elementId));
                trans.name = savedElement.name;
                trans.arcs = savedElement.arcs;
                this.net.elements[elementId] = trans;
            }
            else if (savedElement.PNElementType === "arc") {
                let arc = new PetriArc(document.getElementById(elementId), this.net.elements[savedElement.placeId], this.net.elements[savedElement.transId], savedElement.type);
                arc.weight = savedElement.weight;
                this.net.elements[elementId] = arc;
            }
        }
        console.log(this.net.elements);
    }
}
export var PNManager = new PetriNetManager();
