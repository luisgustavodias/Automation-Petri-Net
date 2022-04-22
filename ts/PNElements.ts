import Vector from "./utils/Vector.js";
import {
    getLineEndPoint, getLineStartPoint,
    getLineMidPoint, setLineStartPoint, getLineDirection, createLine
} from './utils/SVGElement/Line.js';
import { Arrow } from "./utils/Arrow.js";
import { createCircle, setCircleCenter } from "./utils/SVGElement/Circle.js";
import { ArcData, PEId, PlaceData, PlaceType, TransData, ArcType } from "./PNData.js";
import { createRect } from "./utils/SVGElement/Rectangle.js";
import { createGroup, createText } from "./utils/SVGElement/others.js";

abstract class AGenericPetriElement {
    readonly svgElement: SVGGElement
    readonly PEType: string
    protected selected: boolean

    constructor (id: PEId, modelId: string) {
        this.svgElement = createGroup({id: id})
        this.selected = false
    }

    get id() {
        return this.svgElement.id
    }

    isSelected() {
        return this.selected
    }

    abstract select(): void

    abstract deselect(): void

    protected getPETextElement(attrName: string): SVGAElement {
        return this.svgElement.querySelector(`[PEText="${attrName}"]`)
    }

    protected getPEText(attrName: string) {
        return this.getPETextElement(attrName).innerHTML
    }

    protected setPEText(attrName: string, val: string) {
        this.getPETextElement(attrName).innerHTML = val
    }

    protected getPETextPosition(attrName: string) {
        const matrix = this.getPETextElement(attrName).transform
            .baseVal.getItem(0).matrix
        return new Vector(matrix.e, matrix.f)
    }

    protected setPETextPosition(attrName: string, pos: Vector) {
        const transform = this.getPETextElement(attrName).transform
            .baseVal.getItem(0)
        transform.setTranslate(pos.x, pos.y)
    }

    abstract getData()
}

abstract class APetriElement extends AGenericPetriElement {
    private _connectedArcs: string[]
    private _position: Vector

    constructor (id: PEId, modelId: string) {
        super(id, modelId)
        this.svgElement.setAttribute('transform', 'translate(0 0)')
        this._connectedArcs = []
        this._position = new Vector(0, 0)
    }

    get name() { return this.getPEText('name') }
    set name(val: string) { this.setPEText('name', val) }

    get connectedArcs() { return this._connectedArcs }

    get position() {
        return this._position
    }

    set position(coord: Vector) {
        this._position = coord
        const transform = this.svgElement.transform.baseVal.getItem(0);
        transform.setTranslate(coord.x, coord.y);
    }

    abstract getConnectionPoint(u: Vector)

    move(displacement: Vector) {
        this.position = this._position.add(displacement)
    }

    select() {
        this.selected = true
        this.svgElement.children[0].setAttribute('stroke', 'blue');
    }
    
    deselect() {
        this.selected = true
        this.svgElement.children[0].setAttribute('stroke', 'black');
    }
    
    connectArc(PEId: string) {
        if (this.connectedArcs.indexOf(PEId) !== -1) {
            throw "A reference to this arc already exists."
        }
        this.connectedArcs.push(PEId)
    }

    disconnectArc(PEId: string) {
        const index = this.connectedArcs.indexOf(PEId);
        if (index !== -1) {
            this.connectedArcs.splice(index, 1);
        }
    }

    isInside(topLeft: Vector, size: Vector) {
        if (topLeft.x > this.position.x)
            return false
        if (topLeft.y > this.position.y)
            return false
        if (topLeft.x + size.x < this.position.x)
            return false
        if (topLeft.y + size.y < this.position.y)
            return false
        
        return true
    }
}

class PetriPlace extends APetriElement {
    static placeRadius = 8
    static tokenRadius = 1.5
    readonly PEType = 'place'
    private _initialMark: string
    private _mark: number

    constructor (id: PEId) {
        super(id, 'place-model')
        this._initialMark = '0'
        this._mark = 0
        this.svgElement.appendChild(createCircle(
            new Vector(0,0), 
            PetriPlace.placeRadius,
            {
                fill: 'white',
                stroke: 'black',
                drag: 'pe',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createGroup())
        this.svgElement.appendChild(createText(
            'p1',
            new Vector(6.5, -8),
            {
                drag: 'self',
                PEText: 'name',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createText(
            'INT',
            new Vector(7, 8.5),
            {
                drag: 'self',
                PEText: 'placeType',
                PEParent: id
            }
        ))
    }

    get placeType() { 
        return <PlaceType>this.getPEText('placeType') 
    }

    set placeType(val: PlaceType) { 
        this.setPEText('placeType', val) 
    }

    get mark() {
        return this._mark
    }

    set mark(val: number) { 
        this._mark = val
        this.svgElement.children[1].innerHTML = ''

        let tokens: SVGCircleElement[] = []
        if (val === 0) {
            return
        } else if (val === 1) {
            tokens = [this.createToken(new Vector(0, 0))]
        } else if (val === 2) {
            const d = PetriPlace.tokenRadius * 1.3
            tokens = [
                this.createToken(new Vector(-d, 0)),
                this.createToken(new Vector(d, 0))                
            ]
        } else if (val === 3) {
            const d = PetriPlace.tokenRadius * 1.3
            tokens = [
                this.createToken(new Vector(0, -d)),
                this.createToken(new Vector(-d, d)),                
                this.createToken(new Vector(d, d))                
            ]
        } else if (val === 4) {
            const d = PetriPlace.tokenRadius * 1.3
            tokens = [
                this.createToken(new Vector(-d, -d)),
                this.createToken(new Vector(-d, d)),
                this.createToken(new Vector(d, -d)),                
                this.createToken(new Vector(d, d))                
            ]
        } else if (val === 5) {
            const d = PetriPlace.tokenRadius * 1.7
            tokens = [
                this.createToken(new Vector(0, 0)),
                this.createToken(new Vector(-d, -d)),
                this.createToken(new Vector(-d, d)),
                this.createToken(new Vector(d, -d)),                
                this.createToken(new Vector(d, d))                
            ]
        } else if (val === 6) {
            const d1 = PetriPlace.tokenRadius * 1.3
            const d2 = PetriPlace.tokenRadius * 2.3
            tokens = [
                this.createToken(new Vector(-d2, -d1)),
                this.createToken(new Vector(-d2, d1)),
                this.createToken(new Vector(0, -d1)),
                this.createToken(new Vector(0, d1)),
                this.createToken(new Vector(d2, -d1)),                
                this.createToken(new Vector(d2, d1))                
            ]
        } else if (val === 7) {
            const d1 = PetriPlace.tokenRadius * 1.3
            const d2 = PetriPlace.tokenRadius * 2.3
            tokens = [
                this.createToken(new Vector(-d2, -d1)),
                this.createToken(new Vector(-d2, d1)),
                this.createToken(new Vector(0, -d2)),
                this.createToken(new Vector(0, 0)),
                this.createToken(new Vector(0, d2)),
                this.createToken(new Vector(d2, -d1)),                
                this.createToken(new Vector(d2, d1))                
            ]
        } else {
            const r = 0.68*PetriPlace.placeRadius
            tokens = [
                createCircle(new Vector(0, 0), r)               
            ]
            tokens[0].setAttribute('PEParent', this.id)

            const textElement = document.createElementNS(
                'http://www.w3.org/2000/svg', 'text'
            )
            textElement.setAttribute('fill', 'white')
            textElement.setAttribute('text-anchor', 'middle')
            textElement.setAttribute('dominant-baseline', 'middle')
            textElement.setAttribute('transform', 'translate(0 0.5)')
            textElement.setAttribute('PEParent', this.id)

            if (val > 99) {
                textElement.innerHTML = '99+'
            } else {
                textElement.innerHTML = String(val)
            }

            this.svgElement.children[1].appendChild(textElement)
        }

        
        for (const token of tokens) {
            this.svgElement.children[1].prepend(token)
        }
    }

    get initialMark() { 
        return this._initialMark 
    }

    set initialMark(val: string) {
        this._initialMark = val
        this.mark = parseInt(val)
    }

    private createToken(pos: Vector) {
        const token = createCircle(pos, PetriPlace.tokenRadius)
        token.setAttribute('PEParent', this.id)

        return token
    }

    getConnectionPoint(u: Vector) {
        return this.position.add(u.mul(-PetriPlace.placeRadius))
    }

    getData(): PlaceData {
        return {
            id: this.id,
            elementType: this.PEType,
            name: this.name,
            placeType: this.placeType,
            initialMark: this.initialMark,
            position: this.position,
            textsPosition: {
                name: this.getPETextPosition('name'),
                placeType: this.getPETextPosition('name')
            }
        }
    }
}

class PetriTrans extends APetriElement {
    static transWidth = 5.5
    static transHeight = 3
    readonly PEType = 'trans'

    constructor (id: PEId) {
        super(id, 'trans-model')
        this.svgElement.appendChild(createRect(
            new Vector(0, 0), 
            PetriTrans.transWidth*2,
            PetriTrans.transHeight*2,
            {
                fill: 'black',
                stroke: 'black',
                drag: 'pe',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createText(
            'p1',
            new Vector(6, -5.5),
            {
                drag: 'self',
                PEText: 'name',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createText(
            '',
            new Vector(6, 5.5),
            {
                drag: 'self',
                PEText: 'delay',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createText(
            '',
            new Vector(-6, -5.5),
            {
                drag: 'self',
                PEText: 'guard',
                'text-anchor': 'end',
                style: 'font-family: courier',
                PEParent: id
            }
        ))
    }

    get delay() { 
        return this.getPEText('delay') 
    }

    set delay(val: string) { 
        this.setPEText('delay', val) 
    }

    get guard() { 
        return this.getPEText('guard') 
    }

    set guard(val: string) { 
        this.setPEText('guard', val) 
    }

    getConnectionPoint(u: Vector) {
        if (u.y !== 0) {
            let k;
            if (Math.abs(u.x * PetriTrans.transHeight / u.y) > PetriTrans.transWidth) {
                k = PetriTrans.transWidth / Math.abs(u.x);
            } else {
                k = PetriTrans.transHeight / Math.abs(u.y);
            }
            return this.position.add(u.mul(k));
        }
        return this.position.add(u.mul(PetriTrans.transWidth));
    }

    getData(): TransData {
        return {
            id: this.id,
            elementType: this.PEType,
            name: this.name,
            delay: this.delay,
            guard: this.guard,
            position: this.position,
            textsPosition: {
                name: this.getPETextPosition('name'),
                delay: this.getPETextPosition('delay'),
                guard: this.getPETextPosition('guard')
            }
        }
    }
}

class PetriArc extends AGenericPetriElement {
    static negBallRadius = 2
    readonly PEType = 'arc'

    private _arcType: ArcType
    private place: PetriPlace
    private trans: PetriTrans
    private arrow: Arrow
    private corners: Vector[]

    constructor (
        id: PEId,
        place: PetriPlace,
        trans: PetriTrans, 
        arctype: ArcType
    ) {
        super(id, 'arc-model')
        this.place = place
        this.trans = trans
        this.arrow = new Arrow()
        this.svgElement.appendChild(createGroup(
            {
                'stroke-linecap': 'round'
            }
        ))
        this.svgElement.appendChild(createGroup(
            {
                'stroke-linecap': 'round',
                'stroke': 'black'
            }
        ))
        this.svgElement.appendChild(createGroup())
        this.svgElement.appendChild(createCircle(
            new Vector(0,0), 
            PetriArc.negBallRadius,
            {
                fill: 'white',
                stroke: 'black',
                'stroke-width': '0.8',
                visibility: 'hidden',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createText(
            '1',
            new Vector(7, 8.5),
            {
                drag: 'self',
                PEText: 'weight',
                visibility: 'hidden',
                PEParent: id
            }
        ))
        this.arrow.line.setAttribute('PEParent', this.id)
        this.arrow.head.setAttribute('PEParent', this.id)
        this.svgElement.children[0].appendChild(this.arrow.line)
        this.svgElement.children[0].appendChild(this.arrow.head)
        this.corners = []
        this.arcType = arctype
    }

    private get lastCorner() { 
        return this.corners[this.corners.length - 1] 
    }

    private get linesGroup() {
        return this.svgElement.children[1]
    }

    private get negBall() { 
        return <SVGCircleElement>this.svgElement.children[3] 
    }

    private get weightElement() { 
        return this.svgElement.children[4] 
    }

    private get cornersGroup() { 
        return this.svgElement.children[2] 
    }

    get placeId() { 
        return this.place.id 
    }

    get transId() { 
        return this.trans.id 
    }

    get weight() { 
        return this.getPEText('weight') 
    }

    set weight(val) { 
        this.setPEText('weight', val)
        if (val === '1') {
            this.getPETextElement('weight')
                .setAttribute('visibility', 'hidden')
        } else {
            this.getPETextElement('weight')
                .setAttribute('visibility', 'visible')
        }
    }

    get arcType() { 
        return this._arcType 
    }

    set arcType(val: ArcType) {
        if (val === "Test") {
            this.linesGroup.setAttribute('stroke-dasharray', '2 2')
            this.arrow.line.setAttribute('stroke-dasharray', '2 2')
        }
        else {
            this.linesGroup.setAttribute('stroke-dasharray', '')
            this.arrow.line.setAttribute('stroke-dasharray', '')
        }
        if (val === "Inhibitor") {
            this.negBall.setAttribute('visibility', 'visible');
        }
        else {
            this.negBall.setAttribute('visibility', 'hidden');
        }
        if (this.arcType !== val && 
                (val === 'Output' || this._arcType === 'Output')) {
            this.corners.reverse()
        }
        this._arcType = val
        this.svgElement.setAttribute('arc-type', val)
        
        this.updateLines()
        this.updatePlacePos()
        this.updateTransPos()
    }

    getCornerPos(cornerIndex: number) {
        return this.corners[cornerIndex]
    }

    private updateWeightPos() {
        let n = this.corners.length
        let direction: Vector
        let anchorPoint: Vector
        if (n === 0) {
            anchorPoint = this.arrow.getMidPoint()
            direction = this.arrow.getDirection()
        } else {
            if (n % 2 === 1) {
                anchorPoint = getLineMidPoint(
                    <SVGLineElement>this.linesGroup.children[(n - 1)/2]
                )
                direction = getLineDirection(
                    <SVGLineElement>this.linesGroup.children[(n - 1)/2]
                )
            } else {
                anchorPoint = getLineStartPoint(
                    <SVGLineElement>this.linesGroup.children[n/2]
                )
                direction = getLineDirection(
                    <SVGLineElement>this.linesGroup.children[n/2]
                )
            }
        }
        
        let pos = anchorPoint.add(
            direction.norm().ortogonal().mul(4.5)
        )
        this.weightElement.setAttribute('x', String(pos.x))
        this.weightElement.setAttribute('y', String(pos.y))
    }

    private updateInhibitorArrow(connectionPoint: Vector, u: Vector) {
        setCircleCenter(
            this.negBall,
            connectionPoint.add(u.mul(PetriArc.negBallRadius))
        )
        
        this.arrow.updateHeadPos(
            connectionPoint.add(u.mul(2*PetriArc.negBallRadius))
        )
    }

    private noCornerUpdate() {
        let u = (this.place.position.sub(this.trans.position)).norm()
        let placePoint = this.place.getConnectionPoint(u)
        let transPoint = this.trans.getConnectionPoint(u)
        // setCircleCenter(<any>this.svgElement.children[3], placePoint)
        // setCircleCenter(<any>this.svgElement.children[4], transPoint)
        
        if (this._arcType === 'Output') {
            this.arrow.update(transPoint, placePoint)
        } else {
            if (this._arcType === 'Inhibitor') {
                this.arrow.updateTailPos(placePoint)
                this.updateInhibitorArrow(transPoint, u)
            } else {
                this.arrow.update(placePoint, transPoint)
            }
        }
        //this.updateWeightPos()
    }

    private newLine(startPoint: Vector, endPoint: Vector) {
        const line = createLine(startPoint, endPoint, {
            PEParent: this.id
        })
        this.linesGroup.appendChild(line)
    }

    private updateLines() {
        this.linesGroup.innerHTML = ''
        if (!this.corners.length) return

        let startPoint
        if (this._arcType === "Output") {
            const u = this.trans.position.sub(this.corners[0]).norm()
            startPoint = this.trans.getConnectionPoint(u)
        } else {
            const u = this.place.position.sub(this.corners[0]).norm()
            startPoint = this.place.getConnectionPoint(u)
        }
        for (let i = 0; i < this.corners.length; i++) {
            if (i == 0) {
                this.newLine(startPoint, this.corners[0])
            } else {
                this.newLine(
                    this.corners[i-1],
                    this.corners[i]
                )
            }
        }
    }

    private cleanNodes() {
        this.cornersGroup.innerHTML = ''
    }

    private showNodes() {
        this.cleanNodes()

        const lines = <HTMLCollectionOf<SVGLineElement>>this.
            linesGroup.children
        for (let i = 0; i < lines.length; i++) {
            this.createNode(i, getLineMidPoint(lines[i]), 'arcMidNode')
            this.createNode(i, getLineEndPoint(lines[i]), 'corner')
        }

        this.createNode(
            lines.length, 
            this.arrow.getMidPoint(), 
            'arcMidNode'
        )
    }

    private updateArc() {
        this.updateLines()
        this.updatePlacePos()
        this.updateTransPos()

        if (this.selected)
            this.showNodes()
    }

    private createNode(idx: number, pos: Vector, type: string) {
        const node = createRect(pos, 3, 3)
        node.setAttribute('PEParent', this.id)
        node.setAttribute('cornerIdx', String(idx))
        node.setAttribute('stroke', 'black')
        node.setAttribute('stroke-width', '0.6')
        node.setAttribute('drag', type)
        
        if (type === 'arcMidNode') {
            node.setAttribute('fill', 'blue')
        } else {
            node.setAttribute('fill', 'yellow')
        }
        
        this.cornersGroup.appendChild(node)
    }

    updatePlacePos() {
        this.place.position

        if (this.corners.length === 0) {
            this.noCornerUpdate()
        } else if (this._arcType === "Output") {
            this.arrow.update(
                this.lastCorner,
                this.place.getConnectionPoint(
                    this.place.position.sub(this.lastCorner).norm()
                )
            )
        } else {
            setLineStartPoint(
                <SVGLineElement>this.linesGroup.children[0], 
                this.place.getConnectionPoint(
                    this.place.position.sub(this.corners[0]).norm()
                )
            )
        }
    }

    updateTransPos() {
        if (this.corners.length === 0) {
            this.noCornerUpdate()
        } else if (this._arcType === "Output") {
            const u = this.corners[0].sub(this.trans.position).norm()
            const connectionPoint = this.trans.getConnectionPoint(u)
            setLineStartPoint(
                <SVGLineElement>this.linesGroup.children[0], 
                connectionPoint
            )
        } else {
            const u = this.lastCorner.sub(this.trans.position).norm()
            const connectionPoint = this.trans.getConnectionPoint(u)
            this.arrow.updateTailPos(this.lastCorner)

            if (this._arcType === "Inhibitor") {
                this.updateInhibitorArrow(connectionPoint, u) 
            } else {
                this.arrow.updateHeadPos(
                    connectionPoint
                )
            }
        }
    }

    addCorner(cornerIndex: number) {
        if (cornerIndex < this.corners.length) {
            const pos = getLineMidPoint(
                <SVGLineElement>this.linesGroup.children[cornerIndex]
            )
            this.corners.splice(cornerIndex, 0, pos)
        } else if (cornerIndex === this.corners.length) {
            const pos = this.arrow.getMidPoint()
            this.corners.push(pos)
        } else {
            throw "Invalid corner index"
        }

        this.updateArc()
    }

    removeCorner(cornerIndex: number) {
        if (cornerIndex >= this.corners.length) {
            throw "Invalid cornerIndex"
        } 
        
        this.corners.splice(cornerIndex, 1)
        this.updateArc()
    }

    moveCorner(idx: number, pos: Vector) {
        this.corners[idx] = pos
        this.updateArc()
    }

    setArcColor(color: string) {
        this.linesGroup.setAttribute('stroke', color);
        this.negBall.setAttribute('stroke', color);
        this.arrow.line.setAttribute('stroke', color);
        this.arrow.head.setAttribute('fill', color);
        this.arrow.head.setAttribute('stroke', color);
    }

    select() {
        this.selected = true
        this.setArcColor('blue')
        this.showNodes()
    }
        
    deselect() {
        this.selected = false
        this.setArcColor('black')
        this.cleanNodes()
    }

    /*
     * Return the vector with the points the define the arc path.
     * The start point, the corners and the and the end point.
     */
    getArcPath() {
        if (this.corners.length) {
            return [
                getLineStartPoint(
                    <SVGLineElement>this.linesGroup.children[0]
                ), 
                ...this.corners,
                this.arrow.getHeadPos()
            ]
        }

        return [this.arrow.getTailPos(), this.arrow.getHeadPos()]
    }

    getData(): ArcData {
        return {
            id: this.id,
            elementType: this.PEType,
            placeId: this.placeId,
            transId: this.transId,
            arcType: this.arcType,
            weight: this.weight,
            textsPosition: {
                weight: this.getPETextPosition('weight')
            }
        }
    }
}


export {AGenericPetriElement, APetriElement, PetriPlace, 
    PetriTrans, PetriArc}