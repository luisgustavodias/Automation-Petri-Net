import { Input } from "./InputsConfig.js"

type InputValues = { [inputName: string]: number }

const inputsTableBody = <HTMLTableElement>document
    .querySelector("#inputs-window tbody")

abstract class AGenericInput {
    protected readonly element: HTMLInputElement
    readonly name: string

    constructor(inputType: string, inputName: string) {
        const row = document.createElement('tr')
        const td1 = document.createElement('td')
        const td2 = document.createElement('td')
        this.element = document.createElement('input')

        td1.innerHTML = inputName

        this.element.type = inputType
        this.name = inputName

        inputsTableBody.append(row)
        row.append(td1)
        row.append(td2)
        td2.appendChild(this.element)
    }

    abstract read(): number
}

class IntInput extends AGenericInput {
    constructor(inputData: Input) {
        super('number', inputData.name)

        this.element.value = inputData.initialValue
    }

    read(): number {
        return parseInt(this.element.value)
    }
}

class BoolInput extends AGenericInput {
    constructor(inputData: Input) {
        super('checkbox', inputData.name)

        this.element.checked = inputData.initialValue === 'true'
    }

    read(): number {
        return this.element.checked ? 1 : 0
    }
}

const InputsConstructorsByType = {
    'INT': IntInput,
    'BOOL': BoolInput
}

class InputWindow {
    inputs: AGenericInput[]

    constructor() {
        this.inputs = []
    }

    open(inputs: Input[]) {
        (<HTMLElement>document.getElementById('inputs-window'))
            .style.display = 'block'

        inputsTableBody.innerHTML = ''
        
        this.inputs = []
        for (const input of inputs) {
            this.inputs.push(
                new InputsConstructorsByType[input.type](input)
            )
        }
    }

    close() {
        (<HTMLElement>document.getElementById('inputs-window'))
            .style.display = 'none'
    }

    readInputs() {
        return Object.fromEntries(
            this.inputs.map(input => [input.name, input.read()])
        )
    }
}


export {InputValues, InputWindow}
