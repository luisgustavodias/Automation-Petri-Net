import Vector from "../Vector.js";
import { createSVGElement } from "./base.js";
function getCircleRadius(circle) {
    return parseInt(circle.getAttribute('r'));
}
function setCircleRadius(circle, val) {
    circle.setAttribute('r', String(val));
}
function getCircleCenter(circle) {
    return new Vector(parseInt(circle.getAttribute('cx')), parseInt(circle.getAttribute('cy')));
}
function setCircleCenter(circle, center) {
    circle.setAttribute('cx', String(center.x));
    circle.setAttribute('cy', String(center.y));
}
function createCircle(center, radius, attrs = {}) {
    const circle = createSVGElement('circle', attrs);
    setCircleCenter(circle, center);
    setCircleRadius(circle, radius);
    return circle;
}
export { getCircleCenter, getCircleRadius, setCircleCenter, setCircleRadius, createCircle };
