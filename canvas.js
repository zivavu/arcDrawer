import {
    arcColor,
    blur,
    hueRandomize,
    isShadowEnabled,
    lineDecay,
    lineWidth,
    offsetWeight,
    previousOffsetMultiplier,
    saturation,
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
    console.log(ctx.filter);

    let randomHueDeg = Math.round(Math.random() * hueRandomize) - hueRandomize / 2;

    ctx.filter = `blur(${blur}px)`;
    ctx.filter += `hue-rotate(${randomHueDeg}deg)`;
    ctx.filter += `saturate(${saturation}%)`;

    if (isShadowEnabled) {
        ctx.shadowColor = shadowColor;
        ctx.shadowOffsetX = shadowXOffset;
        ctx.shadowOffsetY = shadowYOffset;
        ctx.shadowBlur = shadowBlur;
    }

    ctx.strokeStyle = arcColor;
    ctx.beginPath();

    ctx.lineWidth = lineWidth;
    for (let i = 0; i < strokesNumber; i++) {
        ctx.lineWidth = ctx.lineWidth - ((previousLineWidth * Math.random()) / 3) * lineDecay;
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
        previousLineWidth = ctx.lineWidth;
    }
    ctx.closePath();
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
    if (canvasArr.length >= 10) restorePointsLimiter();
}
let enableRestoreLimit = false;
function restorePointsLimiter() {
    enableRestoreLimit = true;
    let firstCanvas = canvasArr[0];
    let secondCanvas = canvasArr[1];

    let tempCanvas = document.createElement('canvas');
    tempCanvas.classList.add('canvas');

    let tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = window.innerWidth;
    tempCanvas.height = window.innerHeight;

    tempCtx.drawImage(firstCanvas, 0, 0);
    tempCtx.drawImage(secondCanvas, 0, 0);

    container.insertBefore(tempCanvas, container.firstChild);
    canvasArr.shift();
    canvasArr[0] = tempCanvas;
    firstCanvas.remove();
    secondCanvas.remove();
}

export function undo() {
    if (enableRestoreLimit && !canvasArr[canvasArr.length - 3]) return;
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
    enableRestoreLimit = false;
}
