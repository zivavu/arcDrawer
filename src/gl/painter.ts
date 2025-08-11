import { createProgram } from './utils';

export type StrokeSettings = {
	strokesNumber: number;
	baseLineWidth: number;
	lineDecay: number;
	offsetWeight: number;
	previousOffsetMultiplier: number;
	color: [number, number, number, number];
	hueRandomize: number;
	blurSigmaPx: number; // gaussian sigma in pixels across width
	blurJitter: number; // 0..1 randomization factor
};

type RenderTarget = {
	fbo: WebGLFramebuffer;
	tex: WebGLTexture;
	width: number;
	height: number;
};

function createRenderTarget(
	gl: WebGL2RenderingContext,
	width: number,
	height: number
): RenderTarget {
	const tex = gl.createTexture()!;
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA8,
		width,
		height,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		null
	);

	const fbo = gl.createFramebuffer()!;
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER,
		gl.COLOR_ATTACHMENT0,
		gl.TEXTURE_2D,
		tex,
		0
	);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	return { fbo, tex, width, height };
}

const BRUSH_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 position; // base quad -0.5..0.5
layout(location=1) in vec2 aCenter;  // px
layout(location=2) in vec2 aSize;    // px (length,width)
layout(location=3) in float aAngle;  // radians
layout(location=4) in vec4 aColor;   // premultiplied RGBA
layout(location=5) in float aSigmaPx; // gaussian sigma in pixels (across width)

uniform vec2 uResolution;

out vec2 vLocal;
out vec4 vColor;
out float vSigma; // gaussian sigma in local units

void main(){
  vec2 local = position * aSize; // scale to segment size in px
  float c = cos(aAngle), s = sin(aAngle);
  vec2 rotated = vec2(local.x*c - local.y*s, local.x*s + local.y*c);
  vec2 pos = aCenter + rotated;
  vec2 ndc = (pos / uResolution) * 2.0 - 1.0;
  ndc.y = -ndc.y; // canvas-like coords
  gl_Position = vec4(ndc,0.0,1.0);
  vLocal = local / (0.5 * aSize);
  // convert pixel sigma to local coordinates based on width
  float halfWidthPx = max(1.0, 0.5 * aSize.y);
  vSigma = max(0.001, aSigmaPx / halfWidthPx);
  vColor = aColor;
}`;

const BRUSH_FS = `#version 300 es
precision highp float;
in vec2 vLocal; // -1..1
in vec4 vColor; // premultiplied
in float vSigma; // not used here; blur handled by separable pass
out vec4 outColor;

// Hard-edged capsule with analytic antialiasing; width is exact.
void main(){
  vec2 p = vLocal; // -1..1 box in both axes
  float ax = abs(p.x);
  float ay = abs(p.y);
  float d;
  if (ax <= 1.0) {
    d = ay - 1.0; // distance outside across width
  } else {
    d = length(vec2(ax - 1.0, ay)) - 1.0; // distance outside rounded cap
  }
  float aa = fwidth(d) + 1e-4; // antialiasing width in screen space
  float alpha = 1.0 - smoothstep(0.0, aa, d);
  outColor = vec4(vColor.rgb, 1.0) * alpha;
}`;

const BLIT_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 position;
out vec2 vUv;
void main(){
  vUv = (position + 1.0) * 0.5;
  gl_Position = vec4(position,0.0,1.0);
}`;

const BLIT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uResolution;
uniform float uBlur;       // disabled (legacy)
uniform float uSaturation; // 0..2
uniform float uHue;        // degrees

vec3 hueRotate(vec3 c, float hue){
  float a = radians(hue);
  float s = sin(a), co = cos(a);
  mat3 m = mat3(
    0.213+0.787*co-0.213*s, 0.715-0.715*co-0.715*s, 0.072-0.072*co+0.928*s,
    0.213-0.213*co+0.143*s, 0.715+0.285*co+0.140*s, 0.072-0.072*co-0.283*s,
    0.213-0.213*co-0.787*s, 0.715-0.715*co+0.715*s, 0.072+0.928*co+0.072*s
  );
  return c * m;
}

void main(){
  vec4 c = texture(uTex, vUv);
  float l = dot(c.rgb, vec3(0.2126,0.7152,0.0722));
  c.rgb = mix(vec3(l), c.rgb, uSaturation);
  c.rgb = hueRotate(c.rgb, uHue);
  outColor = c;
}`;

// Present with optional glow: combine base and blurred glow texture
const COMPOSE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uBase;
uniform sampler2D uGlow;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform float uHue;

vec3 hueRotate(vec3 c, float hue){
  float a = radians(hue);
  float s = sin(a), co = cos(a);
  mat3 m = mat3(
    0.213+0.787*co-0.213*s, 0.715-0.715*co-0.715*s, 0.072-0.072*co+0.928*s,
    0.213-0.213*co+0.143*s, 0.715+0.285*co+0.140*s, 0.072-0.072*co-0.283*s,
    0.213-0.213*co-0.787*s, 0.715-0.715*co+0.715*s, 0.072+0.928*co+0.072*s
  );
  return c * m;
}

void main(){
  vec4 base = texture(uBase, vUv);
  vec4 glow = texture(uGlow, vUv);
  vec4 c = base + uGlowIntensity * glow;
  float l = dot(c.rgb, vec3(0.2126,0.7152,0.0722));
  c.rgb = mix(vec3(l), c.rgb, uSaturation);
  c.rgb = hueRotate(c.rgb, uHue);
  outColor = c;
}`;

// Separable 1D gaussian blur shader (premultiplied alpha safe)
const GAUSS_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uResolution;
uniform vec2 uDirection; // (1,0) or (0,1)
uniform float uSigma;    // blur radius (pixels)

float gauss(float x, float sigma){
  return exp(-0.5 * (x*x) / (sigma*sigma));
}

void main(){
  if (uSigma <= 0.0) { outColor = texture(uTex, vUv); return; }
  vec2 texel = 1.0 / uResolution;
  float sigma = max(uSigma, 0.0001);
  int MAX_RADIUS = 32;
  int R = int(min(ceil(3.0 * sigma), float(MAX_RADIUS)));

  vec4 sum = texture(uTex, vUv) * gauss(0.0, sigma);
  float norm = gauss(0.0, sigma);

  for (int i = 1; i <= 32; i++) {
    if (i > R) break;
    float w = gauss(float(i), sigma);
    vec2 off = uDirection * (float(i) * texel);
    sum += (texture(uTex, vUv + off) + texture(uTex, vUv - off)) * w;
    norm += 2.0 * w;
  }
  outColor = sum / norm;
}`;

export class Painter {
	private gl: WebGL2RenderingContext;
	private quadVao: WebGLVertexArrayObject;
	private quadVbo: WebGLBuffer;
	private instVbo: WebGLBuffer;

	private brushProgram: WebGLProgram;
	private brushLocResolution: WebGLUniformLocation;

	private blitProgram: WebGLProgram;
	private blitLocRes: WebGLUniformLocation;
	private blitLocBlur: WebGLUniformLocation;
	private blitLocSat: WebGLUniformLocation;
	private blitLocHue: WebGLUniformLocation;

	private gaussProgram: WebGLProgram;
	private gaussLocRes: WebGLUniformLocation;
	private gaussLocDir: WebGLUniformLocation;
	private gaussLocSigma: WebGLUniformLocation;

  private composeProgram: WebGLProgram;
  private composeGlowIntensity: WebGLUniformLocation;
  private composeSat: WebGLUniformLocation;
  private composeHue: WebGLUniformLocation;

	private target: RenderTarget;
	private scratchA: RenderTarget;
	private scratchB: RenderTarget;
	private restore: RenderTarget[] = [];
	private redoStack: RenderTarget[] = []; // Add redo stack

	constructor(gl: WebGL2RenderingContext, width: number, height: number) {
		this.gl = gl;

		// geometry for brush (unit quad -0.5..0.5)
		this.quadVao = gl.createVertexArray()!;
		gl.bindVertexArray(this.quadVao);
		this.quadVbo = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
		const brushQuad = new Float32Array([
			-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
		]);
		gl.bufferData(gl.ARRAY_BUFFER, brushQuad, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		this.instVbo = gl.createBuffer()!;

		// brush
		this.brushProgram = createProgram(gl, BRUSH_VS, BRUSH_FS);
		this.brushLocResolution = gl.getUniformLocation(
			this.brushProgram,
			'uResolution'
		)!;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instVbo);
		const stride = 10 * 4;
		let off = 0;
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, off);
		gl.vertexAttribDivisor(1, 1);
		off += 8;
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, off);
		gl.vertexAttribDivisor(2, 1);
		off += 8;
		gl.enableVertexAttribArray(3);
		gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, off);
		gl.vertexAttribDivisor(3, 1);
		off += 4;
		gl.enableVertexAttribArray(4);
		gl.vertexAttribPointer(4, 4, gl.FLOAT, false, stride, off);
		gl.vertexAttribDivisor(4, 1);
		off += 16;
		gl.enableVertexAttribArray(5);
		gl.vertexAttribPointer(5, 1, gl.FLOAT, false, stride, off);
		gl.vertexAttribDivisor(5, 1);

		// blit
		this.blitProgram = createProgram(gl, BLIT_VS, BLIT_FS);
		this.blitLocRes = gl.getUniformLocation(this.blitProgram, 'uResolution')!;
		this.blitLocBlur = gl.getUniformLocation(this.blitProgram, 'uBlur')!;
		this.blitLocSat = gl.getUniformLocation(this.blitProgram, 'uSaturation')!;
		this.blitLocHue = gl.getUniformLocation(this.blitProgram, 'uHue')!;

		// gaussian
		this.gaussProgram = createProgram(gl, BLIT_VS, GAUSS_FS);
		this.gaussLocRes = gl.getUniformLocation(this.gaussProgram, 'uResolution')!;
		this.gaussLocDir = gl.getUniformLocation(this.gaussProgram, 'uDirection')!;
		this.gaussLocSigma = gl.getUniformLocation(this.gaussProgram, 'uSigma')!;

    this.target = createRenderTarget(gl, width, height);
		this.scratchA = createRenderTarget(gl, width, height);
		this.scratchB = createRenderTarget(gl, width, height);

    // compose (base + glow)
    this.composeProgram = createProgram(gl, BLIT_VS, COMPOSE_FS);
    this.composeGlowIntensity = gl.getUniformLocation(this.composeProgram, 'uGlowIntensity')!;
    this.composeSat = gl.getUniformLocation(this.composeProgram, 'uSaturation')!;
    this.composeHue = gl.getUniformLocation(this.composeProgram, 'uHue')!;
		this.clear();
	}

	resize(width: number, height: number) {
		if (width === this.target.width && height === this.target.height) return;
		const { gl } = this;
		gl.deleteFramebuffer(this.target.fbo);
		gl.deleteTexture(this.target.tex);
		gl.deleteFramebuffer(this.scratchA.fbo);
		gl.deleteTexture(this.scratchA.tex);
		gl.deleteFramebuffer(this.scratchB.fbo);
		gl.deleteTexture(this.scratchB.tex);
		this.target = createRenderTarget(gl, width, height);
		this.scratchA = createRenderTarget(gl, width, height);
		this.scratchB = createRenderTarget(gl, width, height);
		this.clear();
		this.restore = [];
	}

	private drawInstancesTo(target: RenderTarget, instances: Float32Array) {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
		gl.viewport(0, 0, target.width, target.height);
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA,
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA
		);
		gl.useProgram(this.brushProgram);
		gl.uniform2f(this.brushLocResolution, target.width, target.height);
		gl.bindVertexArray(this.quadVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instVbo);
		gl.bufferData(gl.ARRAY_BUFFER, instances, gl.DYNAMIC_DRAW);
		const count = instances.length / 10;
		gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
		gl.disable(gl.BLEND);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	private clearTarget(rt: RenderTarget) {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fbo);
		gl.viewport(0, 0, rt.width, rt.height);
		gl.disable(gl.BLEND);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	private gaussian(
		src: RenderTarget,
		dst: RenderTarget,
		dirX: number,
		dirY: number,
		sigma: number
	) {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
		gl.viewport(0, 0, dst.width, dst.height);
		gl.useProgram(this.gaussProgram);
		gl.uniform2f(this.gaussLocRes, src.width, src.height);
		gl.uniform2f(this.gaussLocDir, dirX, dirY);
		gl.uniform1f(this.gaussLocSigma, sigma);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, src.tex);
		// fullscreen quad
		const fs = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
		gl.bufferData(gl.ARRAY_BUFFER, fs, gl.STATIC_DRAW);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	private composite(src: RenderTarget, dst: RenderTarget) {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
		gl.viewport(0, 0, dst.width, dst.height);
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA,
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA
		);
		gl.useProgram(this.blitProgram);
		gl.uniform2f(this.blitLocRes, dst.width, dst.height);
		gl.uniform1f(this.blitLocBlur, 0.0);
		gl.uniform1f(this.blitLocSat, 1.0);
		gl.uniform1f(this.blitLocHue, 0.0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, src.tex);
		const fs = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
		gl.bufferData(gl.ARRAY_BUFFER, fs, gl.STATIC_DRAW);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		gl.disable(gl.BLEND);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	paintStroke(fromX: number, fromY: number, settings: StrokeSettings) {
		const stamps: number[] = [];
		let previousPos = { x: fromX, y: fromY };
		let previousOffset = { x: 0, y: 0 };
		let width = settings.baseLineWidth;

		const [r, g, b, a] = settings.color;
		const hueJitter =
			(Math.random() * settings.hueRandomize - settings.hueRandomize / 2) /
			360.0;
		const tint = 0.06 * hueJitter;
		const premul = [
			Math.min(1, Math.max(0, r + tint)) * a,
			Math.min(1, Math.max(0, g - tint)) * a,
			Math.min(1, Math.max(0, b + tint)) * a,
			a,
		];

		for (let i = 0; i < settings.strokesNumber; i++) {
			const offset = {
				x: Math.random() * settings.offsetWeight - settings.offsetWeight / 2,
				y: Math.random() * settings.offsetWeight - settings.offsetWeight / 2,
			};
			const nx = previousPos.x + previousOffset.x + offset.x;
			const ny = previousPos.y + previousOffset.y + offset.y;
			const dx = nx - previousPos.x;
			const dy = ny - previousPos.y;
			const len = Math.hypot(dx, dy);
			if (len < 0.0001) {
				continue;
			}
			const dirx = dx / len;
			const diry = dy / len;
			const ang = Math.atan2(dy, dx);
			const segLen = len;
			const cx = previousPos.x + dirx * (segLen * 0.5);
			const cy = previousPos.y + diry * (segLen * 0.5);
			const sigmaPx = Math.max(
				0.0,
				settings.blurSigmaPx *
					(1.0 + (Math.random() * 2.0 - 1.0) * settings.blurJitter)
			);

			stamps.push(
				cx,
				cy,
				segLen,
				Math.max(0.5, width),
				ang,
				premul[0],
				premul[1],
				premul[2],
				premul[3],
				sigmaPx
			);
			previousPos = { x: nx, y: ny };
			previousOffset = {
				x: (previousOffset.x + offset.x) * settings.previousOffsetMultiplier,
				y: (previousOffset.y + offset.y) * settings.previousOffsetMultiplier,
			};
			width = width - ((width * Math.random()) / 3) * settings.lineDecay;
		}

		// Render to scratchA, blur separably according to sigma, then composite into target
		const instances = new Float32Array(stamps);
		this.clearTarget(this.scratchA);
		this.drawInstancesTo(this.scratchA, instances);

		// Use the first instance's sigma as representative for this stroke's blur strength
		// (all segments share similar sigma because we feed a single value with small jitter)
		const sigma = Math.max(0, settings.blurSigmaPx);
		if (sigma > 0.0) {
			this.gaussian(this.scratchA, this.scratchB, 1, 0, sigma);
			this.gaussian(this.scratchB, this.scratchA, 0, 1, sigma);
		}
		this.composite(this.scratchA, this.target);
	}

	captureRestorePoint(limit = 10) {
		const gl = this.gl;
		const copy = createRenderTarget(gl, this.target.width, this.target.height);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.target.fbo);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, copy.fbo);
		gl.blitFramebuffer(
			0,
			0,
			this.target.width,
			this.target.height,
			0,
			0,
			copy.width,
			copy.height,
			gl.COLOR_BUFFER_BIT,
			gl.NEAREST
		);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		this.restore.push(copy);
		while (this.restore.length > limit) {
			const rt = this.restore.shift()!;
			gl.deleteFramebuffer(rt.fbo);
			gl.deleteTexture(rt.tex);
		}
		this.redoStack = []; // Clear redo stack on new action
	}

	undo() {
		const gl = this.gl;
		if (this.restore.length === 0) return;
		// Store current state for redo
		const current = createRenderTarget(
			gl,
			this.target.width,
			this.target.height
		);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.target.fbo);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, current.fbo);
		gl.blitFramebuffer(
			0,
			0,
			this.target.width,
			this.target.height,
			0,
			0,
			current.width,
			current.height,
			gl.COLOR_BUFFER_BIT,
			gl.NEAREST
		);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		this.redoStack.push(current);

		const rt = this.restore.pop()!;
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rt.fbo);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.target.fbo);
		gl.blitFramebuffer(
			0,
			0,
			rt.width,
			rt.height,
			0,
			0,
			this.target.width,
			this.target.height,
			gl.COLOR_BUFFER_BIT,
			gl.NEAREST
		);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		gl.deleteFramebuffer(rt.fbo);
		gl.deleteTexture(rt.tex);
	}

	redo() {
		const gl = this.gl;
		if (this.redoStack.length === 0) return;
		// Store current state for undo
		const current = createRenderTarget(
			gl,
			this.target.width,
			this.target.height
		);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.target.fbo);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, current.fbo);
		gl.blitFramebuffer(
			0,
			0,
			this.target.width,
			this.target.height,
			0,
			0,
			current.width,
			current.height,
			gl.COLOR_BUFFER_BIT,
			gl.NEAREST
		);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		this.restore.push(current);

		const rt = this.redoStack.pop()!;
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rt.fbo);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.target.fbo);
		gl.blitFramebuffer(
			0,
			0,
			rt.width,
			rt.height,
			0,
			0,
			this.target.width,
			this.target.height,
			gl.COLOR_BUFFER_BIT,
			gl.NEAREST
		);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		gl.deleteFramebuffer(rt.fbo);
		gl.deleteTexture(rt.tex);
	}

	clear() {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.target.fbo);
		gl.disable(gl.BLEND);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		this.restore = []; // Clear undo/redo history on clear
		this.redoStack = [];
	}

	present(blurPx: number, saturation: number, hueOffsetDeg: number) {
		const gl = this.gl;
		gl.useProgram(this.blitProgram);
		gl.bindVertexArray(this.quadVao);
		// ensure viewport matches canvas when presenting
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.uniform2f(this.blitLocRes, this.target.width, this.target.height);
		gl.uniform1f(this.blitLocBlur, blurPx);
		gl.uniform1f(this.blitLocSat, saturation);
		gl.uniform1f(this.blitLocHue, hueOffsetDeg);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.target.tex);

		// draw fullscreen
		const fs = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
		gl.bufferData(gl.ARRAY_BUFFER, fs, gl.STATIC_DRAW);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		// restore brush quad
		const brushQuad = new Float32Array([
			-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
		]);
		gl.bufferData(gl.ARRAY_BUFFER, brushQuad, gl.STATIC_DRAW);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	}
}
