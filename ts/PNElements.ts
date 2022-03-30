import Vector from "./utils/Vector.js";
import {
    getLineEndPoint, getLineStartPoint,
    getLineMidPoint, setLineEndPoint, setLineStartPoint, getLineDirection
} from './utils/Line.js';

const arcNodeModel = <SVGAElement><unknown>document.getElementById('arc-node-model')

export class GenericPetriElement {
    _element: SVGAElement

    constructor(ele: SVGAElement) {
        this._element = ele;
    }

    get PNElementType() {
        return 'generic'
    }

    get id() {
        return this._element.id;
    }

    select() {
        this._element.children[0].setAttribute('stroke', 'blue');
    }

    deselect() {
        this._element.children[0].setAttribute('stroke', 'black');
    }

    remove() {
        this._element.remove()
    }

    getProperty(name: string) {
        return this._element.getElementsByClassName(this.PNElementType + "-" + name)[0].innerHTML;
    }

    setProperty(name: string, val: string) {
        this._element.getElementsByClassName(this.PNElementType + "-" + name)[0].innerHTML = val;
    }

    get isDraggable() {
        return this._element.classList.contains('draggable')
    }
}

export class PetriElement extends GenericPetriElement {
    arcs: Array<string>

    constructor(ele: SVGAElement) {
        super(ele);
        this.arcs = [];
    }

    setPosition(coord: Vector) {
        let transform = this._element.transform.baseVal.getItem(0);
        transform.setTranslate(coord.x, coord.y);
    }

    getPosition() {
        let matrix = this._element.transform.baseVal.getItem(0).matrix;
        return new Vector(matrix.e, matrix.f);
    }

    get name() {
        return this.getProperty("name");
    }

    set name(val) {
        this.setProperty("name", val);
    }
}

export class PetriPlace extends PetriElement {
    placeRadius = 7.5

    constructor(ele: SVGAElement) {
        super(ele)
    }

    get PNElementType() {
        return 'place';
    }

    get type() {
        return this.getProperty("type");
    }

    set type(val) {
        this.setProperty("type", val);
    }

    get mark() {
        return parseInt(this.getProperty("mark"));
    }

    set mark(val: number) {
        this.setProperty("mark", String(val));
    }

    get initialMark() {
        return this._element.getAttribute('initialmark')
    }

    set initialMark(val: string) {
        this._element.setAttribute('initialmark', val)
    }

    getConnectionPoint(u: Vector) {
        return this.getPosition().add(u.mul(-this.placeRadius))
    }
}

export class PetriTrans extends PetriElement {
    transWidth = 5.5
    transHeight = 3

    constructor(ele: SVGAElement) {
        super(ele);
    }

    get PNElementType() {
        return 'trans';
    }

    get time() {
        return this.getProperty('time');
    }

    set time(val) {
        this.setProperty('time', val)
    }

    get guard() {
        return this.getProperty('guard');
    }

    set guard(val) {
        this.setProperty('guard', val)
    }

    getConnectionPoint(u: Vector) {
        if (u.y !== 0) {
            let k;
            if (Math.abs(u.x * this.transHeight / u.y) > this.transWidth) {
                k = this.transWidth / Math.abs(u.x);
            } else {
                k = this.transHeight / Math.abs(u.y);
            }
            return this.getPosition().add(u.mul(k));
        }
        return this.getPosition().add(u.mul(this.transWidth));
    }
}

export class AbstractPetriArc extends GenericPetriElement {
    headWidth = 6
    headHeight = 2

    place: PetriPlace
    trans: PetriTrans
    _type: string

    constructor(ele: SVGAElement, place: PetriPlace, trans: PetriTrans, type: string) {
        super(ele)
        this.place = place
        this.trans = trans
        this._type = type
    }

    get placePos() {
        return this.place.getPosition()
    }

    get transPos() {
        return this.trans.getPosition()
    }

    get lines() {
        return <HTMLCollectionOf<SVGLineElement>>this._element.children[0].children
    }

    getPlaceConnectionPoint(u: Vector) {
        return this.place.getConnectionPoint(u)
    }

    getTransConnectionPoint(u: Vector) {
        return this.trans.getConnectionPoint(u)
    }

    updateLine(startPoint: Vector, endPoint: Vector) {
        this.lines[0].setAttribute('x1', String(startPoint.x))
        this.lines[0].setAttribute('y1', String(startPoint.y))
        this.lines[0].setAttribute('x2', String(endPoint.x))
        this.lines[0].setAttribute('y2', String(endPoint.y))
    }

    drawHead(u: Vector, w1: Vector) {
        let v = u.ortogonal();
        let w2 = w1.add(u.mul(this.headWidth)).add(v.mul(this.headHeight));
        let w3 = w2.sub(v.mul(2 * this.headHeight));
        let points = w1.str() + ' ' + w2.str() + ' ' + w3.str();
        this._element.children[1].setAttribute('points', points);
    }
}

export class PetriArc extends AbstractPetriArc {
    negBallRadius = 2

    constructor(ele: SVGAElement, place: PetriPlace, trans: PetriTrans, type: string) {
        super(ele, place, trans, type)
        this.updatePos(place.id)
    }

    get PNElementType() {
        return 'arc';
    }

    get type() {
        return this._type;
    }

    set type(val) {
        if (val === 'test') {
            this._element.children[0].setAttribute('stroke-dasharray', '2 2');
        }
        else {
            this._element.children[0].setAttribute('stroke-dasharray', '');
        }
        if (val === 'inhibitor') {
            this._element.children[2].setAttribute('visibility', 'visible');
        }
        else {
            this._element.children[2].setAttribute('visibility', 'hidden');
        }
        this._type = val;
        this._element.setAttribute('arcType', val)
        this.updatePos()
    }

    get weight() {
        return this.getProperty('weight');
    }

    set weight(val) {
        if (val === '1') {
            this._element.children[3].setAttribute('visibility', 'hidden');
        }
        else {
            this._element.children[3].setAttribute('visibility', 'visible');
        }
        this.setProperty('weight', val)
    }

    updateWeightPosition() {
        let n = this.lines.length
        let line: SVGLineElement
        let v: Vector, direction: Vector
        if (n%2 === 1) {
            line = this.lines[(n-1)/2]
            v = getLineMidPoint(line)
        } else {
            line = this.lines[n/2]
            v = getLineStartPoint(line)
        }
        direction = getLineDirection(line).norm()

        let pos = v.add(direction.ortogonal().mul(4.5));
        this._element.children[3].setAttribute('x', String(pos.x));
        this._element.children[3].setAttribute('y', String(pos.y));
    }

    oneLineUpdate() {
        let u = (this.placePos.sub(this.transPos)).norm()
        let w1: Vector
        let transPoint = this.getTransConnectionPoint(u)
        let placePoint = this.getPlaceConnectionPoint(u)
        if (this._type === 'output') {
            u = u.neg()
            w1 = placePoint
            placePoint = placePoint.add(u.mul(this.headWidth))
        } else {
            if (this._type === 'inhibitor') {
                transPoint = transPoint.add(u.mul(this.negBallRadius))
                this._element.children[2].setAttribute('cx', String(transPoint.x))
                this._element.children[2].setAttribute('cy', String(transPoint.y))
                transPoint = transPoint.add(u.mul(this.negBallRadius))
            }
            w1 = transPoint
            transPoint = transPoint.add(u.mul(this.headWidth))
        }
        this.updateLine(placePoint, transPoint)
        this.drawHead(u, w1)
    }

    updatePosByTrans() {
        let line = this.lines[this.lines.length - 1]
        let u = (getLineStartPoint(line).sub(this.transPos)).norm()
        let transPoint = this.getTransConnectionPoint(u)
        if (this._type === 'output') {
            setLineEndPoint(line, transPoint)
        } else {
            if (this._type === 'inhibitor') {
                transPoint = transPoint.add(u.mul(this.negBallRadius))
                this._element.children[2].setAttribute('cx', String(transPoint.x))
                this._element.children[2].setAttribute('cy', String(transPoint.y))
                transPoint = transPoint.add(u.mul(this.negBallRadius))
            }
            this.drawHead(u, transPoint)
            setLineEndPoint(line, transPoint.add(u.mul(this.headWidth)))
        }
    }

    updatePosByPlace() {
        let line = this.lines[0]
        let u = (this.placePos.sub(getLineEndPoint(line))).norm()
        let placePoint = this.getPlaceConnectionPoint(u)
        if (this._type === 'output') {
            this.drawHead(u.neg(), placePoint)
            setLineStartPoint(line, placePoint.add(u.neg().mul(this.headWidth)))
        } else {
            setLineStartPoint(line, placePoint)
        }
    }

    updatePos(callerId: string = '') {
        if (this.lines.length === 1) {
            this.oneLineUpdate()
        } else {
            if (callerId === this.place.id) {
                this.updatePosByPlace()
            } else if (callerId === this.trans.id)  {
                this.updatePosByTrans()
            } else {
                this.updatePosByPlace()
                this.updatePosByTrans()
            }
        }
        this.updateWeightPosition()
    }

    splitLine(i: number) {
        let ele = this.lines[i].cloneNode(true)
        this._element.children[0].insertBefore(ele, this.lines[i])
        let midPoint = getLineMidPoint(this.lines[i])
        setLineEndPoint(this.lines[i], midPoint)
        setLineStartPoint(this.lines[i + 1], midPoint)
    }

    setNodePos(node: SVGRectElement, coord: Vector) {
        let transform = node.transform.baseVal.getItem(0);
        transform.setTranslate(coord.x, coord.y);
    }

    createNode(type: string, i: number) {
        let group = document.getElementById('arc-nodes')
        let node = <SVGRectElement>arcNodeModel.cloneNode(true)
        node.id = 'arc-' + type + '-node-' + i
        node.setAttribute('pe-parent', this.id)
        node.setAttribute('arc-node-type', type)
        node.setAttribute('arc-node-line', String(i))
        if (type === 'mid') {
            let point = getLineMidPoint(this.lines[i])
            this.setNodePos(node, point)
        } else {
            node.setAttribute('fill', 'yellow')
            let point = getLineMidPoint(this.lines[i])
            this.setNodePos(node, getLineStartPoint(this.lines[i]))
        }
        group.appendChild(node)
    }

    showNodes() {
        for (let i = 0; i < this.lines.length; i++) {
            this.createNode('mid', i)
            if (i > 0) {
                this.createNode('corner', i)
            }
        }
    }

    cleanNodes() {
        document.getElementById('arc-nodes').innerHTML = ''
    }

    select() {
        this._element.children[0].setAttribute('stroke', 'blue');
        this._element.children[1].setAttribute('fill', 'blue');
        this._element.children[2].setAttribute('stroke', 'blue');
        this.showNodes()
    }

    deselect() {
        this._element.children[0].setAttribute('stroke', 'black');
        this._element.children[1].setAttribute('fill', 'black');
        this._element.children[2].setAttribute('stroke', 'black');
        this.cleanNodes()
    }

    removeArcReference(ele: PetriElement) {
        const index = ele.arcs.indexOf(this.id);
        if (index > -1) {
            ele.arcs.splice(index, 1);
        }
    }

    remove() {
        this.removeArcReference(this.place)
        this.removeArcReference(this.trans)
        super.remove();
    }
}
