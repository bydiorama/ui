// Three prototype grounds after the looks of gradflow's mesh, stripe and
// horizon, written from scratch on the shipped prelude and ground helpers.
// The recipe the measurements gave: few, LARGE forms (low detail), a WIDE
// lightness range, REAL chroma. The palette is still two tokens (base and
// accent): the saturated tones are derived from the accent in OKLab.
//
//   node --experimental-strip-types looks.mts && node shoot-looks.cjs && python3 -I measure.py
import { writeFileSync, mkdirSync } from "node:fs";
const { PRELUDE, VERTEX, SHADERS } = await import(new URL("../../../registry/lib/shader/shader-programs.ts", import.meta.url).href);

// The shipped GROUND helpers (uniforms, quiet zone, edge, finish) are the
// head of every ground's fragment, up to its own uniforms.
const GROUND = SHADERS.mesh.fragment.split("uniform float u_distortion")[0];

// Derived tones: the accent pushed to a given lightness with its chroma
// scaled, so a pale accent can still give a deep, saturated tone.
const TONES = `
// Chroma shrinks as the tone darkens: a dark tone at full chroma reads as
// electric, and a dark yellow at any real chroma reads as olive.
vec3 fx_tone(vec3 accent, float lightness, float chroma) {
  return vec3(lightness, accent.yz * chroma * mix(0.45, 1.0, smoothstep(0.3, 0.85, lightness)));
}
// Composition, not a hole: the light falls away toward the copy over a long
// reach, like a vignette, so the quiet zone reads as the shadow side of the
// frame. 0 at the copy, 1 far from it.
float fx_falloff(vec2 uv) {
  vec2 anchor = vec2(u_quietX, (1.0 - u_quietY) * fx_aspect());
  float d = length((uv - anchor) * vec2(0.75, 1.5));
  return u_quiet > 0.0 ? smoothstep(0.35 * u_quiet, 1.6 * u_quiet, d) : 1.0;
}
float fx_dark() { return fx_oklab(u_base).x < 0.5 ? 1.0 : 0.0; }
`;

const WASH = `${GROUND}${TONES}
// WASH: a calm field of colour that fills the frame. Four broad gaussian
// pools drift over a vertical ramp between two derived tones; no point is
// small, so nothing reads as a spot.
void main() {
  vec2 local = fx_local();
  vec2 uv = local / (2.0 * u_box.x);
  float k = fx_aspect(), t = u_time * 0.1, dk = fx_dark();
  vec3 A = fx_oklab(u_light);
  vec3 deep = fx_tone(A, mix(0.74, 0.46, dk), mix(1.35, 1.7, dk));
  vec3 mid = fx_tone(fx_hueTurn(A, radians(16.0)), mix(0.86, 0.64, dk), mix(1.2, 1.5, dk));
  vec3 pale = fx_tone(A, mix(0.95, 0.80, dk), 0.9);
  vec3 ramp = mix(deep, mid, smoothstep(0.0, k, uv.y));
  vec2 P[4]; vec3 C[4];
  P[0] = vec2(0.25, 0.75 * k) + 0.18 * vec2(sin(0.7 * t), cos(0.5 * t));        C[0] = pale;
  P[1] = vec2(0.75, 0.30 * k) + 0.20 * vec2(cos(0.6 * t + 1.0), sin(0.4 * t));  C[1] = deep;
  P[2] = vec2(0.85, 0.85 * k) + 0.16 * vec2(sin(0.5 * t + 2.0), cos(0.7 * t));  C[2] = mid;
  P[3] = vec2(0.45, 0.25 * k) + 0.18 * vec2(cos(0.4 * t + 3.0), sin(0.6 * t + 1.0)); C[3] = fx_tone(fx_hueTurn(A, radians(-14.0)), mix(0.80, 0.52, dk), 1.25);
  vec3 sum = ramp * 0.25; float wsum = 0.25;
  for (int i = 0; i < 4; i++) {
    vec2 d = uv - P[i];
    float w = exp(-dot(d, d) / 0.09);
    sum += w * C[i]; wsum += w;
  }
  vec3 lab = mix(fx_oklab(u_base), sum / wsum, fx_falloff(uv));
  fragColor = fx_groundFinish(lab, uv, local);
}`;

const SWEEP = `${GROUND}${TONES}
// SWEEP: two big S-shaped forms crossing the frame. Each has a soft lit
// edge — light brightest at the boundary, falling away inside the form —
// and a deep shadow in front of it, so the frame runs from near-dark to
// near-white with one strong curve to follow.
float fx_sweepForm(vec2 q, float t, float phase, float amp) {
  return q.y - amp * sin(1.15 * q.x + 0.35 * t + phase) - 0.18 * sin(2.3 * q.x - 0.25 * t + 2.0 * phase);
}
void main() {
  vec2 local = fx_local();
  vec2 uv = local / (2.0 * u_box.x);
  float k = fx_aspect(), t = u_time * 0.1, dk = fx_dark();
  float a = radians(-28.0), c = cos(a), s = sin(a);
  vec2 q = mat2(c, s, -s, c) * (uv - vec2(0.5, 0.5 * k)) * 2.2;
  vec3 B = fx_oklab(u_base), A = fx_oklab(u_light);
  vec3 deep = fx_tone(fx_hueTurn(A, radians(-14.0)), mix(0.68, 0.40, dk), mix(1.5, 1.8, dk));
  vec3 bright = fx_tone(fx_hueTurn(A, radians(8.0)), mix(0.97, 0.93, dk), 1.15);
  vec3 lab = mix(B, deep, 0.55);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float f = fx_sweepForm(q + vec2(0.0, 0.55 - 1.1 * fi), t, 1.7 * fi, 0.55 - 0.15 * fi);
    float inside = smoothstep(-0.02, 0.05, f);
    float lit = exp(-max(f, 0.0) * 2.6);
    float shade = exp(-max(-f, 0.0) * 5.0);
    lab = mix(lab, deep, (1.0 - inside) * shade * 0.6);
    lab = mix(lab, mix(deep, bright, lit), inside * (0.75 - 0.2 * fi));
  }
  lab = mix(B, lab, fx_falloff(uv));
  fragColor = fx_groundFinish(lab, uv, local);
}`;

const RISE = `${GROUND}${TONES}
// RISE: a horizon. A bright rim along a gently moving arc low in the frame,
// a wide glow above it fading into the ground, and the body below falling
// from the rim's colour into a deep tone. One focal edge, nothing else.
void main() {
  vec2 local = fx_local();
  vec2 uv = local / (2.0 * u_box.x);
  float k = fx_aspect(), t = u_time * 0.1, dk = fx_dark();
  float px = 1.0 / (2.0 * u_box.x * u_dpr);
  vec3 B = fx_oklab(u_base), A = fx_oklab(u_light);
  vec3 deep = fx_tone(fx_hueTurn(A, radians(14.0)), mix(0.62, 0.34, dk), 1.6);
  vec3 glow = fx_tone(A, mix(0.86, 0.74, dk), 1.3);
  vec3 rim = fx_tone(fx_hueTurn(A, radians(-10.0)), 0.97, 0.9);
  float x = uv.x - 0.5;
  float edge = 0.30 * k - 0.55 * x * x + 0.025 * sin(3.1 * x + 0.5 * t) + 0.012 * sin(6.0 * x - 0.4 * t);
  float sd = uv.y - edge;                       // > 0 above the horizon
  float above = smoothstep(-px, px, sd);
  float halo = exp(-max(sd, 0.0) / (0.22 * k));
  float core = exp(-abs(sd) / 0.010);
  vec3 sky = mix(B, deep, halo * 0.55);
  sky = mix(sky, glow, halo * halo * 0.75);
  vec3 body = mix(glow, deep, smoothstep(0.0, 0.22 * k, -sd));
  vec3 lab = mix(body, sky, above);
  lab = mix(lab, rim, core * 0.9);
  fragColor = fx_groundFinish(lab, uv, local);
}`;

const T = {
  dark: { base: "#171411", accent: "#9EDBF3", muted: "#A69F98", primary: "#FAF7F3" },
  light: { base: "#FFFFFF", accent: "#9EDBF3", muted: "#69635D", primary: "#1D1B19" },
  "pale-light": { base: "#FFFDF5", accent: "#FFE066", muted: "#6B5D3F", primary: "#1A1400" },
  "pale-dark": { base: "#16130C", accent: "#FFE066", muted: "#A89E86", primary: "#FBF7EA" },
};
// The horizon's light is low in the frame, so its copy goes top left.
const LOOKS = [
  { name: "wash", frag: WASH, quietY: 0.9, copy: "bottom" },
  { name: "sweep", frag: SWEEP, quietY: 0.9, copy: "bottom" },
  { name: "rise", frag: RISE, quietY: 0.18, copy: "top" },
];
const tiles = LOOKS.flatMap((look) =>
  (Object.keys(T) as Array<keyof typeof T>).map((scheme) => ({
    id: `${look.name}-${scheme}`,
    look,
    t: T[scheme],
    u: {
      u_base: T[scheme].base, u_light: T[scheme].accent, u_intensity: 1, u_quiet: 0.42, u_quietX: 0.16,
      u_quietY: look.quietY, u_dissolve: 0, u_grain: 0,
    },
  })),
);

// Full frame, no quiet zone: the gradflow way. Its copy needs glass.
for (const look of LOOKS.filter((l) => l.name !== "rise")) {
  tiles.push({ id: `${look.name}-full-dark`, look, t: T.dark, u: { ...tiles.find((x) => x.id === `${look.name}-dark`)!.u, u_quiet: 0 } });
}

const html = `<!doctype html><meta charset="utf-8"><title>Looks lab</title>
<style>body{margin:0;font:13px system-ui}.tile{position:relative;width:960px;height:540px;margin:0 0 4px;overflow:hidden}
canvas{position:absolute;inset:0;width:960px;height:540px}.copy{position:absolute;left:48px;z-index:2}
.copy.bottom{bottom:44px}.copy.top{top:44px}.copy b{display:block;font-size:22px;font-weight:600;margin-bottom:6px}</style>
${tiles.map((x) => `<div class="tile" id="${x.id}" style="background:${x.t.base}"><canvas></canvas>
<div class="copy ${x.look.copy}"><b style="color:${x.t.primary}">Nothing on this board yet</b><span style="color:${x.t.muted}">Drop images here or start from a template.</span></div></div>`).join("\n")}
<script>
const VERTEX = ${JSON.stringify(VERTEX)}, PRELUDE = ${JSON.stringify(PRELUDE)};
const TILES = ${JSON.stringify(tiles.map((x) => ({ id: x.id, frag: x.look.frag, u: x.u })))};
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
window.__errors = [];
for (const t of TILES) {
  const cv = document.querySelector('#' + t.id + ' canvas'); cv.width = 960; cv.height = 540;
  const gl = cv.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) window.__errors.push(t.id + ': ' + gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, PRELUDE + t.frag)); gl.linkProgram(p); gl.useProgram(p);
  const U = (n) => gl.getUniformLocation(p, n);
  gl.uniform1f(U('u_time'), 6); gl.uniform1f(U('u_dpr'), 1); gl.uniform1ui(U('u_seed'), 7);
  gl.uniform2f(U('u_center'), 480, 270); gl.uniform2f(U('u_box'), 480, 270); gl.uniform1f(U('u_radius'), 0);
  for (const [k, v] of Object.entries(t.u)) typeof v === 'string' ? gl.uniform3fv(U(k), hex(v)) : gl.uniform1f(U(k), v);
  gl.viewport(0, 0, 960, 540); gl.drawArrays(gl.TRIANGLES, 0, 3);
}
window.__done = true;
</script>`;
mkdirSync(new URL("./.out/", import.meta.url), { recursive: true });
writeFileSync(new URL("./.out/looks.html", import.meta.url), html);
writeFileSync(new URL("./.out/looks-copy.json", import.meta.url), JSON.stringify(Object.fromEntries(tiles.map((x) => [x.id, x.look.copy]))));
console.log("tiles", tiles.length);
