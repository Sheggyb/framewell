/**
 * Colour grading on the GPU (WebGL2): exposure, contrast, saturation, warmth, tint, fade,
 * split toning, vignette and grain in one fragment shader. One shared GL canvas is reused;
 * the result must be drawn before the next `gradeFrame` call.
 */
import type { GradeParams } from "../model/color";
import type { DrawableFrame } from "./media";

const VERTEX = `#version 300 es
in vec2 pos;
out vec2 uv;
void main() {
  uv = pos * 0.5 + 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D image;
uniform float exposure, contrast, saturation, warmth, tint, fade, vignette, grain, seed;
uniform vec3 shadows, highlights;
uniform vec2 size;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed) * 43758.5453);
}

void main() {
  vec4 src = texture(image, uv);
  vec3 c = src.rgb;
  c *= pow(2.0, exposure);
  c = (c - 0.5) * (1.0 + contrast) + 0.5;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, 1.0 + saturation);
  c.r += warmth * 0.08;
  c.b -= warmth * 0.08;
  c.g -= tint * 0.06;
  c += mix(shadows, highlights, smoothstep(0.15, 0.85, l)) * 0.5;
  c = c * (1.0 - 0.25 * fade) + 0.12 * fade;
  float d = length((uv - 0.5) * vec2(1.0, size.y / size.x)) * 1.2;
  c *= 1.0 - vignette * 0.75 * smoothstep(0.35, 1.0, d);
  c += (hash(uv * size) - 0.5) * grain * 0.18;
  color = vec4(clamp(c, 0.0, 1.0), src.a);
}`;

interface Grader {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement | OffscreenCanvas;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

let grader: Grader | null | undefined;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader error");
  return shader;
}

function createGrader(): Grader | null {
  try {
    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(1, 1);
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, preserveDrawingBuffer: true }) as
      | WebGL2RenderingContext
      | null;
    if (!gl) return null;
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    // One triangle that covers the whole viewport.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    const names = ["exposure", "contrast", "saturation", "warmth", "tint", "fade", "vignette", "grain", "seed", "shadows", "highlights", "size"];
    const uniforms = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)]));
    return { gl, canvas, uniforms };
  } catch {
    return null;
  }
}

/**
 * Returns the graded frame (the shared GL canvas), or the source unchanged if WebGL2 isn't
 * available. `seed` varies the grain per frame deterministically, so preview matches export.
 */
export function gradeFrame(source: DrawableFrame, params: GradeParams, seed: number): DrawableFrame {
  if (grader === undefined) grader = createGrader();
  if (!grader) return source;
  const { gl, canvas, uniforms: u } = grader;
  if (canvas.width !== source.width || canvas.height !== source.height) {
    canvas.width = source.width;
    canvas.height = source.height;
  }
  gl.viewport(0, 0, source.width, source.height);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.uniform1f(u.exposure, params.exposure);
  gl.uniform1f(u.contrast, params.contrast);
  gl.uniform1f(u.saturation, params.saturation);
  gl.uniform1f(u.warmth, params.warmth);
  gl.uniform1f(u.tint, params.tint);
  gl.uniform1f(u.fade, params.fade);
  gl.uniform1f(u.vignette, params.vignette);
  gl.uniform1f(u.grain, params.grain);
  gl.uniform1f(u.seed, seed % 1000);
  gl.uniform3fv(u.shadows, params.shadows);
  gl.uniform3fv(u.highlights, params.highlights);
  gl.uniform2f(u.size, source.width, source.height);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return canvas;
}
