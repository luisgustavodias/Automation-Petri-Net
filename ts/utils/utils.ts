import Vector from "./Vector.js";

export var svg = <SVGSVGElement><unknown>document.getElementById('my-svg');

export function getMousePosition(evt) {
    const CTM = svg.getScreenCTM();
    return new Vector(
        (evt.clientX - CTM.e) / CTM.a,
        (evt.clientY - CTM.f) / CTM.d
    )
}

const GRID_SIZE = 10;

export function gridFit(pos: Vector) {
    return new Vector(
        Math.round(pos.x/GRID_SIZE)*GRID_SIZE, 
        Math.round(pos.y/GRID_SIZE)*GRID_SIZE
    )
}