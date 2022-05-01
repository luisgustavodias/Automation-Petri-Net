import { PetriNet } from "./PetriNet"

class Editor {
    divElement: HTMLDivElement
    private _currentNet: PetriNet

    constructor() {
        this._currentNet = null
        this.divElement = <HTMLDivElement>document.getElementById('svg-div')
    }

    get currentNet() {
        return this._currentNet
    }

    open(net: PetriNet) {
        if (this._currentNet) {
            this.close()
        }

        this._currentNet = net

        this.divElement.style.display = 'block'
        this.divElement.appendChild(net.svgElement)
    }

    close() {
        if (this._currentNet) {
            this._currentNet.svgElement.remove()
            this.divElement.style.display = 'none'
        }
    }
}

export default Editor