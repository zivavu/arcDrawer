import { arcColor, blur, lineWidth, offsetWeight, previousOffsetMultiplier, strokesNumber } from './settings.js';

const container = document.getElementById('canvas-container');
const settingsMenuElement = document.getElementById('settings-menu');

let canvas = document.querySelector('.canvas');
let ctx = canvas.getContext('2d');
let canvasArr = [canvas];

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function setDimentions() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
let mouseHolding = false;
let mouse = {
    x: 0,
    y: 0,
};

function draw() {
    let currentPos = {
        x: mouse.x,
        y: mouse.y,
    };
    let previousPos = {
        x: mouse.x,
        y: mouse.y,
    };
    let previousOffset = { x: 0, y: 0 };

    ctx.strokeStyle = arcColor;
    ctx.beginPath();
    ctx.filter = `blur(${blur}px)`;
    ctx.shadowColor = 'black';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
    for (let i = 0; i < strokesNumber; i++) {
        ctx.lineWidth = Math.random() * lineWidth;
        ctx.moveTo(previousPos.x, previousPos.y);
        let offset = {
            x: Math.random() * offsetWeight - offsetWeight / 2,
            y: Math.random() * offsetWeight - offsetWeight / 2,
        };
        ctx.lineTo(
            currentPos.x + offset.x + previousOffset.x * previousOffsetMultiplier,
            currentPos.y + offset.y + previousOffset.y * previousOffsetMultiplier
        );
        ctx.stroke();
        previousPos = {
            x: currentPos.x + offset.x + previousOffset.x * previousOffsetMultiplier,
            y: currentPos.y + offset.y + previousOffset.y * previousOffsetMultiplier,
        };
        previousOffset = {
            x: offset.x + previousOffset.x * previousOffsetMultiplier,
            y: offset.y + previousOffset.y * previousOffsetMultiplier,
        };
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.001)';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}
/////////////////// FIRST VERSION //////////////////////
// let x = mouse.x,
//     y = mouse.y;
// width = Math.random() * 2,
// height = Math.random() * 100;

// ctx.save();
// ctx.translate(x, y);
// ctx.rotate(((Math.PI * 180) / Math.random()) * 25);
// ctx.translate(-x, -y);
// ctx.fillStyle = 'white';
// ctx.fillRect(x, y, width, height);
// ctx.restore();

canvas.addEventListener('mousemove', updateMousePosition);
canvas.addEventListener('mousedown', mouseHoldingOn);
canvas.addEventListener('mouseup', newRestorePoint);

container.addEventListener('mouseleave', (e) => {
    if (mouseHolding == true) {
        newRestorePoint();
        mouseHolding = false;
    }
});

function mouseHoldingOn() {
    mouseHolding = true;
}
function updateMousePosition(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (mouseHolding) draw();
}
function newRestorePoint() {
    mouseHolding = false;
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
    setDimentions();
    canvas.classList.add('canvas');
    container.appendChild(canvas);
    canvasArr.push(canvas);
    addCanvasListeners(canvas);
}
export function undo() {
    if (canvasArr[canvasArr.length - 2]) {
        canvasArr[canvasArr.length - 1].remove();
        canvasArr.pop();
    }
    canvasArr[canvasArr.length - 1].remove();
    canvasArr.pop();
    newRestorePoint();
}

function addCanvasListeners(canvas) {
    canvas.addEventListener('mousemove', updateMousePosition);
    canvas.addEventListener('mousedown', mouseHoldingOn);
    canvas.addEventListener('mouseup', newRestorePoint);
}

export function clearAllCanvas() {
    container.innerHTML = '';
    canvasArr = [];
    newRestorePoint();
}
