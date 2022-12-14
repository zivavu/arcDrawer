import { clearAllCanvas, undo } from './canvas.js';
const initialMesage = document.getElementById('initial-message');

const setingsOpenButton = document.getElementById('settings-show-button');
const settingsCloseButton = document.getElementById('settings-hide-button');
const settingsMenuElement = document.getElementById('settings-menu');
const settingsArcButton = document.getElementById('arc-settings-button');
const settingsShadowButton = document.getElementById('shadow-settings-button');
const arcSettingsContainer = document.getElementById('arc-settings');

const shadowSettingsContainer = document.getElementById('shadow-settings');
const shadowEnableCheckbox = document.getElementById('shadow-enable-checkbox');
const shadowOffsetRange = document.getElementById('shadow-offset-range');
const shadowBlurRange = document.getElementById('shadow-blur-range');
const shadowColorPicker = document.getElementById('shadow-color-picker');
const shadowColorFromArcCheckbox = document.getElementById('shadow-color-from-arc-checkbox');

const lineWidthRange = document.getElementById('line-width-range');
const blurRange = document.getElementById('blur-range');
const lineDecayRange = document.getElementById('line-decay-range');
const prevOffsetMultiplierRange = document.getElementById('prev-offset-multiplier-range');
const strokesNumberRange = document.getElementById('strokes-number-range');
const offsetWeightRange = document.getElementById('offset-weight-range');

const colorInput = document.getElementById('color-picker');
const hueRandomizeRange = document.getElementById('hue-randomize-range');
const saturationRange = document.getElementById('saturation-range');

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

export let isShadowEnabled = false;
shadowEnableCheckbox.checked = isShadowEnabled;
shadowEnableCheckbox.addEventListener('change', shadowEnableSwitch);
function shadowEnableSwitch() {
    isShadowEnabled = shadowEnableCheckbox.checked;
    shadowBlurRange.disabled = !isShadowEnabled;
    shadowColorPicker.disabled = !isShadowEnabled;
    shadowColorFromArcCheckbox.disabled = !isShadowEnabled;
    shadowOffsetRange.disabled = !isShadowEnabled;
}
shadowEnableSwitch();

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
    shadowColor = e.target.value;
}

shadowColorFromArcCheckbox.checked = false;
shadowColorFromArcCheckbox.addEventListener('change', shadowColorFromArc);
function shadowColorFromArc(e) {
    if (e.target.checked == true) {
        shadowColorPicker.disabled = true;
        shadowColor = newShade(arcColor, -50);
    } else shadowColorPicker.disabled = false;
}
function newShade(hexColor, magnitude) {
    hexColor = hexColor.replace(`#`, ``);
    if (hexColor.length === 6) {
        const decimalColor = parseInt(hexColor, 16);
        let r = (decimalColor >> 16) + magnitude;
        r > 255 && (r = 255);
        r < 0 && (r = 0);
        let g = (decimalColor & 0x0000ff) + magnitude;
        g > 255 && (g = 255);
        g < 0 && (g = 0);
        let b = ((decimalColor >> 8) & 0x00ff) + magnitude;
        b > 255 && (b = 255);
        b < 0 && (b = 0);
        return `#${(g | (b << 8) | (r << 16)).toString(16)}`;
    } else {
        return hexColor;
    }
}

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
export let lineDecay = 1.5;
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

export let arcColor = '#FFFFFF';
colorInput.value = arcColor;
colorInput.addEventListener('change', updateArcColor);
function updateArcColor(e) {
    arcColor = e.target.value;
    if (shadowEnableCheckbox.checked && shadowColorFromArcCheckbox.checked) {
        shadowColor = newShade(arcColor, -50);
        shadowColorPicker.value = shadowColor;
        ``;
    }
}

export let hueRandomize = 0;
hueRandomizeRange.value = hueRandomize;
hueRandomizeRange.addEventListener('change', setColorRandomize);
function setColorRandomize(e) {
    hueRandomize = e.target.value;
}

export let saturation = 100;
saturationRange.value = saturation;
saturationRange.addEventListener('change', setSaturationRandomize);
function setSaturationRandomize(e) {
    saturation = e.target.value;
}

let brushArr = [];
saveBrushButton.addEventListener('click', saveBrush);
function saveBrush() {
    if (brushArr.length >= 8) return;
    let brush = {
        number: brushArr.length,
        lineWidth: lineWidth,
        strokesNumber: strokesNumber,
        lineDecay: lineDecay,
        offsetWeight: offsetWeight,
        previousOffsetMultiplier: previousOffsetMultiplier,
        blur: blur,
        arcColor: arcColor,
        shadowBaseOffset: shadowBaseOffset,
        shadowBlur: shadowBlur,
        shadowColor: shadowColor,
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
    shadowBaseOffset = selectedBrush.shadowBaseOffset;
    shadowBlur = selectedBrush.shadowBlur;

    blurRange.value = selectedBrush.blur;
    prevOffsetMultiplierRange.value = selectedBrush.previousOffsetMultiplier;
    offsetWeightRange.value = selectedBrush.offsetWeight;
    lineDecayRange.value = selectedBrush.lineDecay;
    lineWidthRange.value = selectedBrush.lineWidth;
    strokesNumberRange.value = selectedBrush.strokesNumber;
    shadowColorPicker.value = selectedBrush.shadowColor;
    shadowOffsetRange.value = selectedBrush.shadowBaseOffset;
    shadowBlurRange.value = selectedBrush.shadowBlur;
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
        if (initialMesage) initialMesage.remove();
        e.preventDefault();
        clearAllCanvas();
    }
    if (e.key === 'c') {
        e.preventDefault();
        colorInput.showPicker();
    }
};

//God have mercy
var keyMap = new Map();
document.onkeydown = onkeyup = function (e) {
    if (!e.key.match(/Arrow/)) return;

    keyMap.set(e.key, e.type == 'keydown');

    let pressedKeys = 0;
    keyMap.forEach((value) => {
        if (value == true) pressedKeys++;
    });

    if (e.type == 'keyup') return;
    if (keyMap.get('ArrowUp') && keyMap.get('ArrowLeft')) {
        shadowYOffset = -shadowBaseOffset;
        shadowXOffset = -shadowBaseOffset;
    }
    if (keyMap.get('ArrowDown') && keyMap.get('ArrowLeft')) {
        shadowXOffset = -shadowBaseOffset;
        shadowYOffset = shadowBaseOffset;
    }
    if (keyMap.get('ArrowUp') && keyMap.get('ArrowRight')) {
        shadowXOffset = shadowBaseOffset;
        shadowYOffset = -shadowBaseOffset;
    }
    if (keyMap.get('ArrowDown') && keyMap.get('ArrowRight')) {
        shadowYOffset = shadowBaseOffset;
        shadowXOffset = shadowBaseOffset;
    }

    if (pressedKeys >= 2) return;

    if (keyMap.get('ArrowUp')) {
        shadowYOffset = -shadowBaseOffset;
        shadowXOffset = 0;
    }
    if (keyMap.get('ArrowDown')) {
        shadowYOffset = shadowBaseOffset;
        shadowXOffset = 0;
    }
    if (keyMap.get('ArrowLeft')) {
        shadowXOffset = -shadowBaseOffset;
        shadowYOffset = 0;
    }
    if (keyMap.get('ArrowRight')) {
        shadowXOffset = shadowBaseOffset;
        shadowYOffset = 0;
    }
};
