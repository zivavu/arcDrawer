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
	let offsetWeight = 30;
	let previousOffsetMultiplier = 1.4;
	let strokesNumber = Math.ceil(Math.random() * 10);

	let currentPos = {
		x: mouse.x,
		y: mouse.y,
	};
	let previousPos = {
		x: mouse.x,
		y: mouse.y,
	};
	let previousOffset = { x: 0, y: 0 };

	ctx.strokeStyle = 'white';
	ctx.beginPath();
	for (let i = 0; i < strokesNumber; i++) {
		ctx.lineWidth = Math.random() * 1.3;
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
	}
	ctx.closePath();
	ctx.filter = 'blur(0.7px)';
	ctx.fillStyle = 'rgba(0, 0, 0, 0.001)';
	ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}
/////////////////// FIRST VERSION //////////////////////
// let x = mouse.x,
//     y = mouse.y;
// width = Math.random() * 2,
// height = Math.random() * 100;

// ctx.save();
// ctx.translate(x, y);
// ctx.rotate(((Math.PI * 180) / Math.random()) * 25);
// ctx.translate(-x, -y);
// ctx.fillStyle = 'white';
// ctx.fillRect(x, y, width, height);
// ctx.restore();

canvas.addEventListener('click', draw);
canvas.addEventListener('mousemove', updateMousePosition);
canvas.addEventListener('mousedown', () => (mouseHolding = true));
canvas.addEventListener('mouseup', () => (mouseHolding = false));
canvas.addEventListener('mouseleave', (e) => {
	if (
		e.clientY <= 0 ||
		e.clientX <= 0 ||
		e.clientX >= window.innerWidth ||
		e.clientY >= window.innerHeight
	) {
		mouseHolding = false;
	}
});

function updateMousePosition(e) {
	mouse.x = e.clientX;
	mouse.y = e.clientY;
	if (mouseHolding) draw();
}
