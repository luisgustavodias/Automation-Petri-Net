import { PetriNetManager } from './PetriNet.js';
import Vector from './utils/Vector.js';
import ToolBar from './ToolBar.js';
import { PropertyWindow } from './PropertyWindow.js';
import { createSimulator } from './Simulation.js'

function addListeners(toolBar) {
    console.log('adding listeners');
    const eventNames = ['mousedown', 'mouseup', 'mousemove', 'mouseleave', 'wheel']
    const svg = document.getElementById('my-svg')
    for (let name of eventNames) {
        svg.addEventListener(name, (evt) => { toolBar[name](evt) });
    }
    document.body.addEventListener('keydown', (evt) => { toolBar.keydown(evt) });
    for (let tool in toolBar.tools) {
        document.getElementById(tool)
            .addEventListener('mousedown', (evt) => { toolBar.changeTool(tool) });
    }
}

function testNetManager(netManager: PetriNetManager) {
    const placeId = netManager.createPlace(new Vector(100, 50))
    const placeId2 = netManager.createPlace(new Vector(50, 100))
    const placeId3 = netManager.createPlace(new Vector(150, 150))
    
    const transId = netManager.createTrans(new Vector(150, 50))
    const transId2 = netManager.createTrans(new Vector(75, 150))
    const transId3 = netManager.createTrans(new Vector(50, 50))
    
    const arcId = netManager.createArc(placeId2, transId2, "Output")
    const arcId2 = netManager.createArc(placeId, transId, "Input")
    const arcId3 = netManager.createArc(placeId, transId2, "Inhibitor")
    
    netManager.createArc(placeId3, transId2, "Input")
    netManager.createArc(placeId2, transId3, "Input")
    netManager.createArc(placeId, transId3, "Output")
    netManager.createArc(placeId3, transId, "Output")

    netManager.zoom(new Vector(100, 100), 0.7)
    netManager.moveScreen(new Vector(20, 20))

    netManager.selectPE(placeId)

    netManager.setGenericPEAttr(arcId, 'weight', '2')
    netManager.setGenericPEAttr(arcId2, 'weight', '2')
    netManager.setGenericPEAttr(arcId3, 'weight', '3')
    netManager.setGenericPEAttr(placeId, 'initialMark', '6')
    netManager.setGenericPEAttr(placeId3, 'initialMark', '7')

}

function main() {
    console.log('Creating net')
    const netManager = new PetriNetManager()
    const toolBar = new ToolBar(netManager)
    const propertyWindow = new PropertyWindow()
    netManager.selectObserver = (PEId: string) => {
        const genericPE = netManager.getPE(PEId)
        propertyWindow.open(
            genericPE.PEType,
            (attr, val) => { 
                netManager.setGenericPEAttr(PEId, attr, val) 
            },
            genericPE
        )
    }
    netManager.deselectObserver = () => { propertyWindow.close() }
    addListeners(toolBar)
    const simulator = createSimulator(netManager.net)

    testNetManager(netManager)
}

window.onload = main