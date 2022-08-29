import { PetriNet } from './PetriNetGraphics/PetriNet.js';
import { PetriArc } from './PetriNetGraphics/PetriNetElements.js';
import Vector from './utils/Vector.js';
import { Application } from './Application.js';

function testNetManager(net: PetriNet) {
    const placeId = net.createPlace(new Vector(100, 50))
    const placeId2 = net.createPlace(new Vector(50, 100))
    const placeId3 = net.createPlace(new Vector(150, 150))
    
    const transId = net.createTrans(new Vector(150, 50))
    const transId2 = net.createTrans(new Vector(75, 150))
    const transId3 = net.createTrans(new Vector(50, 50))
    
    const arcId = net.createArc(placeId2, transId2, "Output")
    const arcId2 = net.createArc(placeId, transId, "Input")
    const arcId3 = net.createArc(placeId, transId2, "Inhibitor")
    
    net.createArc(placeId3, transId2, "Input")
    net.createArc(placeId2, transId3, "Input")
    net.createArc(placeId, transId3, "Output")
    net.createArc(placeId3, transId, "Output")

    net.zoom(new Vector(100, 100), 0.7)
    net.moveScreen(new Vector(20, 20))

    net.selectPE(placeId)

    net.setGenericPEAttr(arcId, 'weight', '2')
    net.setGenericPEAttr(arcId2, 'weight', '2')
    net.setGenericPEAttr(arcId3, 'weight', '3')
    net.setGenericPEAttr(placeId, 'initialMark', '6')
    net.setGenericPEAttr(placeId3, 'initialMark', '7')

    net.removeGenericPE(placeId)
    net.undo()
    net.undo()
    net.undo()
    net.undo()
    net.undo()

    net.redo()
    net.redo()
    net.redo()
    net.redo()

    net.undo()
}

function exampleNet(net: PetriNet) {
    const placeId1 = net.createPlace(new Vector(150, 50))
    const placeId2 = net.createPlace(new Vector(100, 150))
    const placeId3 = net.createPlace(new Vector(200, 150))
    const placeId4 = net.createPlace(new Vector(250, 50))
    const placeId5 = net.createPlace(new Vector(50, 200))

    const transId1 = net.createTrans(new Vector(150, 100))
    const transId2 = net.createTrans(new Vector(150, 200))
    const transId3 = net.createTrans(new Vector(50, 50))

    net.createArc(placeId1, transId1, "Input")
    net.createArc(placeId2, transId1, "Output")
    net.createArc(placeId3, transId1, "Output")
    net.createArc(placeId2, transId2, "Input")
    net.createArc(placeId3, transId2, "Input")
    const arcId6 = net.createArc(placeId4, transId2, "Output")
    net.createArc(placeId5, transId2, "Output")
    const arcId8 = net.createArc(placeId5, transId3, "Input")
    net.createArc(placeId1, transId3, "Output")

    net.addArcCorner(arcId6, 0)
    net.moveArcCorner(arcId6, 0, new Vector(52, 74))

    net.setGenericPEAttr(placeId1, 'initialMark', '1')
    
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
    ]
    
    net.setGenericPEAttr(transId1, 'guard', 's1 and rt("s2")')
    net.setGenericPEAttr(transId3, 'delay', '1')
    net.setGenericPEAttr(transId3, 'guard', 's1 AND (s2 OR NOT s3)')

    net.moveScreen(new Vector(50, 0))
    net.simConfig.simMode = "Classic"
}

function testArc(net: PetriNet) {
    const p1 = net.createPlace(new Vector(20, 50))
    const p2 = net.createPlace(new Vector(20, 150))
    const p3 = net.createPlace(new Vector(100, 150))

    const t1 = net.createTrans(new Vector(50, 100))
    const t2 = net.createTrans(new Vector(100, 50))

    const a1 = net.createArc(p1, t1, 'Input')
    const a2 = net.createArc(p2, t1, 'Input')
    const a3 = net.createArc(p3, t1, 'Input')
    const a4 = net.createArc(p3, t2, 'Input')
    const a5 = net.createArc(p1, t2, 'Input')

    const arc = <PetriArc>net.getGenericPE(a4)
    arc.addCorner(0)
    net.movePE(t2, new Vector(20, 0))
    arc.addCorner(1)
    arc.addCorner(0)

    //netManager.selectPE(a4)
    net.moveArcCorner(a4, 0, new Vector(10, -10))


    net.zoom(new Vector(10, 100), 0.6)

    console.log(arc)
}

function testTokenAnimation(net: PetriNet) {
    const placeId1 = net.createPlace(new Vector(50, 50))
    const placeId2 = net.createPlace(new Vector(100, 50))
    const transId1 = net.createTrans(new Vector(100 , 100))

    net.zoom(new Vector(0, 0), 0.5)

    const arcId1 = net.createArc(placeId1, transId1, 'Output')
    const arcId2 = net.createArc(placeId2, transId1, 'Input')

    net.setGenericPEAttr(placeId2, 'initialMark', '50')
    
    net.addArcCorner(arcId1, 0)
    net.moveArcCorner(arcId1, 0, new Vector(50, 100))
}

function main() {
    const app = new Application()

    //testTokenAnimation(net, simulator)
    const net = PetriNet.newNet()
    // editor.open(PetriNet.loadNet(JSON.parse('{"name":"Untiteled_Net","places":[{"id":"0.23546612309173565","elementType":"place","name":"p1","placeType":"INT","initialMark":"1","position":{"x":96.72544080604534,"y":90.68010075566751},"textsPosition":{"name":{"x":6.5,"y":-8},"placeType":{"x":7,"y":8.5}}},{"id":"0.6928806067957687","elementType":"place","name":"p2","placeType":"INT","initialMark":"0","position":{"x":97.48110831234257,"y":157.9345088161209},"textsPosition":{"name":{"x":6.5,"y":-8},"placeType":{"x":7,"y":8.5}}},{"id":"0.26686873039132397","elementType":"place","name":"p3","placeType":"INT","initialMark":"3","position":{"x":179.8488664987406,"y":65.74307304785894},"textsPosition":{"name":{"x":6.5,"y":-8},"placeType":{"x":7,"y":8.5}}},{"id":"0.1168050198675703","elementType":"place","name":"p4","placeType":"INT","initialMark":"0","position":{"x":181.36020151133502,"y":122.41813602015112},"textsPosition":{"name":{"x":6.5,"y":-8},"placeType":{"x":7,"y":8.5}}},{"id":"0.07704603159106727","elementType":"place","name":"p5","placeType":"INT","initialMark":"0","position":{"x":240.3022670025189,"y":154.15617128463478},"textsPosition":{"name":{"x":6.5,"y":-8},"placeType":{"x":7,"y":8.5}}}],"transitions":[{"id":"0.8734836963630777","elementType":"trans","name":"t1","delay":"","guard":"","position":{"x":180.6045340050378,"y":94.45843828715365},"textsPosition":{"name":{"x":6,"y":-5.5},"delay":{"x":6,"y":5.5},"guard":{"x":-6,"y":-5.5}}},{"id":"0.7700647844862283","elementType":"trans","name":"t2","delay":"","guard":"","position":{"x":97.48110831234257,"y":123.17380352644837},"textsPosition":{"name":{"x":6,"y":-5.5},"delay":{"x":6,"y":5.5},"guard":{"x":-6,"y":-5.5}}},{"id":"0.28299157995456437","elementType":"trans","name":"t3","delay":"","guard":"","position":{"x":179.84886649874056,"y":157.1788413098237},"textsPosition":{"name":{"x":6,"y":-5.5},"delay":{"x":6,"y":5.5},"guard":{"x":-6,"y":-5.5}}},{"id":"0.6241296250622337","elementType":"trans","name":"t4","delay":"","guard":"","position":{"x":251.63727959697735,"y":64.98740554156171},"textsPosition":{"name":{"x":6,"y":-5.5},"delay":{"x":6,"y":5.5},"guard":{"x":-6,"y":-5.5}}},{"id":"0.11546481176281209","elementType":"trans","name":"t5","delay":"","guard":"","position":{"x":53.65239294710328,"y":123.17380352644837},"textsPosition":{"name":{"x":6,"y":-5.5},"delay":{"x":6,"y":5.5},"guard":{"x":-6,"y":-5.5}}}],"arcs":[{"id":"0.008282048094214733","elementType":"arc","placeId":"0.26686873039132397","transId":"0.8734836963630777","arcType":"Input","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.8944631981573488","elementType":"arc","placeId":"0.1168050198675703","transId":"0.8734836963630777","arcType":"Output","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.4301610630831594","elementType":"arc","placeId":"0.23546612309173565","transId":"0.7700647844862283","arcType":"Input","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.5360759514596809","elementType":"arc","placeId":"0.6928806067957687","transId":"0.7700647844862283","arcType":"Output","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.6844354011483644","elementType":"arc","placeId":"0.1168050198675703","transId":"0.7700647844862283","arcType":"Test","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.441749213920982","elementType":"arc","placeId":"0.26686873039132397","transId":"0.6241296250622337","arcType":"Output","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.2645610186350378","elementType":"arc","placeId":"0.1168050198675703","transId":"0.28299157995456437","arcType":"Input","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.6433664067290918","elementType":"arc","placeId":"0.07704603159106727","transId":"0.28299157995456437","arcType":"Output","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.6955975690419893","elementType":"arc","placeId":"0.07704603159106727","transId":"0.6241296250622337","arcType":"Input","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.7723118561186313","elementType":"arc","placeId":"0.23546612309173565","transId":"0.11546481176281209","arcType":"Output","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.36103815042170506","elementType":"arc","placeId":"0.6928806067957687","transId":"0.11546481176281209","arcType":"Input","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[]},{"id":"0.050978968310090744","elementType":"arc","placeId":"0.23546612309173565","transId":"0.6241296250622337","arcType":"Test","weight":"1","textsPosition":{"weight":{"x":0,"y":0}},"corners":[{"x":95.27669924436071,"y":27.76132104932873},{"x":252.3190801007698,"y":29.094962421502935}]}],"inputs":[],"grid":false,"nextPlaceNumber":1,"nextTransNumber":1,"viewBox":{"x":0,"y":0,"width":1500,"heigth":300},"preScript":"","simConfig":{"simMode":"VisObj","arcDebug":true,"guardDebug":true}}')))
    // exampleNet(net)
    // app.openNet(net)
    // toolBar.enable()
    // simulator.start(editor.currentNet)

    app.run()
    console.log(app.getEditor())
}

window.onload = main