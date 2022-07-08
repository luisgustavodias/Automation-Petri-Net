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
        getGruardCondition(trans.guard),
        trans.delay ? `ton_${0}.Q` : ''
    ].filter(isNotEmptyString).join(' AND ');
}
function generateTransCode(trans) {
    return 'IF '
        + getTransEnableCondition(trans)
        + ' THEN\n'
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
function initializeTransitionTimer(trans) {
    return `    ton_0: TON;`;
}
function initializeVariables(net, netInputs) {
    return 'VAR\n'
        + '    // places\n'
        + Object.values(net.places).map(initializePlace).join('\n')
        + '\n\n    // inputs\n'
        + Object.values(netInputs).map(inp => initializeVar(inp.name, inp.type)).join('\n')
        + '\n\n    // transitions delays\n'
        + Object.values(net.transitions)
            .filter(trans => trans.delay)
            .map(initializeTransitionTimer)
            .join('\n')
        + '\nEND_VAR';
}
function generateCode(net, netInputs) {
    return initializeVariables(net, netInputs)
        + '\n\nPROGRAM\n'
        + net.transInOrder.map(generateTransCode).join('\nENF_IF\n\n')
        + '\nEND_IF'
        + '\nEND_PROGRAM';
}
export { generateCode };
