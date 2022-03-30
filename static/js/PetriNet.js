import Vector from "./utils/Vector.js";
// import { v4 as uuidv4 } from 'uuid';
// import { v4 as uuidv4 } from '../node_modules/uuid/wrapper.mjs';
import { PetriPlace, PetriTrans, PetriArc } from "./PNElements.js";
// import { Change, undoRedoManager, UndoRedoManager } from "./UndoRedoHandler.js";
export var svg = document.getElementById('my-svg');
export class PetriNet {
    constructor(svgElement) {
        this.svgElement = svgElement;
        this.elements = {};
        this.inputs = [];
        this.simMode = 1;
        this.preScript = "";
        this.placeNumber = 1;
        this.transNumber = 1;
        this._grid = false;
        this.metadata = { fileName: '', filePath: '' };
    }
    // get svgELement() { return this._svgElement }
    get grid() { return this._grid; }
    set grid(val) {
        if (val) {
            document.getElementById('svg-background')
                .setAttribute('fill', 'url(#grid-pattern)');
        }
        else {
            document.getElementById('svg-background')
                .setAttribute('fill', 'white');
        }
        this._grid = val;
    }
    addGenericPE(genericPE) {
        if (genericPE.PEType === 'arc') {
            let arc = genericPE;
            let place = this.elements[arc.placeId];
            let trans = this.elements[arc.transId];
            if (place.PEType !== 'place' || trans.PEType !== 'trans') {
                throw "Invalid placeId or transId";
            }
            place.connectArc(arc.id);
            trans.connectArc(arc.id);
            arc.updatePlacePos(place.position);
            arc.updateTransPos(trans.position);
            this.svgElement.querySelector('#arcs')
                .appendChild(genericPE.svgElement);
        }
        else {
            let petriElement = genericPE;
            if (petriElement.connectedArcs.length) {
                throw "Can't add a place or trans with connected arcs";
            }
            this.svgElement.querySelector('#pe')
                .appendChild(genericPE.svgElement);
        }
        this.elements[genericPE.id] = genericPE;
    }
    removeGenericPE(PEId) {
        if (this.elements[PEId].PEType === 'arc') {
            let arc = this.elements[PEId];
            let place = this.elements[arc.placeId];
            let trans = this.elements[arc.transId];
            place.disconnectArc(arc.id);
            trans.disconnectArc(arc.id);
        }
        else {
            let petriElement = this.elements[PEId];
            if (petriElement.connectedArcs.length) {
                throw "Can't remove a place or trans with connected arcs";
            }
        }
        let element = this.elements[PEId];
        element.svgElement.remove();
        delete this.elements[PEId];
        return element;
    }
    setGenericPEAttr(PEId, attr, val) {
        const ele = this.elements[PEId];
        ele[attr] = val;
    }
}
const PLACE_GROUP_INDEX = 2, TRANS_GROUP_INDEX = 2, ARC_GROUP_INDEX = 2;
const PETRI_ELEMENT_ID_PREFIX = "PE", PLACE_DEFAULT_NAME_PREFIX = "p", TRANS_DEFAULT_NAME_PREFIX = "t";
// class CreateElementChange implements Change {
//     net: PetriNet
//     genericPE: AGenericPetriElement
//     constructor(net: PetriNet, genericPE: AGenericPetriElement) {
//         this.net = net
//         this.genericPE = genericPE
//     }
//     undo() {
//         this.net.removeGenericPE(this.genericPE.id)
//     }
//     redo() {
//         this.net.addGenericPE(this.genericPE)
//     }
// }
// class RemoveElementChange implements Change {
//     net: PetriNet
//     genericPE: AGenericPetriElement
//     constructor(net: PetriNet, genericPE: AGenericPetriElement) {
//         this.net = net
//         this.genericPE = genericPE
//     }
//     undo() {
//         this.net.addGenericPE(this.genericPE)
//     }
//     redo() {
//         this.net.removeGenericPE(this.genericPE.id)
//     }
// }
const GRID_SIZE = 10;
export class PetriNetManager {
    // private undoRedoManager: UndoRedoManager
    constructor() {
        this.net = new PetriNet(document.getElementById('my-svg'));
        this._selectedPE = null;
    }
    get selectedPE() { return this._selectedPE; }
    createSVGElement(modelId) {
        const model = document.getElementById(modelId);
        const clone = model.cloneNode(true);
        const PEId = String(Math.random());
        clone.id = PEId;
        for (let ele of clone.querySelectorAll(`[pe-parent="${modelId}"]`)) {
            ele.setAttribute('pe-parent', PEId);
        }
        return clone;
    }
    addGenericPE(genericPE) {
        this.net.addGenericPE(genericPE);
        // this.undoRedoManager.registryChange(
        //     new CreateElementChange(
        //         this.net,
        //         genericPE
        //     )
        // )
        return genericPE.id;
    }
    createPetriElement(PEType, coord) {
        const ele = this.createSVGElement(PEType + '-model');
        let petriElement;
        if (PEType == 'place') {
            petriElement = new PetriPlace(ele);
            petriElement.name = PLACE_DEFAULT_NAME_PREFIX + this.net.placeNumber++;
        }
        else {
            petriElement = new PetriTrans(ele);
            petriElement.name = TRANS_DEFAULT_NAME_PREFIX + this.net.transNumber++;
        }
        petriElement.position = coord;
        return petriElement;
    }
    getMousePosition(evt) {
        const CTM = this.net.svgElement.getScreenCTM();
        const pos = new Vector((evt.clientX - CTM.e) / CTM.a, (evt.clientY - CTM.f) / CTM.d);
        if (this.net.grid) {
            return new Vector(Math.round(pos.x / GRID_SIZE) * GRID_SIZE, Math.round(pos.y / GRID_SIZE) * GRID_SIZE);
        }
        return pos;
    }
    createPlace(coord) {
        return this.addGenericPE(this.createPetriElement('place', coord));
    }
    createTrans(coord) {
        return this.addGenericPE(this.createPetriElement('trans', coord));
    }
    createArc(placeId, transId, arcType) {
        return this.addGenericPE(new PetriArc(this.createSVGElement('arc-model'), placeId, transId, arcType));
    }
    getPE(elementId) {
        return this.net.elements[elementId];
    }
    selectPE(id) {
        this._selectedPE = this.net.elements[id];
        this._selectedPE.select();
        this.selectObserver(id);
        // propertyWindow.show(selectedPE)
    }
    deselectPE() {
        if (!this._selectedPE) {
            return;
        }
        this._selectedPE.deselect();
        this._selectedPE = null;
        this.deselectObserver();
        // propertyWindow.show(selectedPE)
    }
    movePE(id, displacement) {
        const genericPE = this.net.elements[id];
        if (genericPE.PEType === 'arc') {
            return;
        }
        const petriElement = genericPE;
        petriElement.move(displacement);
        for (const arcId of petriElement.connectedArcs) {
            if (genericPE.PEType === 'place') {
                //@ts-ignore
                this.net.elements[arcId].updatePlacePos(petriElement.position);
            }
            else {
                //@ts-ignore
                this.net.elements[arcId].updateTransPos(petriElement.position);
            }
        }
    }
    setGenericPEAttr(PEId, attr, val) {
        this.net.setGenericPEAttr(PEId, attr, val);
    }
    removeElement(elementId) {
        if (this.net.elements[elementId].PEType !== 'arc') {
            let ele = this.net.elements[elementId];
            for (let arcId of ele.connectedArcs) {
                this.removeElement(arcId);
            }
        }
        // undoRedoManager.registryChange(
        //     new RemoveElementChange(
        //         this.net,
        //         this.net.removeGenericPE(elementId)
        //     )
        // )
    }
    addIE(element) {
        document.getElementById('IEs').appendChild(element);
    }
    moveScreen(displacement) {
        const viewBox = this.net.svgElement.viewBox.baseVal;
        viewBox.x -= displacement.x;
        viewBox.y -= displacement.y;
    }
    zoom(focusPoint, scale) {
        const viewBox = this.net.svgElement.viewBox.baseVal;
        viewBox.x += (focusPoint.x - viewBox.x) * (1 - scale);
        viewBox.y += (focusPoint.y - viewBox.y) * (1 - scale);
        viewBox.width = viewBox.width * scale;
        viewBox.height = viewBox.height * scale;
    }
}
