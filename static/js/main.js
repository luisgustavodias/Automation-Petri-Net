import { svg } from './PetriNet.js';
import ToolBar from './ToolBar.js';
export var toolBar = new ToolBar();
window.onload = function addListeners() {
    console.log('adding listeners');
    let eventNames = ['mousedown', 'mouseup', 'mousemove', 'mouseleave', 'wheel'];
    for (let name of eventNames) {
        svg.addEventListener(name, (evt) => { toolBar[name](evt); });
    }
    document.body.addEventListener('keydown', (evt) => { toolBar.keydown(evt); });
    for (let tool in toolBar.tools) {
        document.getElementById(tool)
            .addEventListener('mousedown', (evt) => { toolBar.changeTool(tool); });
    }
};
// window.onload = function addListeners() {
//     console.log('adding listeners');
//     svg.addEventListener('mousedown', mouseDownHandler);
//     svg.addEventListener('mousemove', mouseMoveHandler);
//     svg.addEventListener('mouseup', mouseUpHandler);
//     svg.addEventListener('mouseleave', mouseLeaveHandler);
//     svg.addEventListener('wheel', zoom);
//     document.addEventListener('keydown', keyDown)
//     for (let tool in toolBar.tools) {
//         document.getElementById(tool)
//             .addEventListener('mousedown', (evt) => { changeTool(tool) });
//     }
// }
// function zoom(evt) {
//     evt.preventDefault();
//     var scale = 1 + 0.01 * evt.deltaY;
//     scale = Math.min(Math.max(.9, scale), 1.1);
//     var coord = getMousePosition(evt);
//     svg.viewBox.baseVal.x += (coord.x - svg.viewBox.baseVal.x)*(1 - scale);
//     svg.viewBox.baseVal.y += (coord.y - svg.viewBox.baseVal.y)*(1 - scale);
//     svg.viewBox.baseVal.width = svg.viewBox.baseVal.width*scale;
//     svg.viewBox.baseVal.height = svg.viewBox.baseVal.height*scale;
// }
// function mouseDownHandler (evt) {
//     if (evt.ctrlKey) {
//         PNManager.movingScreen = true;
//         offset = getMousePosition(evt);
//     } else {
//         toolBar.currentTool.onMouseDown(evt);
//     }
// }
// function mouseUpHandler (evt) {
//     PNManager.movingScreen = false;
//     toolBar.currentTool.onMouseUp(evt);
// }
// function mouseMoveHandler (evt) {
//     if (PNManager.movingScreen) {
//         var coord = getMousePosition(evt);
//         svg.viewBox.baseVal.x -= (coord.x - offset.x);
//         svg.viewBox.baseVal.y -= (coord.y - offset.y);
//     } else {
//         toolBar.currentTool.onMouseMove(evt);
//     }
// }
// function mouseLeaveHandler (evt) {
//     PNManager.movingScreen = false;
//     toolBar.currentTool.onMouseLeave(evt);
// }
// function changeTool (tool) {
//     toolBar.currentTool.onChangeTool();
//     toolBar.currentTool = toolBar.tools[tool];
//     console.log(tool)
//     document.getElementById(tool).classList.add("selected-tool-bar-item");
// }
// function keyDown(evt) {
//     if(evt.target.tagName === "BODY") {
//         if (evt.key === "Delete") {
//             if(toolBar.tools['mouse-tool'].selectedPE) {
//                 let elementId = toolBar.tools['mouse-tool'].selectedPE.id;
//                 toolBar.tools['mouse-tool'].deselect();
//                 PNManager.removeElement(elementId);
//                 console.log(PNManager.elements)
//             }
//         }
//     }
// }
// PNManager.addPlace({x: 50, y: 50});
// PNManager.addTrans({x: 100, y: 50});
// PNManager.addArc('PE1', 'PE2', 'intput');
// let arc = PNManager.net.elements['PE3']
// arc.splitLine(0)
// arc.lines[0].setAttribute('stroke', 'green')
