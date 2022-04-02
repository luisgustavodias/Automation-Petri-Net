import Vector from "./utils/Vector.js";
import {
    getLineEndPoint, getLineStartPoint,
    getLineMidPoint, setLineEndPoint, setLineStartPoint, getLineDirection
} from './utils/Line.js';
import { Arrow } from "./utils/Arrow.js";
import { createCircle } from "./utils/Circle.js";

const arcNodeModel = <SVGAElement><unknown>document.getElementById('arc-node-model')

type ArcType = "Input" | "Output" | "Test" | "Inhibitor"
type ArcNodeType = "mid" | "corner"
type PetriELmentType = "place" | "trans" | "arc"

interface IPetriElement {
    readonly id: string
    readonly PEType: PetriELmentType

    select(): void
    deselect(): void
    getAttr(attrName: string): string
    setAttr(attrName: string): void
}

abstract class AGenericPetriElement {
    readonly svgElement: SVGGElement
    readonly PEType: string

    abstract select(): void
    abstract deselect(): void

    constructor (ele: SVGGElement) {
        this.svgElement = ele
    }

    get id() {
        return this.svgElement.id
    }

    protected getPETextElement(attrName: string) {
        return this.svgElement.querySelector(`[pe-text="${attrName}"]`)
    }

    getPEText(attrName: string) {
        return this.getPETextElement(attrName).innerHTML
    }

    setPEText(attrName: string, val: string) {
        this.getPETextElement(attrName).innerHTML = val
    }
}

class APetriElement extends AGenericPetriElement {
    private _connectedArcs: string[]
    private _position: Vector

    constructor (ele: SVGGElement) {
        super(ele)
        this._connectedArcs = []
        this._position = this.getPosition()
    }

    get name() { return this.getPEText('name') }
    set name(val: string) { this.setPEText('name', val) }

    get connectedArcs() { return this._connectedArcs }

    get position() {
        return this._position
    }

    set position(coord: Vector) {
        this._position = coord
        let transform = this.svgElement.transform.baseVal.getItem(0);
        transform.setTranslate(coord.x, coord.y);
    }

    move(displacement: Vector) {
        this.position = this._position.add(displacement)
    }

    private getPosition() {
        let matrix = this.svgElement.transform.baseVal.getItem(0).matrix;
        return new Vector(matrix.e, matrix.f);
    }

    

    select() {
        this.svgElement.children[0].setAttribute('stroke', 'blue');
    }
    
    deselect() {
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
}

class PetriPlace extends APetriElement {
    static placeRadius = 8
    static tokenRadius = 1.5
    readonly PEType = 'place'

    constructor (ele: SVGGElement) {
        super(ele)
        this.initialMark = '0'
    }

    get placeType() { return this.getPEText('placeType') }
    set placeType(val: string) { this.setPEText('placeType', val) }

    set mark(val: string) { 
        this.svgElement.children[1].innerHTML = ''

        let tokens: SVGCircleElement[] = []
        if (val === '0') {
            return
        } else if (val === '1') {
            tokens = [this.createToken(new Vector(0, 0))]
        } else if (val === '2') {
            const d = PetriPlace.tokenRadius * 1.3
            tokens = [
                this.createToken(new Vector(-d, 0)),
                this.createToken(new Vector(d, 0))                
            ]
        } else if (val === '3') {
            const d = PetriPlace.tokenRadius * 1.3
            tokens = [
                this.createToken(new Vector(0, -d)),
                this.createToken(new Vector(-d, d)),                
                this.createToken(new Vector(d, d))                
            ]
        } else if (val === '4') {
            const d = PetriPlace.tokenRadius * 1.3
            tokens = [
                this.createToken(new Vector(-d, -d)),
                this.createToken(new Vector(-d, d)),
                this.createToken(new Vector(d, -d)),                
                this.createToken(new Vector(d, d))                
            ]
        } else if (val === '5') {
            const d = PetriPlace.tokenRadius * 1.7
            tokens = [
                this.createToken(new Vector(0, 0)),
                this.createToken(new Vector(-d, -d)),
                this.createToken(new Vector(-d, d)),
                this.createToken(new Vector(d, -d)),                
                this.createToken(new Vector(d, d))                
            ]
        } else if (val === '6') {
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
        } else if (val === '7') {
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
            tokens[0].setAttribute('pe-parent', this.id)

            const textElement = document.createElementNS(
                'http://www.w3.org/2000/svg', 'text'
            )
            textElement.setAttribute('fill', 'white')
            textElement.setAttribute('text-anchor', 'middle')
            textElement.setAttribute('dominant-baseline', 'middle')
            textElement.setAttribute('transform', 'translate(0 0.5)')
            textElement.setAttribute('pe-parent', this.id)

            if (parseInt(val) > 99) {
                textElement.innerHTML = '99+'
            } else {
                textElement.innerHTML = val
            }

            this.svgElement.children[1].appendChild(textElement)
        }

        
        for (const token of tokens) {
            this.svgElement.children[1].prepend(token)
        }
    }

    get initialMark() { return this.svgElement.getAttribute('initialMark') }
    set initialMark(val: string) {
        this.svgElement.setAttribute('initialMark', val)
        this.mark = val
    }

    createToken(pos: Vector) {
        const token = createCircle(pos, PetriPlace.tokenRadius)
        token.setAttribute('pe-parent', this.id)

        return token
    }

    static getConnectionPoint(placePos: Vector, u: Vector) {
        return placePos.add(u.mul(-this.placeRadius))
    }
}

class PetriTrans extends APetriElement {
    static transWidth = 5.5
    static transHeight = 3
    readonly PEType = 'trans'

    constructor (ele: SVGGElement) {
        super(ele)
    }

    get delay() { return this.getPEText('delay') }
    set delay(val: string) { this.setPEText('delay', val) }

    get guard() { return this.getPEText('guard') }
    set guard(val: string) { this.setPEText('guard', val) }

    static getConnectionPoint(transPos: Vector, u: Vector) {
        if (u.y !== 0) {
            let k;
            if (Math.abs(u.x * this.transHeight / u.y) > this.transWidth) {
                k = this.transWidth / Math.abs(u.x);
            } else {
                k = this.transHeight / Math.abs(u.y);
            }
            return transPos.add(u.mul(k));
        }
        return transPos.add(u.mul(this.transWidth));
    }
}

class PetriArc extends AGenericPetriElement {
    static negBallRadius = 2
    readonly PEType = 'arc'

    private _arcType: ArcType
    private _placePos: Vector
    private _transPos: Vector
    private arrow: Arrow

    constructor (
        ele: SVGGElement, 
        placeId: string, 
        transId: string, 
        arctype: ArcType
    ) {
        super(ele)
        this.svgElement.setAttribute('place-id', placeId)
        this.svgElement.setAttribute('trans-id', transId)
        this._placePos = new Vector(0, 0)
        this._transPos = new Vector(1, 0)
        this.arrow = new Arrow(
            <SVGLineElement>this.svgElement.children[0].children[0],
            <SVGPolygonElement>this.svgElement.children[1]
        )
        this.arcType = arctype
    }

    get placeId() { return this.svgElement.getAttribute('place-id') }
    get transId() { return this.svgElement.getAttribute('trans-id') }
    get weight() { return this.getPEText('weight') }
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
    get arcType() { return this._arcType }
    set arcType(val: ArcType) {
        if (val === "Test") {
            this.svgElement.children[0].setAttribute('stroke-dasharray', '2 2');
        }
        else {
            this.svgElement.children[0].setAttribute('stroke-dasharray', '');
        }
        if (val === "Inhibitor") {
            this.svgElement.children[2].setAttribute('visibility', 'visible');
        }
        else {
            this.svgElement.children[2].setAttribute('visibility', 'hidden');
        }
        this._arcType = val
        this.svgElement.setAttribute('arc-type', val)
        let lines = this.getLines()
        if (lines.length === 1) {
            this.singleLineUpdate()
        } else {
            setLineEndPoint(lines[0], getLineStartPoint(lines[1]))
            setLineStartPoint(
                lines[lines.length - 1], 
                getLineEndPoint(lines[lines.length - 2])
            )
            this.updatePlacePos(this._placePos)
            this.updateTransPos(this._transPos)
        }
    }

    private getLines() {
        return <HTMLCollectionOf<SVGLineElement>>this.svgElement.children[0].children
    }

    private updateWeightPos() {
        let lines = this.getLines()
        let n = lines.length
        let line: SVGLineElement
        let anchorPoint: Vector
        if (n % 2 === 1) {
            line = lines[(n - 1)/2]
            anchorPoint = getLineMidPoint(line)
        } else {
            line = lines[n/2]
            anchorPoint = getLineStartPoint(line)
        }
        
        let pos = anchorPoint.add(
            getLineDirection(line).norm().ortogonal().mul(4.5)
        )
        this.svgElement.children[3].setAttribute('x', String(pos.x))
        this.svgElement.children[3].setAttribute('y', String(pos.y))
    }

    private updateNegBall(pos: Vector) {
        this.svgElement.children[2].setAttribute('cx', String(pos.x))
        this.svgElement.children[2].setAttribute('cy', String(pos.y))
    }

    private updateInhibitorArrow(
        tailPos: Vector, connectionPoint: Vector, u: Vector
    ) {
        this.updateNegBall(
            connectionPoint.add(u.mul(PetriArc.negBallRadius))
        )
        
        this.arrow.update(
            tailPos,
            connectionPoint.add(u.mul(2*PetriArc.negBallRadius))
        )
    }

    private singleLineUpdate() {
        let u = (this._placePos.sub(this._transPos)).norm()
        let placePoint = PetriPlace.getConnectionPoint(this._placePos, u)
        let transPoint = PetriTrans.getConnectionPoint(this._transPos, u);
        if (this._arcType === 'Output') {
            this.arrow.update(transPoint, placePoint)
        } else {
            if (this._arcType === 'Inhibitor') {
                this.updateInhibitorArrow(placePoint, transPoint, u)
            } else {
                this.arrow.update(placePoint, transPoint)
            }
        }
        this.updateWeightPos()
    }

    updatePlacePos(pos: Vector) {
        this._placePos = pos
        let lines = this.getLines()

        if (lines.length === 1) {
            this.singleLineUpdate()
        } else if (this._arcType === "Output") {
            this.arrow.updateHeadPos(
                PetriPlace.getConnectionPoint(
                    pos,
                    this.arrow.getDirection()
                )
            )
        } else {
            setLineStartPoint(
                lines[0], 
                PetriPlace.getConnectionPoint(
                    pos,
                    this.arrow.getDirection()
                )
            )
        }
    }

    updateTransPos(pos: Vector) {
        this._transPos = pos
        let lines = this.getLines()

        if (lines.length === 1) {
            this.singleLineUpdate()
        } else {
            let u = this.arrow.getDirection()
            let connectionPoint = PetriTrans.getConnectionPoint(pos, u)

            if (this._arcType === "Output") {
                setLineStartPoint(
                    lines[0], 
                    connectionPoint
                )
            } else {
                if (this._arcType === "Inhibitor") {
                    this.updateInhibitorArrow(
                        getLineEndPoint(lines[lines.length - 2]),
                        connectionPoint,
                        u
                    )
                }
                this.arrow.updateHeadPos(
                    connectionPoint
                )
            }
        }
    }

    select() {
        this.svgElement.children[0].setAttribute('stroke', 'blue');
        this.svgElement.children[1].setAttribute('fill', 'blue');
        this.svgElement.children[2].setAttribute('stroke', 'blue');
        // this.showNodes()
    }
        
    deselect() {
        this.svgElement.children[0].setAttribute('stroke', 'black');
        this.svgElement.children[1].setAttribute('fill', 'black');
        this.svgElement.children[2].setAttribute('stroke', 'black');
        // this.cleanNodes()
    }

    splitLine(i: number) {
        let lines = this.getLines()
        let ele = lines[i].cloneNode(true)
        this.svgElement.children[0].insertBefore(ele, lines[i])
        let midPoint = getLineMidPoint(lines[i])
        setLineEndPoint(lines[i], midPoint)
        setLineStartPoint(lines[i + 1], midPoint)
    }

    setNodePos(node: SVGRectElement, coord: Vector) {
        let transform = node.transform.baseVal.getItem(0);
        transform.setTranslate(coord.x, coord.y);
    }

    private createNode(
        nodeType: ArcNodeType, i: number, line: SVGLineElement
    ) {
        let group = document.getElementById('arc-nodes')
        let node = <SVGRectElement>arcNodeModel.cloneNode(true)
        node.id = 'arc-' + nodeType + '-node-' + i
        node.setAttribute('pe-parent', this.id)
        node.setAttribute('arc-node-type', nodeType)
        node.setAttribute('arc-node-line', String(i))
 
        if (nodeType === 'mid') {
            node.setAttribute('fill', 'blue')
            this.setNodePos(node, getLineMidPoint(line))
        } else {
            node.setAttribute('fill', 'yellow')
            this.setNodePos(node, getLineStartPoint(line))
        }
        group.appendChild(node)
    }

    showNodes() {
        let lines = this.getLines()
        for (let i = 0; i < lines.length; i++) {
            this.createNode('mid', i, lines[i])
            if (i > 0) {
                this.createNode('corner', i, lines[i])
            }
        }
    }

    cleanNodes() {
        document.getElementById('arc-nodes').innerHTML = ''
    }
}


export {AGenericPetriElement, APetriElement, PetriPlace, 
    PetriTrans, PetriArc, ArcType}