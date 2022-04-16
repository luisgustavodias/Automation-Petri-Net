import Vector from "./utils/Vector.js";
// import { v4 as uuidv4 } from 'uuid';
// import { v4 as uuidv4 } from '../node_modules/uuid/wrapper.mjs';
import { PetriPlace, PetriTrans, PetriArc } from "./PNElements.js";
import { UndoRedoManager } from "./UndoRedoManager.js";
export class PetriNet {
    svgElement;
    elements;
    inputs;
    simMode;
    preScript;
    placeNumber;
    transNumber;
    _grid;
    metadata;
    constructor() {
        this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgElement.innerHTML = `<rect id="svg-background" 
            x="-5000" y="-5000" 
            width="10000" height="10000" fill="white"/>
        <g id="elements">
            <g id="arcs"></g>
            <g id="pe"></g>
        </g>
        <g id="IEs"></g>`;
        this.svgElement.style.height = '100%';
        this.svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        this.svgElement.setAttribute('viewBox', '0 0 1500 300');
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
    filterElementsByType(PEType) {
        return Object.values(this.elements).filter((ele) => ele.PEType === PEType);
    }
    getGenericPE(id) {
        return this.elements[id];
    }
    getPlaces() {
        return this.filterElementsByType('place');
    }
    getTransitions() {
        return this.filterElementsByType('trans');
    }
    getArcs() {
        return this.filterElementsByType('arc');
    }
    getData() {
        const viewBox = this.svgElement.viewBox.baseVal;
        return {
            name: 'no name',
            places: this.getPlaces().map(place => place.getData()),
            transitions: this.getTransitions().map(trans => trans.getData()),
            arcs: this.getArcs().map(arc => arc.getData()),
            inputs: this.inputs,
            grid: this.grid,
            nextPlaceNumber: this.placeNumber,
            nextTransNumber: this.transNumber,
            viewBox: {
                x: viewBox.x,
                y: viewBox.y,
                width: viewBox.width,
                heigth: viewBox.height
            },
            preScript: ""
        };
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
            arc.updatePlacePos();
            arc.updateTransPos();
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
    removeGenericPE(id) {
        if (this.elements[id].PEType === 'arc') {
            let arc = this.elements[id];
            let place = this.elements[arc.placeId];
            let trans = this.elements[arc.transId];
            place.disconnectArc(arc.id);
            trans.disconnectArc(arc.id);
        }
        else {
            let petriElement = this.elements[id];
            if (petriElement.connectedArcs.length) {
                throw "Can't remove a place or trans with connected arcs";
            }
        }
        let element = this.elements[id];
        element.svgElement.remove();
        delete this.elements[id];
        return element;
    }
    getGenericPEAttr(id, attrName) {
        return this.elements[id][attrName];
    }
    setGenericPEAttr(id, attrName, val) {
        const ele = this.elements[id];
        ele[attrName] = val;
    }
    static loadPlace(data) {
        const place = new PetriPlace(data.id);
        place.name = data.name;
        place.placeType = data.placeType;
        place.initialMark = data.initialMark;
        place.position = new Vector(data.position.x, data.position.y);
        return place;
    }
    static loadTrans(data) {
        const trans = new PetriTrans(data.id);
        trans.name = data.name;
        trans.delay = String(data.delay);
        trans.guard = data.guard;
        trans.position = new Vector(data.position.x, data.position.y);
        return trans;
    }
    static loadArc(data, net) {
        const arc = new PetriArc(data.id, net.getGenericPE(data.placeId), net.getGenericPE(data.transId), data.arcType);
        arc.weight = data.weight;
        return arc;
    }
    static newNet() {
        return new PetriNet();
    }
    static loadNet(data) {
        const net = new PetriNet();
        data.places.forEach(placeData => { net.addGenericPE(this.loadPlace(placeData)); });
        data.transitions.forEach(transData => { net.addGenericPE(this.loadTrans(transData)); });
        data.arcs.forEach(arcData => { net.addGenericPE(this.loadArc(arcData, net)); });
        const viewBox = net.svgElement.viewBox.baseVal;
        Object.assign(viewBox, data.viewBox);
        return net;
    }
}
const PLACE_DEFAULT_NAME_PREFIX = "p", TRANS_DEFAULT_NAME_PREFIX = "t";
class CreateElementChange {
    net;
    genericPE;
    constructor(net, genericPE) {
        this.net = net;
        this.genericPE = genericPE;
    }
    undo() {
        this.net.removeGenericPE(this.genericPE.id);
    }
    redo() {
        this.net.addGenericPE(this.genericPE);
    }
}
class RemoveElementChange {
    net;
    genericPE;
    constructor(net, genericPE) {
        this.net = net;
        this.genericPE = genericPE;
    }
    undo() {
        this.net.addGenericPE(this.genericPE);
    }
    redo() {
        this.net.removeGenericPE(this.genericPE.id);
    }
}
class SetGenericPEAttrChange {
    net;
    PEId;
    attrName;
    previousValue;
    newValue;
    constructor(net, PEId, attrName, previousValue, newValue) {
        this.net = net;
        this.PEId = PEId;
        this.attrName = attrName;
        this.previousValue = previousValue;
        this.newValue = newValue;
    }
    undo() {
        this.net.setGenericPEAttr(this.PEId, this.attrName, this.previousValue);
    }
    redo() {
        this.net.setGenericPEAttr(this.PEId, this.attrName, this.previousValue);
    }
}
const GRID_SIZE = 10;
export class PetriNetManager {
    // serve como uma iterface para a classe PetriNet
    // tratando as funcionalidades de desfazer e refazer
    net;
    _selectedPE;
    selectObserver;
    deselectObserver;
    undoRedoManager;
    constructor(net) {
        this.net = net;
        document.getElementById('svg-div').appendChild(net.svgElement);
        this._selectedPE = null;
        this.undoRedoManager = new UndoRedoManager();
    }
    open(net) {
        this.net.svgElement.remove();
        this.net = net;
        document.getElementById('svg-div').appendChild(net.svgElement);
    }
    get selectedPE() { return this._selectedPE; }
    addGenericPE(genericPE) {
        this.net.addGenericPE(genericPE);
        this.undoRedoManager.registryChange(new CreateElementChange(this.net, genericPE));
        return genericPE.id;
    }
    getMousePosition(evt, ignoreGrid = false) {
        const CTM = this.net.svgElement.getScreenCTM();
        const pos = new Vector((evt.clientX - CTM.e) / CTM.a, (evt.clientY - CTM.f) / CTM.d);
        if (!ignoreGrid && this.net.grid) {
            return new Vector(Math.round(pos.x / GRID_SIZE) * GRID_SIZE, Math.round(pos.y / GRID_SIZE) * GRID_SIZE);
        }
        return pos;
    }
    generateId() {
        return String(Math.random());
    }
    createPlace(coord) {
        const place = new PetriPlace(this.generateId());
        place.name = PLACE_DEFAULT_NAME_PREFIX + this.net.placeNumber++;
        place.position = coord;
        return this.addGenericPE(place);
    }
    createTrans(coord) {
        const trans = new PetriTrans(this.generateId());
        trans.name = TRANS_DEFAULT_NAME_PREFIX + this.net.transNumber++;
        trans.position = coord;
        return this.addGenericPE(trans);
    }
    createArc(placeId, transId, arcType) {
        return this.addGenericPE(new PetriArc(this.generateId(), this.getPE(placeId), this.getPE(transId), arcType));
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
    addArcCorner(arcId, idx) {
        const arc = this.net.elements[arcId];
        arc.addCorner(idx);
        if (!this._selectedPE)
            return;
        if (arcId !== this._selectedPE.id)
            return;
        arc.cleanNodes();
        arc.showNodes();
    }
    moveArcCorner(arcId, idx, displacement) {
        const arc = this.net.elements[arcId];
        arc.moveCorner(idx, displacement);
        if (!this._selectedPE)
            return;
        if (arcId !== this._selectedPE.id)
            return;
        arc.cleanNodes();
        arc.showNodes();
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
                this.net.elements[arcId].updatePlacePos();
            }
            else {
                //@ts-ignore
                this.net.elements[arcId].updateTransPos();
            }
        }
    }
    setGenericPEAttr(PEId, attrName, val) {
        const previousValue = this.net.getGenericPEAttr(PEId, attrName);
        this.net.setGenericPEAttr(PEId, attrName, val);
        this.undoRedoManager.registryChange(new SetGenericPEAttrChange(this.net, PEId, attrName, previousValue, val));
    }
    removeElement(elementId) {
        if (this.net.elements[elementId].PEType !== 'arc') {
            let ele = this.net.elements[elementId];
            while (ele.connectedArcs.length) {
                this.removeElement(ele.connectedArcs[0]);
            }
        }
        this.undoRedoManager.registryChange(new RemoveElementChange(this.net, this.net.removeGenericPE(elementId)));
    }
    undo() {
        return this.undoRedoManager.undo();
    }
    redo() {
        return this.undoRedoManager.redo();
    }
    toggleGrid() { this.net.grid = !this.net.grid; }
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
