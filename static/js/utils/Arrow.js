import { createSVGElement } from './SVGElement/base.js';
import { createCircle, setCircleCenter } from './SVGElement/Circle.js';
import { createPolygon } from './SVGElement/others.js';
import Vector from './Vector.js';
export class CurvedArrow {
    static headWidth = 6;
    static headHeight = 2;
    static negBallRadius = 2;
    polyline;
    clickablePolyline;
    arrowHead;
    negBall;
    points;
    arcType;
    constructor(parentElement, startPos, endPos, PEParentId) {
        this.points = [startPos, endPos];
        this.polyline = createSVGElement('polyline', {
            'stroke': 'black',
            'fill': 'none',
            'stroke-linecap': 'round'
        });
        this.clickablePolyline = createSVGElement('polyline', {
            'PEParent': PEParentId,
            'stroke': 'black',
            'opacity': '0',
            'stroke-width': '6',
            'fill': 'none',
            'stroke-linecap': 'round'
        });
        this.arrowHead = createPolygon({ 'PEParent': PEParentId });
        this.negBall = createCircle(new Vector(0, 0), CurvedArrow.negBallRadius, {
            'fill-opacity': '0',
            'stroke': 'black',
            'stroke-width': '0.8'
        });
        parentElement.appendChild(this.polyline);
        parentElement.appendChild(this.arrowHead);
        parentElement.appendChild(this.negBall);
        parentElement.appendChild(this.clickablePolyline);
        this.arcType = 'Input';
        this.draw();
    }
    drawHead(u, v1) {
        let w = u.ortogonal();
        // v1, v2 e v3 are the vertices of the triangle(arrow head)
        let v2 = v1.add(u.mul(CurvedArrow.headWidth))
            .add(w.mul(CurvedArrow.headHeight));
        let v3 = v2.sub(w.mul(2 * CurvedArrow.headHeight));
        let points = v1.str() + ' ' + v2.str() + ' ' + v3.str();
        this.arrowHead.setAttribute('points', points);
    }
    draw() {
        const headPos = this.getHeadPos();
        const u = this.points[this.points.length - 2].sub(headPos).norm();
        const pointsStr = this.points
            .map((p, i) => {
            if (i === this.points.length - 1) {
                p = p.sub(u.mul(-6));
            }
            return `${p.x} ${p.y}`;
        }).join(', ');
        this.polyline.setAttribute('points', pointsStr);
        this.clickablePolyline.setAttribute('points', pointsStr);
        if (this.arcType === 'Inhibitor') {
            this.drawHead(u, headPos.sub(u.mul(-2 * CurvedArrow.negBallRadius)));
            setCircleCenter(this.negBall, headPos.sub(u.mul(-CurvedArrow.negBallRadius)));
        }
        else {
            this.drawHead(u, headPos);
        }
    }
    getHeadPos() {
        return this.points[this.points.length - 1];
    }
    getTailPos() {
        return this.points[0];
    }
    getPointPos(idx) {
        return this.points[idx >= 0 ? idx : (this.points.length + idx)];
    }
    getNextLineMidPoint(cornerIdx) {
        return this.points[cornerIdx + 1]
            .add(this.points[cornerIdx]).mul(0.5);
    }
    getPath() {
        return [...this.points];
    }
    hasCorner() {
        return this.points.length > 2;
    }
    numberOfCorners() {
        return this.points.length - 2;
    }
    getCorners() {
        return this.points.slice(1, -1);
    }
    getLinesMidPoint() {
        const midPoints = [];
        for (let i = 0; i < this.points.length - 1; i++)
            midPoints.push(this.getNextLineMidPoint(i));
        return midPoints;
    }
    setArcType(arcType) {
        if (arcType === 'Test')
            this.polyline.setAttribute('stroke-dasharray', '2 2');
        else
            this.polyline.setAttribute('stroke-dasharray', '');
        if (arcType === 'Inhibitor')
            this.negBall.setAttribute('visibility', 'visible');
        else
            this.negBall.setAttribute('visibility', 'hidden');
        this.arcType = arcType;
        this.draw();
    }
    reverse() {
        this.points.reverse();
        this.draw();
    }
    updateHeadPos(pos, reDraw = true) {
        this.points[this.points.length - 1] = pos;
        if (reDraw)
            this.draw();
    }
    updateTailPos(pos, reDraw = true) {
        this.points[0] = pos;
        if (reDraw)
            this.draw();
    }
    updateTips(startPos, endPos, reDraw = true) {
        this.updateTailPos(startPos, false);
        this.updateHeadPos(endPos, reDraw);
    }
    addCorner(cornerIndex) {
        this.points.splice(cornerIndex + 1, 0, this.getNextLineMidPoint(cornerIndex));
    }
    removeCorner(cornerIndex) {
        if (cornerIndex === 0 || cornerIndex === this.points.length - 1)
            throw 'Invalid cornerIndex';
        this.points.splice(cornerIndex, 1);
    }
    moveCorner(cornerIndex, pos, reDraw = true) {
        this.points[cornerIndex] = pos;
        if (reDraw)
            this.draw();
    }
    setColor(color) {
        this.polyline.setAttribute('stroke', color);
        this.arrowHead.setAttribute('fill', color);
        this.negBall.setAttribute('stroke', color);
    }
}
