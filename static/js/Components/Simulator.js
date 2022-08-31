import { LogicalNet } from "../LogicalNet.js";
import { SimulationClassicMode } from "../Simulation/ClassicMode.js";
import { SimulationGraphics } from "../PetriNetGraphics/SimulationGraphics.js";
import { SimulationAutomationMode } from "../Simulation/AutomationMode.js";
import { SimulationVisObjMode } from "../Simulation/VisObjMode.js";
const FIRE_TRANS_ANIMATION_TIME = 1500;
const FIRE_TRANS_INTERVAL = 200;
const SIM_CYCLE_INTERVAL = 0.01;
const STEP_INTERVAL = 200;
const TRANS_ENABLE_COLOR = '#04c200';
const TRANS_FIRE_COLOR = 'red';
var SimState;
(function (SimState) {
    SimState[SimState["Running"] = 0] = "Running";
    SimState[SimState["Pausing"] = 1] = "Pausing";
    SimState[SimState["Paused"] = 2] = "Paused";
    SimState[SimState["Stepping"] = 3] = "Stepping";
    SimState[SimState["Stopping"] = 4] = "Stopping";
    SimState[SimState["Stopped"] = 5] = "Stopped";
})(SimState || (SimState = {}));
const simulationModes = {
    "Classic": SimulationClassicMode,
    "Automation": SimulationAutomationMode,
    "VisObj": SimulationVisObjMode,
};
class Simulator {
    simulation;
    inputWindow;
    state;
    constructor(net, inputWindow) {
        this.inputWindow = inputWindow;
        this.inputWindow.open(net.inputs);
        this.simulation = new simulationModes[net.simConfig.simMode](new LogicalNet(net.getNetData()), new SimulationGraphics(net), () => this.inputWindow.readInputs());
        this.state = SimState.Paused;
    }
    setSimText(text) {
        const simText = document
            .getElementById('simulating-text');
        simText.innerHTML = text;
    }
    _pause() {
        this.state = SimState.Paused;
        this.setSimText("Paused");
    }
    _stop() {
        this.simulation.exit();
        this.state = SimState.Stopped;
        this.inputWindow.close();
        this.setSimText("");
        document.getElementById('simulation-time').innerHTML = '';
    }
    update = () => {
        if (this.state === SimState.Stopping) {
            this._stop();
            return;
        }
        if (this.state === SimState.Pausing || this.state === SimState.Stepping) {
            this._pause();
            return;
        }
        this.simulation.update().then(this.update);
    };
    start() {
        if (this.state !== SimState.Paused)
            return;
        this.state = SimState.Running;
        this.update();
        this.setSimText("Simulating...");
    }
    pause() {
        if (this.state === SimState.Running)
            this.state = SimState.Pausing;
    }
    stop() {
        if (this.state !== SimState.Stopped) {
            if (this.state === SimState.Paused)
                this._stop();
            else
                this.state = SimState.Stopping;
        }
    }
    step() {
        this.start();
        this.state = SimState.Stepping;
    }
    debugStep() {
        this.start();
        this.state = SimState.Pausing;
    }
}
export { Simulator };
