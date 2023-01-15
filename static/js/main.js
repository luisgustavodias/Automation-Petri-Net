import Vector from './utils/Vector.js';
import { Application } from './Application.js';
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
    net.moveArcCorner(arcId6, 0, new Vector(52, 74));
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
    net.setGenericPEAttr(transId1, 'guard', 's1 and rt("s2")');
    net.setGenericPEAttr(transId3, 'delay', '1');
    net.setGenericPEAttr(transId3, 'guard', 's1 AND (s2 OR NOT s3)');
    net.moveScreen(new Vector(50, 0));
    net.simConfig.simMode = "Classic";
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
function testTokenAnimation(net) {
    const placeId1 = net.createPlace(new Vector(50, 50));
    const placeId2 = net.createPlace(new Vector(100, 50));
    const transId1 = net.createTrans(new Vector(100, 100));
    net.zoom(new Vector(0, 0), 0.5);
    const arcId1 = net.createArc(placeId1, transId1, 'Output');
    const arcId2 = net.createArc(placeId2, transId1, 'Input');
    net.setGenericPEAttr(placeId2, 'initialMark', '50');
    net.addArcCorner(arcId1, 0);
    net.moveArcCorner(arcId1, 0, new Vector(50, 100));
}
function main() {
    const app = new Application();
    app.loadNet(JSON.parse('{"name":"Untiteled_Net","places":[{"id":"5a201c92-27db-4dd1-968d-b7d38922fb0a","elementType":"place","name":"p1","placeType":"INT","initialMark":"-2","position":{"x":83.92857142857142,"y":91.51785714285714},"textsPosition":{"name":{"x":6.5,"y":-8},"placeType":{"x":7,"y":8.5}}}],"transitions":[],"arcs":[],"inputs":[],"grid":false,"nextPlaceNumber":2,"nextTransNumber":1,"viewBox":{"x":0,"y":0,"width":1500,"heigth":300},"preScript":"","simConfig":{"simMode":"Automation","arcDebug":false,"guardDebug":false,"priorityMode":"fixed"}}'));
    app.run();
}
window.onload = main;
