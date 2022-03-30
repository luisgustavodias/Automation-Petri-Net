export interface Change {
    undo(): void
    redo(): void
}

export class UndoRedoManager {
    undoList: Array<Change>
    redoList: Array<Change>

    constructor() {
        this.undoList = []
        this.redoList = []
    }

    registryChange(change: Change) {
        this.undoList.push(change)
    }

    undo() {
        if (!this.undoList.length) {
            return
        }
        let change = this.undoList.pop()
        change.undo()
        this.redoList.push(change)
    }

    redo() {
        if (!this.redoList.length) {
            return
        }
        let change = this.redoList.pop()
        change.redo()
        this.undoList.push(change)
    }
}

export var undoRedoManager = new UndoRedoManager()