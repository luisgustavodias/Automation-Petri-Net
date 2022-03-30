import Vector from "./utils/Vector.js";
import { propertyWindow } from "./PropertyWindow.js";
import { AbstractPetriArc } from "./PNElements.js";
import { DragManager } from "./dragHandler.js";
import { undoRedoManager } from "./UndoRedoHandler.js";
import { getMousePosition, gridFit, svg } from "./utils/utils.js";
import { PNManager } from "./PetriNet.js";
const SVG_BG_ID = 'svg-background';
class PetriArcAux extends AbstractPetriArc {
    constructor() {
        super(document.getElementById('arc-aux'), null, null, '');
    }
    updatePos(mousePos) {
        if (!this.place && !this.trans) {
            return;
        }
        let placePos, transPos, u, placePoint, transPoint, w1;
        mousePos = new Vector(mousePos.x, mousePos.y);
        if (this.place) {
            placePos = this.placePos;
            u = (placePos.sub(mousePos)).norm();
            transPoint = mousePos.sub(u.mul(-this.headWidth));
            placePoint = this.getPlaceConnectionPoint(u);
            w1 = mousePos.sub(u.mul(-0.5));
        }
        else {
            transPos = this.transPos;
            u = (transPos.sub(mousePos)).norm();
            transPoint = this.getTransConnectionPoint(u);
            placePoint = mousePos.sub(u.mul(-this.headWidth));
            w1 = mousePos.sub(u.mul(-0.5));
        }
        this.updateLine(placePoint, transPoint);
        this.drawHead(u, w1);
    }
}
class GenericTool {
    constructor(buttonId) {
        this.buttonId = buttonId;
    }
    onMouseDown(evt) { }
    onMouseMove(evt) { }
    onMouseUp(evt) { }
    onMouseLeave(evt) { }
    onKeyDown(evt) { }
    onChangeTool() {
        document.getElementById(this.buttonId).classList.remove("selected-tool-bar-item");
    }
}
class PetriElementTool extends GenericTool {
    constructor(createMethod, buttonId) {
        super(buttonId);
        this.createMethod = createMethod;
    }
    onMouseDown(evt) {
        let ele = evt.target;
        if (ele.id === SVG_BG_ID) {
            let coord = getMousePosition(evt);
            if (PNManager.net.grid) {
                coord = gridFit(coord);
            }
            this.createMethod(coord);
        }
    }
}
class ArcTool extends GenericTool {
    constructor() {
        super("arc-tool");
        this.arc = new PetriArcAux();
    }
    onMouseDown(evt) {
        let target = evt.target;
        if (target.id === SVG_BG_ID) {
            return;
        }
        let ele = target.parentElement;
        if (this.arc.place) {
            if (ele.classList.contains('trans')) {
                PNManager.net.createArc(this.arc.place.id, ele.id, 'input');
                this.arc.place = null;
                this.arc._element.setAttribute('visibility', 'hidden');
            }
        }
        else if (this.arc.trans) {
            if (ele.classList.contains('place')) {
                PNManager.net.createArc(ele.id, this.arc.trans.id, 'output');
                this.arc.trans = null;
                this.arc._element.setAttribute('visibility', 'hidden');
            }
        }
        else {
            if (ele.classList.contains('place')) {
                this.arc.place = PNManager.net.elements[ele.id];
                this.arc.updatePos(getMousePosition(evt));
                this.arc._element.setAttribute('visibility', 'visible');
            }
            else if (ele.classList.contains('trans')) {
                this.arc.trans = PNManager.net.elements[ele.id];
                this.arc.updatePos(getMousePosition(evt));
                this.arc._element.setAttribute('visibility', 'visible');
            }
        }
    }
    onMouseMove(evt) {
        this.arc.updatePos(getMousePosition(evt));
    }
    onChangeTool() {
        this.arc.place = null;
        this.arc.trans = null;
        this.arc._element.setAttribute('visibility', 'hidden');
        super.onChangeTool();
    }
}
class MouseTool extends GenericTool {
    constructor(dragManager) {
        super("mouse-tool");
        this.PEId = null;
        this.dragManager = dragManager;
    }
    select(id) {
        this.PEId = id;
        let selectedPE = PNManager.net.elements[id];
        selectedPE.select();
        propertyWindow.show(selectedPE);
    }
    deselect() {
        if (this.PEId) {
            let selectedPE = PNManager.net.elements[this.PEId];
            selectedPE.deselect();
            propertyWindow.close();
            this.PEId = null;
        }
    }
    onMouseDown(evt) {
        if (evt.target.id === SVG_BG_ID) {
            this.deselect();
            return;
        }
        let PEId = evt.target.getAttribute('pe-parent');
        if (!this.PEId) {
            this.select(PEId);
        }
        else if (this.PEId !== PEId) {
            this.deselect();
            this.select(PEId);
        }
        this.dragManager.startDrag(evt);
    }
    onMouseMove(evt) {
        this.dragManager.drag(evt);
    }
    onMouseUp(evt) {
        this.dragManager.endDrag();
    }
    onMouseLeave(evt) {
        this.dragManager.endDrag();
    }
    onKeyDown(evt) {
        if (evt.key === "Delete" && this.PEId) {
            let PEId = this.PEId;
            this.deselect();
            PNManager.removeElement(PEId);
        }
        else if (evt.key === 'z' && evt.ctrlKey) {
            undoRedoManager.undo();
        }
    }
    onChangeTool() {
        this.deselect();
        super.onChangeTool();
    }
}
export default class ToolBar {
    constructor() {
        this.tools = {
            'mouse-tool': new MouseTool(new DragManager(undoRedoManager)),
            'place-tool': new PetriElementTool((coord) => { PNManager.net.createPlace(coord); }, "place-tool"),
            'trans-tool': new PetriElementTool((coord) => { PNManager.net.createTrans(coord); }, "trans-tool"),
            'arc-tool': new ArcTool()
        };
        this.currentTool = this.tools['mouse-tool'];
        this.movingScreenOffset = null;
    }
    restartArcTool() {
        this.tools['arc-tool'] = new ArcTool();
    }
    mousedown(evt) {
        if (evt.ctrlKey) {
            this.movingScreenOffset = getMousePosition(evt);
        }
        else {
            this.currentTool.onMouseDown(evt);
        }
    }
    mouseup(evt) {
        this.movingScreenOffset = null;
        this.currentTool.onMouseUp(evt);
    }
    mousemove(evt) {
        if (this.movingScreenOffset) {
            var coord = getMousePosition(evt).sub(this.movingScreenOffset);
            svg.viewBox.baseVal.x -= coord.x;
            svg.viewBox.baseVal.y -= coord.y;
        }
        else {
            this.currentTool.onMouseMove(evt);
        }
    }
    mouseleave(evt) {
        this.movingScreenOffset = null;
        this.currentTool.onMouseLeave(evt);
    }
    wheel(evt) {
        evt.preventDefault();
        var scale = 1 + 0.01 * evt.deltaY;
        scale = Math.min(Math.max(.9, scale), 1.1);
        var coord = getMousePosition(evt);
        svg.viewBox.baseVal.x += (coord.x - svg.viewBox.baseVal.x) * (1 - scale);
        svg.viewBox.baseVal.y += (coord.y - svg.viewBox.baseVal.y) * (1 - scale);
        svg.viewBox.baseVal.width = svg.viewBox.baseVal.width * scale;
        svg.viewBox.baseVal.height = svg.viewBox.baseVal.height * scale;
    }
    keydown(evt) {
        let ele = evt.target;
        if (ele.tagName === "BODY") {
            if (evt.key === 'Shift') {
                PNManager.net.grid = !PNManager.net.grid;
            }
            this.currentTool.onKeyDown(evt);
        }
    }
    changeTool(tool) {
        this.currentTool.onChangeTool();
        this.currentTool = this.tools[tool];
        document.getElementById(tool).classList.add("selected-tool-bar-item");
    }
    activeGrid() {
    }
}
