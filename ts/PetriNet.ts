import Vector from "./utils/Vector.js"
// import { v4 as uuidv4 } from 'uuid';
// import { v4 as uuidv4 } from '../node_modules/uuid/wrapper.mjs';
import { AGenericPetriElement, APetriElement, PetriPlace, 
    PetriTrans, PetriArc, ArcType } from "./PNElements.js";
import { Change, UndoRedoManager } from "./UndoRedoManager.js";
import { Input } from "./InputsConfig.js";
import { PetriNetData } from "./PNData.js";

export class PetriNet {
    readonly svgElement: SVGSVGElement
    elements: { [id: string]: AGenericPetriElement }
    inputs: Array<Input>
    simMode: number
    preScript: string
    placeNumber: number
    transNumber: number
    private _grid: boolean
    metadata: { fileName: string, filePath: string }

    private constructor() {
        this.svgElement = document.createElementNS(
            'http://www.w3.org/2000/svg', 'svg'
        )
        this.svgElement.innerHTML = `<rect id="svg-background" 
            x="-5000" y="-5000" 
            width="10000" height="10000" fill="white"/>
        <g id="elements">
            <g id="arcs"></g>
            <g id="pe"></g>
        </g>
        <g id="IEs"></g>`
        this.svgElement.style.height = '100%'
        this.svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        this.svgElement.setAttribute('viewBox', '0 0 1500 300')
        this.elements = {}
        this.inputs = []
        this.simMode = 1
        this.preScript = ""
        this.placeNumber = 1
        this.transNumber = 1
        this._grid = false
        this.metadata = { fileName: '', filePath: '' }
    }

    // get svgELement() { return this._svgElement }
    get grid() { return this._grid }

    set grid(val: boolean) {
        if (val) {
            document.getElementById('svg-background')
                .setAttribute('fill', 'url(#grid-pattern)')
        } else {
            document.getElementById('svg-background')
                .setAttribute('fill', 'white')
        }
        this._grid = val
    }

    private filterElementsByType(PEType: string) {
        return Object.values(this.elements).filter(
            (ele) => ele.PEType === PEType
        )
    }

    getPlaces() {
        return <PetriPlace[]>this.filterElementsByType('place')
    }

    getTransitions() {
        return <PetriTrans[]>this.filterElementsByType('trans')
    }

    getArcs() {
        return <PetriArc[]>this.filterElementsByType('arc')
    }

    getData(): PetriNetData {
        const viewBox = this.svgElement.viewBox.baseVal
        return {
            name: 'no name',

            places: this.getPlaces().map(place => place.getData()),
            transitions: this.getTransitions().map(
                trans => trans.getData()
            ),
            arcs: this.getArcs().map(arc => arc.getData()),
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
            preScript: ""
        }
    }

    addGenericPE(genericPE: AGenericPetriElement) {
        if (genericPE.PEType === 'arc') {
            let arc = <PetriArc>genericPE
            let place = <PetriPlace>this.elements[arc.placeId]
            let trans = <PetriTrans>this.elements[arc.transId]

            if (place.PEType !== 'place' || trans.PEType !== 'trans') {
                throw "Invalid placeId or transId"
            }

            place.connectArc(arc.id)
            trans.connectArc(arc.id)
            arc.updatePlacePos(place.position)
            arc.updateTransPos(trans.position)

            this.svgElement.querySelector('#arcs')
                .appendChild(genericPE.svgElement)
        } else {
            let petriElement = <APetriElement>genericPE;

            if (petriElement.connectedArcs.length) {
                throw "Can't add a place or trans with connected arcs"
            }

            this.svgElement.querySelector('#pe')
                .appendChild(genericPE.svgElement)
        }

        this.elements[genericPE.id] = genericPE
    }

    removeGenericPE(PEId: string) {
        if (this.elements[PEId].PEType === 'arc') {
            let arc = <PetriArc>this.elements[PEId]
            let place = <PetriPlace>this.elements[arc.placeId]
            let trans = <PetriTrans>this.elements[arc.transId]

            place.disconnectArc(arc.id)
            trans.disconnectArc(arc.id)
        } else {
            let petriElement = <APetriElement>this.elements[PEId]
            if (petriElement.connectedArcs.length) {
                throw "Can't remove a place or trans with connected arcs"
            }
        }

        let element = this.elements[PEId]
        element.svgElement.remove()
        delete this.elements[PEId]

        return element
    }

    getGenericPEAttr(PEId: string, attrName: string) {
        return this.elements[PEId][attrName]
    }

    setGenericPEAttr(PEId: string, attrName: string, val: string) {
        const ele = this.elements[PEId]
        ele[attrName] = val
    }

    static newNet() {
        return new PetriNet()
    }

    static loadNet(data: PetriNetData) {
        const net = new PetriNet()

        data.places.forEach(
            placeData => { net.addGenericPE(PetriPlace.load(placeData)) }
        )
        data.transitions.forEach(
            transData => { net.addGenericPE(PetriTrans.load(transData)) }
        )
        data.arcs.forEach(
            arcData => { net.addGenericPE(PetriArc.load(arcData)) }
        )

        const viewBox = net.svgElement.viewBox.baseVal
        Object.assign(viewBox, data.viewBox)

        return net
    }
}

const PLACE_DEFAULT_NAME_PREFIX = "p", TRANS_DEFAULT_NAME_PREFIX = "t";

class CreateElementChange implements Change {
    net: PetriNet
    genericPE: AGenericPetriElement

    constructor(net: PetriNet, genericPE: AGenericPetriElement) {
        this.net = net
        this.genericPE = genericPE
    }

    undo() {
        this.net.removeGenericPE(this.genericPE.id)
    }

    redo() {
        this.net.addGenericPE(this.genericPE)
    }
}

class RemoveElementChange implements Change {
    net: PetriNet
    genericPE: AGenericPetriElement

    constructor(net: PetriNet, genericPE: AGenericPetriElement) {
        this.net = net
        this.genericPE = genericPE
    }

    undo() {
        this.net.addGenericPE(this.genericPE)
    }

    redo() {
        this.net.removeGenericPE(this.genericPE.id)
    }
}

class SetGenericPEAttrChange implements Change {
    net: PetriNet
    PEId: string
    attrName: string
    previousValue: string
    newValue: string

    constructor(
        net: PetriNet, 
        PEId: string,
        attrName: string, 
        previousValue: string,
        newValue: string
    ) {
        this.net = net
        this.PEId = PEId
        this.attrName = attrName
        this.previousValue = previousValue
        this.newValue = newValue
    }

    undo() {
        this.net.setGenericPEAttr(
            this.PEId, this.attrName, this.previousValue
        )
    }

    redo() {
        this.net.setGenericPEAttr(
            this.PEId, this.attrName, this.previousValue
        )
    }
}

const GRID_SIZE = 10;

export class PetriNetManager {
    // serve como uma iterface para a classe PetriNet
    // tratando as funcionalidades de desfazer e refazer

    net: PetriNet
    private _selectedPE: AGenericPetriElement
    selectObserver: (PEId: string) => void
    deselectObserver: () => void
    private undoRedoManager: UndoRedoManager

    constructor(net: PetriNet) {
        this.net = net
        document.getElementById('svg-div').appendChild(net.svgElement)
        this._selectedPE = null
        this.undoRedoManager = new UndoRedoManager()
    }

    open(net: PetriNet) {
        this.net.svgElement.remove()
        this.net = net
        document.getElementById('svg-div').appendChild(net.svgElement)
    }

    get selectedPE() { return this._selectedPE }

    private addGenericPE(genericPE: AGenericPetriElement) {
        this.net.addGenericPE(genericPE)
        this.undoRedoManager.registryChange(
            new CreateElementChange(
                this.net,
                genericPE
            )
        )

        return genericPE.id
    }

    getMousePosition(evt: MouseEvent) {
        const CTM = this.net.svgElement.getScreenCTM();
        const pos = new Vector(
            (evt.clientX - CTM.e) / CTM.a,
            (evt.clientY - CTM.f) / CTM.d
        )

        if (this.net.grid) {
            return new Vector(
                Math.round(pos.x/GRID_SIZE)*GRID_SIZE, 
                Math.round(pos.y/GRID_SIZE)*GRID_SIZE
            )
        }

        return pos
    }

    private generateId() {
        return String(Math.random())
    }

    createPlace(coord: Vector) {
        const place = new PetriPlace(this.generateId())
        place.name = PLACE_DEFAULT_NAME_PREFIX + this.net.placeNumber++
        place.position = coord

        return this.addGenericPE(place)
    }

    createTrans(coord: Vector) {
        const trans = new PetriTrans(this.generateId())
        trans.name = TRANS_DEFAULT_NAME_PREFIX + this.net.transNumber++
        trans.position = coord

        return this.addGenericPE(trans)
    }

    createArc(placeId: string, transId: string, arcType: ArcType) {
        return this.addGenericPE(
            new PetriArc(this.generateId(), placeId, transId, arcType)
        )
    }

    getPE(elementId: string) {
        return this.net.elements[elementId]
    }

    selectPE(id: string) {
        this._selectedPE = this.net.elements[id]
        this._selectedPE.select()
        this.selectObserver(id)
        // propertyWindow.show(selectedPE)
    }

    deselectPE() {
        if (!this._selectedPE) { return }
        
        this._selectedPE.deselect()
        this._selectedPE = null
        this.deselectObserver()
        // propertyWindow.show(selectedPE)
    }

    movePE(id: string, displacement: Vector) {
        const genericPE = this.net.elements[id]

        if (genericPE.PEType === 'arc') {
            return
        }

        const petriElement = <APetriElement>genericPE;

        petriElement.move(displacement)

        for (const arcId of petriElement.connectedArcs) {
            if (genericPE.PEType === 'place') {
                //@ts-ignore
                this.net.elements[arcId].updatePlacePos(petriElement.position);
            } else {
                //@ts-ignore
                this.net.elements[arcId].updateTransPos(petriElement.position);
            }
        }
    }

    setGenericPEAttr(PEId: string, attrName: string, val: string) {
        const previousValue = this.net.getGenericPEAttr(PEId, attrName)
        this.net.setGenericPEAttr(PEId, attrName, val)

        this.undoRedoManager.registryChange(
            new SetGenericPEAttrChange(
                this.net, PEId, attrName, previousValue, val
            )
        )
    }

    removeElement(elementId: string) {
        if (this.net.elements[elementId].PEType !== 'arc') {
            let ele = <APetriElement>this.net.elements[elementId]
            while (ele.connectedArcs.length) {
                this.removeElement(ele.connectedArcs[0])
            }
        }
        
        this.undoRedoManager.registryChange(
            new RemoveElementChange(
                this.net,
                this.net.removeGenericPE(elementId)
            )
        )
    }

    undo() {
        return this.undoRedoManager.undo()
    }

    redo() {
        return this.undoRedoManager.redo()
    }

    toggleGrid() { this.net.grid = !this.net.grid }

    addIE(element: SVGAElement) {
        document.getElementById('IEs').appendChild(element)
    }

    moveScreen(displacement: Vector) {
        const viewBox = this.net.svgElement.viewBox.baseVal
        viewBox.x -= displacement.x
        viewBox.y -= displacement.y
    }

    zoom(focusPoint: Vector, scale: number) {
        const viewBox = this.net.svgElement.viewBox.baseVal
        viewBox.x += (focusPoint.x - viewBox.x)*(1 - scale)
        viewBox.y += (focusPoint.y - viewBox.y)*(1 - scale)
        viewBox.width = viewBox.width*scale
        viewBox.height = viewBox.height*scale
    }
}