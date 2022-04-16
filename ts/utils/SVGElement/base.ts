import Vector from "../Vector.js"

type SVGElementAttrs = {[attrName: string]: string}


function createSVGElement(tagName: string, attrs: SVGElementAttrs = {}) {
    const ele = <SVGElement><unknown>document
        .createElementNS('http://www.w3.org/2000/svg', tagName)
    
    for (const attrName in attrs) {
        ele.setAttribute(attrName, attrs[attrName])
    }

    return ele
}

function getSVGElementTranslate(element: SVGAElement) {
    const matrix = element.transform.baseVal.getItem(0).matrix
    
    return new Vector(matrix.e, matrix.f)
}

function translateSVGElement(element: SVGAElement, pos: Vector) {
    const transform = element.transform.baseVal.getItem(0);
    transform.setTranslate(pos.x, pos.y);
}


export { SVGElementAttrs, createSVGElement, getSVGElementTranslate, translateSVGElement }