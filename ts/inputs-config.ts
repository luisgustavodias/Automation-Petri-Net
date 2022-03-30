import { PetriNet, PNManager} from "./PetriNet.js"


const inputRowModel = <HTMLTemplateElement>document.getElementById("input-row");
const inputDataMapper = {
    name: 0,
    type: 1,
    //initialValue: 2,
    description: 2
}
const DEFAULT_INPUT_DATA = { name: "new_input", type: "BOOL", description: "" }

class InputsConfig {
    net: PetriNet
    modal: HTMLElement
    tbody: HTMLElement

    constructor(net: PetriNet) {
        this.net = net
        this.modal = document.getElementById("inputs-modal")
        this.tbody = document.getElementById("inputs-config")
    }

    updateInputWindow() {
        let inputWindow = document.getElementById("inputs-window");
        inputWindow.innerHTML = "";

        for (let i = 0; i < this.net.inputs.length; i++) {
            let name = this.net.inputs[i].name;
            let input = document.createElement('input');
            let label = document.createElement('label');
            input.id = "input-" + name;
            input.type = "checkbox";
            label.className = "input-label";
            label.innerHTML = name;
            label.setAttribute("for", "input-" + name);
            inputWindow.appendChild(input);
            inputWindow.appendChild(label);
        }
    }

    newInput(inputData) {
        let cloneNode = document.importNode(inputRowModel.content, true);
        let data = cloneNode.querySelectorAll("td");
        for (let attr in inputData) {
            let inpElement = <HTMLFormElement>data[inputDataMapper[attr]].children[0]
            inpElement.value = inputData[attr]
        }
        this.tbody.appendChild(cloneNode);
    }

    getInputs() {
        let inputs = [];
        let rows = this.tbody.querySelectorAll("tr");
        for (let row of rows) {
            let input = {}
            for (let attr in inputDataMapper) {
                let inpElement = <HTMLFormElement>row
                    .children[inputDataMapper[attr]].children[0]
                input[attr] = inpElement.value;
            }
            inputs.push(input);
        }
        return inputs;
    }

    close() {
        this.modal.style.display = "none";
    }

    open() {
        this.modal.style.display = "block";
        this.tbody.innerHTML = "";
        for (let i = 0; i < this.net.inputs.length; i++) {
            this.newInput(this.net.inputs[i]);
        }
    }

    save() {
        this.net.inputs = this.getInputs();
        this.updateInputWindow();
        this.close()
    }
}

function createInput(net: PetriNet) {
    var inpConfig = new InputsConfig(net)

    document.getElementById('inputs-button').onclick = (evt) => {
        inpConfig.open()
    }

    document.getElementById("new-input-button").onclick = (evt) => {
        inpConfig.newInput(DEFAULT_INPUT_DATA);
    }

    document.getElementById("inputs-config-save").onclick = (evt) => {
        inpConfig.save()
        inpConfig.close()
    }

    inpConfig.modal.onmousedown = (evt: MouseEvent) => {
        let ele = <HTMLElement>evt.target
        if (ele.id == "inputs-modal") {
            inpConfig.close();
        }
    }

    document.getElementById("inputs-config-cancel").onclick = (evt) => {
        inpConfig.close()
    }
    document.getElementById("inputs-modal-close").onclick = (evt) => {
        inpConfig.close()
    }
}

function switchSideBar(windowId) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(windowId).style.display = "block";
    document.getElementById(windowId + '-tablink').className += " active";
}

switchSideBar("property-window");

document.getElementById("property-window-tablink").onclick = (evt) => { switchSideBar("property-window") }
document.getElementById("inputs-window-tablink").onclick = (evt) => { switchSideBar("inputs-window") }

export var inpConfig = createInput(PNManager.net)
