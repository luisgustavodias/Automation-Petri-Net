export default class ToolBar {

    constructor() {}

    selectTool(toolName: string) {
        (<HTMLElement>document.getElementById(toolName))
            .classList.add("selected-tool-bar-item")
    }

    deselectTool(toolName: string) {
        (<HTMLElement>document.getElementById(toolName))
            .classList.remove("selected-tool-bar-item")
    }
}
