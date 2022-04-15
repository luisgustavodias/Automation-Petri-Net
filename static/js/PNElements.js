import Vector from "./utils/Vector.js";
import { getLineEndPoint, getLineStartPoint, getLineMidPoint, setLineStartPoint, getLineDirection, createLine } from './utils/Line.js';
import { Arrow } from "./utils/Arrow.js";
import { createCircle } from "./utils/Circle.js";
import { createRect } from "./utils/Rectangle.js";
const arcNodeModel = document.getElementById('arc-node-model');
function createSVGElement(id, modelId) {
    const model = document.getElementById(modelId);
    const clone = model.cloneNode(true);
    clone.id = id;
    for (let ele of clone.querySelectorAll(`[pe-parent="${modelId}"]`)) {
        ele.setAttribute('pe-parent', id);
    }
    return clone;
}
class AGenericPetriElement {
    svgElement;
    PEType;
    constructor(id, modelId) {
        this.svgElement = createSVGElement(id, modelId);
    }
    get id() {
        return this.svgElement.id;
    }
    getPETextElement(attrName) {
        return this.svgElement.querySelector(`[pe-text="${attrName}"]`);
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
    move(displacement) {
        this.position = this._position.add(displacement);
    }
    select() {
        this.svgElement.children[0].setAttribute('stroke', 'blue');
    }
    deselect() {
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
}
class PetriPlace extends APetriElement {
    static placeRadius = 8;
    static tokenRadius = 1.5;
    PEType = 'place';
    _initialMark;
    constructor(id) {
        super(id, 'place-model');
        this._initialMark = '0';
    }
    get placeType() { return this.getPEText('placeType'); }
    set placeType(val) { this.setPEText('placeType', val); }
    set mark(val) {
        this.svgElement.children[1].innerHTML = '';
        let tokens = [];
        if (val === '0') {
            return;
        }
        else if (val === '1') {
            tokens = [this.createToken(new Vector(0, 0))];
        }
        else if (val === '2') {
            const d = PetriPlace.tokenRadius * 1.3;
            tokens = [
                this.createToken(new Vector(-d, 0)),
                this.createToken(new Vector(d, 0))
            ];
        }
        else if (val === '3') {
            const d = PetriPlace.tokenRadius * 1.3;
            tokens = [
                this.createToken(new Vector(0, -d)),
                this.createToken(new Vector(-d, d)),
                this.createToken(new Vector(d, d))
            ];
        }
        else if (val === '4') {
            const d = PetriPlace.tokenRadius * 1.3;
            tokens = [
                this.createToken(new Vector(-d, -d)),
                this.createToken(new Vector(-d, d)),
                this.createToken(new Vector(d, -d)),
                this.createToken(new Vector(d, d))
            ];
        }
        else if (val === '5') {
            const d = PetriPlace.tokenRadius * 1.7;
            tokens = [
                this.createToken(new Vector(0, 0)),
                this.createToken(new Vector(-d, -d)),
                this.createToken(new Vector(-d, d)),
                this.createToken(new Vector(d, -d)),
                this.createToken(new Vector(d, d))
            ];
        }
        else if (val === '6') {
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
        else if (val === '7') {
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
            tokens[0].setAttribute('pe-parent', this.id);
            const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            textElement.setAttribute('fill', 'white');
            textElement.setAttribute('text-anchor', 'middle');
            textElement.setAttribute('dominant-baseline', 'middle');
            textElement.setAttribute('transform', 'translate(0 0.5)');
            textElement.setAttribute('pe-parent', this.id);
            if (parseInt(val) > 99) {
                textElement.innerHTML = '99+';
            }
            else {
                textElement.innerHTML = val;
            }
            this.svgElement.children[1].appendChild(textElement);
        }
        for (const token of tokens) {
            this.svgElement.children[1].prepend(token);
        }
    }
    get initialMark() { return this._initialMark; }
    set initialMark(val) {
        this._initialMark = val;
        this.mark = val;
    }
    createToken(pos) {
        const token = createCircle(pos, PetriPlace.tokenRadius);
        token.setAttribute('pe-parent', this.id);
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
                placeType: this.getPETextPosition('name')
            }
        };
    }
    static load(data) {
        const place = new PetriPlace(data.id);
        place.name = data.name;
        place.placeType = data.placeType;
        place.initialMark = data.initialMark;
        place.position = new Vector(data.position.x, data.position.y);
        return place;
    }
}
class PetriTrans extends APetriElement {
    static transWidth = 5.5;
    static transHeight = 3;
    PEType = 'trans';
    constructor(id) {
        super(id, 'trans-model');
    }
    get delay() { return this.getPEText('delay'); }
    set delay(val) { this.setPEText('delay', val); }
    get guard() { return this.getPEText('guard'); }
    set guard(val) { this.setPEText('guard', val); }
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
    static load(data) {
        const trans = new PetriTrans(data.id);
        trans.name = data.name;
        trans.delay = String(data.delay);
        trans.guard = data.guard;
        trans.position = new Vector(data.position.x, data.position.y);
        return trans;
    }
}
class PetriArc extends AGenericPetriElement {
    static negBallRadius = 2;
    PEType = 'arc';
    _arcType;
    place;
    trans;
    arrow;
    corners;
    constructor(id, place, trans, arctype) {
        super(id, 'arc-model');
        this.place = place;
        this.trans = trans;
        this.arrow = new Arrow(
        // <SVGLineElement>this.svgElement.children[0].children[0],
        // <SVGPolygonElement>this.svgElement.children[1]
        );
        this.arrow.line.setAttribute('pe-parent', this.id);
        this.arrow.head.setAttribute('pe-parent', this.id);
        this.svgElement.children[0].appendChild(this.arrow.line);
        this.svgElement.children[0].appendChild(this.arrow.head);
        this.corners = [];
        this.arcType = arctype;
        console.log(this.svgElement.children[2]);
    }
    get lastCorner() {
        return this.corners[this.corners.length - 1];
    }
    get linesGroup() {
        return this.svgElement.children[1];
    }
    get negBall() { return this.svgElement.children[3]; }
    get weightElement() { return this.svgElement.children[4]; }
    get cornersGroup() { return this.svgElement.children[2]; }
    get placeId() { return this.place.id; }
    get transId() { return this.trans.id; }
    get weight() { return this.getPEText('weight'); }
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
    get arcType() { return this._arcType; }
    set arcType(val) {
        if (val === "Test") {
            this.linesGroup.setAttribute('stroke-dasharray', '2 2');
            this.arrow.line.setAttribute('stroke-dasharray', '2 2');
        }
        else {
            this.linesGroup.setAttribute('stroke-dasharray', '');
            this.arrow.line.setAttribute('stroke-dasharray', '');
        }
        if (val === "Inhibitor") {
            this.negBall.setAttribute('visibility', 'visible');
        }
        else {
            this.negBall.setAttribute('visibility', 'hidden');
        }
        if (this.arcType !== val &&
            (val === 'Output' || this._arcType === 'Output')) {
            this.corners.reverse();
        }
        this._arcType = val;
        this.svgElement.setAttribute('arc-type', val);
        this.updateLines();
        this.updatePlacePos();
        this.updateTransPos();
    }
    updateWeightPos() {
        let n = this.corners.length;
        let direction;
        let anchorPoint;
        if (n === 0) {
            anchorPoint = this.arrow.getMidPoint();
            direction = this.arrow.getDirection();
        }
        else {
            if (n % 2 === 1) {
                anchorPoint = getLineMidPoint(this.linesGroup.children[(n - 1) / 2]);
                direction = getLineDirection(this.linesGroup.children[(n - 1) / 2]);
            }
            else {
                anchorPoint = getLineStartPoint(this.linesGroup.children[n / 2]);
                direction = getLineDirection(this.linesGroup.children[n / 2]);
            }
        }
        let pos = anchorPoint.add(direction.norm().ortogonal().mul(4.5));
        this.weightElement.setAttribute('x', String(pos.x));
        this.weightElement.setAttribute('y', String(pos.y));
    }
    updateNegBall(pos) {
        this.negBall.setAttribute('cx', String(pos.x));
        this.negBall.setAttribute('cy', String(pos.y));
    }
    updateInhibitorArrow(connectionPoint, u) {
        this.updateNegBall(connectionPoint.add(u.mul(PetriArc.negBallRadius)));
        this.arrow.updateHeadPos(connectionPoint.add(u.mul(2 * PetriArc.negBallRadius)));
    }
    noCornerUpdate() {
        let u = (this.place.position.sub(this.trans.position)).norm();
        let placePoint = this.place.getConnectionPoint(u);
        let transPoint = this.trans.getConnectionPoint(u);
        // setCircleCenter(<any>this.svgElement.children[3], placePoint)
        // setCircleCenter(<any>this.svgElement.children[4], transPoint)
        if (this._arcType === 'Output') {
            this.arrow.update(transPoint, placePoint);
        }
        else {
            if (this._arcType === 'Inhibitor') {
                this.arrow.updateTailPos(placePoint);
                this.updateInhibitorArrow(transPoint, u);
            }
            else {
                this.arrow.update(placePoint, transPoint);
            }
        }
        //this.updateWeightPos()
    }
    newLine(startPoint, endPoint) {
        const line = createLine(startPoint, endPoint);
        line.setAttribute('pe-parent', this.id);
        this.linesGroup.appendChild(line);
    }
    updateLines() {
        this.linesGroup.innerHTML = '';
        if (!this.corners.length)
            return;
        let startPoint;
        if (this._arcType === "Output") {
            const u = this.trans.position.sub(this.corners[0]).norm();
            startPoint = this.trans.getConnectionPoint(u);
        }
        else {
            const u = this.place.position.sub(this.corners[0]).norm();
            startPoint = this.place.getConnectionPoint(u);
        }
        for (let i = 0; i < this.corners.length; i++) {
            if (i == 0) {
                this.newLine(startPoint, this.corners[0]);
            }
            else {
                this.newLine(this.corners[i - 1], this.corners[i]);
            }
        }
    }
    updateArc() {
        this.updateLines();
        this.updatePlacePos();
        this.updateTransPos();
    }
    createMidNode(idx, pos) {
        const node = createRect(pos, 3, 3);
        node.setAttribute('pe-parent', this.id);
        node.setAttribute('drag', 'arcMidNode');
        node.setAttribute('cornerIdx', String(idx));
        node.setAttribute('fill', 'blue');
        node.setAttribute('stroke', 'black');
        node.setAttribute('stroke-width', '0.5');
        this.cornersGroup.appendChild(node);
    }
    createNode(idx, pos, type) {
        const node = createRect(pos, 3, 3);
        node.setAttribute('pe-parent', this.id);
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
        if (this.corners.length === 0) {
            this.noCornerUpdate();
        }
        else if (this._arcType === "Output") {
            this.arrow.update(this.lastCorner, this.place.getConnectionPoint(this.place.position.sub(this.lastCorner).norm()));
        }
        else {
            setLineStartPoint(this.linesGroup.children[0], this.place.getConnectionPoint(this.place.position.sub(this.corners[0]).norm()));
        }
    }
    updateTransPos() {
        if (this.corners.length === 0) {
            this.noCornerUpdate();
        }
        else if (this._arcType === "Output") {
            const u = this.corners[0].sub(this.trans.position).norm();
            const connectionPoint = this.trans.getConnectionPoint(u);
            setLineStartPoint(this.linesGroup.children[0], connectionPoint);
        }
        else {
            const u = this.lastCorner.sub(this.trans.position).norm();
            const connectionPoint = this.trans.getConnectionPoint(u);
            this.arrow.updateTailPos(this.lastCorner);
            if (this._arcType === "Inhibitor") {
                this.updateInhibitorArrow(connectionPoint, u);
            }
            else {
                this.arrow.updateHeadPos(connectionPoint);
            }
        }
    }
    addCorner(idx) {
        if (idx < this.corners.length) {
            const pos = getLineMidPoint(this.linesGroup.children[idx]);
            this.corners.splice(idx, 0, pos);
        }
        else if (idx === this.corners.length) {
            const pos = this.arrow.getMidPoint();
            this.corners.push(pos);
            this.arrow.updateTailPos(pos);
        }
        else {
            throw "Invalid corner index";
        }
        this.updateArc();
    }
    removeCorner(idx) {
        if (idx < this.corners.length) {
            const pos = getLineMidPoint(this.linesGroup.children[idx]);
            this.corners.splice(idx, 0, pos);
            this.linesGroup.appendChild(createLine(pos, pos));
        }
        else if (idx === this.corners.length) {
            const pos = this.arrow.getMidPoint();
            this.corners.push(pos);
            this.linesGroup.appendChild(createLine(pos, pos));
            this.arrow.updateTailPos(pos);
        }
        else {
            throw "Invalid corner index";
        }
        this.updateLines();
    }
    moveCorner(idx, displacement) {
        console.log(idx, displacement, this.corners[idx]);
        this.corners[idx] = this.corners[idx].add(displacement);
        this.updateLines();
        console.log(this.corners[idx]);
        if (idx === this.corners.length - 1) {
            this.arrow.updateTailPos(this.corners[this.corners.length - 1]);
            if (this._arcType === 'Output')
                this.updatePlacePos();
            else
                this.updateTransPos();
        }
    }
    showNodes() {
        console.log(this.cornersGroup);
        const lines = this.
            linesGroup.children;
        for (let i = 0; i < lines.length; i++) {
            this.createNode(i, getLineMidPoint(lines[i]), 'arcMidNode');
            this.createNode(i, getLineEndPoint(lines[i]), 'corner');
        }
        this.createMidNode(lines.length, this.arrow.getMidPoint());
    }
    cleanNodes() {
        this.cornersGroup.innerHTML = '';
    }
    setArcColor(color) {
        this.linesGroup.setAttribute('stroke', color);
        this.negBall.setAttribute('stroke', color);
        this.arrow.line.setAttribute('stroke', color);
        this.arrow.head.setAttribute('fill', color);
        this.arrow.head.setAttribute('stroke', color);
    }
    select() {
        this.setArcColor('blue');
        this.showNodes();
    }
    deselect() {
        this.setArcColor('black');
        this.cleanNodes();
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
            }
        };
    }
    static load(data) {
        const arc = new PetriArc(data.id, null, null, data.arcType);
        arc.weight = data.weight;
        return arc;
    }
}
export { AGenericPetriElement, APetriElement, PetriPlace, PetriTrans, PetriArc };
