import Vector from "../Vector.js";
import { createSVGElement, SVGElementAttrs } from "./base.js";

function getCircleRadius(circle: SVGCircleElement) {
    return parseInt(<string>circle.getAttribute('r'))
}

function setCircleRadius(circle: SVGCircleElement, val: number) {
    circle.setAttribute('r', String(val))
}

function getCircleCenter(circle: SVGCircleElement) {
    return new Vector(
        parseInt(<string>circle.getAttribute('cx')),
        parseInt(<string>circle.getAttribute('cy'))
    )
}

function setCircleCenter(circle: SVGCircleElement, center: Vector) {
    circle.setAttribute('cx', String(center.x))
    circle.setAttribute('cy', String(center.y))
}

function createCircle(
    center: Vector, 
    radius: number, 
    attrs: SVGElementAttrs = {}
) {
    const circle = <SVGCircleElement>createSVGElement('circle', attrs)
    setCircleCenter(circle, center)
    setCircleRadius(circle, radius)

    return circle
}

export { getCircleCenter, getCircleRadius, setCircleCenter, 
    setCircleRadius, createCircle }