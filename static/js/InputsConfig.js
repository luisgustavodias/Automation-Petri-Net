const inputDataMapper = {
    name: 0,
    type: 1,
    initialValue: 2,
    description: 3
};
const modal = document.getElementById("inputs-modal");
const tbody = document.getElementById("inputs-config");
const inputRowModel = document.getElementById("input-row");
function addInput(input) {
    const cloneNode = document.importNode(inputRowModel.content, true);
    const data = cloneNode.querySelectorAll("td");
    for (const attr in input) {
        const td = data[inputDataMapper[attr]];
        const inpElement = td.children[0];
        inpElement.value = input[attr];
    }
    tbody.appendChild(cloneNode);
}
function getInputElement(row, index) {
    return row.children[index].children[0];
}
function getInput(row) {
    //@ts-ignore
    return Object.fromEntries(Object.entries(inputDataMapper).map(([attr, index]) => [
        attr,
        getInputElement(row, index).value
    ]));
}
function getInputs() {
    return [...tbody.children].map(getInput);
}
class InputConfig {
    constructor() {
        this.saveObserver = null;
        document.getElementById('new-input-button')
            .onclick = () => addInput({
            name: 'new_input',
            type: 'BOOL',
            initialValue: 'false',
            description: ''
        });
        document.getElementById('inputs-modal-close')
            .onclick = this.close;
        document.getElementById('inputs-config-cancel')
            .onclick = this.close;
        document.getElementById('inputs-config-save')
            .onclick = () => this.save();
    }
    open(inputs, saveObserver) {
        this.saveObserver = saveObserver;
        modal.style.display = "block";
        tbody.innerHTML = "";
        for (const input of inputs) {
            addInput(input);
        }
    }
    close() {
        modal.style.display = "none";
    }
    save() {
        this.saveObserver(getInputs());
        this.close();
    }
}
export { InputConfig };
