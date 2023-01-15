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
class SimSetMarkWindow {
    modal;
    input;
    saveObserver;
    constructor() {
        this.modal = document.getElementById("sim-set-mark-modal");
        this.input = document.getElementById("sim-set-mark-input");
        this.saveObserver = _ => { };
        this.input.onkeydown = evt => {
            if (evt.key === 'Enter') {
                this.save();
            }
        };
        document.getElementById("sim-set-mark-save").onclick = _ => this.save();
        document.getElementById("sim-set-mark-cancel").onclick = _ => this.close();
    }
    open(val, saveObserver) {
        this.modal.showModal();
        this.input.value = String(val);
        setTimeout(() => this.input.focus(), 0);
        this.saveObserver = saveObserver;
    }
    close() {
        this.modal.close();
    }
    save() {
        this.close();
        this.saveObserver(parseInt(this.input.value));
    }
}
class SimulationEventHandler {
    net;
    simulation;
    setMarkWindow;
    constructor(net, simulation) {
        this.net = net;
        this.simulation = simulation;
        this.setMarkWindow = new SimSetMarkWindow();
    }
    mousedown(evt) {
        const parentId = evt.target.getAttribute('PEParent');
        if (!parentId)
            return;
        if (this.net.getGenericPEType(parentId) != "place")
            return;
        const place = this.net.getGenericPE(parentId);
        const mark = this.simulation.getPlaceMark(place.id);
        const setPlaceMark = (val) => {
            if (place.placeType === 'BOOL' && val > 1) {
                alert("Can't insert more than one token in a place of type BOOL");
                return;
            }
            if (val < 0) {
                alert("The number of token can't be negative");
                return;
            }
            this.simulation.setPlaceMark(place.id, val);
        };
        if (evt.shiftKey) {
            this.setMarkWindow.open(mark, setPlaceMark);
            return;
        }
        setPlaceMark(mark + 1);
    }
}
class Simulator {
    simulation;
    graphics;
    inputWindow;
    eventHandler;
    state;
    constructor(net, inputWindow) {
        this.inputWindow = inputWindow;
        this.graphics = new SimulationGraphics(net);
        this.simulation = new simulationModes[net.simConfig.simMode](new LogicalNet(net.getNetData()), this.graphics, () => this.inputWindow.readInputs());
        this.eventHandler = new SimulationEventHandler(net, this.simulation);
        this.state = SimState.Paused;
        this.inputWindow.open(net.inputs);
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
        this.graphics.stopAnimations();
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
    isStopped() {
        return this.state === SimState.Stopped;
    }
}
export { Simulator };
