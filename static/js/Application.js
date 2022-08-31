import { generateCode } from "./CodeGenerator.js";
import Editor from "./Components/Editor.js";
import { InputConfig } from "./Components/InputsConfigWindow.js";
import { InputWindow } from "./Components/InputsWindow.js";
import { PetriNet } from "./PetriNetGraphics/PetriNet.js";
import { PropertyWindow } from "./Components/PropertyWindow.js";
import { SimConfigWindow } from "./Components/SimConfigWindow.js";
import { Simulator } from "./Components/Simulator.js";
import ToolBar from "./Components/ToolBar.js";
const FILE_PICKER_OPTIONS = {
    types: [{
            description: 'Automation Petri Net',
            accept: {
                'text/plain': ['.txt']
            }
        }],
    excludeAcceptAllOption: true,
    multiple: false
};
async function loadNet() {
    let fileHandle;
    //@ts-ignore
    [fileHandle] = await window.showOpenFilePicker(FILE_PICKER_OPTIONS);
    const file = await fileHandle.getFile();
    const fileText = await file.text();
    const netData = JSON.parse(fileText);
    return PetriNet.loadNet(netData);
}
async function saveNet(net) {
    let fileHandle;
    //@ts-ignore
    fileHandle = await window.showSaveFilePicker(FILE_PICKER_OPTIONS);
    const file = await fileHandle.createWritable();
    await file.write(JSON.stringify(net.getNetData()));
    await file.close();
}
export class Application {
    inputWindow;
    propertyWindow;
    inputsConfigWindow;
    simConfigWindow;
    toolBar;
    editor;
    simulator;
    constructor() {
        this.editor = null;
        this.propertyWindow = new PropertyWindow();
        this.inputWindow = new InputWindow();
        this.inputsConfigWindow = new InputConfig();
        this.simConfigWindow = new SimConfigWindow();
        this.toolBar = new ToolBar();
        this.simulator = null;
    }
    run() {
        this.bindNavBarButtons();
        this.bindToolBarButtons();
        this.bindSimulationButtons();
        this.bindGenCodeButtons();
        this.addEditorEventListeners();
    }
    getEditor() {
        return this.editor;
    }
    openNet(net) {
        this.editor = new Editor(PetriNet.newNet(), this.propertyWindow);
    }
    bindNavBarButtons() {
        const handlers = {
            "nav-btn-new-file": () => {
                if (this.editor)
                    this.editor.close();
                this.editor = new Editor(PetriNet.newNet(), this.propertyWindow);
            },
            "nav-btn-close-file": () => {
                if (!this.editor)
                    return;
                this.editor.close();
                this.editor = null;
            },
            "nav-btn-load-file": async () => {
                const net = await loadNet();
                if (this.editor)
                    this.editor.close();
                this.editor = new Editor(net, this.propertyWindow);
            },
            "nav-btn-save-file": async () => {
                if (!this.editor)
                    return;
                await saveNet(this.editor.net);
            },
            "nav-btn-sim-config": async () => {
                if (!this.editor)
                    return;
                this.simConfigWindow.open(this.editor.net.simConfig, simConfig => this.editor.net.simConfig = simConfig);
            },
            "nav-btn-inputs-config": async () => {
                if (!this.editor)
                    return;
                this.inputsConfigWindow.open(this.editor.net.inputs, inputs => this.editor.net.inputs = inputs);
            }
        };
        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(btnId);
            btn.onclick = handler;
        }
    }
    bindToolBarButtons() {
        const tools = [
            "mouse-tool",
            "place-tool",
            "trans-tool",
            "arc-tool"
        ];
        for (const tool of tools) {
            const btn = document
                .getElementById(tool);
            btn.onclick = () => {
                if (this.simulator || !this.editor)
                    return;
                this.toolBar.deselectTool(this.editor.currentToolName);
                this.toolBar.selectTool(tool);
                this.editor.selectTool(tool);
            };
        }
    }
    bindGenCodeButtons() {
        const genCodeModal = document
            .getElementById('gencode-modal');
        const handlers = {
            "nav-btn-gencode": () => {
                if (!this.editor)
                    return;
                genCodeModal.style.display = 'block';
                const ele = document
                    .getElementById('gencode-out');
                ele.value = generateCode(this.editor.net.getNetData());
            },
            "gencode-modal-close": () => {
                genCodeModal.style.display = 'none';
            },
            "gencode-close": () => {
                genCodeModal.style.display = 'none';
            },
        };
        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(btnId);
            btn.onclick = handler;
        }
    }
    bindSimulationButtons() {
        const createSimulator = () => {
            this.editor.currentTool.onChangeTool();
            return new Simulator(this.editor.net, this.inputWindow);
        };
        const handlers = {
            start: () => {
                if (!this.simulator)
                    this.simulator = createSimulator();
                this.simulator.start();
            },
            step: () => {
                if (!this.simulator)
                    this.simulator = createSimulator();
                this.simulator.step();
            },
            restart: () => {
                if (!this.simulator)
                    return;
                this.simulator = createSimulator();
            },
            pause: () => {
                if (!this.simulator)
                    return;
                this.simulator.pause();
            },
            stop: () => {
                if (!this.simulator)
                    return;
                this.simulator.stop();
                this.simulator = null;
            },
        };
        for (const [cmd, handler] of Object.entries(handlers)) {
            const btn = document.getElementById(`sim-btn-${cmd}`);
            btn.onclick = () => {
                if (!this.editor)
                    return;
                handler();
            };
        }
    }
    addEditorEventListeners() {
        let movingScreenOffset;
        const handlers = {
            mousedown: (evt) => {
                console.log(evt);
                if (!this.editor)
                    return;
                if (evt.ctrlKey || evt.button === 2) {
                    movingScreenOffset = this.editor.net
                        .getMousePosition(evt, true);
                }
                else if (!this.simulator) {
                    this.editor.currentTool.onMouseDown(evt);
                }
            },
            mouseup: (evt) => {
                evt.preventDefault();
                if (!this.editor)
                    return;
                movingScreenOffset = null;
                if (!this.simulator) {
                    this.editor.currentTool.onMouseUp(evt);
                }
            },
            mousemove: (evt) => {
                if (!this.editor)
                    return;
                if (movingScreenOffset) {
                    const mousePos = this.editor.net
                        .getMousePosition(evt, true);
                    this.editor.net.moveScreen(mousePos.sub(movingScreenOffset));
                }
                else if (!this.simulator) {
                    this.editor.currentTool.onMouseMove(evt);
                }
            },
            mouseleave: (evt) => {
                if (!this.editor)
                    return;
                movingScreenOffset = null;
                if (!this.simulator) {
                    this.editor.currentTool.onMouseLeave(evt);
                }
            },
            wheel: (evt) => {
                evt.preventDefault();
                if (!this.editor)
                    return;
                const scale = Math.min(Math.max(.9, 1 + .01 * evt.deltaY), 1.1);
                const mousePos = this.editor.net.getMousePosition(evt);
                this.editor.net.zoom(mousePos, scale);
            }
        };
        const ele = document.getElementById("svg-div");
        for (const [event, handler] of Object.entries(handlers)) {
            ele.addEventListener(event, handler);
        }
        document.body.addEventListener('keydown', (evt) => {
            if (!this.editor)
                return;
            console.log();
            if (evt.target.tagName !== "BODY")
                return;
            if (evt.key === 'Shift') {
                console.log(this.editor.net.grid);
                this.editor.net.grid = !this.editor.net.grid;
            }
            if (this.simulator)
                return;
            if (evt.key === 'z' && evt.ctrlKey) {
                this.editor.net.undo();
            }
            else if (evt.key === 'y' && evt.ctrlKey) {
                this.editor.net.redo();
            }
            else
                this.editor.currentTool.onKeyDown(evt);
        });
        document.addEventListener("contextmenu", function (evt) {
            evt.preventDefault();
        }, false);
    }
}
