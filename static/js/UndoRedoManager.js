class UndoRedoManager {
    undoList;
    redoList;
    constructor() {
        this.undoList = [];
        this.redoList = [];
    }
    registryChange(change) {
        this.undoList.push(change);
        this.redoList = [];
    }
    undo() {
        const lastChange = this.undoList.pop();
        if (lastChange) {
            lastChange.undo();
            this.redoList.push(lastChange);
            return true;
        }
        return false;
    }
    redo() {
        const lastChange = this.redoList.pop();
        if (lastChange) {
            lastChange.redo();
            this.undoList.push(lastChange);
            return true;
        }
        return false;
    }
}
export { UndoRedoManager };
