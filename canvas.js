import {
    arcColor,
    blur,
    colorRandomizeValue,
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

    if (colorRandomizeValue > 0) {
        let newColor = newShade(arcColor, colorRandomizeValue);
        ctx.strokeStyle = newColor;
    } else ctx.strokeStyle = arcColor;

    ctx.beginPath();

    if (isShadowEnabled) {
        ctx.shadowColor = shadowColor;
        ctx.shadowOffsetX = shadowXOffset;
        ctx.shadowOffsetY = shadowYOffset;
        ctx.shadowBlur = shadowBlur;
    }
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

function applyFilters(canvas) {
    canvas.style.filter = `blur(${blur}px)`;
}

export function newShade(hexColor, magnitude) {
    let half = magnitude / 2;
    hexColor = hexColor.replace(`#`, ``);
    if (hexColor.length === 6) {
        const decimalColor = parseInt(hexColor, 16);
        let r = (decimalColor >> 16) + Math.round(Math.random() * magnitude) - half;
        r > 255 && (r = 255);
        r < 0 && (r = 0);
        let g = (decimalColor & 0x0000ff) + Math.round(Math.random() * magnitude) - half;
        g > 255 && (g = 255);
        g < 0 && (g = 0);
        let b = ((decimalColor >> 8) & 0x00ff) + Math.round(Math.random() * magnitude) - half;
        b > 255 && (b = 255);
        b < 0 && (b = 0);
        return `#${(g | (b << 8) | (r << 16)).toString(16)}`;
    } else {
        return hexColor;
    }
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
    applyFilters(canvas);
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
