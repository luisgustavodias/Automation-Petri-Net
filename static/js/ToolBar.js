import Vector from "./utils/Vector.js";
import { setLineStartPoint, setLineEndPoint, createLine } from "./utils/SVGElement/Line.js";
const SVG_BG_ID = 'svg-background';
class GenericTool {
    editor;
    buttonId;
    constructor(editor, buttonId) {
        this.editor = editor;
        this.buttonId = buttonId;
    }
    onMouseDown(evt) { }
    onMouseMove(evt) { }
    onMouseUp(evt) { }
    onMouseLeave(evt) { }
    onKeyDown(evt) { }
    onChangeTool() {
        document.getElementById(this.buttonId)
            .classList.remove("selected-tool-bar-item");
    }
}
class PetriElementTool extends GenericTool {
    createMethod;
    constructor(createMethod, editor, buttonId) {
        super(editor, buttonId);
        this.createMethod = createMethod;
    }
    onMouseDown(evt) {
        const ele = evt.target;
        if (ele.id === SVG_BG_ID) {
            const coord = this.editor.currentNet.getMousePosition(evt);
            this.createMethod(coord);
        }
    }
}
class ArcTool extends GenericTool {
    line;
    firstPE;
    mouseDownPos;
    constructor(editor) {
        super(editor, "arc-tool");
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
        const genericPE = this.editor.currentNet.getGenericPE(target.getAttribute('PEParent'));
        if (genericPE.PEType === 'place'
            || genericPE.PEType === 'trans') {
            this.firstPE = genericPE;
            this.mouseDownPos = this.editor.currentNet.getMousePosition(evt);
            setLineStartPoint(this.line, this.mouseDownPos);
            setLineEndPoint(this.line, this.mouseDownPos);
            this.editor.currentNet.addIE(this.line);
        }
    }
    onMouseMove(evt) {
        if (!this.mouseDownPos) {
            return;
        }
        const u = this.editor.currentNet.getMousePosition(evt)
            .sub(this.mouseDownPos).norm();
        setLineEndPoint(this.line, this.editor.currentNet.getMousePosition(evt).sub(u.mul(0.02)));
    }
    onMouseUp(evt) {
        const target = evt.target;
        console.log(target);
        if (target.id === SVG_BG_ID) {
            this.restart();
            return;
        }
        const genericPE = this.editor.currentNet.getGenericPE(target.getAttribute('PEParent'));
        if (this.firstPE.PEType === 'place'
            && genericPE.PEType === 'trans') {
            this.editor.currentNet.createArc(this.firstPE.id, genericPE.id, 'Input');
        }
        else if (this.firstPE.PEType === 'trans'
            && genericPE.PEType === 'place') {
            this.editor.currentNet.createArc(genericPE.id, this.firstPE.id, 'Output');
        }
        this.restart();
    }
    onMouseLeave(evt) { this.restart(); }
    onChangeTool() {
        this.restart();
        super.onChangeTool();
    }
}
class MouseTool extends GenericTool {
    selectedPEId;
    dragging;
    dragStartPos;
    cornerIdx;
    propertyWindow;
    // dragManager: DragManager
    constructor(editor, propertyWindor) {
        super(editor, "mouse-tool");
        this.selectedPEId = null;
        this.dragging = false;
        this.cornerIdx = null;
        this.dragStartPos = null;
        this.propertyWindow = propertyWindor;
        // this.dragManager = dragManager
    }
    selectPE(id) {
        if (this.selectedPEId) {
            throw 'Need to deselect one element to select other';
        }
        this.editor.currentNet.selectPE(id);
        this.selectedPEId = id;
        this.propertyWindow.open(this.editor.currentNet.getGenericPEType(id), (attrName, val) => {
            this.editor.currentNet.setGenericPEAttr(id, attrName, val);
        }, this.editor.currentNet.getGenericPEData(id));
    }
    deselectPE() {
        if (!this.selectedPEId)
            return;
        this.editor.currentNet.deselectPE(this.selectedPEId);
        this.propertyWindow.close();
        this.selectedPEId = null;
        this.dragging = false;
        this.cornerIdx = null;
    }
    drag(evt, registryChange = false) {
        const mousePos = this.editor.currentNet.getMousePosition(evt);
        if (this.cornerIdx !== null) {
            return this.editor.currentNet.moveArcCorner(this.selectedPEId, this.cornerIdx, mousePos, registryChange, this.dragStartPos);
        }
        else {
            return this.editor.currentNet.movePE(this.selectedPEId, mousePos, registryChange, this.dragStartPos);
        }
    }
    endDrag(evt) {
        if (this.dragging) {
            this.drag(evt, true);
        }
        this.dragging = false;
        this.cornerIdx = null;
    }
    onMouseDown(evt) {
        if (evt.target.id === SVG_BG_ID) {
            this.deselectPE();
            return;
        }
        const PEId = evt.target.getAttribute('PEParent');
        if (!this.selectedPEId) {
            this.selectPE(PEId);
        }
        else if (this.selectedPEId !== PEId) {
            this.deselectPE();
            this.selectPE(PEId);
        }
        const elementType = this.editor.currentNet.getGenericPEType(this.selectedPEId);
        if (elementType === 'arc') {
            if (evt.target.getAttribute('drag') === 'corner') {
                this.dragging = true;
                this.cornerIdx = parseInt(evt.target.getAttribute('cornerIdx'));
            }
            else if (evt.target.getAttribute('drag') === 'arcMidNode') {
                this.dragging = true;
                this.cornerIdx = parseInt(evt.target.getAttribute('cornerIdx'));
                this.editor.currentNet.addArcCorner(this.selectedPEId, this.cornerIdx);
            }
            else {
                this.dragging = false;
                this.cornerIdx = null;
            }
        }
        else {
            this.dragging = true;
        }
        if (this.dragging) {
            console.log(this.cornerIdx, this.selectedPEId);
            this.dragStartPos = this.drag(evt);
        }
        console.log(this.dragStartPos);
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
            this.editor.currentNet.removeGenericPE(id);
        }
    }
    onChangeTool() {
        this.deselectPE();
        super.onChangeTool();
    }
}
export default class ToolBar {
    _active;
    tools;
    currentTool;
    movingScreenOffset;
    editor;
    propertyWindow;
    constructor(editor, propertyWindow) {
        this._active = true;
        this.editor = editor;
        this.propertyWindow = propertyWindow;
        this.tools = {
            'mouse-tool': new MouseTool(editor, propertyWindow),
            'place-tool': new PetriElementTool(coord => { editor.currentNet.createPlace(coord); }, editor, 'place-tool'),
            'trans-tool': new PetriElementTool(coord => { editor.currentNet.createTrans(coord); }, editor, 'trans-tool'),
            'arc-tool': new ArcTool(editor)
        };
        this.currentTool = this.tools['mouse-tool'];
        this.movingScreenOffset = null;
        this.addListeners();
    }
    addListeners() {
        const eventNames = [
            'mousedown',
            'mouseup',
            'mousemove',
            'mouseleave',
            'wheel'
        ];
        const ele = document.getElementById('svg-div');
        for (let name of eventNames) {
            ele.addEventListener(name, this[name]);
        }
        ele.addEventListener('contextmenu', event => event.preventDefault());
        document.body.addEventListener('keydown', this.keydown);
        for (let tool in this.tools) {
            document.getElementById(tool).addEventListener('mousedown', evt => { this.changeTool(tool); });
        }
    }
    mousedown = (evt) => {
        if (evt.ctrlKey || evt.button === 2) {
            this.movingScreenOffset = this.editor.currentNet
                .getMousePosition(evt);
        }
        else if (this._active) {
            this.currentTool.onMouseDown(evt);
        }
    };
    mouseup = evt => {
        evt.preventDefault();
        this.movingScreenOffset = null;
        if (this._active) {
            this.currentTool.onMouseUp(evt);
        }
    };
    mousemove = evt => {
        if (this.movingScreenOffset) {
            const mousePos = this.editor.currentNet.getMousePosition(evt);
            this.editor.currentNet.moveScreen(mousePos.sub(this.movingScreenOffset));
        }
        else if (this._active) {
            this.currentTool.onMouseMove(evt);
        }
    };
    mouseleave = evt => {
        this.movingScreenOffset = null;
        if (this._active) {
            this.currentTool.onMouseLeave(evt);
        }
    };
    wheel = evt => {
        evt.preventDefault();
        const scale = Math.min(Math.max(.9, 1 + .01 * evt.deltaY), 1.1);
        const mousePos = this.editor.currentNet.getMousePosition(evt);
        this.editor.currentNet.zoom(mousePos, scale);
    };
    keydown = evt => {
        let ele = evt.target;
        if (ele.tagName === "BODY") {
            if (evt.key === 'Shift') {
                this.editor.currentNet.grid = !this.editor.currentNet.grid;
            }
            else if (evt.key === 'z' && evt.ctrlKey) {
                this.editor.currentNet.undo();
            }
            else if (evt.key === 'y' && evt.ctrlKey) {
                this.editor.currentNet.redo();
            }
            else if (this._active) {
                this.currentTool.onKeyDown(evt);
            }
        }
    };
    changeTool(tool) {
        this.currentTool.onChangeTool();
        this.currentTool = this.tools[tool];
        document.getElementById(tool).classList.add("selected-tool-bar-item");
    }
    enable() {
        this._active = true;
        document.getElementById(this.currentTool.buttonId)
            .classList.add("selected-tool-bar-item");
    }
    disable() {
        this._active = false;
        document.getElementById(this.currentTool.buttonId)
            .classList.remove("selected-tool-bar-item");
    }
}
