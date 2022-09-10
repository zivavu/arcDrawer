import { clearAllCanvas, undo } from './canvas.js';
const canvasContainer = document.createElement('container');

const setingsOpenButton = document.getElementById('settings-show-button');
const settingsCloseButton = document.getElementById('settings-hide-button');
const settingsMenuElement = document.getElementById('settings-menu');
const settingsArcButton = document.getElementById('arc-settings-button');
const settingsShadowButton = document.getElementById('shadow-settings-button');
const arcSettingsContainer = document.getElementById('arc-settings');

const shadowSettingsContainer = document.getElementById('shadow-settings');
const shadowOffsetRange = document.getElementById('shadow-offset-range');
const shadowBlurRange = document.getElementById('shadow-blur-range');
const shadowColorPicker = document.getElementById('shadow-color-picker');
const ShadowColorRandomizeCheckbox = document.getElementById('shadow-color-randomize-checkbox');

const lineWidthRange = document.getElementById('line-width-range');
const blurRange = document.getElementById('blur-range');
const lineDecayRange = document.getElementById('line-decay-range');
const prevOffsetMultiplierRange = document.getElementById('prev-offset-multiplier-range');
const strokesNumberRange = document.getElementById('strokes-number-range');
const offsetWeightRange = document.getElementById('offset-weight-range');

const colorInput = document.getElementById('color-picker');

const savedArcsContainer = document.getElementById('saved-brushes');
const saveBrushButton = document.getElementById('save-brush-button');

setingsOpenButton.addEventListener('click', showSettingsMenu);
function showSettingsMenu() {
    settingsMenuElement.style.animation = 'settings-forward 1s';
    settingsMenuElement.style.animationFillMode = 'forwards';
}

settingsCloseButton.addEventListener('click', hideSettingsMenu);
function hideSettingsMenu() {
    settingsMenuElement.style.animation = 'settings-backwards 1s';
    settingsMenuElement.style.animationFillMode = 'forwards';
}

settingsShadowButton.addEventListener('click', showShadowSettings);
function showShadowSettings() {
    shadowSettingsContainer.style.gridColumn = '1';
    arcSettingsContainer.style.gridColumn = '2';
}
settingsArcButton.addEventListener('click', showArcSettings);
function showArcSettings() {
    arcSettingsContainer.style.gridColumn = '1';
    shadowSettingsContainer.style.gridColumn = '2';
}

export let shadowBaseOffset = 60,
    shadowYOffset = 0,
    shadowXOffset = 0;

shadowOffsetRange.value = shadowBaseOffset;
shadowOffsetRange.addEventListener('change', updateShadowOffset);
function updateShadowOffset(e) {
    shadowBaseOffset = e.target.value;
}

export let shadowBlur = 0;
shadowBlurRange.value = shadowBlur;
shadowBlurRange.addEventListener('change', updateShadowBlur);
function updateShadowBlur(e) {
    shadowBlur = e.target.value;
}

export let shadowColor = '#FFFFFF';
shadowColorPicker.value = shadowColor;
shadowColorPicker.addEventListener('input', updateShadowColor);
function updateShadowColor(e) {
    console.log(e.target.value);
    shadowColor = e.target.value;
}

ShadowColorRandomizeCheckbox.addEventListener('change', switchShadowColorRandomizing);
function switchShadowColorRandomizing(e) {}

export let blur = 3;
blurRange.value = blur;
blurRange.addEventListener('change', updateBlur);
function updateBlur(e) {
    blur = e.target.value;
}
export let previousOffsetMultiplier = 1.3;
prevOffsetMultiplierRange.value = previousOffsetMultiplier;
prevOffsetMultiplierRange.addEventListener('change', updatePrevOffsetMultiplier);
function updatePrevOffsetMultiplier(e) {
    console.log(prevOffsetMultiplierRange.value);
    previousOffsetMultiplier = e.target.value;
}
export let lineWidth = 1;
lineWidthRange.value = lineWidth;
lineWidthRange.addEventListener('change', updateLineWidth);

function updateLineWidth(e) {
    let withInput = e.target.value;
    if (withInput > 1) withInput = Math.pow(withInput, 4);
    lineWidth = withInput;
}
export let lineDecay = 0;
lineDecayRange.value = lineDecay;
lineDecayRange.addEventListener('change', updateLineDecay);
function updateLineDecay(e) {
    lineDecay = e.target.value;
}

export let strokesNumber = 7;
strokesNumberRange.value = strokesNumber;
strokesNumberRange.addEventListener('change', updateStrokesNumber);
function updateStrokesNumber(e) {
    strokesNumber = e.target.value;
}

export let offsetWeight = 40;
offsetWeightRange.value = offsetWeight;
offsetWeightRange.addEventListener('change', updateOffsetWeight);
function updateOffsetWeight(e) {
    offsetWeight = e.target.value;
}

export let arcColor = 'white';
colorInput.value = '#FFFFFF';
colorInput.addEventListener('change', updateArcColor);
function updateArcColor(e) {
    arcColor = e.target.value;
}

let brushArr = [];
saveBrushButton.addEventListener('click', saveBrush);
function saveBrush() {
    let brush = {
        number: brushArr.length,
        lineWidth: lineWidth,
        strokesNumber: strokesNumber,
        lineDecay: lineDecay,
        offsetWeight: offsetWeight,
        previousOffsetMultiplier: previousOffsetMultiplier,
        blur: blur,
        arcColor: arcColor,
        node: document.createElement('div'),
    };
    brushArr.push(brush);
    brush.node.classList.add('saved-brush');
    brush.node.innerText = brushArr.length;
    anotherSavedBrushRowCheck();
    showSavedBrushes();
}
function showSavedBrushes() {
    let newBrush = brushArr[brushArr.length - 1];
    newBrush.node.style.backgroundColor = newBrush.arcColor;
    savedArcsContainer.appendChild(newBrush.node);
    newBrush.node.addEventListener('click', selectBrush);
}
let currentRows = 0;
function anotherSavedBrushRowCheck() {
    if (Math.ceil(brushArr.length / 4) > currentRows) {
        currentRows++;
        savedArcsContainer.style.gridTemplateRows = `repeat(${currentRows}, 5h)`;
    }
}

function selectBrush(e) {
    let brushNumber = e.target.innerText * 1;
    let selectedBrush = brushArr[brushNumber - 1];
    stylingSelectedBrust(e.target);

    previousOffsetMultiplier = selectedBrush.previousOffsetMultiplier;
    offsetWeight = selectedBrush.offsetWeight;
    lineDecay = selectedBrush.lineDecay;
    lineWidth = selectedBrush.lineWidth;
    strokesNumber = selectedBrush.strokesNumber;
    arcColor = selectedBrush.arcColor;

    blurRange.value = selectedBrush.blur;
    prevOffsetMultiplierRange.value = selectedBrush.previousOffsetMultiplier;
    offsetWeightRange.value = selectedBrush.offsetWeight;
    lineDecayRange.value = selectedBrush.lineDecay;
    lineWidthRange.value = selectedBrush.lineWidth;
    strokesNumberRange.value = selectedBrush.strokesNumber;
    colorInput.value = selectedBrush.arcColor;
}

function stylingSelectedBrust(selectedBrushNode) {
    brushArr.forEach((brush) => {
        brush.node.classList.remove('saved-brush-selected');
    });
    selectedBrushNode.classList.add('saved-brush-selected');
}

//// Shortcuts/////

window.onkeydown = (e) => {
    if (e.key === 'z' && e.ctrlKey) {
        e.preventDefault();
        undo();
    }
    if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        clearAllCanvas();
    }
    if (e.key === 'c') {
        e.preventDefault();
        colorInput.showPicker();
    }
};

document.onkeydown = (e) => {
    switch (e.key) {
        case 'c':
            e.preventDefault();
            colorInput.showPicker();
            break;
        case 'ArrowUp':
            shadowYOffset = -shadowBaseOffset;
            shadowXOffset = 0;
            break;
        case 'ArrowDown':
            shadowYOffset = shadowBaseOffset;
            shadowXOffset = 0;
            break;
        case 'ArrowLeft':
            shadowXOffset = -shadowBaseOffset;
            shadowYOffset = 0;
            break;
        case 'ArrowRight':
            shadowXOffset = shadowBaseOffset;
            shadowYOffset = 0;
            break;
    }
};
