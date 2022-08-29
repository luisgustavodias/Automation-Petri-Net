const inputDataMapper = {
    name: 1,
    type: 2,
    initialValue: 3,
    description: 4
};
const modal = document.getElementById("inputs-modal");
const tbody = document.getElementById("inputs-config");
const selectAllRadioButton = document
    .querySelector("#inputs-modal th input");
const inputRowModel = document
    .getElementById("input-row");
function addInput(input) {
    const cloneNode = document.importNode(inputRowModel.content, true);
    const data = cloneNode.querySelectorAll("td");
    let attr;
    for (attr in input) {
        const td = data[inputDataMapper[attr]];
        const inpElement = td.children[0];
        inpElement.value = input[attr];
    }
    tbody.appendChild(cloneNode);
}
function removeInputs() {
    const rowsToRemove = [...tbody.children].filter(
    //@ts-ignore
    row => row.children[0].children[0].checked);
    rowsToRemove.forEach(row => {
        row.remove();
    });
}
function toggleSelectionAll() {
    for (const row of tbody.children) {
        const radioButton = row.children[0].children[0];
        radioButton.checked = selectAllRadioButton.checked;
    }
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
    saveObserver;
    constructor() {
        this.saveObserver = null;
        document.getElementById('new-input-button')
            .onclick = () => addInput({
            name: 'new_input',
            type: 'BOOL',
            initialValue: 'false',
            description: ''
        });
        document.getElementById('remove-inputs-button')
            .onclick = removeInputs;
        selectAllRadioButton.onclick = toggleSelectionAll;
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
        if (!this.saveObserver)
            throw "No saveObserver";
        this.saveObserver(getInputs());
        this.close();
    }
}
export { InputConfig };
