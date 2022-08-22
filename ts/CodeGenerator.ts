import { LogicalPlace, LogicalTrans, LogicalPetriArc, LogicalNet } from "./LogigalNet.js";
import { Input, PEId, PetriNetData } from "./PNData";

type TimerNames = {[id:PEId]: string}

const isNotEmptyString = (s: string) => s !== ''

function getArcEnableCondition(arc: LogicalPetriArc) {
    if (['Input', 'Test'].includes(arc.arcType)) {
        if (arc.place.placeType === 'BOOL' || arc.weight === 1)
            return arc.place.name
        
        return `${arc.place.name} >= ${arc.weight}`
    } 
    if (arc.arcType === 'Inhibitor') {
        if (arc.place.placeType === 'BOOL' || arc.weight === 1)
            return `NOT ${arc.place.name}`
        
        return `${arc.place.name} < ${arc.weight}`
    }
    if (arc.place.placeType === 'BOOL') {
        return `NOT ${arc.place.name}`
    }

    return ''
}

function getGruardCondition(guard: string) {
    return guard.replaceAll(
        /(rt|ft)\((\'|\")(\w*)(\'|\")\)/g, 
        '$1_$3.Q'
    )
}

function getTransEnableCondition(trans: LogicalTrans) {
    return [
        trans.getArcs().map(getArcEnableCondition)
            .filter(isNotEmptyString).join(' AND '), 
        getGruardCondition(trans.guard)
    ].filter(isNotEmptyString)
    .map(condition => `(${condition})`)
    .join(' AND ') || 'TRUE'
}

function generateTransCode(trans: LogicalTrans, timerName?: string) {
    const transCondition = getTransEnableCondition(trans)
    return (trans.delay ? `${timerName}(IN := ${transCondition})\n` : '')
        + 'IF '
        + (trans.delay ? `${timerName}.Q` : transCondition)
        + ' THEN\n'
        + (trans.delay ? `    ${timerName}.IN := FALSE;\n` : '')
        + trans.inputsArcs.map(
            arc => `    ${arc.place.name} := ${arc.place.name} + ${arc.weight};`
        ).join('\n')
        + '\n'
        + trans.inputsArcs.map(
            arc => `    ${arc.place.name} := ${arc.place.name} - ${arc.weight};`
        ).join('\n')
}

function initializeVar(varName: string, varType: string, initialValue?: string) {
    if (initialValue)
        return `    ${varName}: ${varType} := ${initialValue};`
    
    return `    ${varName}: ${varType};`
}

function initializePlace(place: LogicalPlace) {
    return initializeVar(
        place.name,
        place.placeType,
        place.placeType === 'INT' ? 
            String(place.initialMark) 
            : place.initialMark ? 'TRUE' : 'FALSE'
    )
}

function initializeEdgeTriggers(transitions: LogicalTrans[]) {
    const triggers = new Set<string>()

    for (const trans of transitions) {
        const regexIterator = trans.guard.matchAll(
            /(rt|ft)\((\'|\")(\w*)(\'|\")\)/g
        )
        for (const result of regexIterator) {
            triggers.add(`${result[1]}_${result[3]}`)
        }
    }

    return [...triggers].map(
        t => `    ${t}: ${t[0].toUpperCase()}_TRIG;`
    )
}

function initializeVariables(net: LogicalNet, netInputs: Input[], timerNames: TimerNames) {
    return 'VAR\n'
        + '    // places\n'
        + Object.values(net.places).map(initializePlace).join('\n')
        + '\n\n    // inputs\n'
        + Object.values(netInputs).map(
            inp => initializeVar(inp.name, inp.type)
        ).join('\n')
        + '\n\n    // transitions delays\n'
        + Object.values(timerNames)
            .map(timerName => `    ${timerName}: TON;`)
            .join('\n')
        + '\n\n    // edge triggers\n'
        + initializeEdgeTriggers(Object.values(net.transitions))
            .join('\n')
        + '\nEND_VAR'
}

function processTimers(net: PetriNetData) {
    const timerNames: TimerNames = {}

    for (const trans of net.transitions) {
        if (trans.delay) 
            timerNames[trans.id] = `ton_${trans.name}`
    }

    return timerNames
}

function generateCode(netData: PetriNetData, netInputs: Input[]) {
    const timerNames = processTimers(netData)
    const net = new LogicalNet(netData, 0, () => ({}))

    return initializeVariables(net, netInputs, timerNames)
        + '\n\nPROGRAM\n'
        + net.transInOrder
            .map(trans => generateTransCode(trans, timerNames[trans.id]))
            .join('\nENF_IF\n\n')
        + '\nEND_IF'
        + '\nEND_PROGRAM'
}

export { generateCode }