import Vector from "./Vector.js";

function getCircleRadius(circle: SVGCircleElement) {
    return parseInt(circle.getAttribute('r'))
}

function setCircleRadius(circle: SVGCircleElement, val: number) {
    circle.setAttribute('r', String(val))
}

function getCircleCenter(circle: SVGCircleElement) {
    return new Vector(
        parseInt(circle.getAttribute('cx')),
        parseInt(circle.getAttribute('cy'))
    )
}

function setCircleCenter(circle: SVGCircleElement, center: Vector) {
    circle.setAttribute('cx', String(center.x))
    circle.setAttribute('cy', String(center.y))
}

function createCircle(center: Vector, radius: number) {
    const circle = <SVGCircleElement><unknown>document
        .createElementNS('http://www.w3.org/2000/svg', 'circle')
    setCircleCenter(circle, center)
    setCircleRadius(circle, radius)

    return circle
}

export { getCircleCenter, getCircleRadius, setCircleCenter, 
    setCircleRadius, createCircle }