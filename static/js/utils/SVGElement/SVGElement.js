function createSVGElement(tagName, attrs) {
    const ele = document
        .createElementNS('http://www.w3.org/2000/svg', tagName);
    for (const attrName in attrs) {
        ele.setAttribute(attrName, attrs[attrName]);
    }
    return ele;
}
export { createSVGElement };
