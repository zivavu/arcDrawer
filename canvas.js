const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	draw();
});

let mouseHolding = false;
let mouse = {
	x: 0,
	y: 0,
};

function draw(e) {
	ctx.fillStyle = 'white';
	ctx.fillRect(mouse.x - 25, mouse.y - 25, 50, 50);
}

canvas.addEventListener('click', draw);
canvas.addEventListener('mousemove', updateMousePosition);
canvas.addEventListener('mousedown', () => (mouseHolding = true));
canvas.addEventListener('mouseup', () => (mouseHolding = false));

function updateMousePosition(e) {
	mouse.x = e.clientX;
	mouse.y = e.clientY;
	if (mouseHolding) draw();
}
