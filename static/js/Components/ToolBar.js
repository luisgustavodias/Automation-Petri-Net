export default class ToolBar {
    constructor() { }
    selectTool(toolName) {
        document.getElementById(toolName)
            .classList.add("selected-tool-bar-item");
    }
    deselectTool(toolName) {
        document.getElementById(toolName)
            .classList.remove("selected-tool-bar-item");
    }
}
