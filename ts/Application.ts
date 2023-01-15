import { generateCode } from "./CodeGenerator.js";
import Editor from "./Components/Editor.js";
import { InputConfig } from "./Components/InputsConfigWindow.js";
import { InputWindow } from "./Components/InputsWindow.js";
import { PetriNet } from "./PetriNetGraphics/PetriNet.js";
import { PropertyWindow } from "./Components/PropertyWindow.js";
import { SimConfigWindow } from "./Components/SimConfigWindow.js";
import { Simulator } from "./Components/Simulator.js";
import ToolBar from "./Components/ToolBar.js";
import Vector from "./utils/Vector.js";
import { delay } from "./utils/utils.js";
import { PetriNetData } from "./PNData.js";
import { SimulationError } from "./LogicalNet.js";

const FILE_PICKER_OPTIONS = {
    types: [{
        description: 'Automation Petri Net',
        accept: {
            'text/plain': ['.txt']
        }
    }],
    excludeAcceptAllOption: true,
    multiple: false
}

async function loadNet() {
    let fileHandle
    //@ts-ignore
    [fileHandle] = await window.showOpenFilePicker(FILE_PICKER_OPTIONS)
    const file = await fileHandle.getFile()
    const fileText = await file.text()

    const netData = JSON.parse(fileText)

    return PetriNet.loadNet(netData)
}

async function saveNet(net: PetriNet) { 
    let fileHandle
    //@ts-ignore
    fileHandle = await window.showSaveFilePicker(FILE_PICKER_OPTIONS)
    const file = await fileHandle.createWritable()
    
    await file.write(JSON.stringify(net.getNetData()))
    
    await file.close()
}

export class Application {
    private readonly inputWindow: InputWindow
    private readonly propertyWindow: PropertyWindow
    private readonly inputsConfigWindow: InputConfig
    private readonly simConfigWindow: SimConfigWindow
    private readonly toolBar: ToolBar
    private editor: Editor | null
    private simulator: Simulator | null

    constructor() {
        this.editor = null
        this.propertyWindow = new PropertyWindow()
        this.inputWindow = new InputWindow()
        this.inputsConfigWindow = new InputConfig()
        this.simConfigWindow = new SimConfigWindow()
        this.toolBar = new ToolBar()
        this.simulator = null
    }

    run() {
        this.bindNavBarButtons()
        this.bindToolBarButtons()
        this.bindSimulationButtons()
        this.bindGenCodeButtons()
        this.addEditorEventListeners()

        this.setTheme(localStorage.getItem("theme") ?? "light")
    }

    getEditor() {
        return this.editor
    }

    loadNet(netData: PetriNetData) {
        this.editor = new Editor(PetriNet.loadNet(netData), this.propertyWindow)
    }

    setTheme(theme: string) {
        document.body.className = `${theme}-theme net-${theme}-theme`
        localStorage.setItem("theme", theme)
    }

    closeEditor() {
        if (!this.editor) return

        if (!window.confirm("Unsaved changes will be lost, do you want to continue?"))
            return
        
        this.editor.close()
        this.editor = null
    }

    stopSimulation() {

    }

    startSimulation() {
        if (this.simulator) return

        this.editor!.currentTool.onChangeTool()
        try {
            this.simulator = new Simulator(
                this.editor!.net,
                this.inputWindow
            )
        } catch (e) {
            if (!(e instanceof SimulationError)) return

            const {message, elementId} = e;
            this.simulator = null
            this.editor!.selectTool('mouse-tool')
            const errorModal = <HTMLDialogElement>document.getElementById("error-modal")
            errorModal.showModal()
            document.getElementById("error-message")!.innerHTML = message
            document.getElementById("error-select-element")!.onclick = elementId ?
                () => {
                    this.propertyWindow.open(
                        this.editor!.net.getGenericPEType(elementId),
                        (attrName, val) => {
                            this.editor!.net.setGenericPEAttr(elementId, attrName, val)
                        },
                        this.editor!.net.getGenericPEData(elementId)
                    )
                    this.editor!.net.selectPE(elementId)
                    errorModal.close()
                }
                : () => {}
            
            throw e
        }
    }

    private bindNavBarButtons() {
        const handlers = {
            "nav-btn-new-file": () => {
                this.closeEditor()
                this.editor = new Editor(PetriNet.newNet(), this.propertyWindow)
            },
            "nav-btn-close-file": () => {
                this.closeEditor()
            },
            "nav-btn-load-file": async () => {
                const net = await loadNet()
                this.closeEditor()
                this.editor = new Editor(net, this.propertyWindow)
            },
            "nav-btn-save-file": async () => {
                if (!this.editor) return
                await saveNet(this.editor.net)
            },
            "nav-btn-export": () => {
                if (!this.editor) return

                const ele = <HTMLAnchorElement>document.getElementById("nav-btn-export")
                ele.href = "data:text/plain;charset=utf-8," + JSON.stringify(this.editor.net.getNetData())
            },
            "nav-btn-toggle-grid": () => {
                if (!this.editor) return
                this.editor.net.grid = !this.editor.net.grid
            },
            "nav-btn-toggle-theme": () => {
                const currentTheme = localStorage.getItem("theme")
                this.setTheme(currentTheme === "light" ? "dark" : "light")
            },
            "nav-btn-sim-config": async () => {
                if (!this.editor) return

                this.simConfigWindow.open(
                    this.editor.net.simConfig,
                    simConfig => this.editor!.net.simConfig = simConfig
                )
            },
            "nav-btn-inputs-config": async () => {
                if (!this.editor) return

                this.inputsConfigWindow.open(
                    this.editor.net.inputs,
                    inputs => this.editor!.net.inputs = inputs
                )
            }
        }

        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = <HTMLElement>document.getElementById(
                btnId
            )
            btn.onclick = handler
        }

        const fileInputElement = <HTMLInputElement>document.getElementById("nav-btn-import")
        fileInputElement.onchange = async () => {
            if (this.editor)
                    this.editor.close()
            if (!fileInputElement.files?.length)
                return
            const data = await fileInputElement.files[0].text()
            if (!data)
                return
            const net = PetriNet.loadNet(JSON.parse(data))
            this.editor = new Editor(net, this.propertyWindow)
        }
    }

    private bindToolBarButtons() {
        const tools = [
            "mouse-tool",
            "place-tool",
            "trans-tool",
            "arc-tool"
        ]

        for (const tool of tools) {
            const btn = <HTMLElement>document
                .getElementById(tool)

            btn.onclick = () => {
                if (this.simulator || !this.editor)
                    return

                this.toolBar.deselectTool(this.editor.currentToolName)
                this.toolBar.selectTool(tool)
                this.editor.selectTool(tool)
            }
        }
    }

    private bindGenCodeButtons() {
        const genCodeModal = <HTMLDialogElement>document
            .getElementById('gencode-modal')

        const handlers = {
            "nav-btn-gencode": () => {
                if (!this.editor)
                    return

                genCodeModal.showModal()
                const ele = <HTMLTextAreaElement>document
                    .getElementById('gencode-out')
        
                ele.value = generateCode(
                    this.editor.net.getNetData()
                )
            },
            "gencode-modal-close": () => {
                genCodeModal.close()
            },
            "gencode-close": () => {
                genCodeModal.close()
            },
        }

        for (const [btnId, handler] of Object.entries(handlers)) {
            const btn = <HTMLElement>document.getElementById(
                btnId
            )
            btn.onclick = handler
        }
    }

    private bindSimulationButtons() {
        const handlers = {
            start: () => {
                if (!this.simulator)
                    this.startSimulation()
                this.simulator!.start()
            },
            step: () => {
                if (!this.simulator)
                    this.startSimulation()
                this.simulator!.step()
            },
            restart: async () => {
                if (!this.simulator) return
                this.simulator.stop()
                while (!this.simulator.isStopped())
                    await delay(50)
                this.startSimulation()
                this.simulator.start()
            },
            pause: () => {
                if (!this.simulator) return
                this.simulator.pause()
            },
            stop: async () => {
                if (!this.simulator) return
                this.simulator.stop()
                while (!this.simulator.isStopped())
                    await delay(50)
                this.simulator = null
            },
        }

        for (const [cmd, handler] of Object.entries(handlers)) {
            const btn = <HTMLElement>document.getElementById(
                `sim-btn-${cmd}`
            )
            btn.onclick = () => {
                if (!this.editor)
                    return

                handler()
            }
        }

        const errorModal = <HTMLDialogElement>document.getElementById("error-modal");
        document.getElementById("close-error-modal")!.onclick = () => errorModal.close()
    }

    private addEditorEventListeners() {
        let movingScreenOffset: Vector | null

        const handlers = {
            mousedown: (evt: MouseEvent) => {
                console.log(evt)
                if (!this.editor) return

                if (evt.ctrlKey || evt.button === 2) {
                    movingScreenOffset = this.editor.net
                        .getMousePosition(evt, true);
                } else if(this.simulator) { 
                    this.simulator.eventHandler.mousedown(evt)
                } else {
                    this.editor.currentTool.onMouseDown(evt)
                }
            },
            mouseup: (evt: MouseEvent) => {
                evt.preventDefault()
                if (!this.editor) return
                
                movingScreenOffset = null
                if(!this.simulator) {
                    this.editor.currentTool.onMouseUp(evt);
                }
            },
            mousemove: (evt: MouseEvent) => {
                if (!this.editor) return
                
                if (movingScreenOffset) {
                    const mousePos = this.editor.net
                        .getMousePosition(evt, true);
                    this.editor.net.moveScreen(
                        mousePos.sub(movingScreenOffset)
                    )
                } else if(!this.simulator) {
                    this.editor.currentTool.onMouseMove(evt);
                }
            },
            mouseleave: (evt: MouseEvent) => {
                if (!this.editor) return

                movingScreenOffset = null
                if(!this.simulator) {
                    this.editor.currentTool.onMouseLeave(evt);
                }
            },
            wheel: (evt: WheelEvent) => {
                evt.preventDefault();
                if (!this.editor) return
            
                const scale = Math.min(Math.max(.9, 1 + .01*evt.deltaY), 1.1)
                const mousePos = this.editor.net.getMousePosition(evt);
        
                this.editor.net.zoom(mousePos, scale)
            }
        }

        const ele = <HTMLElement>document.getElementById("svg-div")

        for (const [event, handler] of Object.entries(handlers)) {
            ele.addEventListener(event, <(evt: any) => void>handler)
        }

        document.body.addEventListener('keydown', (evt: KeyboardEvent) => {
            if (!this.editor) return
            console.log()
            if ((<HTMLElement>evt.target).tagName !== "BODY")
                return

            if (this.simulator) return

            if (evt.key === 'z' && evt.ctrlKey) {
                this.editor.net.undo()
            }
            else if (evt.key === 'y' && evt.ctrlKey) {
                this.editor.net.redo()
            } else 
                this.editor.currentTool.onKeyDown(evt)
        })

        document.addEventListener("contextmenu", function (evt) {
            evt.preventDefault();
        }, false);
    }
}