const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
});

let mouseHolding = false;
let mouse = {
	x: 0,
	y: 0,
};

function draw() {
	let x = mouse.x,
		y = mouse.y,
		width = Math.random() * 2,
		height = Math.random() * 100;

	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(((Math.PI * 180) / Math.random()) * 25);
	ctx.translate(-x, -y);
	ctx.fillStyle = 'white';
	ctx.fillRect(x, y, width, height);
	ctx.restore();
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
