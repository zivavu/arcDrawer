const setingsOpenButton = document.getElementById('settings-show-button');
const settingsCloseButton = document.getElementById('settings-hide-button');
const settingsMenuElement = document.getElementById('settings-menu');

const lineWidthRange = document.getElementById('line-width');
const blurRange = document.getElementById('blur-range');
const prevOffsetMultiplierRange = document.getElementById('prev-offset-multiplier-range');

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
prevOffsetMultiplierRange.addEventListener('change', updatePrevOffsetMultiplier);
function updatePrevOffsetMultiplier(e) {
    previousOffsetMultiplier = e.target.value;
}
export let lineWidth = 2;
lineWidthRange.value = lineWidth;
lineWidthRange.addEventListener('change', updateLineWidth);
function updateLineWidth(e) {
    console.log(e.target.value);
    lineWidth = e.target.value;
}
