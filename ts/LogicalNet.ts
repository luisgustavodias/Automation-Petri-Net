import { ArcData, ArcType, PEId, PetriNetData, PlaceData, PlaceType, SimConfig, TransData } from "./PNData"

export class SimulationError extends Error {
    constructor(readonly message: string, readonly elementId: PEId) {
        super(message)
    }
}

type GuardFunc = (...args: any[]) => boolean

class LogicalPlace {
    readonly id: PEId
    readonly name: string
    readonly placeType: PlaceType
    readonly initialMark: number
    mark: number

    constructor (data: PlaceData) {
        this.id = data.id
        this.name = data.name
        this.placeType = data.placeType
        try {
            this.initialMark = parseInt(data.initialMark)
        } catch(e) {
            throw new SimulationError("Invalid initial mark: expected integer", this.id)
        }
        if (this.initialMark < 0) {
            throw new SimulationError("Invalid initial mark: can't be negative", this.id)
        }
        this.mark = this.initialMark
    }

    restart() {
        this.mark = this.initialMark
    }
}

class LogicalPetriArc {
    readonly id: PEId
    readonly place: LogicalPlace
    readonly arcType: ArcType
    readonly weight: number

    constructor (data: ArcData, place: LogicalPlace) {
        this.id = data.id
        this.place = place
        this.arcType = data.arcType
        try {
            this.weight = parseInt(data.weight)
        } catch(e) {
            throw new SimulationError("Invalid arc weight: expected integer", this.id)
        }
        if (this.weight <= 0) {
            throw new SimulationError("Invalid arc weight: must be greater than zero", this.id)
        }
    }

    isEnable() {
        if (this.arcType === 'Input' || this.arcType === 'Test')
            return this.weight <= this.place.mark
        if (this.arcType === 'Inhibitor')
            return this.weight > this.place.mark
        if (this.place.placeType === 'BOOL')
            return !this.place.mark

        return true
    }
}

class LogicalTrans {
    readonly id: PEId
    readonly inputsArcs: LogicalPetriArc[]
    readonly outputsArcs: LogicalPetriArc[]
    readonly testArcs: LogicalPetriArc[]
    readonly inhibitorArcs: LogicalPetriArc[]
    readonly guard: string
    readonly delay: number
    readonly priority: number
    private readonly guardFunc: GuardFunc
    private timeToEnable: number
    private _isGuardEnable: boolean
    private _isEnable: boolean

    constructor(data: TransData, netInputNames: string[], arcs: LogicalPetriArc[]) {
        this._isEnable = false
        this.id = data.id
        try {
            this.delay = parseFloat(data.delay)
        } catch(e) {
            throw new SimulationError("Invalid transition delay: expected float", this.id)
        }
        if (this.delay < 0) {
            throw new SimulationError("Invalid transition delay: can't be negative", this.id)
        }
        try {
            this.priority = parseFloat(data.priority)
        } catch(e) {
            throw new SimulationError("Invalid transitions priority: expected float", this.id)
        }
        this.guard = data.guard
        if (data.guard) {
            try {
                this.guardFunc = this.createGuardFunc(
                    data.guard, netInputNames
                )
            } catch(e) {
                throw new SimulationError("Invalid guard expression: syntax Error", this.id)
            }
            const decodeGuard = this.decodeGuard(data.guard)

            const expectedVarNames = [...netInputNames, 'rt', 'ft']

            const varNames = [...(" " + decodeGuard).matchAll(/[(\s><=|&]([A-z]\w*)/g)].map(s => s[1])

            for (const varName of varNames) {
                if (!expectedVarNames.includes(varName)) {
                    throw new SimulationError(
                        `Invalid guard expression: the input "${varName}" was not defined`,
                        this.id
                    )
                }
            }

            const functionCalls = [...(" " + decodeGuard).matchAll(/[(\s><=|&]([A-z]\w*)\s*\(/g)].map(s => s[1])
            const callables = ['rt', 'ft']

            for (const functionCall of functionCalls) {
                if (!callables.includes(functionCall)) {
                    throw new SimulationError(
                        `Invalid guard expression: the "${functionCall}" is not callable`,
                        this.id
                    )
                }
            }
            
            const edgeTriggerInputs = [...(" " + decodeGuard).matchAll(/(rt|ft)\((\'|\")(\w*)(\'|\")\)/g)].map(s => s[2])
            
            for (const edgeTriggerInput of edgeTriggerInputs) {
                if (!netInputNames.includes(edgeTriggerInput)) {
                    throw new SimulationError(
                        `Invalid guard expression: the input of a "ft" or "rt" call must be a net input name`,
                        this.id
                    )
                }
            }


        } else {
            this.guardFunc = (...args) => true
        }

        this.inputsArcs = arcs.filter(arc => arc.arcType === 'Input')
        this.outputsArcs = arcs.filter(arc => arc.arcType === 'Output')
        this.testArcs = arcs.filter(arc => arc.arcType === 'Test')
        this.inhibitorArcs = arcs.filter(arc => arc.arcType === 'Inhibitor')

        this.timeToEnable = this.delay
        this._isGuardEnable = false
    }

    private decodeGuard(guard: string) {
        return guard
        .replaceAll(/(?<=(\)|\s))and(?=(\(|\s))/gi, '&&')
        .replaceAll(/(?<=(\)|\s))or(?=(\(|\s))/gi, '||')
        .replaceAll(/(?<=(\(|\)|\s|^))not(?=(\(|\s))/gi, '!')
        .replaceAll(/(?<=(\w|\s))=(?=(\w|\s))/gi, '===')
        .replaceAll('&gt;', '>')
        .replaceAll('&lt;', '<')
    }

    private createGuardFunc(guard: string, inputNames: string[]): GuardFunc {
        return eval(`(${inputNames.join(',')}, rt, ft) => ${this.decodeGuard(guard)}`)
    }

    getArcs() {
        return [...this.inputsArcs, 
            ...this.outputsArcs, 
            ...this.testArcs, 
            ...this.inhibitorArcs]
    }

    restart() {
        this.timeToEnable = 0
        this._isEnable = false
    }

    checkArcs() {
        for (const arc of this.getArcs()) {
            if (!arc.isEnable())
                return false
        }
        return true
    }

    update(
        dt: number, 
        netInputs: Map<string, number>,
        rt: (varName: string) => boolean,
        ft: (varName: string) => boolean
    ) {
        this._isEnable = false
        this._isGuardEnable = true
        this._isGuardEnable = this.guardFunc(
            ...netInputs.values(), rt, ft
        )
        if (this.checkArcs() && this._isGuardEnable) {
            if (this.timeToEnable > 0)
                this.timeToEnable -= dt
            else
                this._isEnable = true
        } else
            this.timeToEnable = this.delay
    }

    fire() {
        if (!this.isEnable()) throw "Can't fire a disabled transition"
        
        for (const arc of this.inputsArcs)
            arc.place.mark -= arc.weight
        
        for (const arc of this.outputsArcs)
            arc.place.mark += arc.weight

        this.timeToEnable = this.delay
    }

    isEnable() {
        return this._isEnable
    }

    isGuardEnable() {
        return this._isGuardEnable
    }

    isWaitingDelay() {
        return this.delay &&  this.timeToEnable < this.delay
    }
}


class LogicalNet {
    readonly places: { [id: PEId]: LogicalPlace }
    readonly arcs: { [id: PEId]: LogicalPetriArc }
    readonly transitions: { [id: PEId]: LogicalTrans }
    readonly transInOrder: LogicalTrans[]
    readonly simConfig: SimConfig

    constructor(netData: PetriNetData) {
        const netInputNames = netData.inputs.map(inp => inp.name)
        this.places = Object.fromEntries(netData.places.map(
            placeData => [placeData.id, new LogicalPlace(placeData)]
        ))
        this.arcs = Object.fromEntries(netData.arcs.map(
            arcData => [
                arcData.id, 
                new LogicalPetriArc(arcData, this.places[arcData.placeId])
            ]
        ))
        this.transitions = Object.fromEntries(netData.transitions.map(
            transData => [
                transData.id, 
                new LogicalTrans(
                    transData, 
                    netInputNames,
                    netData.arcs
                        .filter(arcData => arcData.transId === transData.id)
                        .map(arcData => this.arcs[arcData.id])
                )
                
            ]
        ))

        // Sort transition in descresing order of priority
        this.transInOrder = Object.values(this.transitions).sort((a, b) => b.priority - a.priority)
        this.simConfig = netData.simConfig
    }
}

export { LogicalPlace, LogicalTrans, LogicalPetriArc, LogicalNet }