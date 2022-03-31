import Vector from "./Vector.js";
export function getLineStartPoint(line) {
    return new Vector(parseFloat(line.getAttribute('x1')), parseFloat(line.getAttribute('y1')));
}
export function setLineStartPoint(line, point) {
    line.setAttribute('x1', String(point.x));
    line.setAttribute('y1', String(point.y));
}
export function getLineEndPoint(line) {
    return new Vector(parseFloat(line.getAttribute('x2')), parseFloat(line.getAttribute('y2')));
}
export function setLineEndPoint(line, point) {
    line.setAttribute('x2', String(point.x));
    line.setAttribute('y2', String(point.y));
}
export function getLineMidPoint(line) {
    return getLineStartPoint(line).add(getLineEndPoint(line)).mul(0.5);
}
export function getLineDirection(line) {
    return getLineEndPoint(line).sub(getLineStartPoint(line)).norm();
}
export function updateLine(line, startPoint, endPoint) {
    setLineStartPoint(line, startPoint);
    setLineEndPoint(line, endPoint);
}
export function invertLine(line) {
    updateLine(line, getLineEndPoint(line), getLineStartPoint(line));
}
export function createLine(startPoint, endPoint) {
    const line = document
        .createElementNS('http://www.w3.org/2000/svg', 'line');
    setLineStartPoint(line, startPoint);
    setLineEndPoint(line, endPoint);
    return line;
}
