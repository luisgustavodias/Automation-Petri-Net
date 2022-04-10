import Vector from "./utils/Vector.js"
import { AGenericPetriElement, PetriPlace, PetriTrans } from "./PNElements.js";
import { setLineStartPoint, setLineEndPoint, createLine } from "./utils/Line.js";
import { PetriNetManager } from "./PetriNet.js";

const SVG_BG_ID = 'svg-background'

class GenericTool {
    netManager: PetriNetManager
    buttonId: string

    constructor(netManager: PetriNetManager, buttonId: string) {
        this.netManager = netManager
        this.buttonId = buttonId;
    }

    onMouseDown(evt: Event) { }

    onMouseMove(evt: Event) { }

    onMouseUp(evt: Event) { }

    onMouseLeave(evt: Event) { }

    onKeyDown(evt: Event) { }

    onChangeTool() {
        document.getElementById(this.buttonId)
            .classList.remove("selected-tool-bar-item");
    }
}

class PetriElementTool extends GenericTool {
    createMethod: Function

    constructor(createMethod: Function, netManager: PetriNetManager, buttonId: string) {
        super(netManager, buttonId);
        this.createMethod = createMethod;
    }

    onMouseDown(evt: MouseEvent) {
        const ele = <SVGAElement>evt.target
        if (ele.id === SVG_BG_ID) {
            const coord = this.netManager.getMousePosition(evt)
            this.createMethod(coord);
        }
    }
}

class ArcTool extends GenericTool {
    line: SVGLineElement
    firstPE: AGenericPetriElement
    mouseDownPos: Vector

    constructor(netManager: PetriNetManager) {
        super(netManager, "arc-tool");
        this.line = createLine(new Vector(20, 20), new Vector(20, 80))
        // this.netManager.addIE(<SVGAElement><unknown>this.line)
        this.line.setAttribute('stroke', 'black')
        this.line.setAttribute('stroke-dasharray', '3 1')
        // this.line.setAttribute('stroke-width', '4')
        this.firstPE = null
        this.mouseDownPos = null
    }

    restart() {
        this.firstPE = null
        this.mouseDownPos = null
        this.line.remove()
    }

    onMouseDown(evt: MouseEvent) {
        const target = <SVGAElement>evt.target

        if (target.id === SVG_BG_ID) {
            this.restart()
            return
        }

        const genericPE = this.netManager.getPE(
            target.getAttribute('pe-parent')
        )

        if (genericPE.PEType === 'place' 
                || genericPE.PEType === 'trans') {
            this.firstPE = genericPE
            this.mouseDownPos = this.netManager.getMousePosition(evt)
            this.netManager.addIE(<SVGAElement><unknown>this.line)
            setLineStartPoint(this.line, this.mouseDownPos)
            const u = this.netManager.getMousePosition(evt)
                .sub(this.mouseDownPos).norm()
            setLineEndPoint(
                this.line, 
                this.netManager.getMousePosition(evt).sub(u.mul(0.02))
            )
        }
    }

    onMouseMove(evt: MouseEvent) {
        if (!this.mouseDownPos) { return }

        const u = this.netManager.getMousePosition(evt)
            .sub(this.mouseDownPos).norm()
        setLineEndPoint(
            this.line, 
            this.netManager.getMousePosition(evt).sub(u.mul(0.02))
        )
    }

    onMouseUp(evt: Event): void {
        const target = <SVGAElement>evt.target
        console.log(target)

        if (target.id === SVG_BG_ID) {
            this.restart()
            return
        }

        const genericPE = this.netManager.getPE(
            target.getAttribute('pe-parent')
        )

        if (this.firstPE.PEType === 'place' 
                && genericPE.PEType === 'trans') {
            this.netManager.createArc(
                this.firstPE.id, 
                genericPE.id, 
                'Input'
            )
        } else if (this.firstPE.PEType === 'trans' 
                && genericPE.PEType === 'place') {
            this.netManager.createArc(
                genericPE.id, 
                this.firstPE.id, 
                'Output'
            )
        }

        this.restart()
    }

    onMouseLeave(evt: Event) { this.restart() }

    onChangeTool() {
        this.restart()
        super.onChangeTool();
    }
}

class MouseTool extends GenericTool {
    dragging: boolean
    lastMousePos: Vector
    // dragManager: DragManager

    constructor(netManager: PetriNetManager) {
        super(netManager, "mouse-tool")
        this.dragging = false
        // this.dragManager = dragManager
    }

    onMouseDown(evt) {
        if (evt.target.id === SVG_BG_ID) {
            this.netManager.deselectPE()
            return
        }

        const PEId = evt.target.getAttribute('pe-parent')

        if (!this.netManager.selectedPE) {
            this.netManager.selectPE(PEId)
        } else if (this.netManager.selectedPE.id !== PEId) {
            this.netManager.deselectPE()
            this.netManager.selectPE(PEId)
        }
        this.dragging = true
        this.lastMousePos = this.netManager.getMousePosition(evt)
        // this.dragManager.startDrag(evt)
    }

    onMouseMove(evt) {
        if (this.dragging) {
            const mousePos = this.netManager.getMousePosition(evt)
            this.netManager.movePE(
                this.netManager.selectedPE.id,
                mousePos.sub(this.lastMousePos)
            )
            this.lastMousePos = mousePos
        }
    }

    onMouseUp(evt) {
        this.dragging = false
    }

    onMouseLeave(evt) {
        this.dragging = false
    }

    onKeyDown(evt: KeyboardEvent) {
        if (evt.key === "Delete" && this.netManager.selectedPE) {
            const PEId = this.netManager.selectedPE.id
            this.netManager.deselectPE()
            this.netManager.removeElement(PEId)
        }
    }

    onChangeTool() {
        this.netManager.deselectPE()
        super.onChangeTool();
    }
}

export default class ToolBar {
    private _active: boolean
    tools: { [name: string]: GenericTool }
    currentTool: GenericTool
    movingScreenOffset: Vector
    netManager: PetriNetManager

    constructor(netManager: PetriNetManager) {
        this._active = true
        this.netManager = netManager
        this.tools = {
            'mouse-tool': new MouseTool(netManager),
            'place-tool': new PetriElementTool((coord) => { netManager.createPlace(coord) }, netManager, "place-tool"),
            'trans-tool': new PetriElementTool((coord) => { netManager.createTrans(coord) }, netManager, "trans-tool"),
            'arc-tool': new ArcTool(netManager)
        }
        this.currentTool = this.tools['mouse-tool']
        this.movingScreenOffset = null
    }

    mousedown(evt) {
        if (evt.ctrlKey) {
            this.movingScreenOffset = this.netManager.getMousePosition(evt);
        } else if(this._active) {
            this.currentTool.onMouseDown(evt);
        }
    }
    
    mouseup(evt) {
        this.movingScreenOffset = null
        if(this._active) {
            this.currentTool.onMouseUp(evt);
        }
    }
    
    mousemove(evt: MouseEvent) {
        if (this.movingScreenOffset) {
            this.netManager.moveScreen(
                this.netManager.getMousePosition(evt)
                    .sub(this.movingScreenOffset)
            )
        } else if(this._active) {
            this.currentTool.onMouseMove(evt);
        }
    }
    
    mouseleave(evt) {
        this.movingScreenOffset = null
        if(this._active) {
            this.currentTool.onMouseLeave(evt);
        }
    }

    wheel(evt) {
        evt.preventDefault();
    
        const scale = Math.min(Math.max(.9, 1 + .01*evt.deltaY), 1.1)
        
        this.netManager.zoom(
            this.netManager.getMousePosition(evt), scale
        )
    }

    keydown(evt: KeyboardEvent) {
        let ele = <HTMLElement>evt.target
        if(ele.tagName === "BODY") {
            if (evt.key === 'Shift') {
                this.netManager.toggleGrid()
            }
            else if (evt.key === 'z' && evt.ctrlKey) {
                this.netManager.undo()
            }
            else if (evt.key === 'y' && evt.ctrlKey) {
                this.netManager.redo()
            } else if(this._active) {
                this.currentTool.onKeyDown(evt)
            }
        }
    }
    
    
    changeTool (tool) {
        this.currentTool.onChangeTool();
        this.currentTool = this.tools[tool];
        document.getElementById(tool).classList.add("selected-tool-bar-item");
    }

    enable() {
        this._active = true
        document.getElementById(this.currentTool.buttonId)
            .classList.add("selected-tool-bar-item")
    }

    disable() {
        this._active = false
        document.getElementById(this.currentTool.buttonId)
            .classList.remove("selected-tool-bar-item")
    }
}
