import { PetriNet } from './PetriNet.js';
import Vector from './utils/Vector.js';
import ToolBar from './ToolBar.js';
import { PropertyWindow } from './PropertyWindow.js';
import { createSimulator } from './Simulation.js';
import { InputConfig } from './InputsConfig.js';
import Editor from './Editor.js';
function testNetManager(net) {
    const placeId = net.createPlace(new Vector(100, 50));
    const placeId2 = net.createPlace(new Vector(50, 100));
    const placeId3 = net.createPlace(new Vector(150, 150));
    const transId = net.createTrans(new Vector(150, 50));
    const transId2 = net.createTrans(new Vector(75, 150));
    const transId3 = net.createTrans(new Vector(50, 50));
    const arcId = net.createArc(placeId2, transId2, "Output");
    const arcId2 = net.createArc(placeId, transId, "Input");
    const arcId3 = net.createArc(placeId, transId2, "Inhibitor");
    net.createArc(placeId3, transId2, "Input");
    net.createArc(placeId2, transId3, "Input");
    net.createArc(placeId, transId3, "Output");
    net.createArc(placeId3, transId, "Output");
    net.zoom(new Vector(100, 100), 0.7);
    net.moveScreen(new Vector(20, 20));
    net.selectPE(placeId);
    net.setGenericPEAttr(arcId, 'weight', '2');
    net.setGenericPEAttr(arcId2, 'weight', '2');
    net.setGenericPEAttr(arcId3, 'weight', '3');
    net.setGenericPEAttr(placeId, 'initialMark', '6');
    net.setGenericPEAttr(placeId3, 'initialMark', '7');
    net.removeGenericPE(placeId);
    net.undo();
    net.undo();
    net.undo();
    net.undo();
    net.undo();
    net.redo();
    net.redo();
    net.redo();
    net.redo();
    net.undo();
}
function exampleNet(net) {
    const placeId1 = net.createPlace(new Vector(150, 50));
    const placeId2 = net.createPlace(new Vector(100, 150));
    const placeId3 = net.createPlace(new Vector(200, 150));
    const placeId4 = net.createPlace(new Vector(250, 50));
    const placeId5 = net.createPlace(new Vector(50, 200));
    const transId1 = net.createTrans(new Vector(150, 100));
    const transId2 = net.createTrans(new Vector(150, 200));
    const transId3 = net.createTrans(new Vector(50, 50));
    net.createArc(placeId1, transId1, "Input");
    net.createArc(placeId2, transId1, "Output");
    net.createArc(placeId3, transId1, "Output");
    net.createArc(placeId2, transId2, "Input");
    net.createArc(placeId3, transId2, "Input");
    const arcId6 = net.createArc(placeId4, transId2, "Output");
    net.createArc(placeId5, transId2, "Output");
    const arcId8 = net.createArc(placeId5, transId3, "Input");
    net.createArc(placeId1, transId3, "Output");
    net.addArcCorner(arcId6, 0);
    net.moveArcCorner(arcId6, 0, new Vector(250, 200));
    net.setGenericPEAttr(placeId1, 'initialMark', '1');
    net.inputs = [
        {
            name: 's1',
            type: 'BOOL',
            initialValue: 'false',
            description: ''
        },
        {
            name: 's2',
            type: 'BOOL',
            initialValue: 'true',
            description: ''
        },
        {
            name: 's3',
            type: 'BOOL',
            initialValue: 'true',
            description: ''
        },
    ];
    net.setGenericPEAttr(transId1, 'guard', 's1 and s2');
    net.setGenericPEAttr(transId3, 'guard', 's1 AND (s2 OR NOT s3)');
    net.moveScreen(new Vector(50, 0));
}
function testArc(net) {
    const p1 = net.createPlace(new Vector(20, 50));
    const p2 = net.createPlace(new Vector(20, 150));
    const p3 = net.createPlace(new Vector(100, 150));
    const t1 = net.createTrans(new Vector(50, 100));
    const t2 = net.createTrans(new Vector(100, 50));
    const a1 = net.createArc(p1, t1, 'Input');
    const a2 = net.createArc(p2, t1, 'Input');
    const a3 = net.createArc(p3, t1, 'Input');
    const a4 = net.createArc(p3, t2, 'Input');
    const a5 = net.createArc(p1, t2, 'Input');
    const arc = net.getGenericPE(a4);
    arc.addCorner(0);
    net.movePE(t2, new Vector(20, 0));
    arc.addCorner(1);
    arc.addCorner(0);
    //netManager.selectPE(a4)
    net.moveArcCorner(a4, 0, new Vector(10, -10));
    net.zoom(new Vector(10, 100), 0.6);
    console.log(arc);
}
function testTokenAnimation(net, simulator) {
    const placeId1 = net.createPlace(new Vector(50, 50));
    const placeId2 = net.createPlace(new Vector(100, 50));
    const transId1 = net.createTrans(new Vector(100, 100));
    net.zoom(new Vector(0, 0), 0.5);
    const arcId1 = net.createArc(placeId1, transId1, 'Output');
    const arcId2 = net.createArc(placeId2, transId1, 'Input');
    net.setGenericPEAttr(placeId2, 'initialMark', '50');
    net.addArcCorner(arcId1, 0);
    net.moveArcCorner(arcId1, 0, new Vector(50, 100));
    simulator.step(net);
}
const filePickerOptions = {
    types: [{
            description: 'Automation Petri Net',
            accept: {
                'text/plain': ['.txt']
            }
        }],
    excludeAcceptAllOption: true,
    multiple: false
};
async function loadNet() {
    let fileHandle;
    //@ts-ignore
    [fileHandle] = await window.showOpenFilePicker(filePickerOptions);
    const file = await fileHandle.getFile();
    const fileText = await file.text();
    const netData = JSON.parse(fileText);
    return PetriNet.loadNet(netData);
}
async function saveNet(net) {
    let fileHandle;
    //@ts-ignore
    [fileHandle] = await window.showOpenFilePicker(filePickerOptions);
    const file = await fileHandle.createWritable();
    await file.write(JSON.stringify(net.getNetData()));
    await file.close();
}
function main() {
    console.log('Creating net');
    const net = PetriNet.newNet();
    const editor = new Editor();
    const propertyWindow = new PropertyWindow();
    const toolBar = new ToolBar(editor, propertyWindow);
    const inputConfig = new InputConfig();
    document.getElementById('inputs-button')
        .onclick = () => {
        inputConfig.open(editor.currentNet.inputs, inputs => { editor.currentNet.inputs = inputs; });
    };
    const simulator = createSimulator(editor.currentNet, () => {
        toolBar.disable();
        return editor.currentNet;
    }, () => { toolBar.enable(); });
    document.getElementById('new-file-button').onclick = () => {
        editor.open(PetriNet.newNet());
        toolBar.enable();
    };
    document.getElementById('close-file-button').onclick = () => {
        editor.close();
    };
    document.getElementById('load-file-button').onclick = async () => {
        editor.open(await loadNet());
    };
    document.getElementById('save-file-button').onclick = async () => {
        await saveNet(editor.currentNet);
    };
    //testTokenAnimation(net, simulator)
    //exampleNet(net)
}
window.onload = main;
