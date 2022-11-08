import Vector from "../utils/Vector.js";
import { PetriPlace, PetriTrans, PetriArc } from "./PetriNetElements.js";
class UndoRedoManager {
    undoList;
    redoList;
    constructor() {
        this.undoList = [];
        this.redoList = [];
    }
    registryChange(change) {
        this.undoList.push(change);
        this.redoList = [];
    }
    undo() {
        const lastChange = this.undoList.pop();
        if (lastChange) {
            lastChange.undo();
            this.redoList.push(lastChange);
            return true;
        }
        return false;
    }
    redo() {
        const lastChange = this.redoList.pop();
        if (lastChange) {
            lastChange.redo();
            this.undoList.push(lastChange);
            return true;
        }
        return false;
    }
}
function createSVGNet() {
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.innerHTML = `<rect id="svg-background" 
        x="-5000" y="-5000" 
        width="10000" height="10000" fill="white"/>
    <g id="elements">
        <g id="arcs"></g>
        <g id="pe"></g>
    </g>
    <g id="IEs"></g>`;
    svgElement.style.height = '100%';
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgElement.setAttribute('viewBox', '0 0 1500 300');
    return svgElement;
}
class BasePetriNet {
    static GRID_SIZE = 10;
    svgElement;
    elements;
    inputs;
    simConfig;
    preScript;
    placeNumber;
    transNumber;
    undoRedoManager;
    _grid;
    constructor() {
        this.svgElement = createSVGNet();
        this.elements = {};
        this.inputs = [];
        this.simConfig = {
            simMode: "Automation",
            arcDebug: false,
            guardDebug: false
        };
        this.preScript = "";
        this.placeNumber = 1;
        this.transNumber = 1;
        this._grid = false;
        this.undoRedoManager = new UndoRedoManager();
    }
    get grid() {
        return this._grid;
    }
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
    generateId() {
        if (window.crypto.randomUUID)
        return window.crypto.randomUUID();
        else
            return String(Math.random());
    }
    getGenericPE(id) {
        return this.elements[id];
    }
    getGenericPEType(id) {
        return this.elements[id].PEType;
    }
    getGenericPEData(id) {
        return this.elements[id].getData();
    }
    fitToGrid(pos) {
        return new Vector(Math.round(pos.x / BasePetriNet.GRID_SIZE) * BasePetriNet.GRID_SIZE, Math.round(pos.y / BasePetriNet.GRID_SIZE) * BasePetriNet.GRID_SIZE);
    }
    getMousePosition(evt, ignoreGrid = true) {
        const CTM = this.svgElement.getScreenCTM();
        const pos = new Vector((evt.clientX - CTM.e) / CTM.a, (evt.clientY - CTM.f) / CTM.d);
        if (!ignoreGrid && this.grid)
            return this.fitToGrid(pos);
        return pos;
    }
    selectPE(id) {
        this.elements[id].select();
    }
    deselectPE(id) {
        this.elements[id].deselect();
    }
    addGenericPE(genericPE, registryChange = true) {
        if (genericPE.PEType === 'arc') {
            let arc = genericPE;
            let place = this.elements[arc.placeId];
            let trans = this.elements[arc.transId];
            if (place.PEType !== 'place' || trans.PEType !== 'trans') {
                throw "Invalid placeId or transId";
            }
            this.svgElement.querySelector('#arcs')
                .appendChild(genericPE.svgElement);
            place.connectArc(arc.id);
            trans.connectArc(arc.id);
            arc.updatePlacePos();
            arc.updateTransPos();
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
        if (registryChange) {
            this.undoRedoManager.registryChange({
                undo: () => this.removeGenericPE(genericPE.id, false),
                redo: () => this.addGenericPE(genericPE, false)
            });
        }
    }
    removeGenericPE(id, registryChange = true) {
        const genericPE = this.elements[id];
        if (this.elements[id].PEType === 'arc') {
            const arc = genericPE;
            const place = this.elements[arc.placeId];
            const trans = this.elements[arc.transId];
            place.disconnectArc(arc.id);
            trans.disconnectArc(arc.id);
        }
        else {
            const petriElement = this.elements[id];
            while (petriElement.connectedArcs.length) {
                this.removeGenericPE(petriElement.connectedArcs[0]);
            }
        }
        genericPE.svgElement.remove();
        delete this.elements[id];
        if (registryChange) {
            this.undoRedoManager.registryChange({
                undo: () => this.addGenericPE(genericPE, false),
                redo: () => this.removeGenericPE(genericPE.id, false)
            });
        }
        return genericPE;
    }
    addIE(element) {
        document.getElementById('IEs').appendChild(element);
    }
    getNetData() {
        const viewBox = this.svgElement.viewBox.baseVal;
        const elementsDataByPEType = Object.fromEntries(['place', 'trans', 'arc'].map(PEType => [
            PEType,
            Object.values(this.elements).filter((ele) => ele.PEType === PEType).map(ele => ele.getData())
        ]));
        return {
            name: 'Untiteled_Net',
            places: elementsDataByPEType['place'],
            transitions: elementsDataByPEType['trans'],
            arcs: elementsDataByPEType['arc'],
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
            preScript: "",
            simConfig: this.simConfig
        };
    }
    static newNet() {
        return new PetriNet();
    }
    static loadPlace(data) {
        const place = new PetriPlace(data.id);
        place.name = data.name;
        place.placeType = data.placeType;
        place.initialMark = data.initialMark;
        place.position = new Vector(data.position.x, data.position.y);
        for (const [attrName, pos] of Object.entries(data.textsPosition)) {
            place.setPETextPosition(attrName, pos);
        }
        return place;
    }
    static loadTrans(data) {
        const trans = new PetriTrans(data.id);
        trans.name = data.name;
        trans.delay = String(data.delay);
        trans.guard = data.guard;
        trans.position = new Vector(data.position.x, data.position.y);
        for (const [attrName, pos] of Object.entries(data.textsPosition)) {
            trans.setPETextPosition(attrName, pos);
        }
        return trans;
    }
    static loadArc(data, net) {
        const arc = new PetriArc(data.id, net.getGenericPE(data.placeId), net.getGenericPE(data.transId), data.arcType);
        arc.weight = data.weight;
        if (data.corners) {
            for (const corner of data.corners.reverse()) {
                arc.addCorner(0);
                arc.moveCorner(0, new Vector(corner.x, corner.y));
            }
        }
        for (const [attrName, pos] of Object.entries(data.textsPosition)) {
            arc.setPETextPosition(attrName, pos);
        }
        return arc;
    }
    static loadNet(data) {
        const net = new PetriNet();
        data.places.forEach(placeData => {
            net.addGenericPE(this.loadPlace(placeData), false);
        });
        data.transitions.forEach(transData => {
            net.addGenericPE(this.loadTrans(transData), false);
        });
        data.arcs.forEach(arcData => {
            net.addGenericPE(this.loadArc(arcData, net), false);
        });
        net.inputs = data.inputs;
        if (data.simConfig)
            net.simConfig = data.simConfig;
        const viewBox = net.svgElement.viewBox.baseVal;
        Object.assign(viewBox, data.viewBox);
        console.log(net);
        return net;
    }
}
class PetriNetElementsCreation extends BasePetriNet {
    createPlace(coord) {
        const place = new PetriPlace(this.generateId());
        place.name = 'p' + this.placeNumber++;
        place.position = coord;
        this.addGenericPE(place);
        return place.id;
    }
    createTrans(coord) {
        const trans = new PetriTrans(this.generateId());
        trans.name = 't' + this.transNumber++;
        trans.position = coord;
        this.addGenericPE(trans);
        return trans.id;
    }
    createArc(placeId, transId, arcType) {
        const arc = new PetriArc(this.generateId(), this.getGenericPE(placeId), this.getGenericPE(transId), arcType);
        this.addGenericPE(arc);
        return arc.id;
    }
    addArcCorner(arcId, cornerIndex, registryChange = true) {
        const arc = this.elements[arcId];
        arc.addCorner(cornerIndex);
        if (registryChange) {
            this.undoRedoManager.registryChange({
                undo: () => arc.removeCorner(cornerIndex),
                redo: () => this.addArcCorner(arcId, cornerIndex, false),
            });
        }
    }
}
class PetriNetElementsMovement extends PetriNetElementsCreation {
    moveGeneric(dragHandler, pos, registryChange = true) {
        dragHandler.drag(pos);
        if (registryChange)
            dragHandler.endDrag();
    }
    movePE(id, pos, registryChange = true) {
        this.moveGeneric(this.getPetriElementDragHandler(id), pos, registryChange);
    }
    moveArcCorner(arcId, cornerIndex, pos, registryChange = true) {
        this.moveGeneric(this.getArcCornerDragHandler(arcId, cornerIndex), pos, registryChange);
    }
    movePEText(id, attrName, pos, registryChange = true) {
        this.moveGeneric(this.getPETextDragHandler(id, attrName), pos, registryChange);
    }
    createDragHandler(getPos, setPos, ignoreGrid) {
        const initialPos = getPos();
        const drag = (displacement) => {
            const pos = initialPos.add(displacement);
            if (!ignoreGrid && this.grid)
                setPos(this.fitToGrid(pos));
            else
                setPos(pos);
        };
        const endDrag = () => {
            const finalPos = getPos();
            this.undoRedoManager.registryChange({
                undo: () => setPos(initialPos),
                redo: () => setPos(finalPos),
            });
        };
        return {
            drag: drag,
            endDrag: endDrag
        };
    }
    getPetriElementDragHandler(id) {
        const petriElement = this.getGenericPE(id);
        const getPos = () => petriElement.position;
        const setPos = (pos) => {
            petriElement.position = pos;
            for (const arcId of petriElement.connectedArcs) {
                const arc = this.getGenericPE(arcId);
                if (petriElement.PEType === 'place')
                    arc.updatePlacePos();
                else
                    arc.updateTransPos();
            }
        };
        return this.createDragHandler(getPos, setPos, false);
    }
    getArcCornerDragHandler(id, cornerIdx) {
        const arc = this.getGenericPE(id);
        const getPos = () => arc.getCornerPos(cornerIdx);
        const setPos = (pos) => { arc.moveCorner(cornerIdx, pos); };
        return this.createDragHandler(getPos, setPos, false);
    }
    getPETextDragHandler(id, textName) {
        const petriElement = this.getGenericPE(id);
        const getPos = () => petriElement.getPETextPosition(textName);
        const setPos = (pos) => { petriElement.setPETextPosition(textName, pos); };
        return this.createDragHandler(getPos, setPos, true);
    }
    getMultiplePEsDragHandler(ids) {
        const dragHandlers = ids.map(id => this.getPetriElementDragHandler(id));
        let lastDisplacement = new Vector(0, 0);
        const drag = (displacement) => {
            for (const dragHandler of dragHandlers)
                dragHandler.drag(displacement);
            lastDisplacement = displacement;
        };
        const endDrag = () => {
            this.undoRedoManager.registryChange({
                undo: () => drag(new Vector(0, 0)),
                redo: () => drag(lastDisplacement),
            });
        };
        return {
            drag: drag,
            endDrag: endDrag
        };
    }
}
export class PetriNet extends PetriNetElementsMovement {
    setGenericPEAttr(id, attrName, val, registryChange = true) {
        const ele = this.elements[id];
        const previousValue = ele[attrName];
        ele[attrName] = val;
        if (registryChange) {
            this.undoRedoManager.registryChange({
                undo: () => this.setGenericPEAttr(id, attrName, previousValue, false),
                redo: () => this.setGenericPEAttr(id, attrName, val, false),
            });
        }
    }
    getPEsInsiteRect(rectPos, rectSize) {
        return Object.values(this.elements).filter(ele => {
            if (!(ele.PEType === 'place' || ele.PEType === 'trans'))
                return false;
            const pos = ele.position;
            const rectBottomLeft = rectPos.add(rectSize);
            if (pos.x < rectPos.x ||
                pos.y < rectPos.y ||
                pos.x > rectBottomLeft.x ||
                pos.y > rectBottomLeft.y) {
                return false;
            }
            return true;
        }).map(ele => ele.id);
    }
    undo() {
        return this.undoRedoManager.undo();
    }
    redo() {
        return this.undoRedoManager.redo();
    }
    moveScreen(displacement) {
        const viewBox = this.svgElement.viewBox.baseVal;
        viewBox.x -= displacement.x;
        viewBox.y -= displacement.y;
    }
    zoom(focusPoint, scale) {
        const viewBox = this.svgElement.viewBox.baseVal;
        viewBox.x += (focusPoint.x - viewBox.x) * (1 - scale);
        viewBox.y += (focusPoint.y - viewBox.y) * (1 - scale);
        viewBox.width = viewBox.width * scale;
        viewBox.height = viewBox.height * scale;
    }
}
