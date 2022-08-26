import { PetriNet } from "./PetriNet.js"
import { SimConfig } from "./PNData.js"
import { InputWindow } from "./InputWindow.js"
import { LogicalNet } from "./LogigalNet.js"
import { SimulationBaseMode } from "./Simulation/BaseMode.js"
import { SimulationClassicMode } from "./Simulation/ClassicMode.js"
import { SimulationGraphics } from "./Simulation/SimulationGraphics.js"
import { SimulationAutomationMode } from "./Simulation/AutomationMode.js"
import { SimulationVisObjMode } from "./Simulation/VisObjMode.js"

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
    private simulation: SimulationBaseMode
    private state: SimState
    private inputWindow: InputWindow

    constructor() { 
        this.simulation = null
        this.state = SimState.Stopped
        this.inputWindow = new InputWindow()
    }

    private init(net: PetriNet) {
        this.inputWindow.open(net.inputs)
        
        this.simulation = new simulationModes[net.simConfig.simMode](
            new LogicalNet(
                net.getNetData(), 
                Object.keys(this.inputWindow.readInputs()
            )),
            new SimulationGraphics(net),
            () => this.inputWindow.readInputs()
        )
    }

    private _pause() {
        this.state = SimState.Paused
        document.getElementById('simulating-text')
            .innerHTML = 'Paused'
    }

    private _stop() {
        this.simulation.exit()
        this.state = SimState.Stopped
        this.inputWindow.close()
        document.getElementById('simulating-text')
            .innerHTML = ''
        document.getElementById('simulation-time')
            .innerHTML = ''
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

    start(net: PetriNet) {
        if (this.state !== SimState.Stopped && this.state !== SimState.Paused)
            return

        if (this.state === SimState.Stopped )
            this.init(net)
        
        this.state = SimState.Running
        this.update()
        document.getElementById('simulating-text')
            .innerHTML = 'Simulating...'
    }

    pause() {
        if (this.state === SimState.Running)
            this.state = SimState.Pausing
    }

    restart(net: PetriNet) {
        if (this.state !== SimState.Stopped)
            this.init(net)
    }

    stop() {
        if (this.state !== SimState.Stopped) {
            if (this.state === SimState.Paused)
                this._stop()
            else
                this.state = SimState.Stopping
        }
    }

    step(net: PetriNet) {
        this.start(net)
        this.state = SimState.Stepping
    }

    debugStep(net: PetriNet) {
        this.start(net)
        this.state = SimState.Pausing
    }
}

function createSimulator(
    startSimObserver: () => PetriNet,
    stopSimObserver: VoidFunction 
) {
    const simulator = new Simulator()

    document.getElementById('step-button').onclick = 
        () => { 
            simulator.step(startSimObserver())
        }

    // document.getElementById('debug-button').onclick = 
    // () => { 
    //     simulator.debugStep(startSimObserver())
    // }
    
    document.getElementById('start-button').onclick = 
        () => { 
            simulator.start(startSimObserver())
        }

    document.getElementById('pause-button').onclick = 
        () => { simulator.pause() }

    document.getElementById('restart-button').onclick = 
        () => { 
            simulator.restart(startSimObserver())
        }

    document.getElementById('stop-button').onclick = 
        () => { 
            simulator.stop()
            stopSimObserver()
        }

    return simulator
}

export { Simulator, createSimulator }