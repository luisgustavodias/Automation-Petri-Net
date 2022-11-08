import Vector from "../utils/Vector.js"
import { AGenericPetriElement, APetriElement, PetriPlace, 
    PetriTrans, PetriArc } from "./PetriNetElements.js";
import { ArcData, PEId, PetriNetData, PlaceData, TransData, ArcType, SimConfig, Input } from "../PNData.js";

interface Change {
    undo: () => void
    redo: () => void
}

export interface IDragHandler {
    drag: (displacement: Vector) => void
    endDrag: () => void
}

class UndoRedoManager {
    private undoList: Change[]
    private redoList: Change[]

    constructor() {
        this.undoList = []
        this.redoList = []
    }

    registryChange(change: Change) {
        this.undoList.push(change)
        this.redoList = []
    }

    undo() {
        const lastChange = this.undoList.pop()

        if (lastChange) {
            lastChange.undo()
            this.redoList.push(lastChange)
            return true
        }

        return false
    }

    redo() {
        const lastChange = this.redoList.pop()

        if (lastChange) {
            lastChange.redo()
            this.undoList.push(lastChange)
            return true
        }

        return false
    }
}

function createSVGNet() {
    const svgElement = document.createElementNS(
        'http://www.w3.org/2000/svg', 'svg'
    )
    svgElement.innerHTML = `<rect id="svg-background" 
        x="-5000" y="-5000" 
        width="10000" height="10000" fill="white"/>
    <g id="elements">
        <g id="arcs"></g>
        <g id="pe"></g>
    </g>
    <g id="IEs"></g>`
    svgElement.style.height = '100%'
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    svgElement.setAttribute('viewBox', '0 0 1500 300')

    return svgElement
}

class BasePetriNet {
    private static readonly GRID_SIZE = 10

    readonly svgElement: SVGSVGElement
    protected elements: { [id: PEId]: AGenericPetriElement }
    inputs: Array<Input>
    simConfig: SimConfig
    protected preScript: string
    protected placeNumber: number
    protected transNumber: number
    protected undoRedoManager: UndoRedoManager
    protected _grid: boolean

    protected constructor() {
        this.svgElement = createSVGNet()
        this.elements = {}
        this.inputs = []
        this.simConfig = {
            simMode: "Automation",
            arcDebug: false,
            guardDebug: false
        }
        this.preScript = ""
        this.placeNumber = 1
        this.transNumber = 1
        this._grid = false
        this.undoRedoManager = new UndoRedoManager()
    }

    get grid() { 
        return this._grid 
    }

    set grid(val: boolean) {
        if (val) {
            (<HTMLElement>document.getElementById('svg-background'))
                .setAttribute('fill', 'url(#grid-pattern)')
        } else {
            (<HTMLElement>document.getElementById('svg-background'))
                .setAttribute('fill', 'white')
        }
        this._grid = val
    }

    protected generateId() {
        if (window.crypto.randomUUID)
        return window.crypto.randomUUID()
        else
            return String(Math.random())
    }

    getGenericPE(id: PEId) {
        return this.elements[id]
    }

    getGenericPEType(id: PEId) {
        return this.elements[id].PEType
    }

    getGenericPEData(id: PEId) {
        return this.elements[id].getData()
    }

    fitToGrid(pos: Vector) {
        return new Vector(
            Math.round(pos.x/BasePetriNet.GRID_SIZE)*BasePetriNet.GRID_SIZE, 
            Math.round(pos.y/BasePetriNet.GRID_SIZE)*BasePetriNet.GRID_SIZE
        )
    }

    getMousePosition(evt: MouseEvent, ignoreGrid: boolean = true) {
        const CTM = <DOMMatrix>this.svgElement.getScreenCTM();
        const pos = new Vector(
            (evt.clientX - CTM.e) / CTM.a,
            (evt.clientY - CTM.f) / CTM.d
        )

        if (!ignoreGrid && this.grid)
            return this.fitToGrid(pos);

        return pos
    }

    selectPE(id: PEId) {
        this.elements[id].select()
    }

    deselectPE(id: PEId) {
        this.elements[id].deselect()
    }  

    protected addGenericPE(
        genericPE: AGenericPetriElement, 
        registryChange: boolean = true
    ) {
        if (genericPE.PEType === 'arc') {
            let arc = <PetriArc>genericPE
            let place = <PetriPlace>this.elements[arc.placeId]
            let trans = <PetriTrans>this.elements[arc.transId]

            if (place.PEType !== 'place' || trans.PEType !== 'trans') {
                throw "Invalid placeId or transId"
            }

            (<HTMLElement>this.svgElement.querySelector('#arcs'))
                .appendChild(genericPE.svgElement)

            place.connectArc(arc.id)
            trans.connectArc(arc.id)
            arc.updatePlacePos()
            arc.updateTransPos()
        } else {
            let petriElement = <APetriElement>genericPE;

            if (petriElement.connectedArcs.length) {
                throw "Can't add a place or trans with connected arcs"
            }

            (<HTMLElement>this.svgElement.querySelector('#pe'))
                .appendChild(genericPE.svgElement)
        }

        this.elements[genericPE.id] = genericPE

        if (registryChange) {
            this.undoRedoManager.registryChange({
                undo: () => this.removeGenericPE(genericPE.id, false),
                redo: () => this.addGenericPE(genericPE, false)
            })
        }
    }

    removeGenericPE(id: PEId, registryChange: boolean = true) {
        const genericPE = this.elements[id]
        if (this.elements[id].PEType === 'arc') {
            const arc = <PetriArc>genericPE
            const place = <PetriPlace>this.elements[arc.placeId]
            const trans = <PetriTrans>this.elements[arc.transId]

            place.disconnectArc(arc.id)
            trans.disconnectArc(arc.id)
        } else {
            const petriElement = <APetriElement>this.elements[id]
            while (petriElement.connectedArcs.length) {
                this.removeGenericPE(petriElement.connectedArcs[0])
            }
        }

        genericPE.svgElement.remove()
        delete this.elements[id]

        if (registryChange) {
            this.undoRedoManager.registryChange({
                undo: () => this.addGenericPE(genericPE, false),
                redo: () => this.removeGenericPE(genericPE.id, false)
            })
        }

        return genericPE
    }

    addIE(element: SVGAElement) {
        (<HTMLElement>document.getElementById('IEs')).appendChild(element)
    }

    getNetData(): PetriNetData {
        const viewBox = this.svgElement.viewBox.baseVal

        const elementsDataByPEType = Object.fromEntries(
            ['place', 'trans', 'arc'].map(PEType => [
                PEType,
                Object.values(this.elements).filter(
                    (ele) => ele.PEType === PEType
                ).map(ele => ele.getData())
            ])
        )

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
        }
    }

    static newNet() {
        return new PetriNet()
    }

    private static loadPlace(data: PlaceData) {
        const place = new PetriPlace(data.id)
        place.name = data.name
        place.placeType = data.placeType
        place.initialMark = data.initialMark

        place.position = new Vector(
            data.position.x,
            data.position.y
        )

        for (const [attrName, pos] of Object.entries(data.textsPosition)) {
            place.setPETextPosition(attrName, pos)
        }
    
        return place
    }

    private static loadTrans(data: TransData) {
        const trans = new PetriTrans(data.id)
        trans.name = data.name
        trans.delay = String(data.delay)
        trans.guard = data.guard

        trans.position = new Vector(
            data.position.x,
            data.position.y
        )

        for (const [attrName, pos] of Object.entries(data.textsPosition)) {
            trans.setPETextPosition(attrName, pos)
        }
    
        return trans
    }

    private static loadArc(data: ArcData, net: PetriNet) {
        const arc = new PetriArc(
            data.id,
            <PetriPlace>net.getGenericPE(data.placeId), 
            <PetriTrans>net.getGenericPE(data.transId), 
            data.arcType
        )
        arc.weight = data.weight

        if (data.corners) {
            for (const corner of data.corners.reverse()) {
                arc.addCorner(0)
                arc.moveCorner(0, new Vector(corner.x, corner.y))
            }
        }

        for (const [attrName, pos] of Object.entries(data.textsPosition)) {
            arc.setPETextPosition(attrName, pos)
        }

        return arc
    }

    static loadNet(data: PetriNetData) {
        const net = new PetriNet()

        data.places.forEach(placeData => { 
            net.addGenericPE(this.loadPlace(placeData), false) 
        })
        data.transitions.forEach(transData => { 
            net.addGenericPE(this.loadTrans(transData), false) 
        })
        data.arcs.forEach(arcData => { 
            net.addGenericPE(this.loadArc(arcData, net), false) 
        })

        net.inputs = data.inputs
        if (data.simConfig)
            net.simConfig = data.simConfig

        const viewBox = net.svgElement.viewBox.baseVal
        Object.assign(viewBox, data.viewBox)

        console.log(net)
        return net
    }
}

class PetriNetElementsCreation extends BasePetriNet {
    createPlace(coord: Vector) {
        const place = new PetriPlace(this.generateId())
        place.name = 'p' + this.placeNumber++
        place.position = coord

        this.addGenericPE(place)

        return place.id
    }

    createTrans(coord: Vector) {
        const trans = new PetriTrans(this.generateId())
        trans.name = 't' + this.transNumber++
        trans.position = coord

        this.addGenericPE(trans)

        return trans.id
    }

    createArc(placeId: string, transId: string, arcType: ArcType) {
        const arc = new PetriArc(
            this.generateId(), 
            <PetriPlace>this.getGenericPE(placeId), 
            <PetriTrans>this.getGenericPE(transId), 
            arcType
        )
        
        this.addGenericPE(arc)

        return arc.id
    }

    addArcCorner(
        arcId: PEId, 
        cornerIndex: number, 
        registryChange: boolean = true
    ) {
        const arc = <PetriArc>this.elements[arcId]
        arc.addCorner(cornerIndex)

        if (registryChange) {
            this.undoRedoManager.registryChange({
                undo: () => arc.removeCorner(cornerIndex),
                redo: () => this.addArcCorner(arcId, cornerIndex, false),
            })
        }
    }
}

class PetriNetElementsMovement extends PetriNetElementsCreation {
    private moveGeneric(
        dragHandler: IDragHandler, 
        pos: Vector, 
        registryChange: boolean = true
    ) {
        dragHandler.drag(pos)

        if (registryChange)
            dragHandler.endDrag()
    }

    movePE(
        id: PEId, 
        pos: Vector, 
        registryChange: boolean = true
    ) {
        this.moveGeneric(
            this.getPetriElementDragHandler(id), 
            pos, 
            registryChange
        )
    }

    moveArcCorner(
        arcId: PEId, 
        cornerIndex: number, 
        pos: Vector, 
        registryChange: boolean = true
    ) {
        this.moveGeneric(
            this.getArcCornerDragHandler(arcId, cornerIndex), 
            pos, 
            registryChange
        )
    }

    movePEText(
        id: PEId,
        attrName: string, 
        pos: Vector, 
        registryChange: boolean = true
    ) {
        this.moveGeneric(
            this.getPETextDragHandler(id, attrName), 
            pos, 
            registryChange
        )
    }

    private createDragHandler(
        getPos: () => Vector, 
        setPos: (pos: Vector) => void,
        ignoreGrid: boolean
    ): IDragHandler {
        const initialPos = getPos()

        const drag = (displacement: Vector) => {
            const pos = initialPos.add(displacement)
            if (!ignoreGrid && this.grid)
                setPos(this.fitToGrid(pos))
            else
                setPos(pos)
        }

        const endDrag = () => {
            const finalPos = getPos()

            this.undoRedoManager.registryChange({
                undo: () => setPos(initialPos),
                redo: () => setPos(finalPos),
            })
        }

        return {
            drag: drag,
            endDrag: endDrag
        }
    }

    getPetriElementDragHandler(id: PEId) {
        const petriElement = <APetriElement>this.getGenericPE(id)

        const getPos = () => petriElement.position
        const setPos = (pos: Vector) => {
            petriElement.position = pos

            for (const arcId of petriElement.connectedArcs) {
                const arc = <PetriArc>this.getGenericPE(arcId)
    
                if (petriElement.PEType === 'place')
                    arc.updatePlacePos();
                else
                    arc.updateTransPos();
            }
        }

        return this.createDragHandler(getPos, setPos, false)
    }

    getArcCornerDragHandler(id: PEId, cornerIdx: number) {
        const arc = <PetriArc>this.getGenericPE(id)

        const getPos = () => arc.getCornerPos(cornerIdx)
        const setPos = (pos: Vector) => { arc.moveCorner(cornerIdx, pos) }

        return this.createDragHandler(getPos, setPos, false)
    }

    getPETextDragHandler(id: PEId, textName: string) {
        const petriElement = <APetriElement>this.getGenericPE(id)

        const getPos = () => petriElement.getPETextPosition(textName)
        const setPos = (pos: Vector) => { petriElement.setPETextPosition(textName, pos) }

        return this.createDragHandler(getPos, setPos, true)
    }

    getMultiplePEsDragHandler(ids: PEId[]) {
        const dragHandlers = ids.map(id => this.getPetriElementDragHandler(id))
        let lastDisplacement = new Vector(0, 0)

        const drag = (displacement: Vector) => {
            for (const dragHandler of dragHandlers)
                dragHandler.drag(displacement)
            lastDisplacement = displacement
        }

        const endDrag = () => {
            this.undoRedoManager.registryChange({
                undo: () => drag(new Vector(0, 0)),
                redo: () => drag(lastDisplacement),
            })
        }

        return {
            drag: drag,
            endDrag: endDrag
        }
    }
}

export class PetriNet extends PetriNetElementsMovement {
    setGenericPEAttr(
        id: PEId, 
        attrName: string, 
        val: string, 
        registryChange: boolean = true) 
    {
        const ele: any = this.elements[id]
        const previousValue = ele[attrName]
        ele[attrName] = val

        if (registryChange) {
            this.undoRedoManager.registryChange({
                undo: () => this.setGenericPEAttr(
                    id, attrName, previousValue, false
                ),
                redo: () => this.setGenericPEAttr(
                    id, attrName, val, false
                ),
            })
        }
    }

    getPEsInsiteRect(rectPos: Vector, rectSize: Vector) {
        return Object.values(this.elements).filter(ele => {
            if (!(ele.PEType === 'place' || ele.PEType === 'trans'))
                return false
            
            const pos = (<APetriElement>ele).position
            const rectBottomLeft = rectPos.add(rectSize)

            if (
                pos.x < rectPos.x ||
                pos.y < rectPos.y ||
                pos.x > rectBottomLeft.x ||
                pos.y > rectBottomLeft.y
            ) {
                return false
            }
            return true
        }).map(ele => ele.id)
    }

    undo() {
        return this.undoRedoManager.undo()
    }

    redo() {
        return this.undoRedoManager.redo()
    }

    moveScreen(displacement: Vector) {
        const viewBox = this.svgElement.viewBox.baseVal
        viewBox.x -= displacement.x
        viewBox.y -= displacement.y
    }

    zoom(focusPoint: Vector, scale: number) {
        const viewBox = this.svgElement.viewBox.baseVal
        viewBox.x += (focusPoint.x - viewBox.x)*(1 - scale)
        viewBox.y += (focusPoint.y - viewBox.y)*(1 - scale)
        viewBox.width = viewBox.width*scale
        viewBox.height = viewBox.height*scale
    }
}