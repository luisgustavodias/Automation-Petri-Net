import { LogicalPlace, LogicalTrans, LogicalPetriArc, LogicalNet } from "./LogigalNet";
import { Input } from "./PNData";

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

function generateTransCode(trans: LogicalTrans) {
    const transCondition = getTransEnableCondition(trans)
    return (trans.delay ? `ton_${0}(IN := ${transCondition})\n` : '')
        + 'IF '
        + (trans.delay ? `ton_${0}.Q` : transCondition)
        + ' THEN\n'
        + (trans.delay ? `    ton_${0}.IN := FALSE;\n` : '')
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

function initializeTransitionTimer(trans: LogicalTrans) {
    return `    ton_0: TON;`
}

function initializeVariables(net: LogicalNet, netInputs: Input[]) {
    return 'VAR\n'
        + '    // places\n'
        + Object.values(net.places).map(initializePlace).join('\n')
        + '\n\n    // inputs\n'
        + Object.values(netInputs).map(
            inp => initializeVar(inp.name, inp.type)
        ).join('\n')
        + '\n\n    // transitions delays\n'
        + Object.values(net.transitions)
            .filter(trans => trans.delay)
            .map(initializeTransitionTimer)
            .join('\n')
        + '\nEND_VAR'
}

function generateCode(net: LogicalNet, netInputs: Input[]) {
    return initializeVariables(net, netInputs)
        + '\n\nPROGRAM\n'
        + net.transInOrder.map(generateTransCode).join('\nENF_IF\n\n')
        + '\nEND_IF'
        + '\nEND_PROGRAM'
}

export { generateCode }