// Builds lab.html: the current aurora ground, the blurred-circles ground and
// a prototype mesh gradient, rendered under identical conditions.
import { writeFileSync } from "node:fs";
const { PRELUDE, VERTEX, SHADERS } = await import(new URL("../../../registry/lib/shader/shader-programs.ts", import.meta.url).href);

// theme-zero tokens
const T = {
  dark: { base: "#171411", accent: "#9EDBF3", muted: "#A69F98", primary: "#FAF7F3" },
  light: { base: "#FFFFFF", accent: "#9EDBF3", muted: "#69635D", primary: "#1D1B19" },
};

// ---- Prototype: a token-driven mesh gradient (written from scratch for this lab).
// Colour points drift on slow Lissajous paths; the domain is bent by two
// low-frequency sine swirls (no noise octaves -> no high-frequency "dirt");
// weights are inverse-distance, the mix happens in OKLab (no grey dead zones);
// output gets a static triangular-PDF dither of +-1 LSB so 8-bit ramps don't band.
const MESH = `
uniform vec3 u_base;       // --ui-bg-base: the ground
uniform vec3 u_light;      // --ui-bg-accent: the brand light
uniform vec3 u_avoid;      // ink guarded against
uniform float u_guard;     // contrast ratio, 0 = off
uniform float u_intensity; // how far the field leaves the ground
uniform float u_distortion;
uniform float u_softness;
uniform float u_dissolve;
uniform float u_dither;
// Five colour points, all derived from two tokens in OKLab.
vec3 fx_meshLab(vec2 uv, float aspect, float t) {
  vec3 B = fx_oklab(u_base), A = fx_oklab(u_light);
  vec2 p = uv;
  p += u_distortion * 0.08 * vec2(sin(2.1 * p.y + 1.3 * t + 1.7), sin(1.7 * p.x - 1.1 * t + 0.4));
  p += u_distortion * 0.04 * vec2(sin(3.3 * p.y - 0.9 * t + 4.0), sin(2.9 * p.x + 0.7 * t + 2.2));
  vec2 P[5]; vec3 C[5];
  // the ground holds the corner where copy usually sits (bottom-left)
  P[0] = vec2(0.10, 0.10 * aspect) + 0.04 * vec2(sin(0.5 * t), cos(0.4 * t));  C[0] = B;
  P[1] = vec2(0.82, 0.78 * aspect) + 0.14 * vec2(sin(0.43 * t + 2.0), cos(0.67 * t + 0.3)); C[1] = A;
  P[2] = vec2(0.30, 0.86 * aspect) + 0.14 * vec2(sin(0.59 * t + 4.1), cos(0.37 * t + 2.6));
  C[2] = fx_hueTurn(A, radians(48.0)); C[2].x = mix(B.x, A.x, 0.8);
  P[3] = vec2(0.58, 0.40 * aspect) + 0.16 * vec2(sin(0.31 * t + 1.2), cos(0.47 * t + 5.0)); C[3] = mix(B, A, 0.45);
  P[4] = vec2(0.95, 0.20 * aspect) + 0.12 * vec2(sin(0.27 * t + 3.3), cos(0.41 * t + 4.4));
  C[4] = fx_hueTurn(A, radians(-32.0)); C[4].x = mix(B.x, A.x, 0.9);
  vec3 sum = vec3(0.0); float wsum = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 d = p - P[i];
    float w = 1.0 / pow(dot(d, d) + 0.015, u_softness);
    sum += w * C[i]; wsum += w;
  }
  return mix(B, sum / wsum, u_intensity);
}
float fx_tpdf(vec2 px) {
  return fx_rand(uvec3(uvec2(px), 1u)) + fx_rand(uvec3(uvec2(px), 2u)) - 1.0;
}
void main() {
  vec2 css = gl_FragCoord.xy / u_dpr;
  float d = fx_shapeDistance(css);
  vec2 local = css - (u_center - u_box);          // 0..2*box, y up
  float w = 2.0 * u_box.x, aspect = u_box.y / u_box.x;
  vec2 uv = local / w;                             // x 0..1, y 0..aspect
  vec3 lab = fx_meshLab(uv, aspect, u_time * 0.12);
  // Dissolve: product of two 1D falloffs. Smooth everywhere: a fade by the
  // box's distance field creases along its diagonals (the mitre artefact).
  vec2 reach = vec2(max(u_dissolve * 2.0 * min(u_box.x, u_box.y), 1.0));
  vec2 e = min(local, 2.0 * u_box - local) / reach;
  vec2 s = smoothstep(0.0, 1.0, clamp(e, 0.0, 1.0));
  float fade = u_dissolve > 0.0 ? s.x * s.y : 1.0;
  lab = mix(fx_oklab(u_base), lab, fade);
  vec3 rgb = fx_srgb(lab);
  rgb = fx_guard(rgb, u_avoid, u_base, u_guard);
  rgb += u_dither * fx_tpdf(gl_FragCoord.xy) / 255.0;
  float a = fx_cover(d);
  fragColor = vec4(rgb * a, a);
}`;

// ---- Prototype 2: a "fold" ground, the directional family the references
// (gradflow fold/silk, MagicPattern) belong to. Written from scratch. Light
// panes are stacked along slowly bending creases: a soft body behind each
// crease and a sharp lit rim on it, mixed in OKLab from two tokens. A quiet
// zone keeps the ground's own colour where copy sits (bottom-left), instead
// of a per-pixel guard. Static TPDF dither last.
const FOLD = `
uniform vec3 u_base;
uniform vec3 u_light;
uniform float u_angle;    // degrees; the folds' direction
uniform float u_sharp;    // rim falloff: higher = crisper edge
uniform float u_quiet;    // 0 = none; radius of the copy's quiet zone, in widths
uniform float u_dither;
float fx_tpdf(vec2 px) {
  return fx_rand(uvec3(uvec2(px), 1u)) + fx_rand(uvec3(uvec2(px), 2u)) - 1.0;
}
void main() {
  vec2 css = gl_FragCoord.xy / u_dpr;
  float d = fx_shapeDistance(css);
  vec2 local = css - (u_center - u_box);
  float w = 2.0 * u_box.x, aspect = u_box.y / u_box.x;
  vec2 uv = local / w;
  float a = radians(u_angle), c = cos(a), s = sin(a);
  vec2 q = mat2(c, s, -s, c) * (uv - vec2(0.5, 0.5 * aspect)) * 2.4;
  float px = 2.4 / (w * u_dpr);
  float t = u_time * 0.12;
  vec3 B = fx_oklab(u_base), A = fx_oklab(u_light);
  vec3 A2 = fx_hueTurn(A, radians(42.0)); A2.x = mix(B.x, A.x, 0.85);
  vec3 lab = B;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float crease = (fi - 2.0) * 0.34
                 + 0.24 * sin(q.x * (1.0 + 0.14 * fi) + 1.9 * fi + t * (0.3 + 0.06 * fi))
                 + 0.06 * sin(q.x * 2.3 - 0.7 * fi - 0.5 * t);
    float sd = q.y - crease;
    float pane = smoothstep(-px, px, sd);
    float back = max(sd, 0.0);
    float body = exp(-back * 2.4);
    float rim = exp(-back * u_sharp);
    vec3 tint = mix(mix(B, A, 0.55), mix(A, A2, 0.5 + 0.5 * sin(2.1 * fi + 0.8 * q.x)), body);
    lab = mix(lab, tint, pane * (0.42 * body + 0.55 * rim));
  }
  vec2 anchor = vec2(0.16, 0.10);
  float quiet = u_quiet > 0.0 ? smoothstep(0.0, u_quiet, length((uv - anchor) * vec2(0.75, 1.5))) : 1.0;
  lab = mix(B, lab, quiet);
  vec3 rgb = fx_srgb(lab) + u_dither * fx_tpdf(gl_FragCoord.xy) / 255.0;
  float cov = fx_cover(d);
  fragColor = vec4(rgb * cov, cov);
}`;

const tiles: any[] = [];
for (const scheme of ["dark", "light"] as const) {
  const t = T[scheme];
  tiles.push({ id: `aurora-${scheme}`, scheme, kind: "gl", frag: PRELUDE + SHADERS.aurora.fragment, time: SHADERS.aurora.restTime,
    u: { u_base: t.base, u_light: t.accent, u_avoid: t.muted, u_guard: 4.5, u_intensity: 0.7, u_scale: 420, u_grain: 0, u_dissolve: 0.22, u_on: 1 },
    label: "Current: aurora ground (shader-programs.ts, rest frame)" });
  tiles.push({ id: `blobs-${scheme}`, scheme, kind: "css", label: "Blurred circles: two radial blobs, filter: blur(32px)",
    html: `<div class="blobs"><i style="left:8%;top:-20%"></i><i style="left:52%;top:30%"></i></div>` });
  tiles.push({ id: `mesh-${scheme}`, scheme, kind: "gl", frag: PRELUDE + MESH, time: 6,
    u: { u_base: t.base, u_light: t.accent, u_avoid: t.muted, u_guard: 0, u_intensity: scheme === "dark" ? 0.85 : 0.7, u_distortion: 1, u_softness: 1.6, u_dissolve: 0.18, u_dither: 1 },
    label: "Prototype: mesh gradient, unguarded" });
  tiles.push({ id: `meshguard-${scheme}`, scheme, kind: "gl", frag: PRELUDE + MESH, time: 6,
    u: { ...tiles[tiles.length - 1].u, u_guard: 4.5 }, label: "Prototype: mesh gradient, guarded 4.5:1 per pixel" });
  tiles.push({ id: `meshnodither-${scheme}`, scheme, kind: "gl", frag: PRELUDE + MESH, time: 6,
    u: { ...tiles[tiles.length - 2].u, u_dither: 0 }, label: "Same mesh, dither off (to isolate banding)" });
  tiles.push({ id: `fold-${scheme}`, scheme, kind: "gl", frag: PRELUDE + FOLD, time: 6,
    u: { u_base: t.base, u_light: t.accent, u_angle: 24, u_sharp: 70, u_quiet: 0.42, u_dither: 1 },
    label: "Prototype 2: fold ground, quiet zone under the copy" });
}

const html = `<!doctype html><meta charset="utf-8"><title>Ground lab</title>
<style>
body{margin:0;background:#888;font:13px system-ui;color:#000}
.tile{position:relative;width:960px;height:540px;margin:0 0 4px;overflow:hidden}
.tile canvas{position:absolute;inset:0;width:960px;height:540px}
.dark{background:${T.dark.base}} .light{background:${T.light.base}}
.copy{position:absolute;left:48px;bottom:44px;z-index:2}
.copy b{display:block;font-size:22px;font-weight:600;margin-bottom:6px}
.dark .copy b{color:${T.dark.primary}} .dark .copy span{color:${T.dark.muted}}
.light .copy b{color:${T.light.primary}} .light .copy span{color:${T.light.muted}}
.blobs{position:absolute;inset:0;border-radius:16px;overflow:hidden}
.blobs i{position:absolute;width:46%;aspect-ratio:1;border-radius:50%;filter:blur(32px);
  background:radial-gradient(circle, rgba(158,219,243,.55) 0%, rgba(158,219,243,.25) 42%, rgba(158,219,243,0) 70%)}
</style>
${tiles.map((t) => `<div class="tile ${t.scheme}" id="${t.id}" data-kind="${t.kind}">${t.kind === "gl" ? "<canvas></canvas>" : t.html}
<div class="copy"><b>Nothing on this board yet</b><span>Drop images here or start from a template.</span></div></div>`).join("\n")}
<script>
const VERTEX = ${JSON.stringify(VERTEX)};
const TILES = ${JSON.stringify(tiles.filter((t) => t.kind === "gl"))};
const hex = (h) => [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255);
window.__errors = [];
for (const t of TILES) {
  const cv = document.querySelector('#'+t.id+' canvas');
  const dpr = window.devicePixelRatio; cv.width = 960*dpr; cv.height = 540*dpr;
  const gl = cv.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
  if (!gl) { window.__errors.push('no webgl2'); continue; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) window.__errors.push(t.id + ': ' + gl.getShaderInfoLog(s)); return s; };
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, t.frag)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) window.__errors.push(t.id + ' link: ' + gl.getProgramInfoLog(p));
  gl.useProgram(p);
  const U = (n) => gl.getUniformLocation(p, n);
  gl.uniform2f(U('u_resolution'), cv.width, cv.height); gl.uniform1f(U('u_time'), t.time); gl.uniform1f(U('u_dpr'), dpr);
  gl.uniform1ui(U('u_seed'), 7); gl.uniform2f(U('u_center'), 480, 270); gl.uniform2f(U('u_box'), 480, 270); gl.uniform1f(U('u_radius'), 16);
  for (const [k, v] of Object.entries(t.u)) typeof v === 'string' ? gl.uniform3fv(U(k), hex(v)) : gl.uniform1f(U(k), v);
  gl.viewport(0, 0, cv.width, cv.height); gl.drawArrays(gl.TRIANGLES, 0, 3);
}
window.__done = true;
</script>`;
writeFileSync(new URL("./.out/lab.html", import.meta.url), html);
console.log("tiles", tiles.length);
