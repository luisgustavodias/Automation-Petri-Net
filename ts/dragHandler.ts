import Vector from "./utils/Vector.js"
import { PetriNet, PNManager } from "./PetriNet.js"
import { getLineMidPoint, setLineStartPoint, setLineEndPoint } from "./utils/Line.js"
import { GenericPetriElement, PetriElement, PetriArc } from "./PNElements.js"
import { Change, UndoRedoManager } from "./UndoRedoHandler.js"
import { getMousePosition, gridFit } from "./utils/utils.js"

export class DragChange implements Change {
    transform: SVGTransform
    startPosition: Vector
    lastPosition: Vector
    callbackFunction: CallableFunction

    constructor(transform: SVGTransform, startPosition: Vector, 
                lastPosition: Vector, callbackFunction: CallableFunction) {
        this.transform = transform
        this.startPosition = startPosition
        this.lastPosition = lastPosition
        this.callbackFunction = callbackFunction
    }

    undo() {
        this.transform.setTranslate(this.startPosition.x, this.startPosition.y)
        this.callbackFunction(this.startPosition)
    }

    redo() {
        this.transform.setTranslate(this.lastPosition.x, this.lastPosition.y)
        this.callbackFunction(this.lastPosition)
    }
}

export class DragHandler {
    callbackFunction: CallableFunction
    transform: SVGTransform
    startPosition: Vector
    lastPosition: Vector
    dragOffset: Vector

    constructor(evt: Event, draggingElement: SVGAElement, func: CallableFunction) {
        this.callbackFunction = func
        this.transform = draggingElement.transform.baseVal.getItem(0)
        this.startPosition = new Vector(this.transform.matrix.e, this.transform.matrix.f)
        this.dragOffset = getMousePosition(evt).sub(this.startPosition)
        this.lastPosition = this.dragOffset
    }

    drag(evt: MouseEvent) {
        let coord = getMousePosition(evt).sub(this.dragOffset)
        if (PNManager.net.grid) {
            coord = gridFit(coord)
        }
        this.transform.setTranslate(coord.x, coord.y)
        this.callbackFunction(coord)
        this.lastPosition = coord
    }
}


function petriElementStartDrag(evt: Event, petriElement: PetriElement) {
    let ele = <SVGAElement>evt.target
    if (ele.classList.contains('draggable')) {
        return new DragHandler(evt, ele, (coord) => { })
    }
    let arcs = petriElement.arcs
    return new DragHandler(evt, petriElement._element, (coord) => {
            for (let i = 0; i < arcs.length; i++) {
                let arc = <PetriArc>PNManager.net.elements[arcs[i]]
                arc.updatePos(petriElement.id);
            }
    })
}

function arcStartDrag(evt: Event, petriElement: PetriArc) {
    let ele = <SVGAElement>evt.target
    if (ele.getAttribute('arc-node-type') === 'mid') {
        petriElement.cleanNodes()
        let i = parseInt(ele.getAttribute('arc-node-line'))
        petriElement.splitLine(i)
        petriElement.showNodes()
        return null
    } else if (ele.getAttribute('arc-node-type') === 'corner') {
        let i = parseInt(ele.getAttribute('arc-node-line'))
        return new DragHandler(evt, ele, (coord) => {
            setLineEndPoint(petriElement.lines[i - 1], coord)
            setLineStartPoint(petriElement.lines[i], coord)
            let node = <SVGRectElement><unknown>document.getElementById('arc-mid-node-' + (i - 1))
            petriElement.setNodePos(node, getLineMidPoint(petriElement.lines[i - 1]))
            node = <SVGRectElement><unknown>document.getElementById('arc-mid-node-' + i)
            petriElement.setNodePos(node, getLineMidPoint(petriElement.lines[i]))
            if (i === 1) {
                petriElement.updatePosByPlace()
            }
            if (i === petriElement.lines.length - 1) {
                petriElement.updatePosByTrans()
            }
            petriElement.updateWeightPosition()
        })
    } else if (ele.classList.contains('draggable')) {
        return new DragHandler(evt, ele, (coord) => { })
    }
    return null
}

function startDrag(evt: Event) {
    let ele = <SVGAElement>evt.target
    let petriElement = PNManager.net.elements[ele.getAttribute('pe-parent')]

    if (petriElement.PNElementType === 'arc') {
        return arcStartDrag(evt, <PetriArc>petriElement)
    } else {
        return petriElementStartDrag(evt, <PetriElement>petriElement)
    }
}

export class DragManager {
    net: PetriNet
    dragHandler: DragHandler
    undoRedoManager: UndoRedoManager
    callbackFunction: CallableFunction
    transform: SVGTransform
    startPosition: Vector
    lastPosition: Vector
    dragOffset: Vector

    constructor(undoRedoManager: UndoRedoManager) {
        this.net = PNManager.net
        this.dragHandler = null
        this.undoRedoManager = undoRedoManager
    }

    petriElementStartDrag(evt: Event, petriElement: PetriElement) {
        let ele = <SVGAElement>evt.target
        if (ele.classList.contains('draggable')) {
            this.callbackFunction = (coord) => { }
            return ele
        }
        let arcs = petriElement.arcs
        this.callbackFunction = (coord) => {
            for (let i = 0; i < arcs.length; i++) {
                let arc = <PetriArc>this.net.elements[arcs[i]]
                arc.updatePos(petriElement.id);
            }
        }
        return petriElement._element
    }

    arcStartDrag(evt: Event, petriElement: PetriArc) {
        let ele = <SVGAElement>evt.target
        if (ele.getAttribute('arc-node-type') === 'mid') {
            petriElement.cleanNodes()
            let i = parseInt(ele.getAttribute('arc-node-line'))
            petriElement.splitLine(i)
            petriElement.showNodes()
            return null
        } else if (ele.getAttribute('arc-node-type') === 'corner') {
            let i = parseInt(ele.getAttribute('arc-node-line'))
            this.callbackFunction = (coord) => {
                setLineEndPoint(petriElement.lines[i - 1], coord)
                setLineStartPoint(petriElement.lines[i], coord)
                let node = <SVGRectElement><unknown>document.getElementById('arc-mid-node-' + (i - 1))
                petriElement.setNodePos(node, getLineMidPoint(petriElement.lines[i - 1]))
                node = <SVGRectElement><unknown>document.getElementById('arc-mid-node-' + i)
                petriElement.setNodePos(node, getLineMidPoint(petriElement.lines[i]))
                if (i === 1) {
                    petriElement.updatePosByPlace()
                }
                if (i === petriElement.lines.length - 1) {
                    petriElement.updatePosByTrans()
                }
                petriElement.updateWeightPosition()
            }
            return ele
        } else if (ele.classList.contains('draggable')) {
            this.callbackFunction = (coord) => { }
            return ele
        }
        return null
    }

    _startDrag(evt: Event) {
        let ele = <SVGAElement>evt.target
        let petriElement = PNManager.net.elements[ele.getAttribute('pe-parent')]
        let draggingElement: SVGAElement
    
        if (petriElement.PNElementType === 'arc') {
            draggingElement = this.arcStartDrag(evt, <PetriArc>petriElement)
        } else {
            draggingElement = this.petriElementStartDrag(evt, <PetriElement>petriElement)
        }
        if (!draggingElement) { return }
        
        this.transform = draggingElement.transform.baseVal.getItem(0)
        this.startPosition = new Vector(this.transform.matrix.e, this.transform.matrix.f)
        this.dragOffset = getMousePosition(evt).sub(this.startPosition)
        this.lastPosition = this.dragOffset
    }

    startDrag(evt: Event) {
        this.dragHandler = startDrag(evt)
    }

    drag(evt: MouseEvent) {
        if (this.dragHandler) {
            this.dragHandler.drag(evt)
        }
    }

    endDrag() {
        if (!this.dragHandler) {
            return
        }
        this.undoRedoManager.registryChange(
            new DragChange(
                this.dragHandler.transform,
                this.dragHandler.startPosition,
                this.dragHandler.lastPosition,
                this.dragHandler.callbackFunction
            )
        )
        this.dragHandler = null
    }
}