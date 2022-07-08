class LogicalPlace {
    id;
    name;
    placeType;
    initialMark;
    mark;
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.placeType = data.placeType;
        try {
            this.initialMark = parseFloat(data.initialMark);
        }
        catch (e) {
            throw "Can't convert initialMark to Integer.";
        }
    }
    restart() {
        this.mark = this.initialMark;
    }
}
class LogicalPetriArc {
    id;
    place;
    arcType;
    weight;
    constructor(data, place) {
        this.id = data.id;
        this.place = place;
        this.arcType = data.arcType;
        try {
            this.weight = parseFloat(data.weight);
        }
        catch (e) {
            throw "Can't convert weight to Integer.";
        }
    }
    isEnable() {
        if (this.arcType === 'Input' || this.arcType === 'Test')
            return this.weight <= this.place.mark;
        if (this.arcType === 'Inhibitor')
            return this.weight >= this.place.mark;
        if (this.place.placeType === 'BOOL')
            return !this.place.mark;
        return true;
    }
}
class LogicalTrans {
    id;
    inputsArcs;
    outputsArcs;
    testArcs;
    inhibitorArcs;
    guard;
    delay;
    priority;
    timeToEnable;
    _isGuardEnable;
    _isEnable;
    guardFunc;
    constructor(data, netInputs) {
        this._isEnable = false;
        this.id = data.id;
        try {
            this.delay = parseFloat(data.delay);
        }
        catch (e) {
            throw "Can't convert delay to float.";
        }
        // try {
        //     this.priority = parseFloat(data.priority)
        // } catch(e) {
        //     throw "Can't convert priority to float."
        // }
        this.guard = data.guard;
        if (data.guard) {
            try {
                this.guardFunc = this.createGuardFunc(data.guard, [...netInputs.keys()]);
            }
            catch (e) {
                'Invalid guard expression';
            }
        }
        else {
            this.guardFunc = (...args) => true;
        }
        this.inputsArcs = [];
        this.outputsArcs = [];
        this.testArcs = [];
        this.inhibitorArcs = [];
    }
    createGuardFunc(guard, inputNames) {
        const decodedGuard = guard
            .replaceAll(/(?<=(\)|\s))and(?=(\(|\s))/gi, '&&')
            .replaceAll(/(?<=(\)|\s))or(?=(\(|\s))/gi, '||')
            .replaceAll(/(?<=(\(|\)|\s|^))not(?=(\(|\s))/gi, '!');
        return eval(`(${inputNames.join(',')}, rt, ft) => ${decodedGuard}`);
    }
    addArc(arc) {
        if (arc.arcType === 'Input')
            this.inputsArcs.push(arc);
        if (arc.arcType === 'Output')
            this.outputsArcs.push(arc);
        if (arc.arcType === 'Test')
            this.testArcs.push(arc);
        if (arc.arcType === 'Inhibitor')
            this.inhibitorArcs.push(arc);
    }
    getArcs() {
        return [...this.inputsArcs,
            ...this.outputsArcs,
            ...this.testArcs,
            ...this.inhibitorArcs];
    }
    restart() {
        this.timeToEnable = 0;
        this._isEnable = false;
    }
    checkArcs() {
        for (const arc of [...this.inputsArcs, ...this.testArcs]) {
            if (arc.place.mark < arc.weight)
                return false;
        }
        for (const arc of this.inhibitorArcs) {
            if (arc.place.mark >= arc.weight)
                return false;
        }
        for (const arc of this.outputsArcs) {
            if (arc.place.placeType === 'BOOL' && arc.place.mark === 1)
                return false;
        }
        return true;
    }
    update(dt, netInputs, rt, ft) {
        this._isEnable = false;
        this._isGuardEnable = this.guardFunc(...netInputs.values(), rt, ft);
        if (this.checkArcs() && this._isGuardEnable) {
            if (this.timeToEnable > 0)
                this.timeToEnable -= dt;
            else
                this._isEnable = true;
        }
        else
            this.timeToEnable = this.delay;
    }
    fire() {
        if (!this.isEnable())
            throw "Can't fire a disabled transition";
        for (const arc of this.inputsArcs)
            arc.place.mark -= arc.weight;
        for (const arc of this.outputsArcs)
            arc.place.mark += arc.weight;
        this.timeToEnable = this.delay;
    }
    isEnable() {
        return this._isEnable;
    }
    isGuardEnable() {
        return this._isGuardEnable;
    }
    isWaitingDelay() {
        return this.delay && this.timeToEnable < this.delay;
    }
}
class LogicalNet {
    inputValues;
    places;
    arcs;
    transitions;
    transInOrder;
    readInputs;
    previousInputValues;
    contextFunctions;
    cycleInterval;
    currentTransIndex;
    simulationTime;
    constructor(netData, cycleInterval, readInputs) {
        this.inputValues = new Map();
        this.previousInputValues = new Map();
        this.cycleInterval = cycleInterval;
        this.readInputs = readInputs;
        for (const [inputName, inputValue] of Object.entries(readInputs())) {
            this.inputValues.set(inputName, inputValue);
            this.previousInputValues.set(inputName, inputValue);
        }
        this.places = Object.fromEntries(netData.places.map(placeData => [placeData.id, new LogicalPlace(placeData)]));
        this.arcs = Object.fromEntries(netData.arcs.map(arcData => [
            arcData.id,
            new LogicalPetriArc(arcData, this.places[arcData.placeId])
        ]));
        this.transitions = Object.fromEntries(netData.transitions.map(transData => [
            transData.id,
            new LogicalTrans(transData, this.inputValues)
        ]));
        netData.arcs.forEach(arcData => {
            this.transitions[arcData.transId].addArc(this.arcs[arcData.id]);
        });
        this.transInOrder = Object.values(this.transitions);
        this.contextFunctions = {
            rt: (varName) => this.inputValues.get(varName) && !this.previousInputValues.get(varName),
            ft: (varName) => this.previousInputValues.get(varName) && !this.inputValues.get(varName),
        };
        // this.transInOrder.sort(
        //     (a, b) => a.priority - b.priority
        // )
        this.currentTransIndex = 0;
        this.simulationTime = 0;
    }
    getSimulationTime() {
        return this.simulationTime;
    }
    getPlaceMarks() {
        return Object.fromEntries(Object.values(this.places).map(place => [place.id, place.mark]));
    }
    updateInputValues() {
        const inputs = this.readInputs();
        for (const [inputName, inputValue] of Object.entries(inputs)) {
            this.previousInputValues.set(inputName, this.inputValues.get(inputName));
            this.inputValues.set(inputName, inputValue);
        }
    }
    restart() {
        for (const placeId in this.places)
            this.places[placeId].restart();
        for (const transId in this.transitions)
            this.transitions[transId].restart();
        this.currentTransIndex = 0;
        this.simulationTime = 0;
    }
    update() {
        if (this.currentTransIndex >= this.transInOrder.length)
            this.currentTransIndex = 0;
        if (this.currentTransIndex == 0)
            this.updateInputValues();
        const trans = this.transInOrder[this.currentTransIndex++];
        trans.update(this.cycleInterval, this.inputValues, this.contextFunctions.rt, this.contextFunctions.ft);
        const isLastTrans = this.currentTransIndex
            === this.transInOrder.length;
        if (isLastTrans)
            this.simulationTime += this.cycleInterval;
        if (trans.isEnable())
            trans.fire();
        return {
            currentTrans: trans,
            isLastTrans: isLastTrans
        };
    }
}
export { LogicalPlace, LogicalTrans, LogicalPetriArc, LogicalNet };
