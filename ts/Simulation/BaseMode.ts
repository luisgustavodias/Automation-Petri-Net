import { InputValues } from "../InputWindow"
import { LogicalNet, LogicalTrans } from "../LogigalNet"
import { SimulationGraphics } from "./SimulationGraphics"

const CYCLE_INTERVAL = 0.01

export abstract class SimulationBaseMode {
    protected readonly net: LogicalNet
    protected readonly graphics: SimulationGraphics
    private readonly readInputs: () => InputValues
    private readonly inputValues: Map<string, number>
    private readonly previousInputValues: Map<string, number>
    private readonly contextFunctions: { 
        rt: (varName: string) => boolean,
        ft: (varName: string) => boolean
    }
    private simTime: number

    constructor (
        net: LogicalNet, 
        graphics: SimulationGraphics, 
        readInputs: () => InputValues
    ) {
        this.net = net
        this.graphics = graphics
        this.readInputs = readInputs
        this.inputValues = new Map()
        this.previousInputValues = new Map()
        for (const [inputName, inputValue] of Object.entries(readInputs())) {
            this.inputValues.set(inputName, inputValue)
            this.previousInputValues.set(inputName, inputValue)
        }

        this.contextFunctions = {
            rt: (varName) => this.inputValues.get(varName) && !this.previousInputValues.get(varName),
            ft: (varName) => this.previousInputValues.get(varName) && !this.inputValues.get(varName),
        }

        this.restartPlaces()
        this.simTime = 0
    }

    private restartPlaces() {
        for (const placeId in this.net.places) {
            this.net.places[placeId].restart()
            this.graphics.updatePlaceMark(placeId, this.net.places[placeId].mark)
        }
    }

    exit() {
        this.restartPlaces()
        Object.values(this.net.transitions)
            .forEach(this.graphics.disableTrans)
        Object.values(this.net.arcs)
            .forEach(this.graphics.resetArcColor)
    }

    updateInputValues() {
        const inputs = this.readInputs()
        for (const [inputName, inputValue] of Object.entries(inputs)) {
            this.previousInputValues.set(
                inputName, this.inputValues.get(inputName)
            )
            this.inputValues.set(inputName, inputValue)
        }
    }

    updateSimTime() {
        this.simTime += CYCLE_INTERVAL
        this.graphics.displayTime(this.simTime)
    }

    updateTrans(trans: LogicalTrans) {
        trans.update(
            CYCLE_INTERVAL, 
            this.inputValues, 
            this.contextFunctions.rt, 
            this.contextFunctions.ft
        )
    }

    getSimTime() {
        return this.simTime
    }

    abstract update(): Promise<void>
}