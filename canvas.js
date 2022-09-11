import {
    arcColor,
    blur,
    isShadowEnabled,
    lineDecay,
    lineWidth,
    offsetWeight,
    previousOffsetMultiplier,
    shadowBlur,
    shadowColor,
    shadowXOffset,
    shadowYOffset,
    strokesNumber,
} from './settings.js';

const container = document.getElementById('canvas-container');
const settingsMenuElement = document.getElementById('settings-menu');

let canvas = document.querySelector('.canvas');
let ctx = canvas.getContext('2d');
let canvasArr = [canvas];

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', setDimentions);
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
    let offScreenCanvas = document.createElement('canvas');
    let offCtx = offScreenCanvas.getContext('2d');
    offScreenCanvas.width = canvas.width;
    offScreenCanvas.height = canvas.height;
    let currentPos = {
        x: mouse.x,
        y: mouse.y,
    };
    let previousPos = {
        x: mouse.x,
        y: mouse.y,
    };
    let previousOffset = { x: 0, y: 0 };
    let previousLineWidth = 0;
    offCtx.strokeStyle = arcColor;
    offCtx.beginPath();
    if (isShadowEnabled) {
        offCtx.shadowColor = shadowColor;
        offCtx.shadowOffsetX = shadowXOffset;
        offCtx.shadowOffsetY = shadowYOffset;
        offCtx.shadowBlur = shadowBlur;
    }
    offCtx.lineWidth = lineWidth;
    for (let i = 0; i < strokesNumber; i++) {
        offCtx.lineWidth = offCtx.lineWidth - ((previousLineWidth * Math.random()) / 3) * lineDecay;
        offCtx.moveTo(previousPos.x, previousPos.y);
        let offset = {
            x: Math.random() * offsetWeight - offsetWeight / 2,
            y: Math.random() * offsetWeight - offsetWeight / 2,
        };
        offCtx.lineTo(
            currentPos.x + offset.x + previousOffset.x * previousOffsetMultiplier,
            currentPos.y + offset.y + previousOffset.y * previousOffsetMultiplier
        );
        offCtx.stroke();
        previousPos = {
            x: currentPos.x + offset.x + previousOffset.x * previousOffsetMultiplier,
            y: currentPos.y + offset.y + previousOffset.y * previousOffsetMultiplier,
        };
        previousOffset = {
            x: offset.x + previousOffset.x * previousOffsetMultiplier,
            y: offset.y + previousOffset.y * previousOffsetMultiplier,
        };
        previousLineWidth = offCtx.lineWidth;
    }
    offCtx.closePath();
    ctx.drawImage(offScreenCanvas, 0, 0);
    canvas.style.webkitFilter = `blur(${blur}px)`;
}

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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
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
