class Editor {
    divElement;
    _currentNet;
    constructor() {
        this._currentNet = null;
        this.divElement = document.getElementById('svg-div');
    }
    get currentNet() {
        return this._currentNet;
    }
    open(net) {
        if (this._currentNet) {
            this.close();
        }
        this._currentNet = net;
        this.divElement.appendChild(net.svgElement);
    }
    close() {
        if (this._currentNet) {
            this._currentNet.svgElement.remove();
        }
    }
}
export default Editor;
