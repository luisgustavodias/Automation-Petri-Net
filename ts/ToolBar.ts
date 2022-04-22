import Vector from "./utils/Vector.js"
import { AGenericPetriElement, PetriPlace, PetriTrans } from "./PNElements.js";
import { setLineStartPoint, setLineEndPoint, createLine } from "./utils/SVGElement/Line.js";
import Editor from "./Editor.js";
import { PropertyWindow } from "./PropertyWindow.js";
import { PEId } from "./PNData.js";

const SVG_BG_ID = 'svg-background'

class GenericTool {
    editor: Editor
    buttonId: string

    constructor(editor: Editor, buttonId: string) {
        this.editor = editor
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

    constructor(createMethod: Function, editor: Editor, buttonId: string) {
        super(editor, buttonId);
        this.createMethod = createMethod;
    }

    onMouseDown(evt: MouseEvent) {
        const ele = <SVGAElement>evt.target
        if (ele.id === SVG_BG_ID) {
            const coord = this.editor.currentNet.getMousePosition(evt)
            this.createMethod(coord);
        }
    }
}

class ArcTool extends GenericTool {
    line: SVGLineElement
    firstPE: AGenericPetriElement
    mouseDownPos: Vector

    constructor(editor: Editor) {
        super(editor, "arc-tool");
        this.line = createLine(new Vector(20, 20), new Vector(20, 80))
        // this.currentNet.addIE(<SVGAElement><unknown>this.line)
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

        const genericPE = this.editor.currentNet.getGenericPE(
            target.getAttribute('PEParent')
        )

        if (genericPE.PEType === 'place' 
                || genericPE.PEType === 'trans') {
            this.firstPE = genericPE
            this.mouseDownPos = this.editor.currentNet.getMousePosition(evt)
            setLineStartPoint(this.line, this.mouseDownPos)
            setLineEndPoint(this.line, this.mouseDownPos)
            this.editor.currentNet.addIE(<SVGAElement><unknown>this.line)
        }
    }

    onMouseMove(evt: MouseEvent) {
        if (!this.mouseDownPos) { return }

        const u = this.editor.currentNet.getMousePosition(evt)
            .sub(this.mouseDownPos).norm()
        setLineEndPoint(
            this.line, 
            this.editor.currentNet.getMousePosition(evt).sub(u.mul(0.02))
        )
    }

    onMouseUp(evt: Event): void {
        const target = <SVGAElement>evt.target
        console.log(target)

        if (target.id === SVG_BG_ID) {
            this.restart()
            return
        }

        const genericPE = this.editor.currentNet.getGenericPE(
            target.getAttribute('PEParent')
        )

        if (this.firstPE.PEType === 'place' 
                && genericPE.PEType === 'trans') {
            this.editor.currentNet.createArc(
                this.firstPE.id, 
                genericPE.id, 
                'Input'
            )
        } else if (this.firstPE.PEType === 'trans' 
                && genericPE.PEType === 'place') {
            this.editor.currentNet.createArc(
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
    selectedPEId: PEId
    dragging: boolean
    dragStartPos: Vector
    cornerIdx: number
    
    propertyWindow: PropertyWindow
    // dragManager: DragManager

    constructor(editor: Editor, propertyWindor: PropertyWindow) {
        super(editor, "mouse-tool")
        this.selectedPEId = null
        this.dragging = false
        this.cornerIdx = null
        this.dragStartPos = null

        this.propertyWindow = propertyWindor
        // this.dragManager = dragManager
    }

    selectPE(id: PEId) {
        if (this.selectedPEId) {
            throw 'Need to deselect one element to select other'
        }
        this.editor.currentNet.selectPE(id)
        this.selectedPEId = id
        this.propertyWindow.open(
            this.editor.currentNet.getGenericPEType(id),
            (attrName, val) => { 
                this.editor.currentNet.setGenericPEAttr(id, attrName, val)
            },
            this.editor.currentNet.getGenericPEData(id)
        )
    }

    deselectPE() {
        if (!this.selectedPEId) return
        
        this.editor.currentNet.deselectPE(this.selectedPEId)
        this.propertyWindow.close()
        this.selectedPEId = null
        this.dragging = false
        this.cornerIdx = null
    }

    drag(evt: MouseEvent, registryChange: boolean = false) {
        const mousePos = this.editor.currentNet.getMousePosition(evt)

        if (this.cornerIdx !== null) {
            return this.editor.currentNet.moveArcCorner(
                this.selectedPEId,
                this.cornerIdx,
                mousePos,
                registryChange,
                this.dragStartPos
            )
        } else {
            return this.editor.currentNet.movePE(
                this.selectedPEId, 
                mousePos,
                registryChange,
                this.dragStartPos
            )
        }
    } 

    endDrag(evt) {
        if (this.dragging) {
            this.drag(evt, true)
        }
        this.dragging = false
        this.cornerIdx = null
    }

    onMouseDown(evt) {
        if (evt.target.id === SVG_BG_ID) {
            this.deselectPE()
            return
        }

        const PEId = evt.target.getAttribute('PEParent')

        if (!this.selectedPEId) {
            this.selectPE(PEId)
        } else if (this.selectedPEId !== PEId) {
            this.deselectPE()
            this.selectPE(PEId)
        }

        const elementType = this.editor.currentNet.getGenericPEType(
            this.selectedPEId
        )
        if (elementType === 'arc') {
            if (evt.target.getAttribute('drag') === 'corner') {
                this.dragging = true
                this.cornerIdx = parseInt(evt.target.getAttribute('cornerIdx'))
            } else if (evt.target.getAttribute('drag') === 'arcMidNode') {
                this.dragging = true
                this.cornerIdx = parseInt(evt.target.getAttribute('cornerIdx'))
                this.editor.currentNet.addArcCorner(
                    this.selectedPEId,
                    this.cornerIdx
                )
            } else {
                this.dragging = false
                this.cornerIdx = null
            }
        } else {
            this.dragging = true
        }

        if (this.dragging) {
            console.log(this.cornerIdx, this.selectedPEId)
            this.dragStartPos = this.drag(evt)
        }
        console.log(this.dragStartPos)
    }

    onMouseMove(evt) {
        if (this.dragging) {
            this.drag(evt)
        }
    }

    onMouseUp(evt) {
        this.endDrag(evt)
    }

    onMouseLeave(evt) {
        this.endDrag(evt)
    }

    onKeyDown(evt: KeyboardEvent) {
        if (evt.key === "Delete" && this.selectedPEId) {
            const id = this.selectedPEId
            this.deselectPE()
            this.editor.currentNet.removeGenericPE(id)
        }
    }

    onChangeTool() {
        this.deselectPE()
        super.onChangeTool();
    }
}

export default class ToolBar {
    private _active: boolean
    tools: { [name: string]: GenericTool }
    currentTool: GenericTool
    movingScreenOffset: Vector
    editor: Editor
    propertyWindow: PropertyWindow

    constructor(editor: Editor, propertyWindow: PropertyWindow) {
        this._active = true
        this.editor = editor
        this.propertyWindow = propertyWindow
        this.tools = {
            'mouse-tool': new MouseTool(editor, propertyWindow),
            'place-tool': new PetriElementTool(
                coord => { editor.currentNet.createPlace(coord) }, 
                editor, 
                'place-tool'
            ),
            'trans-tool': new PetriElementTool(
                coord => { editor.currentNet.createTrans(coord) }, 
                editor, 
                'trans-tool'
            ),
            'arc-tool': new ArcTool(editor)
        }
        this.currentTool = this.tools['mouse-tool']
        this.movingScreenOffset = null
        this.addListeners()
    }

    private addListeners() {
        console.log('adding listeners');
        const eventNames = [
            'mousedown', 
            'mouseup', 
            'mousemove', 
            'mouseleave', 
            'wheel'
        ]
        const ele = document.getElementById('svg-div')
        for (let name of eventNames) {
            ele.addEventListener(name, this[name])
        }
        ele.addEventListener('contextmenu', event => event.preventDefault())

        document.body.addEventListener('keydown', this.keydown)

        for (let tool in this.tools) {
            document.getElementById(tool).addEventListener(
                'mousedown',
                evt => { this.changeTool(tool) }
            )
        }
    }

    private mousedown = (evt: MouseEvent) => {
        if (evt.ctrlKey || evt.button === 2) {
            this.movingScreenOffset = this.editor.currentNet
                .getMousePosition(evt);
        } else if(this._active) {
            this.currentTool.onMouseDown(evt);
        }
    }
    
    private mouseup = evt => {
        evt.preventDefault()
        this.movingScreenOffset = null
        if(this._active) {
            this.currentTool.onMouseUp(evt);
        }
    }
    
    private mousemove = evt => {
        if (this.movingScreenOffset) {
            const mousePos = this.editor.currentNet.getMousePosition(evt);
            this.editor.currentNet.moveScreen(
                mousePos.sub(this.movingScreenOffset)
            )
        } else if(this._active) {
            this.currentTool.onMouseMove(evt);
        }
    }
    
    private mouseleave = evt => {
        this.movingScreenOffset = null
        if(this._active) {
            this.currentTool.onMouseLeave(evt);
        }
    }

    private wheel = evt => {
        evt.preventDefault();
    
        const scale = Math.min(Math.max(.9, 1 + .01*evt.deltaY), 1.1)
        const mousePos = this.editor.currentNet.getMousePosition(evt);

        this.editor.currentNet.zoom(mousePos, scale)
    }

    private keydown = evt => {
        let ele = <HTMLElement>evt.target
        if(ele.tagName === "BODY") {
            if (evt.key === 'Shift') {
                this.editor.currentNet.grid = !this.editor.currentNet.grid
            }
            else if (evt.key === 'z' && evt.ctrlKey) {
                this.editor.currentNet.undo()
            }
            else if (evt.key === 'y' && evt.ctrlKey) {
                this.editor.currentNet.redo()
            } else if(this._active) {
                this.currentTool.onKeyDown(evt)
            }
        }
    }
    
    private changeTool (tool) {
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
