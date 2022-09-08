const setingsOpenButton = document.getElementById('settings-show-button');
const settingsCloseButton = document.getElementById('settings-hide-button');
const settingsMenuElement = document.getElementById('settings-menu');

const lineWidthRange = document.getElementById('line-width-range');
const blurRange = document.getElementById('blur-range');
const prevOffsetMultiplierRange = document.getElementById(
	'prev-offset-multiplier-range'
);
const strokesNumberRange = document.getElementById('strokes-number-range');
const offsetWeightRange = document.getElementById('offset-weight-range');
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

export let blur = 0;
blurRange.value = blur;
blurRange.addEventListener('change', updateBlur);
function updateBlur(e) {
	blur = e.target.value;
}
export let previousOffsetMultiplier = 1.3;
prevOffsetMultiplierRange.value = previousOffsetMultiplier;
prevOffsetMultiplierRange.addEventListener(
	'change',
	updatePrevOffsetMultiplier
);
function updatePrevOffsetMultiplier(e) {
	previousOffsetMultiplier = e.target.value;
}
export let lineWidth = 2;
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

let arcArr = [];
saveArcButton.addEventListener('click', saveArc);

function saveArc() {
	let arc = {
		lineWidth: lineWidth,
		strokesNumber: strokesNumber,
		offsetWeight: offsetWeight,
		previousOffsetMultiplier: previousOffsetMultiplier,
		blur: blur,
		node: document.createElement('div'),
	};
	arc.node.classList.add('saved-arc');
	arcArr.push(arc);
	showSavedArcs();
}
const savedArcsContainer = document.getElementById('saved-arcs');
function showSavedArcs() {
	arcArr.forEach((arc) => {
		savedArcsContainer.appendChild(arc.node);
	});
}
