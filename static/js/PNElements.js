import Vector from "./utils/Vector.js";
import { getLineEndPoint, getLineStartPoint, getLineMidPoint, setLineStartPoint, getLineDirection, createLine } from './utils/SVGElement/Line.js';
import { Arrow } from "./utils/Arrow.js";
import { createCircle, setCircleCenter } from "./utils/SVGElement/Circle.js";
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
    move(displacement) {
        this.position = this._position.add(displacement);
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
            drag: 'self',
            PEText: 'name',
            PEParent: id
        }));
        this.svgElement.appendChild(createText('INT', new Vector(7, 8.5), {
            drag: 'self',
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
                placeType: this.getPETextPosition('name')
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
            drag: 'self',
            PEText: 'name',
            PEParent: id
        }));
        this.svgElement.appendChild(createText('', new Vector(6, 5.5), {
            drag: 'self',
            PEText: 'delay',
            PEParent: id
        }));
        this.svgElement.appendChild(createText('', new Vector(-6, -5.5), {
            drag: 'self',
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
    corners;
    constructor(id, place, trans, arctype) {
        super(id, 'arc-model');
        this.place = place;
        this.trans = trans;
        this.arrow = new Arrow();
        this.svgElement.appendChild(createGroup({
            'stroke-linecap': 'round'
        }));
        this.svgElement.appendChild(createGroup({
            'stroke-linecap': 'round',
            'stroke': 'black'
        }));
        this.svgElement.appendChild(createGroup());
        this.svgElement.appendChild(createCircle(new Vector(0, 0), PetriArc.negBallRadius, {
            fill: 'white',
            stroke: 'black',
            'stroke-width': '0.8',
            visibility: 'hidden',
            PEParent: id
        }));
        this.svgElement.appendChild(createText('1', new Vector(0, 0), {
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            drag: 'self',
            PEText: 'weight',
            visibility: 'hidden',
            PEParent: id
        }));
        this.arrow.line.setAttribute('PEParent', this.id);
        this.arrow.head.setAttribute('PEParent', this.id);
        this.svgElement.children[0].appendChild(this.arrow.line);
        this.svgElement.children[0].appendChild(this.arrow.head);
        this.corners = [];
        this.arcType = arctype;
    }
    get lastCorner() {
        return this.corners[this.corners.length - 1];
    }
    get linesGroup() {
        return this.svgElement.children[1];
    }
    get negBall() {
        return this.svgElement.children[3];
    }
    get weightElement() {
        return this.svgElement.children[4];
    }
    get cornersGroup() {
        return this.svgElement.children[2];
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
    getCornerPos(cornerIndex) {
        return this.corners[cornerIndex];
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
            const lineIndex = n % 2 === 0 ? n / 2 : (n - 1) / 2;
            anchorPoint = getLineMidPoint(this.linesGroup.children[lineIndex]);
            direction = getLineDirection(this.linesGroup.children[lineIndex]);
        }
        let pos = anchorPoint.add(direction.norm().ortogonal().mul(6));
        this.weightElement.setAttribute('x', String(pos.x));
        this.weightElement.setAttribute('y', String(pos.y));
    }
    updateInhibitorArrow(connectionPoint, u) {
        setCircleCenter(this.negBall, connectionPoint.add(u.mul(PetriArc.negBallRadius)));
        this.arrow.updateHeadPos(connectionPoint.add(u.mul(2 * PetriArc.negBallRadius)));
    }
    noCornerUpdate() {
        let u = (this.place.position.sub(this.trans.position)).norm();
        let placePoint = this.place.getConnectionPoint(u);
        let transPoint = this.trans.getConnectionPoint(u);
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
        this.updateWeightPos();
    }
    newLine(startPoint, endPoint) {
        const line = createLine(startPoint, endPoint, {
            PEParent: this.id
        });
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
    cleanNodes() {
        this.cornersGroup.innerHTML = '';
    }
    showNodes() {
        this.cleanNodes();
        const lines = this.
            linesGroup.children;
        for (let i = 0; i < lines.length; i++) {
            this.createNode(i, getLineMidPoint(lines[i]), 'arcMidNode');
            this.createNode(i, getLineEndPoint(lines[i]), 'corner');
        }
        this.createNode(lines.length, this.arrow.getMidPoint(), 'arcMidNode');
    }
    updateArc() {
        this.updateLines();
        this.updatePlacePos();
        this.updateTransPos();
        this.updateWeightPos();
        if (this.selected)
            this.showNodes();
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
        if (this.corners.length === 0) {
            this.noCornerUpdate();
        }
        else if (this._arcType === "Output") {
            this.arrow.update(this.lastCorner, this.place.getConnectionPoint(this.place.position.sub(this.lastCorner).norm()));
        }
        else {
            setLineStartPoint(this.linesGroup.children[0], this.place.getConnectionPoint(this.place.position.sub(this.corners[0]).norm()));
            if (this.corners.length === 1)
                this.updateWeightPos();
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
            if (this.corners.length === 1)
                this.updateWeightPos();
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
    addCorner(cornerIndex) {
        if (cornerIndex < this.corners.length) {
            const pos = getLineMidPoint(this.linesGroup.children[cornerIndex]);
            this.corners.splice(cornerIndex, 0, pos);
        }
        else if (cornerIndex === this.corners.length) {
            const pos = this.arrow.getMidPoint();
            this.corners.push(pos);
        }
        else {
            throw "Invalid corner index";
        }
        this.updateArc();
    }
    removeCorner(cornerIndex) {
        if (cornerIndex >= this.corners.length) {
            throw "Invalid cornerIndex";
        }
        this.corners.splice(cornerIndex, 1);
        this.updateArc();
    }
    moveCorner(idx, pos) {
        this.corners[idx] = pos;
        this.updateArc();
    }
    setArcColor(color) {
        this.linesGroup.setAttribute('stroke', color);
        this.negBall.setAttribute('stroke', color);
        this.arrow.line.setAttribute('stroke', color);
        this.arrow.head.setAttribute('fill', color);
        this.arrow.head.setAttribute('stroke', color);
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
    /*
     * Return the vector with the points the define the arc path.
     * The start point, the corners and the and the end point.
     */
    getArcPath() {
        if (this.corners.length) {
            return [
                getLineStartPoint(this.linesGroup.children[0]),
                ...this.corners,
                this.arrow.getHeadPos()
            ];
        }
        return [this.arrow.getTailPos(), this.arrow.getHeadPos()];
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
            corners: [...this.corners]
        };
    }
}
export { AGenericPetriElement, APetriElement, PetriPlace, PetriTrans, PetriArc };
