import Vector from "./Vector.js";

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

function setRectCenter(rect: SVGRectElement, pos: Vector) {
    setRectPos(rect, pos.sub(getRectSizeAsVector(rect).mul(0.5)))
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

function getRectSizeAsVector(rect: SVGRectElement) {
    return new Vector(getRectWidth(rect), getRectHeight(rect))
}

function createRect(pos: Vector, width: number, height: number) {
    const rect = <SVGRectElement><unknown>document
        .createElementNS('http://www.w3.org/2000/svg', 'rect')
    setRectHeight(rect, height)
    setRectWidth(rect, width)
    setRectCenter(rect, pos)

    return rect
}

export { getRectPos, getRectHeight, getRectWidth, setRectHeight, setRectWidth, setRectPos, setRectCenter, createRect }
