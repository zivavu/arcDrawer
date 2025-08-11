export function createShader(
	gl: WebGL2RenderingContext,
	type: number,
	source: string
): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error('Failed to create shader');
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader) || 'unknown';
		gl.deleteShader(shader);
		throw new Error(`Shader compile error: ${log}`);
	}
	return shader;
}

export function createProgram(
	gl: WebGL2RenderingContext,
	vertexSource: string,
	fragmentSource: string
): WebGLProgram {
	const vs = createShader(gl, gl.VERTEX_SHADER, vertexSource);
	const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
	const program = gl.createProgram();
	if (!program) throw new Error('Failed to create program');
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.bindAttribLocation(program, 0, 'position');
	gl.linkProgram(program);
	gl.deleteShader(vs);
	gl.deleteShader(fs);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const log = gl.getProgramInfoLog(program) || 'unknown';
		gl.deleteProgram(program);
		throw new Error(`Program link error: ${log}`);
	}
	return program;
}
