import Vector from "../utils/Vector.js";
import { CurvedArrow } from "../utils/Arrow.js";
import { createCircle } from "../utils/SVGElement/Circle.js";
import { ArcData, PEId, PlaceData, PlaceType, TransData, ArcType } from "../PNData.js";
import { createRect } from "../utils/SVGElement/Rectangle.js";
import { createGroup, createText } from "../utils/SVGElement/others.js";

abstract class AGenericPetriElement {
    readonly svgElement: SVGGElement
    readonly PEType: string = ""
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

    protected getPETextElement(attrName: string) {
        return <SVGAElement>this.svgElement
            .querySelector(`[PEText="${attrName}"]`)
    }

    protected getPEText(attrName: string) {
        return this.getPETextElement(attrName).innerHTML
    }

    protected setPEText(attrName: string, val: string) {
        this.getPETextElement(attrName).innerHTML = val
    }

    getPETextPosition(attrName: string) {
        const matrix = this.getPETextElement(attrName).transform
            .baseVal.getItem(0).matrix
        return new Vector(matrix.e, matrix.f)
    }

    setPETextPosition(attrName: string, pos: Vector) {
        const transform = this.getPETextElement(attrName).transform
            .baseVal.getItem(0)
        transform.setTranslate(pos.x, pos.y)
    }

    abstract getData(): any
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

    abstract getConnectionPoint(u: Vector): Vector

    select() {
        this.selected = true
        this.svgElement.children[0].setAttribute('stroke', 'var(--color-select)');
    }
    
    deselect() {
        this.selected = true
        this.svgElement.children[0].setAttribute('stroke', 'var(--color-default)');
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
                fill: 'var(--color-bg)',
                stroke: 'var(--color-default)',
                drag: 'pe',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createGroup())
        this.svgElement.appendChild(createText(
            'p1',
            new Vector(6.5, -8),
            {
                drag: 'PEText',
                PEText: 'name',
                fill: 'var(--color-text)',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createText(
            'INT',
            new Vector(7, 8.5),
            {
                drag: 'PEText',
                PEText: 'placeType',
                fill: 'var(--color-text)',
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
                this.createToken(new Vector(0, 0), r)
            ]

            const textElement = document.createElementNS(
                'http://www.w3.org/2000/svg', 'text'
            )
            textElement.style.fill = 'var(--color-bg)'
            textElement.setAttribute('text-anchor', 'middle')
            textElement.setAttribute('dominant-baseline', 'middle')
            textElement.setAttribute('transform', 'translate(0 0.5)')
            textElement.setAttribute('PEParent', this.id)
            textElement.setAttribute('drag', 'pe')

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

    private createToken(pos: Vector, radius = PetriPlace.tokenRadius) {
        const token = createCircle(pos, radius, {fill: 'var(--color-default)'})
        token.setAttribute('PEParent', this.id)
        token.setAttribute('drag', 'pe')

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
                placeType: this.getPETextPosition('placeType')
            }
        }
    }
}

class PetriTrans extends APetriElement {
    static transWidth = 5.5
    static transHeight = 3
    readonly PEType = 'trans'
    private priority: string = '0'

    constructor (id: PEId) {
        super(id, 'trans-model')
        this.svgElement.appendChild(createRect(
            new Vector(0, 0), 
            PetriTrans.transWidth*2,
            PetriTrans.transHeight*2,
            {
                fill: 'var(--color-default)',
                stroke: 'var(--color-default)',
                drag: 'pe',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createText(
            'p1',
            new Vector(6, -5.5),
            {
                drag: 'PEText',
                PEText: 'name',
                fill: 'var(--color-text)',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createText(
            '',
            new Vector(6, 5.5),
            {
                drag: 'PEText',
                PEText: 'delay',
                fill: 'var(--color-text)',
                PEParent: id
            }
        ))
        this.svgElement.appendChild(createText(
            '',
            new Vector(-6, -5.5),
            {
                drag: 'PEText',
                PEText: 'guard',
                'text-anchor': 'end',
                fill: 'var(--color-text)',
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
            priority: this.priority,
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
    private arrow: CurvedArrow

    constructor (
        id: PEId,
        place: PetriPlace,
        trans: PetriTrans, 
        arctype: ArcType
    ) {
        super(id, 'arc-model')
        this.place = place
        this.trans = trans
        const arrowGroup = createGroup()
        this.arrow = new CurvedArrow(
            arrowGroup,
            place.position,
            trans.position,
            this.id
        )
        this.arrow.setColor('var(--color-default)')
        this.svgElement.appendChild(arrowGroup)
        this.svgElement.appendChild(createGroup())
        this.svgElement.appendChild(createText(
            '1',
            new Vector(0, 0),
            {
                'text-anchor': 'middle',
                'dominant-baseline': 'central',
                fill: 'var(--color-text)',
                drag: 'PEText',
                PEText: 'weight',
                visibility: 'hidden',
                PEParent: id
            }
        ))
        
        this._arcType = arctype
        this.arcType = arctype
    }

    private get weightElement() { 
        return this.svgElement.children[2] 
    }

    private get cornersGroup() { 
        return this.svgElement.children[1] 
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
        if (this.arcType !== val && 
                (val === 'Output' || this._arcType === 'Output')) {
            this.arrow.reverse()
        }
        this._arcType = val
        this.arrow.setArcType(val)
        this.updateAll()
    }

    getCornerPos(cornerIndex: number) {
        return this.arrow.getPointPos(cornerIndex + 1)
    }

    private updateWeightPos() {
        const n = Math.floor(this.arrow.numberOfCorners()/2)
        const direction = this.arrow.getPointPos(n + 1).sub(
            this.arrow.getPointPos(n)
        )
        const anchorPoint = this.arrow.getPointPos(n + 1)
            .add(this.arrow.getPointPos(n)).mul(0.5)
        
        const pos = anchorPoint.add(
            direction.norm().ortogonal().mul(6)
        )
        this.weightElement.setAttribute('x', String(pos.x))
        this.weightElement.setAttribute('y', String(pos.y))
    }

    private noCornerUpdate() {
        const u = this.place.position.sub(this.trans.position).norm()
        const placePoint = this.place.getConnectionPoint(u)
        const transPoint = this.trans.getConnectionPoint(u)
        
        if (this._arcType === 'Output') {
            this.arrow.updateTips(transPoint, placePoint)
        } else {
            this.arrow.updateTips(placePoint, transPoint)
        }
        
        this.updateWeightPos()
    }

    private cleanNodes() {
        this.cornersGroup.innerHTML = ''
    }

    private showNodes() {
        this.cleanNodes()

        const corners = this.arrow.getCorners()
        const midPoints = this.arrow.getLinesMidPoint()

        for (let i = 0; i < midPoints.length; i++) {
            this.createNode(i, midPoints[i], 'arcMidNode')
            if (i < corners.length)
                this.createNode(i, corners[i], 'corner')
        }
    }

    private createNode(idx: number, pos: Vector, type: string) {
        const node = createRect(pos, 3, 3)
        node.setAttribute('PEParent', this.id)
        node.setAttribute('cornerIdx', String(idx))
        node.setAttribute('stroke', 'var(--color-default)')
        node.setAttribute('stroke-width', '0.6')
        node.setAttribute('drag', type)
        
        if (type === 'arcMidNode') {
            node.setAttribute('fill', 'var(--color-select)')
        } else {
            node.setAttribute('fill', 'yellow')
        }
        
        this.cornersGroup.appendChild(node)
    }

    updatePlacePos() {
        this.place.position

        if (!this.arrow.hasCorner()) {
            this.noCornerUpdate()
        } else if (this._arcType === "Output") {
            this.arrow.updateHeadPos(
                this.place.getConnectionPoint(
                    this.place.position.sub(
                        this.arrow.getPointPos(-2)
                    ).norm()
                )
            )
        } else {
            this.arrow.updateTailPos(
                this.place.getConnectionPoint(
                    this.place.position.sub(
                        this.arrow.getPointPos(1)
                    ).norm()
                )
            )

            if (this.arrow.numberOfCorners() === 1)
                this.updateWeightPos()
        }
    }

    updateTransPos() {
        if (!this.arrow.hasCorner()) {
            this.noCornerUpdate()
        } else if (this._arcType === "Output") {
            this.arrow.updateTailPos(
                this.trans.getConnectionPoint(
                    this.trans.position.sub(
                        this.arrow.getPointPos(1)
                    ).norm()
                )
            )
            
            if (this.arrow.numberOfCorners() === 1)
                this.updateWeightPos()
        } else {
            this.arrow.updateHeadPos(
                this.trans.getConnectionPoint(
                    this.trans.position.sub(
                        this.arrow.getPointPos(-2)
                    ).norm().neg()
                )
            )
        }
    }

    updateAll() {
        this.updatePlacePos()
        this.updateTransPos()
    }

    addCorner(cornerIndex: number) {
        this.arrow.addCorner(cornerIndex)
    }

    removeCorner(cornerIndex: number) {
        this.arrow.removeCorner(cornerIndex + 1)
        
        this.updateAll()
        if (this.selected)
            this.showNodes()
    }

    moveCorner(idx: number, pos: Vector) {
        this.arrow.moveCorner(idx+1, pos)

        this.updateAll()
        if (this.selected)
            this.showNodes()
    }

    setArcColor(color: string) {
        this.arrow.setColor(color)
    }

    select() {
        this.selected = true
        this.setArcColor('var(--color-select)')
        this.showNodes()
    }
        
    deselect() {
        this.selected = false
        this.setArcColor('var(--color-default)')
        this.cleanNodes()
    }

    getArcPath() {
        return this.arrow.getPath()
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
            },
            corners: this.arrow.getCorners()
        }
    }
}


export {AGenericPetriElement, APetriElement, PetriPlace, 
    PetriTrans, PetriArc}