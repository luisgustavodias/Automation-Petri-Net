import { LogicalPlace, LogicalTrans, LogicalPetriArc, LogicalNet } from "./LogicalNet.js";
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

function indent(line: string, level = 1) {
    let res = line
    for (let i = 0; i < level; i++)
        res = '    ' + res
    
    return res
}

function fireArc(arc: LogicalPetriArc) {
    if (arc.place.placeType === 'INT') {
        const op = arc.arcType === 'Input' ? '-' : '+'
        return `${arc.place.name} := ${arc.place.name} ${op} ${arc.weight};\n`
    } else {
        const val = arc.arcType === 'Input' ? 'FALSE' : 'TRUE'
        return `${arc.place.name} := ${val};\n`
    }
}

function convertToSTTime(delay: number) {
    const seconds = Math.floor(delay)
    const miliseconds = Math.floor((delay - seconds)*1000)

    return "T#" + (seconds ? `${seconds}S` : '') 
        + (miliseconds ? `${miliseconds}MS` : '')
}

function updateTON(trans: LogicalTrans, timerName: string) {
    const TON_IN = getTransEnableCondition(trans)
    const TON_PT = convertToSTTime(trans.delay)
    return `${timerName}(IN := ${TON_IN}, PT := ${TON_PT})\n`
}

function generateTransCode(trans: LogicalTrans, timerName?: string) {
    const transCondition = getTransEnableCondition(trans)
    const ifExpression = trans.delay ? `${timerName}.Q` : transCondition

    return [
        timerName ? updateTON(trans, timerName) : '',
        `IF ${ifExpression} THEN\n`,
        trans.delay ? `    ${timerName}.IN := FALSE;\n` : '',
        trans.inputsArcs.map(arc => indent(fireArc(arc))).join(''),
        trans.outputsArcs.map(arc => indent(fireArc(arc))).join(''),
        'END_IF'
        ].join('')
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

function getAllEdgeTriggers(transitions: LogicalTrans[]) {
    const triggers = new Set<string>()

    for (const trans of transitions) {
        const regexIterator = trans.guard.matchAll(
            /(rt|ft)\((\'|\")(\w*)(\'|\")\)/g
        )
        for (const result of regexIterator) {
            triggers.add(`${result[1]}_${result[3]}`)
        }
    }

    return [...triggers]
}

function declareEdgeTrigger(trigger: string) {
    return `    ${trigger}: ${trigger[0].toUpperCase()}_TRIG;`
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
        + getAllEdgeTriggers(Object.values(net.transitions))
            .map(declareEdgeTrigger).join('\n')
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

function updateEdgeTriggers(net: LogicalNet) {
    const triggers = getAllEdgeTriggers(Object.values(net.transitions))

    return triggers.map(t => `${t}(CLK := ${t.slice(3)});`)
}

function generateCode(netData: PetriNetData) {
    const timerNames = processTimers(netData)
    const net = new LogicalNet(netData)

    return initializeVariables(net, netData.inputs, timerNames)
        + '\n\nPROGRAM\n'
        + updateEdgeTriggers(net)
        + '\n'
        + net.transInOrder
            .map(trans => generateTransCode(trans, timerNames[trans.id]))
            .join('\n\n')
        + '\nEND_PROGRAM'
}

export { generateCode }