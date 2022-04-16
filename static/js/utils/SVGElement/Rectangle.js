import Vector from "../Vector.js";
import { createSVGElement } from "./base.js";
function getRectPos(rect) {
    return new Vector(parseInt(rect.getAttribute('x')), parseInt(rect.getAttribute('y')));
}
function setRectPos(rect, pos) {
    rect.setAttribute('x', String(pos.x));
    rect.setAttribute('y', String(pos.y));
}
function setRectCenter(rect, pos) {
    setRectPos(rect, pos.sub(getRectSizeAsVector(rect).mul(0.5)));
}
function getRectWidth(rect) {
    return parseInt(rect.getAttribute('width'));
}
function setRectWidth(rect, width) {
    rect.setAttribute('width', String(width));
}
function getRectHeight(rect) {
    return parseInt(rect.getAttribute('height'));
}
function setRectHeight(rect, height) {
    rect.setAttribute('height', String(height));
}
function getRectSizeAsVector(rect) {
    return new Vector(getRectWidth(rect), getRectHeight(rect));
}
function createRect(pos, width, height, attrs = {}) {
    const rect = createSVGElement('rect', attrs);
    setRectHeight(rect, height);
    setRectWidth(rect, width);
    setRectCenter(rect, pos);
    return rect;
}
export { getRectPos, getRectHeight, getRectWidth, setRectHeight, setRectWidth, setRectPos, setRectCenter, createRect };
