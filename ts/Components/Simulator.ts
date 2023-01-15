import { PetriNet } from "../PetriNetGraphics/PetriNet.js"
import { InputWindow } from "./InputsWindow.js"
import { LogicalNet } from "../LogicalNet.js"
import { SimulationBaseMode } from "../Simulation/BaseMode.js"
import { SimulationClassicMode } from "../Simulation/ClassicMode.js"
import { SimulationGraphics } from "../PetriNetGraphics/SimulationGraphics.js"
import { SimulationAutomationMode } from "../Simulation/AutomationMode.js"
import { SimulationVisObjMode } from "../Simulation/VisObjMode.js"
import { PetriPlace } from "../PetriNetGraphics/PetriNetElements.js"

const FIRE_TRANS_ANIMATION_TIME = 1500
const FIRE_TRANS_INTERVAL = 200
const SIM_CYCLE_INTERVAL = 0.01
const STEP_INTERVAL = 200
const TRANS_ENABLE_COLOR = '#04c200'
const TRANS_FIRE_COLOR = 'red'

enum SimState {
    Running,
    Pausing,
    Paused,
    Stepping,
    Stopping,
    Stopped
}

const simulationModes = {
    "Classic": SimulationClassicMode,
    "Automation": SimulationAutomationMode,
    "VisObj": SimulationVisObjMode,
}

class SimSetMarkWindow {
    private readonly modal: HTMLDialogElement
    private readonly input: HTMLInputElement
    private saveObserver: (val: number) => void
    
    constructor() {
        this.modal = <HTMLDialogElement>document.getElementById("sim-set-mark-modal")
        this.input = <HTMLInputElement>document.getElementById("sim-set-mark-input")
        this.saveObserver = _ => {}

        this.input.onkeydown = evt => {
            if (evt.key === 'Enter') {
                this.save()
            }
        }
        (<HTMLElement>document.getElementById("sim-set-mark-save")).onclick = _ => this.save();
        (<HTMLElement>document.getElementById("sim-set-mark-cancel")).onclick = _ => this.close();
    }

    open(val: number, saveObserver: (val: number) => void) {
        this.modal.showModal()
        this.input.value = String(val)
        setTimeout(() => this.input.focus(), 0)
        this.saveObserver = saveObserver
    }

    private close() {
        this.modal.close()
    }

    private save() {
        this.close()
        this.saveObserver(parseInt(this.input.value))
    }
}

class SimulationEventHandler {
    private readonly net: PetriNet
    private readonly simulation: SimulationBaseMode
    private readonly setMarkWindow: SimSetMarkWindow

    constructor(net: PetriNet, simulation: SimulationBaseMode) {
        this.net = net
        this.simulation = simulation
        this.setMarkWindow = new SimSetMarkWindow()
    }

    mousedown(evt: MouseEvent) {
        const parentId = (<SVGAElement>evt.target).getAttribute('PEParent')

        if (!parentId) return

        if (this.net.getGenericPEType(parentId) != "place") return
        
        const place = <PetriPlace>this.net.getGenericPE(parentId)
        
        const mark = this.simulation.getPlaceMark(place.id)

        const setPlaceMark = (val: number) => {
            if (place.placeType === 'BOOL' && val > 1) {
                alert("Can't insert more than one token in a place of type BOOL")
                return
            } 
            if (val < 0) {
                alert("The number of token can't be negative")
                return
            }

            this.simulation.setPlaceMark(place.id, val)
        }

        if (evt.shiftKey) {
            this.setMarkWindow.open(mark, setPlaceMark)
            return
        }

        setPlaceMark(mark + 1)
    }
}

class Simulator {
    private readonly simulation: SimulationBaseMode
    private readonly graphics: SimulationGraphics
    private readonly inputWindow: InputWindow
    readonly eventHandler: SimulationEventHandler
    private state: SimState

    constructor(net: PetriNet, inputWindow: InputWindow) { 
        this.inputWindow = inputWindow
        this.graphics = new SimulationGraphics(net)
        this.simulation = new simulationModes[net.simConfig.simMode](
            new LogicalNet(
                net.getNetData()
            ),
            this.graphics,
            () => this.inputWindow.readInputs()
        )
        this.eventHandler = new SimulationEventHandler(net, this.simulation)
        this.state = SimState.Paused
        this.inputWindow.open(net.inputs)
    }

    private setSimText(text: string) {
        const simText = <HTMLElement>document
            .getElementById('simulating-text')
        simText.innerHTML = text
    }

    private _pause() {
        this.state = SimState.Paused
        this.setSimText("Paused")
    }

    private _stop() {
        this.simulation.exit()
        this.state = SimState.Stopped
        this.inputWindow.close()
        this.setSimText("");
        (<HTMLElement>document.getElementById('simulation-time')).innerHTML = ''
    }

    private update = () => {
        if (this.state === SimState.Stopping) {
            this._stop()
            return
        }
        if (this.state === SimState.Pausing || this.state === SimState.Stepping) {
            this._pause()
            return
        }

        this.simulation.update().then(this.update)
    }

    start() {
        if (this.state !== SimState.Paused)
            return
        
        this.state = SimState.Running
        this.update()

        this.setSimText("Simulating...")
    }

    pause() {
        if (this.state === SimState.Running)
            this.state = SimState.Pausing
    }

    stop() {
        this.graphics.stopAnimations()
        if (this.state !== SimState.Stopped) {
            if (this.state === SimState.Paused)
                this._stop()
            else
                this.state = SimState.Stopping
        }
    }

    step() {
        this.start()
        this.state = SimState.Stepping
    }

    debugStep() {
        this.start()
        this.state = SimState.Pausing
    }

    isStopped() {
        return this.state === SimState.Stopped
    }
}

export { Simulator }