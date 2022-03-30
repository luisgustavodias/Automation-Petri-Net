import { toolBar } from "./main.js";
import { PNManager } from "./PetriNet.js"
import { PetriPlace, PetriTrans, PetriArc } from "./PNElements.js";

function build() {
    var json = {};
    for(let elmentId in PNManager.net.elements) {
        let element = PNManager.net.elements[elmentId];
        if (element.PNElementType == "place") {
            let ele = <PetriPlace>element
            json[elmentId] = {
                PNElementType: "place",
                name: ele.name,
                type: ele.type,
                arcs: ele.arcs,
                initialMark: ele.initialMark
            }
        } else if (element.PNElementType == "trans") {
            let ele = <PetriTrans>element
            json[elmentId] = {
                PNElementType: "trans",
                name: ele.name,
                time: ele.time,
                guard: ele.guard,
                arcs: ele.arcs
            }
        } else if (element.PNElementType == "arc") {
            let ele = <PetriArc>element
            json[elmentId] = {
                PNElementType: "arc",
                type: ele.type,
                weight: ele.weight,
                placeId: ele.place.id,
                transId: ele.trans.id
            }
        }
    }
    return json;
}

function save(){
    for (let elementId in PNManager.net.elements) {
        PNManager.net.elements[elementId].deselect()
    }

    let svg = <SVGSVGElement><unknown>document.getElementById("my-svg");
    let viewBox = {
        x: svg.viewBox.baseVal.x,
        y: svg.viewBox.baseVal.y,
        width: svg.viewBox.baseVal.width,
        height: svg.viewBox.baseVal.height
    }

    return {
        svg: {
            innerHTML: svg.innerHTML,
            viewBox: viewBox
        },
        net: {
            elements: build(),
            inputs: PNManager.net.inputs,
            simMode: PNManager.net.simMode,
            preScript: PNManager.net.preScript,
            placeNumber: PNManager.net.placeNumber,
            transNumber: PNManager.net.transNumber,
            _nextId: PNManager.net._nextId,
            metadata: PNManager.net.metadata
        }
    }
}

var intervalId = null;
//@ts-ignore
const socket = io('http://127.0.0.1:5000');

function updateInput(evt) {
    let input = {};
    input[evt.target.id.split('-')[1]] = evt.target.checked;
    console.log(input);
    socket.emit("updateInput", input);
}

function simulate() {
    let inputElements = document.getElementById('inputs-window').getElementsByTagName('input');
    let inputs = {};
    for(let i = 0; i < inputElements.length; i++) {
        inputElements[i].addEventListener('change', updateInput);
        inputs[inputElements[i].id.split('-')[1]] = inputElements[i].checked;
    }
    socket.emit("simulate", {
        elements: build(),
        inputs: inputs,
        simMode: PNManager.net.simMode,
        preScript: PNManager.net.preScript
    });
}

socket.on("stepresp", (msg) => {
    console.log('step');
    console.log(msg)
    for(let placeId in msg) {
        let place = <PetriPlace>PNManager.net.elements[placeId]
        place.mark = msg[placeId];
    }
});

socket.on("loadresp", (msg) => {
    PNManager.loadNet(msg);
    toolBar.restartArcTool()
})

socket.on("saveresp", (msg) => {
    PNManager.net.metadata = msg.net.metadata;
})

function pause() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

document.getElementById("compile-button").onclick = () => { 
    pause();
    simulate();
}
document.getElementById("step-button").onclick = () => { socket.emit("step", build()) };
document.getElementById("save-button").onclick = () => { 
    if (PNManager.net.metadata.fileName) {
        socket.emit("save", save());
    } else {
        socket.emit("saveas", save());
    }
};
document.getElementById("save-as-button").onclick = () => { socket.emit("saveas", save()) };
document.getElementById("load-button").onclick = () => { socket.emit("load", {}) };

document.getElementById("play-button").onclick = () => {
    intervalId = setInterval(() => { socket.emit("step", build()) }, 200);
}

document.getElementById("play-button").onclick = () => {
    if (!intervalId) {
        intervalId = setInterval(() => { socket.emit("step", build()) }, 200);
    }
}

document.getElementById("pause-button").onclick = pause;


//=================================================================================
//=================================================================================


var modal = document.getElementById("sim-config-modal");
var simModeElement = <HTMLFormElement>document.getElementById("sim-mode");
var preScriptElement = <HTMLFormElement>document.getElementById("pre-script");

function closeModal() {
    modal.style.display = "none";
}

document.getElementById("sim-config-button").onclick = function (evt) {
    simModeElement.value = PNManager.net.simMode;
    preScriptElement.value = PNManager.net.preScript;
    modal.style.display = "block";
}

document.getElementById("sim-config-save").onclick = function (evt) {
    PNManager.net.simMode = simModeElement.value;
    PNManager.net.preScript = preScriptElement.value;
    closeModal();
}

modal.onmousedown = function (event) {
    let ele = <HTMLElement>event.target
    if (ele.id == "inputs-modal") {
        closeModal();
    }
}

document.getElementById("sim-config-close").onclick = closeModal;
document.getElementById("sim-config-cancel").onclick = closeModal;
