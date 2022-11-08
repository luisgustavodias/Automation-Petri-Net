import { IDragHandler, PetriNet } from "../PetriNetGraphics/PetriNet.js";
import { AGenericPetriElement } from "../PetriNetGraphics/PetriNetElements.js";
import { PEId } from "../PNData.js";
import { PropertyWindow } from "./PropertyWindow.js";
import { createLine, setLineEndPoint, setLineStartPoint } from "../utils/SVGElement/Line.js";
import Vector from "../utils/Vector.js";
import { createRect, getRectPos, getRectSizeAsVector, setRectPos, setRectSize } from "../utils/SVGElement/Rectangle.js";

const SVG_BG_ID = 'svg-background'

class GenericTool {
    constructor() {}

    onMouseDown(evt: Event) { }

    onMouseMove(evt: Event) { }

    onMouseUp(evt: Event) { }

    onMouseLeave(evt: Event) { }

    onKeyDown(evt: Event) { }

    onChangeTool() {}
}

class PetriElementTool extends GenericTool {
    private readonly createMethod: (evt: MouseEvent) => void

    constructor(createMethod: (evt: MouseEvent) => void) {
        super()
        this.createMethod = createMethod
    }

    onMouseDown(evt: MouseEvent) {
        const ele = <SVGAElement>evt.target
        if (ele.id === SVG_BG_ID) {
            const coord = this.createMethod(evt)
        }
    }
}

class ArcTool extends GenericTool {
    private readonly net: PetriNet
    private readonly line: SVGLineElement
    private firstPE: AGenericPetriElement | null
    private mouseDownPos: Vector | null

    constructor(net: PetriNet) {
        super();
        this.net = net
        this.line = createLine(new Vector(20, 20), new Vector(20, 80))
        // this.currentNet.addIE(<SVGAElement><unknown>this.line)
        this.line.setAttribute('stroke', 'var(--color-default)')
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

        const parentId = target.getAttribute('PEParent')

        if (!parentId) return

        const genericPE = this.net.getGenericPE(
            parentId
        )

        if (genericPE.PEType === 'place' 
                || genericPE.PEType === 'trans') {
            this.firstPE = genericPE
            this.mouseDownPos = this.net.getMousePosition(evt)
            setLineStartPoint(this.line, this.mouseDownPos)
            setLineEndPoint(this.line, this.mouseDownPos)
            this.net.addIE(<SVGAElement><unknown>this.line)
        }
    }

    onMouseMove(evt: MouseEvent) {
        if (!this.mouseDownPos) { return }

        const u = this.net.getMousePosition(evt)
            .sub(this.mouseDownPos).norm()
        setLineEndPoint(
            this.line, 
            this.net.getMousePosition(evt).sub(u.mul(0.02))
        )
    }

    onMouseUp(evt: Event): void {
        const target = <SVGAElement>evt.target
        console.log(target)

        if (target.id === SVG_BG_ID) {
            this.restart()
            return
        }

        const parentId = target.getAttribute('PEParent')

        if (!parentId || !this.firstPE) return

        const genericPE = this.net.getGenericPE(
            parentId
        )

        if (this.firstPE.PEType === 'place' 
                && genericPE.PEType === 'trans') {
            this.net.createArc(
                this.firstPE.id, 
                genericPE.id, 
                'Input'
            )
        } else if (this.firstPE.PEType === 'trans' 
                && genericPE.PEType === 'place') {
            this.net.createArc(
                genericPE.id, 
                this.firstPE.id, 
                'Output'
            )
        }

        this.restart()
    }

    onMouseLeave(evt: Event) { 
        this.restart() 
    }

    onChangeTool() {
        this.restart()
        super.onChangeTool();
    }
}

class MouseTool extends GenericTool {
    private readonly net: PetriNet
    private selectedPEs: PEId[]
    private dragHandler: IDragHandler | null
    private dragInitialPos: Vector
    private selectionRectangle: SVGRectElement | null
    
    propertyWindow: PropertyWindow
    // dragManager: DragManager

    constructor(net: PetriNet, propertyWindow: PropertyWindow) {
        super()
        this.net = net
        this.selectedPEs = []
        this.dragHandler = null
        this.dragInitialPos = new Vector(0, 0)
        this.selectionRectangle = null
        
        this.propertyWindow = propertyWindow
    }

    selectPE(id: PEId) {
        if (!this.selectedPEs.length) {
            this.propertyWindow.open(
                this.net.getGenericPEType(id),
                (attrName, val) => {
                    this.net.setGenericPEAttr(id, attrName, val)
                },
                this.net.getGenericPEData(id)
            )
        } else if (this.selectedPEs.length === 1) {
            this.propertyWindow.close()
        }

        this.net.selectPE(id)
        this.selectedPEs.push(id)
    }

    deselectPE(id: PEId) {
        if (this.selectedPEs.length === 1) 
            this.propertyWindow.close()
        
        this.net.deselectPE(id)
        this.selectedPEs = this.selectedPEs.filter(selectedId => selectedId !== id)
    }

    deselectAll() {
        if (this.selectedPEs.length === 1) {
            this.deselectPE(this.selectedPEs[0])
            return
        }

        for (const id of this.selectedPEs)
            this.net.deselectPE(id)

        this.selectedPEs = []
    }

    getDragHandler(target: SVGAElement): IDragHandler | null {
        if (this.selectedPEs.length > 1) {
            return this.net.getMultiplePEsDragHandler(this.selectedPEs)
        }

        const id = target.getAttribute('PEParent')

        const dragWhat = target.getAttribute('drag')

        if (!id || !dragWhat) throw "Invalid target"

        if (dragWhat === 'corner' || dragWhat === 'arcMidNode') {
            const cornerIdx = parseInt(target.getAttribute('cornerIdx') || "-1")

            if (dragWhat === 'arcMidNode')
                this.net.addArcCorner(id, cornerIdx)

            return this.net.getArcCornerDragHandler(id, cornerIdx)

        } else if (dragWhat === 'PEText') {
            const textName = target.getAttribute('PEText') || ""

            return this.net.getPETextDragHandler(id, textName)
        } else if (dragWhat === "pe") {
            return this.net.getPetriElementDragHandler(id)
        }

        return null
    }

    endDrag() {
        if (this.dragHandler)
            this.dragHandler.endDrag()
        this.dragHandler = null
    }

    addSelectionRectangle() {
        const rectAttrs = {
            'fill': 'black',
            'fill-opacity': '0.05',
            'stroke': 'gray',
            'stroke-width': '0.5'
        }
        this.selectionRectangle = createRect(this.dragInitialPos, 0, 0, rectAttrs)
        this.net.addIE(<SVGAElement><unknown>this.selectionRectangle)
    }

    onMouseDown(evt: MouseEvent) {
        const target = <SVGAElement>evt.target
        this.dragInitialPos = this.net.getMousePosition(evt)

        if (target.id === SVG_BG_ID) {
            this.deselectAll()
            this.addSelectionRectangle()
            return
        }

        const id = target.getAttribute('PEParent')

        if (!id) return

        const peType = this.net.getGenericPEType(id)
        if (
            (this.selectedPEs.length > 0 &&
            ["place", "trans"].includes(peType)) &&
            evt.shiftKey
        ) {
            this.selectPE(id)
        } else if (!this.selectedPEs.includes(id)) {
            this.deselectAll()
            this.selectPE(id)
        }

        this.dragHandler = this.getDragHandler(target)
    }

    onMouseMove(evt: MouseEvent) {
        const mousePos = this.net.getMousePosition(evt)
        const displacement = mousePos.sub(this.dragInitialPos)
        
        if (this.dragHandler)
            this.dragHandler.drag(displacement)
        else if (this.selectionRectangle) {
            setRectPos(
                this.selectionRectangle,
                new Vector(
                    Math.min(this.dragInitialPos.x, mousePos.x),
                    Math.min(this.dragInitialPos.y, mousePos.y)
                )
            )
            setRectSize(
                this.selectionRectangle,
                Math.abs(displacement.x),
                Math.abs(displacement.y)
            )
        }
    }

    onMouseUp(evt: MouseEvent) {
        this.endDrag()
        if (this.selectionRectangle) {
            const rectPos = getRectPos(this.selectionRectangle)
            const rectSize = getRectSizeAsVector(this.selectionRectangle)
            for (const id of this.net.getPEsInsiteRect(rectPos, rectSize)) {
                this.selectPE(id)
            }
            this.selectionRectangle.remove()
            this.selectionRectangle = null
        }
    }

    onMouseLeave(evt: MouseEvent) {
        this.endDrag()
    }

    onKeyDown(evt: KeyboardEvent) {
        if (evt.key === "Delete" && this.selectedPEs.length) {
            const idsToRemove = [...this.selectedPEs]
            this.deselectAll()
            for (const id of idsToRemove)
                this.net.removeGenericPE(id)
        }
    }

    onChangeTool() {
        this.deselectAll()
        super.onChangeTool();
    }
}

function createTools(net: PetriNet, propertyWindow: PropertyWindow) {
    return {
        'mouse-tool': new MouseTool(net, propertyWindow),
        'place-tool': new PetriElementTool(
            evt => { net.createPlace(net.getMousePosition(evt, false)) }
        ),
        'trans-tool': new PetriElementTool(
            evt => { net.createTrans(net.getMousePosition(evt, false)) }
        ),
        'arc-tool': new ArcTool(net)
    }
}

type Tools = { [toolName: string]: GenericTool }

class Editor {
    private readonly divElement: HTMLDivElement
    private readonly tools: Tools
    private _currentToolName: string
    private _currentTool: GenericTool
    readonly net: PetriNet

    constructor(net: PetriNet, propertyWindow: PropertyWindow) {
        this.divElement = <HTMLDivElement>document
            .getElementById('svg-div')
        this.net = net
        this.divElement.style.display = 'block'
        this.divElement.appendChild(net.svgElement)
        this.tools = createTools(net, propertyWindow)
        this._currentToolName = "mouse-tool"
        this._currentTool = this.tools[this._currentToolName]
    }

    get currentToolName() {
        return this._currentToolName
    }

    get currentTool() {
        return this._currentTool
    }

    selectTool(toolName: string) {
        if (toolName in this.tools) {
            this.currentTool.onChangeTool()
            this._currentToolName = toolName
            this._currentTool = this.tools[toolName]
        } else {
            throw "Invalid toolName"
        }
    }

    close() {
        this.net.svgElement.remove()
        this.divElement.style.display = 'none'
        
    }
}

export default Editor