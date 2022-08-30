import { createLine, setLineEndPoint, setLineStartPoint } from "../utils/SVGElement/Line.js";
import Vector from "../utils/Vector.js";
const SVG_BG_ID = 'svg-background';
class GenericTool {
    constructor() { }
    onMouseDown(evt) { }
    onMouseMove(evt) { }
    onMouseUp(evt) { }
    onMouseLeave(evt) { }
    onKeyDown(evt) { }
    onChangeTool() { }
}
class PetriElementTool extends GenericTool {
    createMethod;
    constructor(createMethod) {
        super();
        this.createMethod = createMethod;
    }
    onMouseDown(evt) {
        const ele = evt.target;
        if (ele.id === SVG_BG_ID) {
            const coord = this.createMethod(evt);
        }
    }
}
class ArcTool extends GenericTool {
    net;
    line;
    firstPE;
    mouseDownPos;
    constructor(net) {
        super();
        this.net = net;
        this.line = createLine(new Vector(20, 20), new Vector(20, 80));
        // this.currentNet.addIE(<SVGAElement><unknown>this.line)
        this.line.setAttribute('stroke', 'black');
        this.line.setAttribute('stroke-dasharray', '3 1');
        // this.line.setAttribute('stroke-width', '4')
        this.firstPE = null;
        this.mouseDownPos = null;
    }
    restart() {
        this.firstPE = null;
        this.mouseDownPos = null;
        this.line.remove();
    }
    onMouseDown(evt) {
        const target = evt.target;
        if (target.id === SVG_BG_ID) {
            this.restart();
            return;
        }
        const parentId = target.getAttribute('PEParent');
        if (!parentId)
            return;
        const genericPE = this.net.getGenericPE(parentId);
        if (genericPE.PEType === 'place'
            || genericPE.PEType === 'trans') {
            this.firstPE = genericPE;
            this.mouseDownPos = this.net.getMousePosition(evt);
            setLineStartPoint(this.line, this.mouseDownPos);
            setLineEndPoint(this.line, this.mouseDownPos);
            this.net.addIE(this.line);
        }
    }
    onMouseMove(evt) {
        if (!this.mouseDownPos) {
            return;
        }
        const u = this.net.getMousePosition(evt)
            .sub(this.mouseDownPos).norm();
        setLineEndPoint(this.line, this.net.getMousePosition(evt).sub(u.mul(0.02)));
    }
    onMouseUp(evt) {
        const target = evt.target;
        console.log(target);
        if (target.id === SVG_BG_ID) {
            this.restart();
            return;
        }
        const parentId = target.getAttribute('PEParent');
        if (!parentId || !this.firstPE)
            return;
        const genericPE = this.net.getGenericPE(parentId);
        if (this.firstPE.PEType === 'place'
            && genericPE.PEType === 'trans') {
            this.net.createArc(this.firstPE.id, genericPE.id, 'Input');
        }
        else if (this.firstPE.PEType === 'trans'
            && genericPE.PEType === 'place') {
            this.net.createArc(genericPE.id, this.firstPE.id, 'Output');
        }
        this.restart();
    }
    onMouseLeave(evt) {
        this.restart();
    }
    onChangeTool() {
        this.restart();
        super.onChangeTool();
    }
}
class MouseTool extends GenericTool {
    net;
    selectedPEId;
    dragging;
    dragInitialPos;
    dragMouseInitialPos;
    cornerIdx;
    peTextName;
    propertyWindow;
    // dragManager: DragManager
    constructor(net, propertyWindow) {
        super();
        this.net = net;
        this.selectedPEId = null;
        this.dragging = false;
        this.cornerIdx = null;
        this.peTextName = null;
        this.dragInitialPos = null;
        this.dragMouseInitialPos = null;
        this.propertyWindow = propertyWindow;
    }
    selectPE(id) {
        if (this.selectedPEId) {
            throw 'Need to deselect one element to select other';
        }
        this.net.selectPE(id);
        this.selectedPEId = id;
        this.propertyWindow.open(this.net.getGenericPEType(id), (attrName, val) => {
            this.net.setGenericPEAttr(id, attrName, val);
        }, this.net.getGenericPEData(id));
    }
    deselectPE() {
        if (!this.selectedPEId)
            return;
        this.net.deselectPE(this.selectedPEId);
        this.propertyWindow.close();
        this.selectedPEId = null;
        this.dragging = false;
        this.cornerIdx = null;
    }
    drag(evt, registryChange = false) {
        const mousePos = this.net.getMousePosition(evt);
        if (!this.selectedPEId
            || !this.dragMouseInitialPos)
            throw "Dragging Error";
        if (this.cornerIdx !== null) {
            this.dragInitialPos = this.net.moveArcCorner(this.selectedPEId, this.cornerIdx, mousePos.sub(this.dragMouseInitialPos), registryChange, false, this.dragInitialPos);
        }
        else if (this.peTextName !== null) {
            this.dragInitialPos = this.net.movePEText(this.selectedPEId, this.peTextName, mousePos.sub(this.dragMouseInitialPos), registryChange, this.dragInitialPos);
        }
        else {
            this.dragInitialPos = this.net.movePE(this.selectedPEId, mousePos.sub(this.dragMouseInitialPos), registryChange, false, this.dragInitialPos);
        }
    }
    endDrag(evt) {
        if (this.dragging) {
            this.drag(evt, true);
        }
        this.dragging = false;
        this.cornerIdx = null;
        this.peTextName = null;
        this.dragInitialPos = null;
    }
    onMouseDown(evt) {
        const target = evt.target;
        if (target.id === SVG_BG_ID) {
            this.deselectPE();
            return;
        }
        const PEId = target.getAttribute('PEParent');
        if (!PEId)
            return;
        if (!this.selectedPEId) {
            this.selectPE(PEId);
        }
        else if (this.selectedPEId !== PEId) {
            this.deselectPE();
            this.selectPE(PEId);
        }
        const dragWhat = target.getAttribute('drag');
        if (!dragWhat)
            return;
        this.dragging = true;
        this.dragMouseInitialPos = this.net
            .getMousePosition(evt);
        if (dragWhat === 'corner') {
            this.cornerIdx = parseInt(target.getAttribute('cornerIdx') || "-1");
        }
        else if (dragWhat === 'arcMidNode') {
            this.cornerIdx = parseInt(target.getAttribute('cornerIdx') || "-1");
            this.net.addArcCorner(this.selectedPEId, this.cornerIdx);
        }
        else if (dragWhat === 'PEText') {
            this.peTextName = target.getAttribute('PEText');
        }
    }
    onMouseMove(evt) {
        if (this.dragging) {
            this.drag(evt);
        }
    }
    onMouseUp(evt) {
        this.endDrag(evt);
    }
    onMouseLeave(evt) {
        this.endDrag(evt);
    }
    onKeyDown(evt) {
        if (evt.key === "Delete" && this.selectedPEId) {
            const id = this.selectedPEId;
            this.deselectPE();
            this.net.removeGenericPE(id);
        }
    }
    onChangeTool() {
        this.deselectPE();
        super.onChangeTool();
    }
}
function createTools(net, propertyWindow) {
    return {
        'mouse-tool': new MouseTool(net, propertyWindow),
        'place-tool': new PetriElementTool(evt => { net.createPlace(net.getMousePosition(evt, false)); }),
        'trans-tool': new PetriElementTool(evt => { net.createTrans(net.getMousePosition(evt, false)); }),
        'arc-tool': new ArcTool(net)
    };
}
class Editor {
    divElement;
    tools;
    _currentToolName;
    _currentTool;
    net;
    constructor(net, propertyWindow) {
        this.divElement = document
            .getElementById('svg-div');
        this.net = net;
        this.divElement.style.display = 'block';
        this.divElement.appendChild(net.svgElement);
        this.tools = createTools(net, propertyWindow);
        this._currentToolName = "mouse-tool";
        this._currentTool = this.tools[this._currentToolName];
    }
    get currentToolName() {
        return this._currentToolName;
    }
    get currentTool() {
        return this._currentTool;
    }
    selectTool(toolName) {
        if (toolName in this.tools) {
            this.currentTool.onChangeTool();
            this._currentToolName = toolName;
            this._currentTool = this.tools[toolName];
        }
        else {
            throw "Invalid toolName";
        }
    }
    close() {
        this.net.svgElement.remove();
        this.divElement.style.display = 'none';
    }
}
export default Editor;
