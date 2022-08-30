
type InputType = "INT" | "BOOL"

interface Input {
    name: string
    type: InputType
    initialValue: string
    description: string
}

const inputDataMapper = {
    name: 1,
    type: 2,
    initialValue: 3,
    description: 4
}
const modal = <HTMLElement>document.getElementById("inputs-modal")
const tbody = <HTMLElement>document.getElementById("inputs-config")
const selectAllRadioButton = <HTMLInputElement>document
    .querySelector("#inputs-modal th input")
const inputRowModel = <HTMLTemplateElement>document
    .getElementById("input-row");


function addInput(input: Input) {
    const cloneNode = document.importNode(inputRowModel.content, true);
    const data = cloneNode.querySelectorAll("td");
    let attr: keyof Input
    for (attr in input) {
        const td = data[inputDataMapper[attr]]
        const inpElement = <HTMLFormElement>td.children[0]
        inpElement.value = input[attr]
    }
    tbody.appendChild(cloneNode);
}

function removeInputs() {
    const rowsToRemove = [...tbody.children].filter(
        //@ts-ignore
        row => row.children[0].children[0].checked
    )

    rowsToRemove.forEach(row => {
        row.remove()
    });
}

function toggleSelectionAll() {
    for (const row of tbody.children) {
        const radioButton = <HTMLInputElement>row.children[0].children[0]
        radioButton.checked = selectAllRadioButton.checked
    }
}

function getInputElement(row: HTMLTableRowElement, index: number) {
    return <HTMLFormElement>row.children[index].children[0]
}

function getInput(row: HTMLTableRowElement): Input {
    //@ts-ignore
    return Object.fromEntries(
        Object.entries(inputDataMapper).map(
            ([attr, index]) => [
                attr, 
                getInputElement(row, index).value
            ]
        )
    )
}

function getInputs() {
    return [...(<HTMLCollectionOf<HTMLTableRowElement>>tbody.children)].map(getInput)
}

type SaveObserver = (inputs: Input[]) => void

class InputConfig {
    saveObserver: SaveObserver | null

    constructor() {
        this.saveObserver = null;
        
        (<HTMLElement>document.getElementById('new-input-button'))
            .onclick = () => addInput({
                name: 'new_input',
                type: 'BOOL',
                initialValue: 'false',
                description: ''
            });
        (<HTMLElement>document.getElementById('remove-inputs-button'))
            .onclick = removeInputs
        selectAllRadioButton.onclick = toggleSelectionAll;
        (<HTMLElement>document.getElementById('inputs-modal-close'))
            .onclick = this.close;
        (<HTMLElement>document.getElementById('inputs-config-cancel'))
            .onclick = this.close;
        (<HTMLElement>document.getElementById('inputs-config-save'))
            .onclick = () => this.save();
    }

    open(inputs: Input[], saveObserver: SaveObserver) {
        this.saveObserver = saveObserver
        modal.style.display = "block";
        tbody.innerHTML = "";
        for (const input of inputs) {
            addInput(input);
        }
    }

    close() {
        modal.style.display = "none"
    }

    save() {
        if (!this.saveObserver) 
            throw "No saveObserver"

        this.saveObserver(getInputs())
        this.close()
    }
}

export { Input, InputConfig }