import { createSVGElement } from "./base.js";
function createText(innerHTML, pos, attrs = {}) {
    Object.assign(attrs, { transform: `translate(${pos.x}, ${pos.y})` });
    const textElement = createSVGElement('text', attrs);
    textElement.innerHTML = innerHTML;
    return textElement;
}
function createGroup(attrs = {}) {
    return createSVGElement('g', attrs);
}
function createPolygon(attrs = {}) {
    return createSVGElement('polygon', attrs);
}
export { createText, createGroup, createPolygon };
