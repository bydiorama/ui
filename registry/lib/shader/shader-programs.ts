/**
 * The shader programs of the effects layer (ADR 0022, ADR 0025): the two
 * grounds, mesh and fold, and halo, and the GLSL they share. Paired with
 * `@/lib/shader`, which runs them.
 *
 * THE ADMISSION RULE, which `pnpm check:fx` enforces on this file:
 *
 *   1. A shader paints only pixels it owns — its part's fill, or a ground.
 *      It never reads the page, a backdrop or another canvas: no sampler2D,
 *      no texture(). (Refraction failed exactly here, twice.)
 *   2. Every input is a token, read where the part sits: every uniform below
 *      names a `--…` custom property.
 *   3. Its floor is the component. Nothing here draws what the component
 *      does not already show; it only paints over a fill that exists.
 *   4. It keeps the ink on its part legible, and the browser test samples
 *      the result. A ground does it with a QUIET ZONE (ADR 0025): around the
 *      copy's anchor it paints exactly its base, so the ink keeps the
 *      contrast the token pair was audited at, and the light outside the
 *      zone is free to be bright. (A per-pixel guard, aurora's way, held the
 *      ratio only by squeezing a dark ground into a handful of grey levels.)
 *
 * Every program ends the same way: mixed in OKLab, encoded to sRGB, then a
 * static triangular-PDF dither of one 8-bit step, so a slow ramp never shows
 * bands (Playdead, "Banding in Games": dither last, in the space the value is
 * quantised in).
 *
 * The GLSL prelude — hashing, noise, OKLab, the shape — is kept as measured
 * in the effects lab. Hash: lowbias32 by Chris Wellons (public domain).
 * OKLab: Björn Ottosson's published matrices (public domain). The grounds
 * were written for this library (docs/webgl-gradients.md); other gradient
 * libraries were a benchmark only, and no code was taken from them.
 */

import type { ShaderFxName } from "@/lib/fx";

export type ShaderName = ShaderFxName;

/** A uniform's source: a colour token, or a numeric one. `live` ones follow a CSS transition. */
export type UniformSpec = { color: string } | { number: string; fallback?: number; live?: boolean };

export interface ShaderDef {
  name: ShaderName;
  fragment: string;
  /** Every uniform names a token (rule 2). */
  uniforms: Record<string, UniformSpec>;
  /** The frame shown under reduced motion: chosen, not t = 0. */
  restTime: number;
  /** CSS px the canvas reaches past its part, for a light that falls off. */
  bleed?: number;
  /**
   * False keeps the target at full resolution when frames get slow. A ground
   * dithers per device pixel; scaled up, the dither smears and the bands it
   * hides come back. Default true.
   */
  adaptive?: boolean;
  /** Frames per second at most. A ground moves slowly; 30 halves its cost unseen. */
  fps?: number;
  /** Skip drawing while this holds (a halo faded to nothing costs nothing). */
  idle?: (values: Record<string, number | number[]>) => boolean;
}

export const VERTEX = `#version 300 es
// One triangle that covers the viewport: (-1,-1) (3,-1) (-1,3). No buffers.
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// highp on purpose: mediump float is fp16 on many phone GPUs (noise turns to
// blocks past ~2048) and mediump int is 16-bit (every integer hash breaks).
// Desktop GPUs run mediump as highp, so the bug hides where shaders are written.
export const PRELUDE = `#version 300 es
precision highp float;
precision highp int;

uniform vec2  u_resolution;  // drawing size, device px
uniform float u_time;        // seconds, scaled by the motion knob
uniform float u_dpr;
uniform uint  u_seed;
out vec4 fragColor;

// lowbias32 (Chris Wellons, public domain): integer hashing, stable across GPUs.
uint fx_hash(uint x) {
  x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16; return x;
}
uint fx_hash(uvec3 v) { return fx_hash(v.x ^ fx_hash(v.y ^ fx_hash(v.z ^ u_seed))); }
float fx_rand(uvec3 v) { return float(fx_hash(v)) * (1.0 / 4294967295.0); }

vec2 fx_grad(ivec2 c, uint salt) {
  float a = fx_rand(uvec3(uvec2(c + 65536), salt)) * 6.2831853;
  return vec2(cos(a), sin(a));
}
float fx_noise(vec2 p, uint salt) {
  ivec2 i = ivec2(floor(p)); vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(fx_grad(i, salt), f);
  float b = dot(fx_grad(i + ivec2(1, 0), salt), f - vec2(1.0, 0.0));
  float c = dot(fx_grad(i + ivec2(0, 1), salt), f - vec2(0.0, 1.0));
  float d = dot(fx_grad(i + ivec2(1, 1), salt), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// sRGB <-> OKLab (Bjorn Ottosson's published matrices).
vec3 fx_toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 fx_toSrgb(vec3 c) { c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 fx_oklab(vec3 srgb) {
  vec3 c = fx_toLinear(srgb);
  float l = pow(max(0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b, 0.0), 1.0 / 3.0);
  float m = pow(max(0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b, 0.0), 1.0 / 3.0);
  float s = pow(max(0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b, 0.0), 1.0 / 3.0);
  return vec3(0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
              1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
              0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 fx_srgb(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return fx_toSrgb(vec3(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                       -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                       -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s));
}
vec3 fx_hueTurn(vec3 lab, float r) { float c = cos(r), s = sin(r); return vec3(lab.x, c * lab.y - s * lab.z, s * lab.y + c * lab.z); }
// Static triangular-PDF dither in [-1, 1] of one step (two uniform draws):
// no pixel is left without noise, unlike a uniform draw. Static, because a
// slow ground has no motion to hide a dither that changes every frame.
float fx_tpdf(vec2 px) {
  uvec2 p = uvec2(px);
  return fx_rand(uvec3(p, 101u)) + fx_rand(uvec3(p, 102u)) - 1.0;
}

float fx_roundBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// The shape: the part's own rounded box, in canvas CSS px (y up). The shader
// draws it, antialiased to one device pixel, so nothing depends on CSS
// clipping a canvas (which iOS Safari drops while a layer animates).
uniform vec2  u_center;
uniform vec2  u_box;
uniform float u_radius;
float fx_shapeDistance(vec2 css) { return fx_roundBox(css - u_center, u_box, u_radius); }
float fx_cover(float d) { return clamp(0.5 - d * u_dpr, 0.0, 1.0); }
`;

/**
 * What both grounds share (ADR 0025): the box as a 0..1-wide field, the
 * quiet zone, an edge that can dissolve into the page, and the finish —
 * grain, sRGB, dither.
 *
 * The palette is the ground's two tokens and nothing else: the base it
 * replaces and the light moving over it. Every other tone is derived in
 * OKLab (a mix, a lightness step, a hue turn), so a brand theme gets a
 * ground without a single new token.
 */
const GROUND = `
uniform vec3  u_base;       // the ground the light sits on
uniform vec3  u_light;      // the brand light
uniform float u_intensity;  // 0 = the base alone, 1 = the full field
uniform float u_quiet;      // quiet zone radius, as a fraction of the width; 0 = none
uniform float u_quietX;     // its centre, 0..1 across the box, left to right
uniform float u_quietY;     // and 0..1 down the box, top to bottom (as CSS reads it)
uniform float u_dissolve;   // 0 = fill to the edge; >0 = fraction of the short side the light fades over
uniform float u_grain;      // visible film grain; 0 = none (the dither is always on)

// The box in CSS px, y up (GL), and the field: x 0..1 across, y 0..aspect.
vec2 fx_local() { return gl_FragCoord.xy / u_dpr - (u_center - u_box); }
float fx_aspect() { return u_box.y / max(u_box.x, 1.0); }

// 0 inside the quiet zone's core (the copy), 1 outside it. An ellipse wider
// than tall, because a block of copy is. The core is HALF the radius, so the
// whole copy block sits on the exact base, then the field comes in.
float fx_quietMask(vec2 uv) {
  if (u_quiet <= 0.0) return 1.0;
  vec2 anchor = vec2(u_quietX, (1.0 - u_quietY) * fx_aspect());
  float d = length((uv - anchor) * vec2(0.75, 1.5));
  return smoothstep(0.5 * u_quiet, u_quiet, d);
}

// Separable: the product of two 1D falloffs is smooth everywhere. A fade by
// the box's distance field creases along its diagonals (the mitre the lab
// measured in the retired aurora's dissolve).
float fx_edgeMask(vec2 local) {
  if (u_dissolve <= 0.0) return 1.0;
  vec2 reach = vec2(max(u_dissolve * 2.0 * min(u_box.x, u_box.y), 1.0));
  vec2 e = clamp(min(local, 2.0 * u_box - local) / reach, 0.0, 1.0);
  vec2 s = smoothstep(0.0, 1.0, e);
  return s.x * s.y;
}

// From the field's colour (OKLab) to the pixel: back to the base wherever the
// light must not be, then grain (outside the quiet zone only, so the copy's
// ground stays exact), then the dither, last.
vec4 fx_groundFinish(vec3 lab, vec2 uv, vec2 local) {
  vec3 base = fx_oklab(u_base);
  float keep = fx_quietMask(uv) * fx_edgeMask(local);
  lab = mix(base, mix(base, lab, u_intensity), keep);
  vec3 rgb = fx_srgb(lab);
  rgb += (fx_rand(uvec3(uvec2(gl_FragCoord.xy), 7u)) - 0.5) * u_grain * keep;
  rgb += fx_tpdf(gl_FragCoord.xy) / 255.0;
  float a = fx_cover(fx_shapeDistance(gl_FragCoord.xy / u_dpr));
  return vec4(clamp(rgb, 0.0, 1.0) * a, a);
}
`;

/** Every ground reads the same tokens; each look adds its own. */
const GROUND_UNIFORMS = {
  u_base: { color: "--ui-fx-ground-base" },
  u_light: { color: "--ui-fx-ground-light" },
  u_intensity: { number: "--ui-fx-ground-intensity", fallback: 0.85 },
  u_quiet: { number: "--ui-fx-ground-quiet", fallback: 0.42 },
  u_quietX: { number: "--ui-fx-ground-quiet-x", fallback: 0.16 },
  u_quietY: { number: "--ui-fx-ground-quiet-y", fallback: 0.9 },
  u_dissolve: { number: "--ui-fx-ground-dissolve", fallback: 0 },
  u_grain: { number: "--ui-fx-grain-amount", fallback: 0 },
} satisfies Record<string, UniformSpec>;

export const SHADERS: Record<ShaderName, ShaderDef> = {
  /**
   * MESH — the quiet look. Five colour points drift on slow Lissajous paths
   * over a field bent by two low sine swirls; each pixel is their
   * inverse-distance blend, in OKLab. Low frequency by construction: no
   * noise octaves, so nothing reads as veins or dirt.
   */
  mesh: {
    name: "mesh",
    restTime: 6,
    adaptive: false,
    fps: 30,
    uniforms: {
      ...GROUND_UNIFORMS,
      u_distortion: { number: "--ui-fx-mesh-distortion", fallback: 1 },
    },
    fragment: `${GROUND}
uniform float u_distortion; // 0 = still points, 1 = the default swirl
void main() {
  vec2 local = fx_local();
  vec2 uv = local / (2.0 * u_box.x);
  float k = fx_aspect(), t = u_time * 0.12;
  vec3 B = fx_oklab(u_base), A = fx_oklab(u_light);
  vec2 p = uv;
  p += u_distortion * 0.08 * vec2(sin(2.1 * p.y + 1.3 * t + 1.7), sin(1.7 * p.x - 1.1 * t + 0.4));
  p += u_distortion * 0.04 * vec2(sin(3.3 * p.y - 0.9 * t + 4.0), sin(2.9 * p.x + 0.7 * t + 2.2));
  vec2 P[5]; vec3 C[5];
  // The ground itself is one of the points, held near the quiet corner.
  P[0] = vec2(0.10, 0.10 * k) + 0.04 * vec2(sin(0.5 * t), cos(0.4 * t));                C[0] = B;
  P[1] = vec2(0.82, 0.78 * k) + 0.14 * vec2(sin(0.43 * t + 2.0), cos(0.67 * t + 0.3));  C[1] = A;
  P[2] = vec2(0.30, 0.86 * k) + 0.14 * vec2(sin(0.59 * t + 4.1), cos(0.37 * t + 2.6));
  C[2] = fx_hueTurn(A, radians(24.0)); C[2].x = mix(B.x, A.x, 0.8);
  P[3] = vec2(0.58, 0.40 * k) + 0.16 * vec2(sin(0.31 * t + 1.2), cos(0.47 * t + 5.0));  C[3] = mix(B, A, 0.45);
  P[4] = vec2(0.95, 0.20 * k) + 0.12 * vec2(sin(0.27 * t + 3.3), cos(0.41 * t + 4.4));
  C[4] = fx_hueTurn(A, radians(-20.0)); C[4].x = mix(B.x, A.x, 0.9);
  vec3 sum = vec3(0.0); float wsum = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 d = p - P[i];
    float w = 1.0 / pow(dot(d, d) + 0.015, 1.6);
    sum += w * C[i]; wsum += w;
  }
  fragColor = fx_groundFinish(sum / wsum, uv, local);
}`,
  },

  /**
   * FOLD — the expressive look: light panes stacked along slowly bending
   * creases, each a soft body behind the crease and a sharp lit rim on it,
   * running in one direction. The look the benchmarks share (folded silk,
   * glass panes), written from scratch.
   */
  fold: {
    name: "fold",
    restTime: 6,
    adaptive: false,
    fps: 30,
    uniforms: {
      ...GROUND_UNIFORMS,
      u_angle: { number: "--ui-fx-fold-angle", fallback: 24 },
      u_sharp: { number: "--ui-fx-fold-sharpness", fallback: 70 },
    },
    fragment: `${GROUND}
uniform float u_angle;  // degrees: the direction the folds run
uniform float u_sharp;  // the rim's falloff: higher is a crisper edge
void main() {
  vec2 local = fx_local();
  float w = 2.0 * u_box.x;
  vec2 uv = local / w;
  float a = radians(u_angle), c = cos(a), s = sin(a);
  vec2 q = mat2(c, s, -s, c) * (uv - vec2(0.5, 0.5 * fx_aspect())) * 2.4;
  float px = 2.4 / (w * u_dpr);  // one device pixel, in q units: the crease's antialiasing
  float t = u_time * 0.12;
  vec3 B = fx_oklab(u_base), A = fx_oklab(u_light);
  // A small drift only: a wide turn sends a pale-yellow brand's folds to green.
  vec3 A2 = fx_hueTurn(A, radians(-20.0)); A2.x = mix(B.x, A.x, 0.85);
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
  fragColor = fx_groundFinish(lab, uv, local);
}`,
  },

  halo: {
    name: "halo",
    restTime: 2.2,
    bleed: 22,
    uniforms: {
      u_light: { color: "--ui-fx-halo-light" },
      u_ground: { color: "--ui-bg-base" },
      u_strength: { number: "--ui-fx-halo-strength", fallback: 0, live: true },
      u_loop: { number: "--ui-duration-loop", fallback: 2 },
    },
    idle: (v) => (v.u_strength as number) <= 0.001,
    fragment: `
uniform vec3 u_light;
uniform vec3 u_ground;
uniform float u_strength;  // 0..1, follows a CSS transition
uniform float u_loop;      // --ui-duration-loop, seconds: the light laps once per loop
uniform float u_bleed;
void main() {
  vec2 p = gl_FragCoord.xy / u_dpr - u_center;
  float d = fx_shapeDistance(gl_FragCoord.xy / u_dpr);
  float angle = atan(p.y * (u_box.x / max(u_box.y, 1.0)), p.x);
  vec2 ring = vec2(cos(angle), sin(angle));     // seamless round the edge
  float t = u_time * 0.35;
  float flow = fx_noise(ring * 1.8 + vec2(t, -0.7 * t), 21u) * 0.9 + 0.5;
  // One lap per --ui-duration-loop: a working button and its shimmering
  // status line keep one rhythm.
  float comet = pow(0.5 + 0.5 * cos(angle - u_time * 6.2831853 / max(u_loop, 0.1)), 10.0);
  float energy = clamp(0.3 + flow * 0.6 + comet * 0.9, 0.0, 1.6);
  float outside = max(d, 0.0);
  // No crisp edge line: a sharp ring would read as the focus indicator.
  float glow = exp(-outside / (0.26 * u_bleed));
  float alpha = 0.5 * glow * energy * u_strength * smoothstep(-1.0, 1.0, d);
  vec3 light = fx_oklab(u_light);
  // A small drift only: a wide hue turn sends a green brand's halo to yellow.
  vec3 lab = mix(light, fx_hueTurn(light, radians(-18.0)), 0.5 + 0.5 * sin(angle + t));
  lab.x += fx_oklab(u_ground).x > 0.6 ? -0.06 * comet : 0.05 * comet;
  // A long, faint falloff is a slow ramp too: dither its alpha, last.
  float a = clamp(alpha + step(0.002, alpha) * fx_tpdf(gl_FragCoord.xy) / 255.0, 0.0, 1.0);
  fragColor = vec4(fx_srgb(lab) * a, a);
}`,
  },
};
