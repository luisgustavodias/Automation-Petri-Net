export class UndoRedoManager {
    constructor() {
        this.undoList = [];
        this.redoList = [];
    }
    registryChange(change) {
        this.undoList.push(change);
    }
    undo() {
        if (!this.undoList.length) {
            return;
        }
        let change = this.undoList.pop();
        change.undo();
        this.redoList.push(change);
    }
    redo() {
        if (!this.redoList.length) {
            return;
        }
        let change = this.redoList.pop();
        change.redo();
        this.undoList.push(change);
    }
}
export var undoRedoManager = new UndoRedoManager();
