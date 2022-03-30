import Vector from "./utils/Vector.js";
import { getLineEndPoint, getLineStartPoint, getLineMidPoint, setLineEndPoint, setLineStartPoint, getLineDirection } from './utils/Line.js';
import { Arrow } from "./utils/Arrow.js";
const arcNodeModel = document.getElementById('arc-node-model');
class AGenericPetriElement {
    constructor(ele) {
        this.svgElement = ele;
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
}
class APetriElement extends AGenericPetriElement {
    constructor(ele) {
        super(ele);
        this._connectedArcs = [];
        this._position = this.getPosition();
    }
    get name() { return this.getPEText('name'); }
    set name(val) { this.setPEText('name', val); }
    get connectedArcs() { return this._connectedArcs; }
    get position() {
        return this._position;
    }
    set position(coord) {
        this._position = coord;
        let transform = this.svgElement.transform.baseVal.getItem(0);
        transform.setTranslate(coord.x, coord.y);
    }
    move(displacement) {
        this.position = this._position.add(displacement);
    }
    getPosition() {
        let matrix = this.svgElement.transform.baseVal.getItem(0).matrix;
        return new Vector(matrix.e, matrix.f);
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
    constructor(ele) {
        super(ele);
        this.PEType = 'place';
        this.initialMark = '0';
    }
    get placeType() { return this.getPEText('placeType'); }
    set placeType(val) { this.setPEText('placeType', val); }
    set mark(val) { this.setPEText('mark', val); }
    get initialMark() { return this.svgElement.getAttribute('initialMark'); }
    set initialMark(val) {
        this.svgElement.setAttribute('initialMark', val);
        this.mark = val;
    }
    static getConnectionPoint(placePos, u) {
        return placePos.add(u.mul(-this.placeRadius));
    }
}
PetriPlace.placeRadius = 7.5;
class PetriTrans extends APetriElement {
    constructor(ele) {
        super(ele);
        this.PEType = 'trans';
    }
    get delay() { return this.getPEText('delay'); }
    set delay(val) { this.setPEText('delay', val); }
    get guard() { return this.getPEText('guard'); }
    set guard(val) { this.setPEText('guard', val); }
    static getConnectionPoint(transPos, u) {
        if (u.y !== 0) {
            let k;
            if (Math.abs(u.x * this.transHeight / u.y) > this.transWidth) {
                k = this.transWidth / Math.abs(u.x);
            }
            else {
                k = this.transHeight / Math.abs(u.y);
            }
            return transPos.add(u.mul(k));
        }
        return transPos.add(u.mul(this.transWidth));
    }
}
PetriTrans.transWidth = 5.5;
PetriTrans.transHeight = 3;
class PetriArc extends AGenericPetriElement {
    constructor(ele, placeId, transId, arctype) {
        super(ele);
        this.PEType = 'arc';
        this.svgElement.setAttribute('place-id', placeId);
        this.svgElement.setAttribute('trans-id', transId);
        this._placePos = new Vector(0, 0);
        this._transPos = new Vector(1, 0);
        this.arrow = new Arrow(this.svgElement.children[0].children[0], this.svgElement.children[1]);
        this.arcType = arctype;
    }
    get placeId() { return this.svgElement.getAttribute('place-id'); }
    get transId() { return this.svgElement.getAttribute('trans-id'); }
    get weight() { return this.getPEText('weight'); }
    set weight(val) { this.setPEText('weight', val); }
    get arcType() { return this._arcType; }
    set arcType(val) {
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
        this._arcType = val;
        this.svgElement.setAttribute('arc-type', val);
        let lines = this.getLines();
        if (lines.length === 1) {
            this.singleLineUpdate();
        }
        else {
            setLineEndPoint(lines[0], getLineStartPoint(lines[1]));
            setLineStartPoint(lines[lines.length - 1], getLineEndPoint(lines[lines.length - 2]));
            this.updatePlacePos(this._placePos);
            this.updateTransPos(this._transPos);
        }
    }
    getLines() {
        return this.svgElement.children[0].children;
    }
    updateWeightPos() {
        let lines = this.getLines();
        let n = lines.length;
        let line;
        let anchorPoint;
        if (n % 2 === 1) {
            line = lines[(n - 1) / 2];
            anchorPoint = getLineMidPoint(line);
        }
        else {
            line = lines[n / 2];
            anchorPoint = getLineStartPoint(line);
        }
        let pos = anchorPoint.add(getLineDirection(line).norm().ortogonal().mul(4.5));
        this.svgElement.children[3].setAttribute('x', String(pos.x));
        this.svgElement.children[3].setAttribute('y', String(pos.y));
    }
    updateNegBall(pos) {
        this.svgElement.children[2].setAttribute('cx', String(pos.x));
        this.svgElement.children[2].setAttribute('cy', String(pos.y));
    }
    updateInhibitorArrow(tailPos, connectionPoint, u) {
        this.updateNegBall(connectionPoint.add(u.mul(PetriArc.negBallRadius)));
        this.arrow.update(tailPos, connectionPoint.add(u.mul(2 * PetriArc.negBallRadius)));
    }
    singleLineUpdate() {
        let u = (this._placePos.sub(this._transPos)).norm();
        let placePoint = PetriPlace.getConnectionPoint(this._placePos, u);
        let transPoint = PetriTrans.getConnectionPoint(this._transPos, u);
        if (this._arcType === 'Output') {
            this.arrow.update(transPoint, placePoint);
        }
        else {
            if (this._arcType === 'Inhibitor') {
                this.updateInhibitorArrow(placePoint, transPoint, u);
            }
            else {
                this.arrow.update(placePoint, transPoint);
            }
        }
        this.updateWeightPos();
    }
    updatePlacePos(pos) {
        this._placePos = pos;
        let lines = this.getLines();
        if (lines.length === 1) {
            this.singleLineUpdate();
        }
        else if (this._arcType === "Output") {
            this.arrow.updateHeadPos(PetriPlace.getConnectionPoint(pos, this.arrow.getDirection()));
        }
        else {
            setLineStartPoint(lines[0], PetriPlace.getConnectionPoint(pos, this.arrow.getDirection()));
        }
    }
    updateTransPos(pos) {
        this._transPos = pos;
        let lines = this.getLines();
        if (lines.length === 1) {
            this.singleLineUpdate();
        }
        else {
            let u = this.arrow.getDirection();
            let connectionPoint = PetriTrans.getConnectionPoint(pos, u);
            if (this._arcType === "Output") {
                setLineStartPoint(lines[0], connectionPoint);
            }
            else {
                if (this._arcType === "Inhibitor") {
                    this.updateInhibitorArrow(getLineEndPoint(lines[lines.length - 2]), connectionPoint, u);
                }
                this.arrow.updateHeadPos(connectionPoint);
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
    splitLine(i) {
        let lines = this.getLines();
        let ele = lines[i].cloneNode(true);
        this.svgElement.children[0].insertBefore(ele, lines[i]);
        let midPoint = getLineMidPoint(lines[i]);
        setLineEndPoint(lines[i], midPoint);
        setLineStartPoint(lines[i + 1], midPoint);
    }
    setNodePos(node, coord) {
        let transform = node.transform.baseVal.getItem(0);
        transform.setTranslate(coord.x, coord.y);
    }
    createNode(nodeType, i, line) {
        let group = document.getElementById('arc-nodes');
        let node = arcNodeModel.cloneNode(true);
        node.id = 'arc-' + nodeType + '-node-' + i;
        node.setAttribute('pe-parent', this.id);
        node.setAttribute('arc-node-type', nodeType);
        node.setAttribute('arc-node-line', String(i));
        if (nodeType === 'mid') {
            node.setAttribute('fill', 'blue');
            this.setNodePos(node, getLineMidPoint(line));
        }
        else {
            node.setAttribute('fill', 'yellow');
            this.setNodePos(node, getLineStartPoint(line));
        }
        group.appendChild(node);
    }
    showNodes() {
        let lines = this.getLines();
        for (let i = 0; i < lines.length; i++) {
            this.createNode('mid', i, lines[i]);
            if (i > 0) {
                this.createNode('corner', i, lines[i]);
            }
        }
    }
    cleanNodes() {
        document.getElementById('arc-nodes').innerHTML = '';
    }
}
PetriArc.negBallRadius = 2;
export { AGenericPetriElement, APetriElement, PetriPlace, PetriTrans, PetriArc };
