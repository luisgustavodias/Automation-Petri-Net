export default class Vector {
    x: number
    y: number

    constructor (x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(vec: Vector) {
        return new Vector(this.x + vec.x, this.y + vec.y);
    }

    sub(vec: Vector) {
        return new Vector(this.x - vec.x, this.y - vec.y);
    }

    mul(val: number) {
        return new Vector(val*this.x, val*this.y);
    }

    neg() {
        return new Vector(-this.x, -this.y);
    }

    mag() {
        return Math.sqrt(this.x*this.x + this.y*this.y)
    }

    norm() {
        let mag = this.mag()
        return new Vector(this.x/mag, this.y/mag);
    }

    ortogonal() {
        return new Vector(-this.y, this.x);
    }

    str() {
        return this.x + ',' + this.y;
    } 
    
    toJSON() {
        return {x: this.x, y: this.y}
    }
}