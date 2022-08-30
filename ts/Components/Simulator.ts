import { PetriNet } from "../PetriNetGraphics/PetriNet.js"
import { InputWindow } from "./InputsWindow.js"
import { LogicalNet } from "../LogicalNet.js"
import { SimulationBaseMode } from "../Simulation/BaseMode.js"
import { SimulationClassicMode } from "../Simulation/ClassicMode.js"
import { SimulationGraphics } from "../PetriNetGraphics/SimulationGraphics.js"
import { SimulationAutomationMode } from "../Simulation/AutomationMode.js"
import { SimulationVisObjMode } from "../Simulation/VisObjMode.js"

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

class Simulator {
    private readonly simulation: SimulationBaseMode
    private readonly inputWindow: InputWindow
    private state: SimState

    constructor(net: PetriNet, inputWindow: InputWindow) { 
        this.inputWindow = inputWindow
        this.inputWindow.open(net.inputs)
        this.simulation = new simulationModes[net.simConfig.simMode](
            new LogicalNet(
                net.getNetData(), 
                Object.keys(this.inputWindow.readInputs()
            )),
            new SimulationGraphics(net),
            () => this.inputWindow.readInputs()
        )
        this.state = SimState.Paused
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
}

export { Simulator }