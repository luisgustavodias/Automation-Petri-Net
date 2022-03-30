import Vector from "./utils/Vector.js"
import { AGenericPetriElement, PetriPlace, PetriTrans } from "./PNElements.js";
import { setLineStartPoint, setLineEndPoint } from "./utils/Line.js";
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

    onMouseDown(evt: Event) {
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
        this.line = <SVGLineElement><unknown>document
            .createElementNS('http://www.w3.org/2000/svg', 'line')
        setLineStartPoint(this.line, new Vector(20, 20))
        setLineEndPoint(this.line, new Vector(20, 80))
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

    onMouseDown(evt: Event) {
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
        }
    }

    onMouseMove(evt: Event) {
        if (!this.mouseDownPos) { return }

        const u = this.netManager.getMousePosition(evt)
            .sub(this.mouseDownPos).norm()
        setLineEndPoint(
            <SVGLineElement><unknown>this.line, 
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

    // onMouseLeave(evt) {
    //     this.dragManager.endDrag()
    // }

    // onKeyDown(evt: KeyboardEvent) {
    //     if (evt.key === "Delete" && this.PEId) {
    //         let PEId = this.PEId
    //         this.deselect()
    //         PNManager.removeElement(PEId)
    //     }
    //     else if (evt.key === 'z' && evt.ctrlKey) {
    //         undoRedoManager.undo()
    //     }
    // }

    onChangeTool() {
        this.netManager.deselectPE()
        super.onChangeTool();
    }
}

export default class ToolBar {
    tools: { [name: string]: GenericTool }
    currentTool: GenericTool
    movingScreenOffset: Vector
    netManager: PetriNetManager

    constructor(netManager: PetriNetManager) {
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
    
    restartArcTool() {
        this.tools['arc-tool'] = new ArcTool(this.netManager)
    }

    mousedown(evt) {
        if (evt.ctrlKey) {
            this.movingScreenOffset = this.netManager.getMousePosition(evt);
        } else {
            this.currentTool.onMouseDown(evt);
        }
    }
    
    mouseup(evt) {
        this.movingScreenOffset = null
        this.currentTool.onMouseUp(evt);
    }
    
    mousemove(evt: Event) {
        if (this.movingScreenOffset) {
            this.netManager.moveScreen(
                this.netManager.getMousePosition(evt)
                    .sub(this.movingScreenOffset)
            )
        } else {
            this.currentTool.onMouseMove(evt);
        }
    }
    
    mouseleave(evt) {
        this.movingScreenOffset = null
        this.currentTool.onMouseLeave(evt);
    }

    wheel(evt) {
        evt.preventDefault();
    
        const scale = Math.min(Math.max(.9, 1 + .01*evt.deltaY), 1.1)
        
        this.netManager.zoom(
            this.netManager.getMousePosition(evt), scale
        )
    }

    keydown(evt) {
        console.log('keydown')
        // let ele = <HTMLElement>evt.target
        // if(ele.tagName === "BODY") {
        //     if (evt.key === 'Shift') {
        //         PNManager.net.grid = !PNManager.net.grid
        //     }
        //     this.currentTool.onKeyDown(evt)

        // }
    }
    
    
    changeTool (tool) {
        this.currentTool.onChangeTool();
        this.currentTool = this.tools[tool];
        document.getElementById(tool).classList.add("selected-tool-bar-item");
    }

    activeGrid() {

    }
}
