import { createLine, updateLine } from './SVGElement/Line.js';
import { createPolygon } from './SVGElement/others.js';
import Vector from './Vector.js';
export class Arrow {
    headWidth = 6;
    headHeight = 2;
    line;
    head;
    headPos;
    tailPos;
    constructor() {
        this.headPos = new Vector(20, 20);
        this.tailPos = new Vector(50, 20);
        this.line = createLine(this.headPos, this.tailPos);
        this.line.setAttribute('stroke', 'black');
        this.head = createPolygon();
        this._update();
    }
    updateHead(u, v1) {
        let w = u.ortogonal();
        // v1, v2 e v3 são os vétices do triângulo que forma a cabeça do arco
        let v2 = v1.add(u.mul(this.headWidth)).add(w.mul(this.headHeight));
        let v3 = v2.sub(w.mul(2 * this.headHeight));
        let points = v1.str() + ' ' + v2.str() + ' ' + v3.str();
        this.head.setAttribute('points', points);
    }
    getDirection() {
        return (this.headPos.sub(this.tailPos)).norm();
    }
    _update() {
        let u = this.getDirection();
        updateLine(this.line, this.tailPos, this.headPos.add(u.mul(-this.headWidth)));
        this.updateHead(u.mul(-1), this.headPos);
    }
    update(tailPos, headPos) {
        this.tailPos = tailPos;
        this.headPos = headPos;
        this._update();
    }
    updateHeadPos(pos) { this.update(this.tailPos, pos); }
    updateTailPos(pos) { this.update(pos, this.headPos); }
    getHeadPos() {
        return this.headPos;
    }
    getTailPos() {
        return this.tailPos;
    }
    getMidPoint() {
        return this.tailPos.add(this.headPos.sub(this.tailPos).mul(0.5));
    }
}
// type ArcType = "Input" | "Output" | "Test" | "Inhibitor"
// export class CurvedArrow {
//     svgGElement: SVGGElement
//     startPos: Vector
//     endPos: Vector
//     constructor (svgGElement: SVGGElement) {
//         this.svgGElement = svgGElement
//         this.startPos = 
//     }
//     private updateLine(startPoint: Vector, endPoint: Vector) {
//         this.line.setAttribute('x1', String(startPoint.x))
//         this.line.setAttribute('y1', String(startPoint.y))
//         this.line.setAttribute('x2', String(endPoint.x))
//         this.line.setAttribute('y2', String(endPoint.y))
//     }
//     private updateHead(u: Vector, v1: Vector) {
//         let w = u.ortogonal()
//         // v1, v2 e v3 são os vétices do triângulo que forma a cabeça do arco
//         let v2 = v1.add(u.mul(this.headWidth)).add(w.mul(this.headHeight))
//         let v3 = v2.sub(w.mul(2 * this.headHeight))
//         let points = v1.str() + ' ' + v2.str() + ' ' + v3.str()
//         this.head.setAttribute('points', points)
//     }
//     getDirection() {
//         return (this.headPos.sub(this.tailPos)).norm()
//     }
//     private _update() {
//         let u = this.getDirection()
//         updateLine(
//             this.line,
//             this.tailPos, 
//             this.headPos.add(u.mul(this.headWidth))
//         )
//         this.updateHead(u.mul(-1), this.headPos)
//     }
//     update(tailPos: Vector, headPos: Vector) {
//         this.tailPos = tailPos
//         this.headPos = headPos
//         this._update()
//     }
//     updateHeadPos(pos: Vector) { this.update(this.tailPos, pos) }
//     updateTailPos(pos: Vector) { this.update(pos, this.headPos) }
//     changeLine(line: SVGLineElement) {
//         this.line = line
//         this._update()
//     }
// }
