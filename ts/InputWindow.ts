import { Input } from "./InputsConfig.js"

type InputValues = { [inputName: string]: number }

const inputWindowDiv = document.getElementById("inputs-window")

abstract class AGenericInput {
    protected readonly element: HTMLInputElement
    readonly name: string

    constructor(inputType: string, inputName: string) {
        this.element = document.createElement('input')
        const label = document.createElement('label')
        this.element.type = inputType
        label.className = "input-label"
        label.innerHTML = inputName
        this.name = inputName
        this.element.id = "input-" + inputName
        label.setAttribute("for", this.element.id)
        inputWindowDiv.appendChild(this.element)
        inputWindowDiv.appendChild(label)
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

    constructor(inputs: Input[]) {
        inputWindowDiv.innerHTML = ''
        
        this.inputs = []
        for (const input of inputs) {
            this.inputs.push(
                new InputsConstructorsByType[input.type](input)
            )
        }
    }

    readInputs() {
        return Object.fromEntries(
            this.inputs.map(input => [input.name, input.read()])
        )
    }
}


export {InputValues, InputWindow}
