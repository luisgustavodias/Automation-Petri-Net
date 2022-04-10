import Vector from "./Vector";
function getRectPos(rect) {
    return new Vector(parseInt(rect.getAttribute('x')), parseInt(rect.getAttribute('y')));
}
function setRectPos(rect, pos) {
    rect.setAttribute('x', String(pos.x));
    rect.setAttribute('y', String(pos.y));
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
function createRect(pos, width, height) {
    const rect = document
        .createElementNS('http://www.w3.org/2000/svg', 'rect');
    setRectPos(rect, pos);
    setRectWidth(rect, width);
    setRectHeight(rect, height);
    return rect;
}
