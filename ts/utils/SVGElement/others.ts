import Vector from "../Vector";
import { createSVGElement, SVGElementAttrs } from "./base.js";

function createText(
    innerHTML: string, 
    pos: Vector,
    attrs: SVGElementAttrs = {}
) {
    Object.assign(attrs, {transform: `translate(${pos.x}, ${pos.y})`})
    const textElement = <SVGTextElement>createSVGElement('text', attrs)

    textElement.innerHTML = innerHTML

    return textElement
}

function createGroup(attrs: SVGElementAttrs = {}) {
    return <SVGGElement>createSVGElement('g', attrs)
}

function createPolygon(attrs: SVGElementAttrs = {}) {
    return <SVGPolygonElement>createSVGElement('polygon', attrs)
}

export { createText, createGroup, createPolygon }