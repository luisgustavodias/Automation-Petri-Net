import Vector from "../Vector.js";
function createSVGElement(tagName, attrs = {}) {
    const ele = document
        .createElementNS('http://www.w3.org/2000/svg', tagName);
    for (const attrName in attrs) {
        ele.setAttribute(attrName, attrs[attrName]);
    }
    return ele;
}
function getSVGElementTranslate(element) {
    const matrix = element.transform.baseVal.getItem(0).matrix;
    return new Vector(matrix.e, matrix.f);
}
function translateSVGElement(element, pos) {
    const transform = element.transform.baseVal.getItem(0);
    transform.setTranslate(pos.x, pos.y);
}
export { createSVGElement, getSVGElementTranslate, translateSVGElement };
