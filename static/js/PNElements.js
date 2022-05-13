import Vector from "./utils/Vector.js";
import { CurvedArrow } from "./utils/Arrow.js";
import { createCircle } from "./utils/SVGElement/Circle.js";
import { createRect } from "./utils/SVGElement/Rectangle.js";
import { createGroup, createText } from "./utils/SVGElement/others.js";
class AGenericPetriElement {
    svgElement;
    PEType;
    selected;
    constructor(id, modelId) {
        this.svgElement = createGroup({ id: id });
        this.selected = false;
    }
    get id() {
        return this.svgElement.id;
    }
    isSelected() {
        return this.selected;
    }
    getPETextElement(attrName) {
        return this.svgElement.querySelector(`[PEText="${attrName}"]`);
    }
    getPEText(attrName) {
        return this.getPETextElement(attrName).innerHTML;
    }
    setPEText(attrName, val) {
        this.getPETextElement(attrName).innerHTML = val;
    }
    getPETextPosition(attrName) {
        const matrix = this.getPETextElement(attrName).transform
            .baseVal.getItem(0).matrix;
        return new Vector(matrix.e, matrix.f);
    }
    setPETextPosition(attrName, pos) {
        const transform = this.getPETextElement(attrName).transform
            .baseVal.getItem(0);
        transform.setTranslate(pos.x, pos.y);
    }
}
class APetriElement extends AGenericPetriElement {
    _connectedArcs;
    _position;
    constructor(id, modelId) {
        super(id, modelId);
        this.svgElement.setAttribute('transform', 'translate(0 0)');
        this._connectedArcs = [];
        this._position = new Vector(0, 0);
    }
    get name() { return this.getPEText('name'); }
    set name(val) { this.setPEText('name', val); }
    get connectedArcs() { return this._connectedArcs; }
    get position() {
        return this._position;
    }
    set position(coord) {
        this._position = coord;
        const transform = this.svgElement.transform.baseVal.getItem(0);
        transform.setTranslate(coord.x, coord.y);
    }
    select() {
        this.selected = true;
        this.svgElement.children[0].setAttribute('stroke', 'blue');
    }
    deselect() {
        this.selected = true;
        this.svgElement.children[0].setAttribute('stroke', 'black');
    }
    connectArc(PEId) {
        if (this.connectedArcs.indexOf(PEId) !== -1) {
            throw "A reference to this arc already exists.";
        }
        this.connectedArcs.push(PEId);
    }
    disconnectArc(PEId) {
        const index = this.connectedArcs.indexOf(PEId);
        if (index !== -1) {
            this.connectedArcs.splice(index, 1);
        }
    }
    isInside(topLeft, size) {
        if (topLeft.x > this.position.x)
            return false;
        if (topLeft.y > this.position.y)
            return false;
        if (topLeft.x + size.x < this.position.x)
            return false;
        if (topLeft.y + size.y < this.position.y)
            return false;
        return true;
    }
}
class PetriPlace extends APetriElement {
    static placeRadius = 8;
    static tokenRadius = 1.5;
    PEType = 'place';
    _initialMark;
    _mark;
    constructor(id) {
        super(id, 'place-model');
        this._initialMark = '0';
        this._mark = 0;
        this.svgElement.appendChild(createCircle(new Vector(0, 0), PetriPlace.placeRadius, {
            fill: 'white',
            stroke: 'black',
            drag: 'pe',
            PEParent: id
        }));
        this.svgElement.appendChild(createGroup());
        this.svgElement.appendChild(createText('p1', new Vector(6.5, -8), {
            drag: 'PEText',
            PEText: 'name',
            PEParent: id
        }));
        this.svgElement.appendChild(createText('INT', new Vector(7, 8.5), {
            drag: 'PEText',
            PEText: 'placeType',
            PEParent: id
        }));
    }
    get placeType() {
        return this.getPEText('placeType');
    }
    set placeType(val) {
        this.setPEText('placeType', val);
    }
    get mark() {
        return this._mark;
    }
    set mark(val) {
        this._mark = val;
        this.svgElement.children[1].innerHTML = '';
        let tokens = [];
        if (val === 0) {
            return;
        }
        else if (val === 1) {
            tokens = [this.createToken(new Vector(0, 0))];
        }
        else if (val === 2) {
            const d = PetriPlace.tokenRadius * 1.3;
            tokens = [
                this.createToken(new Vector(-d, 0)),
                this.createToken(new Vector(d, 0))
            ];
        }
        else if (val === 3) {
            const d = PetriPlace.tokenRadius * 1.3;
            tokens = [
                this.createToken(new Vector(0, -d)),
                this.createToken(new Vector(-d, d)),
                this.createToken(new Vector(d, d))
            ];
        }
        else if (val === 4) {
            const d = PetriPlace.tokenRadius * 1.3;
            tokens = [
                this.createToken(new Vector(-d, -d)),
                this.createToken(new Vector(-d, d)),
                this.createToken(new Vector(d, -d)),
                this.createToken(new Vector(d, d))
            ];
        }
        else if (val === 5) {
            const d = PetriPlace.tokenRadius * 1.7;
            tokens = [
                this.createToken(new Vector(0, 0)),
                this.createToken(new Vector(-d, -d)),
                this.createToken(new Vector(-d, d)),
                this.createToken(new Vector(d, -d)),
                this.createToken(new Vector(d, d))
            ];
        }
        else if (val === 6) {
            const d1 = PetriPlace.tokenRadius * 1.3;
            const d2 = PetriPlace.tokenRadius * 2.3;
            tokens = [
                this.createToken(new Vector(-d2, -d1)),
                this.createToken(new Vector(-d2, d1)),
                this.createToken(new Vector(0, -d1)),
                this.createToken(new Vector(0, d1)),
                this.createToken(new Vector(d2, -d1)),
                this.createToken(new Vector(d2, d1))
            ];
        }
        else if (val === 7) {
            const d1 = PetriPlace.tokenRadius * 1.3;
            const d2 = PetriPlace.tokenRadius * 2.3;
            tokens = [
                this.createToken(new Vector(-d2, -d1)),
                this.createToken(new Vector(-d2, d1)),
                this.createToken(new Vector(0, -d2)),
                this.createToken(new Vector(0, 0)),
                this.createToken(new Vector(0, d2)),
                this.createToken(new Vector(d2, -d1)),
                this.createToken(new Vector(d2, d1))
            ];
        }
        else {
            const r = 0.68 * PetriPlace.placeRadius;
            tokens = [
                createCircle(new Vector(0, 0), r)
            ];
            tokens[0].setAttribute('PEParent', this.id);
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('fill', 'white');
            textElement.setAttribute('text-anchor', 'middle');
            textElement.setAttribute('dominant-baseline', 'middle');
            textElement.setAttribute('transform', 'translate(0 0.5)');
            textElement.setAttribute('PEParent', this.id);
            if (val > 99) {
                textElement.innerHTML = '99+';
            }
            else {
                textElement.innerHTML = String(val);
            }
            this.svgElement.children[1].appendChild(textElement);
        }
        for (const token of tokens) {
            this.svgElement.children[1].prepend(token);
        }
    }
    get initialMark() {
        return this._initialMark;
    }
    set initialMark(val) {
        this._initialMark = val;
        this.mark = parseInt(val);
    }
    createToken(pos) {
        const token = createCircle(pos, PetriPlace.tokenRadius);
        token.setAttribute('PEParent', this.id);
        return token;
    }
    getConnectionPoint(u) {
        return this.position.add(u.mul(-PetriPlace.placeRadius));
    }
    getData() {
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
        };
    }
}
class PetriTrans extends APetriElement {
    static transWidth = 5.5;
    static transHeight = 3;
    PEType = 'trans';
    constructor(id) {
        super(id, 'trans-model');
        this.svgElement.appendChild(createRect(new Vector(0, 0), PetriTrans.transWidth * 2, PetriTrans.transHeight * 2, {
            fill: 'black',
            stroke: 'black',
            drag: 'pe',
            PEParent: id
        }));
        this.svgElement.appendChild(createText('p1', new Vector(6, -5.5), {
            drag: 'PEText',
            PEText: 'name',
            PEParent: id
        }));
        this.svgElement.appendChild(createText('', new Vector(6, 5.5), {
            drag: 'PEText',
            PEText: 'delay',
            PEParent: id
        }));
        this.svgElement.appendChild(createText('', new Vector(-6, -5.5), {
            drag: 'PEText',
            PEText: 'guard',
            'text-anchor': 'end',
            style: 'font-family: courier',
            PEParent: id
        }));
    }
    get delay() {
        return this.getPEText('delay');
    }
    set delay(val) {
        this.setPEText('delay', val);
    }
    get guard() {
        return this.getPEText('guard');
    }
    set guard(val) {
        this.setPEText('guard', val);
    }
    getConnectionPoint(u) {
        if (u.y !== 0) {
            let k;
            if (Math.abs(u.x * PetriTrans.transHeight / u.y) > PetriTrans.transWidth) {
                k = PetriTrans.transWidth / Math.abs(u.x);
            }
            else {
                k = PetriTrans.transHeight / Math.abs(u.y);
            }
            return this.position.add(u.mul(k));
        }
        return this.position.add(u.mul(PetriTrans.transWidth));
    }
    getData() {
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
        };
    }
}
class PetriArc extends AGenericPetriElement {
    static negBallRadius = 2;
    PEType = 'arc';
    _arcType;
    place;
    trans;
    arrow;
    constructor(id, place, trans, arctype) {
        super(id, 'arc-model');
        this.place = place;
        this.trans = trans;
        const arrowGroup = createGroup();
        this.arrow = new CurvedArrow(arrowGroup, place.position, trans.position, this.id);
        this.svgElement.appendChild(arrowGroup);
        this.svgElement.appendChild(createGroup());
        this.svgElement.appendChild(createText('1', new Vector(0, 0), {
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            drag: 'PEText',
            PEText: 'weight',
            visibility: 'hidden',
            PEParent: id
        }));
        this.arcType = arctype;
    }
    get weightElement() {
        return this.svgElement.children[2];
    }
    get cornersGroup() {
        return this.svgElement.children[1];
    }
    get placeId() {
        return this.place.id;
    }
    get transId() {
        return this.trans.id;
    }
    get weight() {
        return this.getPEText('weight');
    }
    set weight(val) {
        this.setPEText('weight', val);
        if (val === '1') {
            this.getPETextElement('weight')
                .setAttribute('visibility', 'hidden');
        }
        else {
            this.getPETextElement('weight')
                .setAttribute('visibility', 'visible');
        }
    }
    get arcType() {
        return this._arcType;
    }
    set arcType(val) {
        if (this.arcType !== val &&
            (val === 'Output' || this._arcType === 'Output')) {
            this.arrow.reverse();
        }
        this._arcType = val;
        this.arrow.setArcType(val);
        this.updateAll();
    }
    getCornerPos(cornerIndex) {
        return this.arrow.getPointPos(cornerIndex + 1);
    }
    updateWeightPos() {
        const n = Math.floor(this.arrow.numberOfCorners() / 2);
        const direction = this.arrow.getPointPos(n + 1).sub(this.arrow.getPointPos(n));
        const anchorPoint = this.arrow.getPointPos(n + 1)
            .add(this.arrow.getPointPos(n)).mul(0.5);
        const pos = anchorPoint.add(direction.norm().ortogonal().mul(6));
        this.weightElement.setAttribute('x', String(pos.x));
        this.weightElement.setAttribute('y', String(pos.y));
    }
    noCornerUpdate() {
        const u = this.place.position.sub(this.trans.position).norm();
        const placePoint = this.place.getConnectionPoint(u);
        const transPoint = this.trans.getConnectionPoint(u);
        if (this._arcType === 'Output') {
            this.arrow.updateTips(transPoint, placePoint);
        }
        else {
            this.arrow.updateTips(placePoint, transPoint);
        }
        this.updateWeightPos();
    }
    cleanNodes() {
        this.cornersGroup.innerHTML = '';
    }
    showNodes() {
        this.cleanNodes();
        const corners = this.arrow.getCorners();
        const midPoints = this.arrow.getLinesMidPoint();
        for (let i = 0; i < midPoints.length; i++) {
            this.createNode(i, midPoints[i], 'arcMidNode');
            if (i < corners.length)
                this.createNode(i, corners[i], 'corner');
        }
    }
    createNode(idx, pos, type) {
        const node = createRect(pos, 3, 3);
        node.setAttribute('PEParent', this.id);
        node.setAttribute('cornerIdx', String(idx));
        node.setAttribute('stroke', 'black');
        node.setAttribute('stroke-width', '0.6');
        node.setAttribute('drag', type);
        if (type === 'arcMidNode') {
            node.setAttribute('fill', 'blue');
        }
        else {
            node.setAttribute('fill', 'yellow');
        }
        this.cornersGroup.appendChild(node);
    }
    updatePlacePos() {
        this.place.position;
        if (!this.arrow.hasCorner()) {
            this.noCornerUpdate();
        }
        else if (this._arcType === "Output") {
            this.arrow.updateHeadPos(this.place.getConnectionPoint(this.place.position.sub(this.arrow.getPointPos(-2)).norm()));
        }
        else {
            this.arrow.updateTailPos(this.place.getConnectionPoint(this.place.position.sub(this.arrow.getPointPos(1)).norm()));
            if (this.arrow.numberOfCorners() === 1)
                this.updateWeightPos();
        }
    }
    updateTransPos() {
        if (!this.arrow.hasCorner()) {
            this.noCornerUpdate();
        }
        else if (this._arcType === "Output") {
            this.arrow.updateTailPos(this.trans.getConnectionPoint(this.trans.position.sub(this.arrow.getPointPos(1)).norm()));
            if (this.arrow.numberOfCorners() === 1)
                this.updateWeightPos();
        }
        else {
            this.arrow.updateHeadPos(this.trans.getConnectionPoint(this.trans.position.sub(this.arrow.getPointPos(-2)).norm().neg()));
        }
    }
    updateAll() {
        this.updatePlacePos();
        this.updateTransPos();
    }
    addCorner(cornerIndex) {
        this.arrow.addCorner(cornerIndex);
    }
    removeCorner(cornerIndex) {
        this.arrow.removeCorner(cornerIndex + 1);
        this.updateAll();
        if (this.selected)
            this.showNodes();
    }
    moveCorner(idx, pos) {
        this.arrow.moveCorner(idx + 1, pos);
        this.updateAll();
        if (this.selected)
            this.showNodes();
    }
    setArcColor(color) {
        this.arrow.setColor(color);
    }
    select() {
        this.selected = true;
        this.setArcColor('blue');
        this.showNodes();
    }
    deselect() {
        this.selected = false;
        this.setArcColor('black');
        this.cleanNodes();
    }
    getArcPath() {
        return this.arrow.getPath();
    }
    getData() {
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
        };
    }
}
export { AGenericPetriElement, APetriElement, PetriPlace, PetriTrans, PetriArc };
