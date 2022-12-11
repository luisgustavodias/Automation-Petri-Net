import { LogicalNet } from "./LogicalNet.js";
const isNotEmptyString = (s) => s !== '';
function getArcEnableCondition(arc) {
    if (['Input', 'Test'].includes(arc.arcType)) {
        if (arc.place.placeType === 'BOOL')
            return arc.place.name;
        return `${arc.place.name} >= ${arc.weight}`;
    }
    if (arc.arcType === 'Inhibitor') {
        if (arc.place.placeType === 'BOOL')
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
function indent(line, level = 1) {
    let res = line;
    for (let i = 0; i < level; i++)
        res = '    ' + res;
    return res;
}
function fireArc(arc) {
    if (arc.place.placeType === 'INT') {
        const op = arc.arcType === 'Input' ? '-' : '+';
        return `${arc.place.name} := ${arc.place.name} ${op} ${arc.weight};\n`;
    }
    else {
        const val = arc.arcType === 'Input' ? 'FALSE' : 'TRUE';
        return `${arc.place.name} := ${val};\n`;
    }
}
function convertToSTTime(delay) {
    const seconds = Math.floor(delay);
    const miliseconds = Math.floor((delay - seconds) * 1000);
    return "T#" + (seconds ? `${seconds}S` : '')
        + (miliseconds ? `${miliseconds}MS` : '');
}
function updateTON(trans, timerName) {
    const TON_IN = getTransEnableCondition(trans);
    const TON_PT = convertToSTTime(trans.delay);
    return `${timerName}(IN := ${TON_IN}, PT := ${TON_PT});\n`;
}
function generateTransCode(trans, timerName) {
    const transCondition = getTransEnableCondition(trans);
    const ifExpression = trans.delay ? `${timerName}.Q` : transCondition;
    return [
        timerName ? updateTON(trans, timerName) : '',
        `IF ${ifExpression} THEN\n`,
        trans.delay ? `    ${timerName}(IN := FALSE);\n` : '',
        trans.inputsArcs.map(arc => indent(fireArc(arc))).join(''),
        trans.outputsArcs.map(arc => indent(fireArc(arc))).join(''),
        'END_IF'
    ].join('');
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
function getAllEdgeTriggers(transitions) {
    const triggers = new Set();
    for (const trans of transitions) {
        const regexIterator = trans.guard.matchAll(/(rt|ft)\((\'|\")(\w*)(\'|\")\)/g);
        for (const result of regexIterator) {
            triggers.add(`${result[1]}_${result[3]}`);
        }
    }
    return [...triggers];
}
function declareEdgeTrigger(trigger) {
    return `    ${trigger}: ${trigger[0].toUpperCase()}_TRIG;`;
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
        + getAllEdgeTriggers(Object.values(net.transitions))
            .map(declareEdgeTrigger).join('\n')
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
function updateEdgeTriggers(net) {
    const triggers = getAllEdgeTriggers(Object.values(net.transitions));
    return triggers.map(t => `${t}(CLK := ${t.slice(3)});`).join('\n');
}
function generateCode(netData) {
    const timerNames = processTimers(netData);
    const net = new LogicalNet(netData);
    return initializeVariables(net, netData.inputs, timerNames)
        + '\n\nPROGRAM\n'
        + updateEdgeTriggers(net)
        + '\n'
        + net.transInOrder
            .map(trans => generateTransCode(trans, timerNames[trans.id]))
            .join('\n\n')
        + '\nEND_PROGRAM';
}
export { generateCode };
