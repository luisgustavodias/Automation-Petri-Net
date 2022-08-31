import { LogicalNet } from "./LogicalNet.js";
const isNotEmptyString = (s) => s !== '';
function getArcEnableCondition(arc) {
    if (['Input', 'Test'].includes(arc.arcType)) {
        if (arc.place.placeType === 'BOOL' || arc.weight === 1)
            return arc.place.name;
        return `${arc.place.name} >= ${arc.weight}`;
    }
    if (arc.arcType === 'Inhibitor') {
        if (arc.place.placeType === 'BOOL' || arc.weight === 1)
            return `NOT ${arc.place.name}`;
        return `${arc.place.name} < ${arc.weight}`;
    }
    if (arc.place.placeType === 'BOOL') {
        return `NOT ${arc.place.name}`;
    }
    return '';
}
function getGruardCondition(guard) {
    return guard.replaceAll(/(rt|ft)\((\'|\")(\w*)(\'|\")\)/g, '$1_$3.Q');
}
function getTransEnableCondition(trans) {
    return [
        trans.getArcs().map(getArcEnableCondition)
            .filter(isNotEmptyString).join(' AND '),
        getGruardCondition(trans.guard)
    ].filter(isNotEmptyString)
        .map(condition => `(${condition})`)
        .join(' AND ') || 'TRUE';
}
function generateTransCode(trans, timerName) {
    const transCondition = getTransEnableCondition(trans);
    return (trans.delay ? `${timerName}(IN := ${transCondition})\n` : '')
        + 'IF '
        + (trans.delay ? `${timerName}.Q` : transCondition)
        + ' THEN\n'
        + (trans.delay ? `    ${timerName}.IN := FALSE;\n` : '')
        + trans.inputsArcs.map(arc => `    ${arc.place.name} := ${arc.place.name} + ${arc.weight};`).join('\n')
        + '\n'
        + trans.inputsArcs.map(arc => `    ${arc.place.name} := ${arc.place.name} - ${arc.weight};`).join('\n');
}
function initializeVar(varName, varType, initialValue) {
    if (initialValue)
        return `    ${varName}: ${varType} := ${initialValue};`;
    return `    ${varName}: ${varType};`;
}
function initializePlace(place) {
    return initializeVar(place.name, place.placeType, place.placeType === 'INT' ?
        String(place.initialMark)
        : place.initialMark ? 'TRUE' : 'FALSE');
}
function initializeEdgeTriggers(transitions) {
    const triggers = new Set();
    for (const trans of transitions) {
        const regexIterator = trans.guard.matchAll(/(rt|ft)\((\'|\")(\w*)(\'|\")\)/g);
        for (const result of regexIterator) {
            triggers.add(`${result[1]}_${result[3]}`);
        }
    }
    return [...triggers].map(t => `    ${t}: ${t[0].toUpperCase()}_TRIG;`);
}
function initializeVariables(net, netInputs, timerNames) {
    return 'VAR\n'
        + '    // places\n'
        + Object.values(net.places).map(initializePlace).join('\n')
        + '\n\n    // inputs\n'
        + Object.values(netInputs).map(inp => initializeVar(inp.name, inp.type)).join('\n')
        + '\n\n    // transitions delays\n'
        + Object.values(timerNames)
            .map(timerName => `    ${timerName}: TON;`)
            .join('\n')
        + '\n\n    // edge triggers\n'
        + initializeEdgeTriggers(Object.values(net.transitions))
            .join('\n')
        + '\nEND_VAR';
}
function processTimers(net) {
    const timerNames = {};
    for (const trans of net.transitions) {
        if (trans.delay)
            timerNames[trans.id] = `ton_${trans.name}`;
    }
    return timerNames;
}
function generateCode(netData) {
    const timerNames = processTimers(netData);
    const net = new LogicalNet(netData);
    return initializeVariables(net, netData.inputs, timerNames)
        + '\n\nPROGRAM\n'
        + net.transInOrder
            .map(trans => generateTransCode(trans, timerNames[trans.id]))
            .join('\nENF_IF\n\n')
        + '\nEND_IF'
        + '\nEND_PROGRAM';
}
export { generateCode };
