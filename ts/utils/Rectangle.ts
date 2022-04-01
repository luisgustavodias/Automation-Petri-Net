import Vector from "./Vector";

function getRectPos(rect: SVGRectElement) {
    return new Vector(
        parseInt(rect.getAttribute('x')),
        parseInt(rect.getAttribute('y'))
    )
}

function setRectPos(rect: SVGRectElement, pos: Vector) {
    rect.setAttribute('x', String(pos.x))
    rect.setAttribute('y', String(pos.y))
}

function getRectWidth(rect: SVGRectElement) {
    return parseInt(rect.getAttribute('width'))
}

function setRectWidth(rect: SVGRectElement, width: number) {
    rect.setAttribute('width', String(width))
}

function getRectHeight(rect: SVGRectElement) {
    return parseInt(rect.getAttribute('height'))
}

function setRectHeight(rect: SVGRectElement, height: number) {
    rect.setAttribute('height', String(height))
}

function createRect(pos: Vector, width: number, height: number) {
    const rect = <SVGRectElement><unknown>document
        .createElementNS('http://www.w3.org/2000/svg', 'rect')
    setRectPos(rect, pos)
    setRectWidth(rect, width)
    setRectHeight(rect, height)

    return rect
}
