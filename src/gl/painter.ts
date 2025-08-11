import { createProgram } from './utils';

export type StrokeSettings = {
	strokesNumber: number;
	baseLineWidth: number;
	lineDecay: number;
	offsetWeight: number;
	previousOffsetMultiplier: number;
	color: [number, number, number, number];
	hueRandomize: number;
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

uniform vec2 uResolution;

out vec2 vLocal;
out vec4 vColor;

void main(){
  vec2 local = position * aSize; // scale to segment size in px
  float c = cos(aAngle), s = sin(aAngle);
  vec2 rotated = vec2(local.x*c - local.y*s, local.x*s + local.y*c);
  vec2 pos = aCenter + rotated;
  vec2 ndc = (pos / uResolution) * 2.0 - 1.0;
  ndc.y = -ndc.y; // canvas-like coords
  gl_Position = vec4(ndc,0.0,1.0);
  vLocal = local / (0.5 * aSize);
  vColor = aColor;
}`;

const BRUSH_FS = `#version 300 es
precision highp float;
in vec2 vLocal; // -1..1
in vec4 vColor; // premultiplied
out vec4 outColor;

void main(){
  vec2 d = abs(vLocal);
  float along = smoothstep(1.0, 0.88, d.x); // soften tips
  float across = smoothstep(1.0, 0.82, d.y); // soften edges
  float alpha = along * across;
  outColor = vec4(vColor.rgb, 1.0) * alpha; // premultiplied rgb
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
uniform float uBlur;       // px
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
  vec2 texel = 1.0 / uResolution;
  vec4 c = texture(uTex, vUv);
  if(uBlur > 0.5){
    vec2 o = texel * uBlur;
    c = (
      texture(uTex, vUv + vec2(-o.x,-o.y)) +
      texture(uTex, vUv + vec2( 0.0 , -o.y)) +
      texture(uTex, vUv + vec2( o.x , -o.y)) +
      texture(uTex, vUv + vec2(-o.x, 0.0 )) +
      texture(uTex, vUv) +
      texture(uTex, vUv + vec2( o.x , 0.0 )) +
      texture(uTex, vUv + vec2(-o.x, o.y )) +
      texture(uTex, vUv + vec2( 0.0 , o.y )) +
      texture(uTex, vUv + vec2( o.x , o.y ))
    )/9.0;
  }
  float l = dot(c.rgb, vec3(0.2126,0.7152,0.0722));
  c.rgb = mix(vec3(l), c.rgb, uSaturation);
  c.rgb = hueRotate(c.rgb, uHue);
  outColor = c;
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

	private target: RenderTarget;
	private restore: RenderTarget[] = [];

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
		const stride = 9 * 4;
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

		// blit
		this.blitProgram = createProgram(gl, BLIT_VS, BLIT_FS);
		this.blitLocRes = gl.getUniformLocation(this.blitProgram, 'uResolution')!;
		this.blitLocBlur = gl.getUniformLocation(this.blitProgram, 'uBlur')!;
		this.blitLocSat = gl.getUniformLocation(this.blitProgram, 'uSaturation')!;
		this.blitLocHue = gl.getUniformLocation(this.blitProgram, 'uHue')!;

		this.target = createRenderTarget(gl, width, height);
		this.clear();
	}

	resize(width: number, height: number) {
		if (width === this.target.width && height === this.target.height) return;
		const { gl } = this;
		gl.deleteFramebuffer(this.target.fbo);
		gl.deleteTexture(this.target.tex);
		this.target = createRenderTarget(gl, width, height);
		this.clear();
		this.restore = [];
	}

	private drawInstances(instances: Float32Array) {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.target.fbo);
		gl.viewport(0, 0, this.target.width, this.target.height);
		gl.enable(gl.BLEND);
		gl.blendFuncSeparate(
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA,
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA
		);
		gl.useProgram(this.brushProgram);
		gl.uniform2f(
			this.brushLocResolution,
			this.target.width,
			this.target.height
		);
		gl.bindVertexArray(this.quadVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instVbo);
		gl.bufferData(gl.ARRAY_BUFFER, instances, gl.DYNAMIC_DRAW);
		const count = instances.length / 9;
		gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
		gl.disable(gl.BLEND);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	paintStroke(fromX: number, fromY: number, settings: StrokeSettings) {
		const stamps: number[] = [];
		let previousPos = { x: fromX, y: fromY };
		let previousOffset = { x: 0, y: 0 };
		let width = settings.baseLineWidth;
		let lengthAcc = Math.max(4, settings.baseLineWidth * 1.2);

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
			const nx =
				previousPos.x +
				offset.x +
				previousOffset.x * settings.previousOffsetMultiplier;
			const ny =
				previousPos.y +
				offset.y +
				previousOffset.y * settings.previousOffsetMultiplier;
			const dx = nx - previousPos.x;
			const dy = ny - previousPos.y;
			const ang = Math.atan2(dy, dx);
			const segLen = Math.hypot(dx, dy) + lengthAcc * 0.25;
			const cx = previousPos.x + dx * 0.5;
			const cy = previousPos.y + dy * 0.5;
			stamps.push(
				cx,
				cy,
				segLen,
				Math.max(0.5, width),
				ang,
				premul[0],
				premul[1],
				premul[2],
				premul[3]
			);
			previousPos = { x: nx, y: ny };
			previousOffset = {
				x: offset.x + previousOffset.x * settings.previousOffsetMultiplier,
				y: offset.y + previousOffset.y * settings.previousOffsetMultiplier,
			};
			width = width - ((width * Math.random()) / 3) * settings.lineDecay;
			lengthAcc *= 1.05;
		}

		this.drawInstances(new Float32Array(stamps));
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
	}

	undo() {
		const gl = this.gl;
		if (this.restore.length === 0) return;
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

	clear() {
		const gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.target.fbo);
		gl.disable(gl.BLEND);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
