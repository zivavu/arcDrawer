const setingsOpenButton = document.getElementById('settings-show-button');
const settingsCloseButton = document.getElementById('settings-hide-button');
const settingsMenuElement = document.getElementById('settings-menu');

const lineWidthRange = document.getElementById('line-width-range');
const blurRange = document.getElementById('blur-range');
const prevOffsetMultiplierRange = document.getElementById('prev-offset-multiplier-range');
const strokesNumberRange = document.getElementById('strokes-number-range');
const offsetWeightRange = document.getElementById('offset-weight-range');

const colorInput = document.getElementById('color-picker');

const savedArcsContainer = document.getElementById('saved-arcs');
const saveArcButton = document.getElementById('save-arc-button');

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
    lineWidth = e.target.value;
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

let arcArr = [];
saveArcButton.addEventListener('click', saveArc);
function saveArc() {
    let arc = {
        number: arcArr.length,
        lineWidth: lineWidth,
        strokesNumber: strokesNumber,
        offsetWeight: offsetWeight,
        previousOffsetMultiplier: previousOffsetMultiplier,
        blur: blur,
        arcColor: arcColor,
        node: document.createElement('div'),
    };
    arcArr.push(arc);
    arc.node.classList.add('saved-arc');
    arc.node.innerText = arcArr.length;
    anotherSavedArcsRowCheck();
    showSavedArcs();
}
function showSavedArcs() {
    arcArr.forEach((arc) => {
        arc.node.style.backgroundColor = arc.arcColor;
        savedArcsContainer.appendChild(arc.node);
        arc.node.addEventListener('click', selectBrush);
    });
}
let currentRows = 0;
function anotherSavedArcsRowCheck() {
    if (Math.ceil(arcArr.length / 4) > currentRows) {
        currentRows++;
        savedArcsContainer.style.gridTemplateRows = `repeat(${currentRows}, 5h)`;
    }
}

function selectBrush(e) {
    let brushNumber = e.target.innerText * 1;
    let selectedBrush = arcArr[brushNumber - 1];

    blur = selectedBrush.blur;
    previousOffsetMultiplier = selectedBrush.previousOffsetMultiplier;
    offsetWeight = selectedBrush.offsetWeight;
    lineWidth = selectedBrush.lineWidth;
    strokesNumber = selectedBrush.strokesNumber;
    arcColor = selectedBrush.arcColor;

    blurRange.value = selectedBrush.blur;
    prevOffsetMultiplierRange.value = selectedBrush.previousOffsetMultiplier;
    offsetWeightRange.value = selectedBrush.offsetWeight;
    lineWidthRange.value = selectedBrush.lineWidth;
    strokesNumberRange.value = selectedBrush.strokesNumber;
    colorInput.value = selectedBrush.arcColor;
}
