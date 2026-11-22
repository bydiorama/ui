/**
 * The shader programs of the effects layer (ADR 0022, ADR 0025): the two
 * gradient ground (one parametric program: wash, sweep, fold, rise) and
 * halo, and the GLSL they share. Paired with
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

/**
 * A uniform's source: a colour token, a numeric one, or a KEYWORD one (its
 * value is one of `values`, sent as its index). `live` ones follow a CSS
 * transition. A numeric token set to `auto` reads as its fallback; NaN as a
 * fallback means "the look decides", filled in by the program's `resolve`.
 */
export type UniformSpec =
  | { color: string }
  | { number: string; fallback?: number; live?: boolean }
  | { keyword: string; values: readonly string[] };

export type UniformValues = Record<string, number | number[]>;

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
  idle?: (values: UniformValues) => boolean;
  /** Fill in what the tokens left to the program (`auto`): a look's own preset. */
  resolve?: (values: UniformValues) => void;
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
 * THE GRADIENT (ADR 0025): one ground, parametric. A look picks the form —
 * wash, sweep, fold or rise — and every other knob is shared: the two
 * colours, angle, sharpness, scale, chroma, intensity, the quiet zone, the
 * edge, grain. Any knob left at `auto` takes the look's own preset, so
 * `--ui-fx-gradient-look: rise` alone is a finished horizon. The looks do
 * not blend into each other (they are different forms), but everything
 * around the form is the same code.
 *
 * The palette is the two tokens and nothing else: the base it replaces and
 * the light moving over it. Every other tone is derived in OKLab.
 */
export const GRADIENT_LOOKS = ["wash", "sweep", "fold", "rise", "dawn"] as const;
export type GradientLook = (typeof GRADIENT_LOOKS)[number];

/** What `auto` means, per look. */
export const GRADIENT_PRESETS: Record<GradientLook, { angle: number; intensity: number; quiet: number; quietY: number }> = {
  /** A calm field that fills the frame. */
  wash: { angle: 0, intensity: 1, quiet: 0.42, quietY: 0.9 },
  /** Two big S-shaped forms, each lit across its body. */
  sweep: { angle: -28, intensity: 1, quiet: 0.42, quietY: 0.9 },
  /** Light panes along slow folds, a soft body and a sharp lit rim. */
  fold: { angle: 24, intensity: 0.85, quiet: 0.42, quietY: 0.9 },
  /**
   * A horizon: a bright rim low in the frame, glow above, body below. Copy
   * goes in the sky, and the zone is smaller: the sky is already quiet, and
   * a large ellipse there reaches down into the light.
   */
  rise: { angle: 0, intensity: 1, quiet: 0.3, quietY: 0.18 },
  /** A soft horizon: light rising from below the frame, no rim. Copy goes in the sky. */
  dawn: { angle: 0, intensity: 1, quiet: 0.3, quietY: 0.18 },
};

const GRADIENT = `
uniform vec3  u_base;       // the ground the light sits on
uniform vec3  u_light;      // the brand light
uniform float u_look;       // 0 wash, 1 sweep, 2 fold, 3 rise, 4 dawn
uniform float u_angle;      // degrees: the direction the forms run
uniform float u_sharpness;  // 0..1; 0.5 is the look's own edges and rims
uniform float u_scale;      // the forms' size; 1 is the look's own
uniform float u_chroma;     // colourfulness; 1 is the look's own
uniform float u_intensity;  // 0 = the base alone, 1 = the full field
uniform float u_quiet;      // quiet zone radius, as a fraction of the width; 0 = none
uniform float u_quietX;     // its centre, 0..1 across the box, left to right
uniform float u_quietY;     // and 0..1 down the box, top to bottom (as CSS reads it)
uniform float u_dissolve;   // 0 = fill to the edge; >0 = fraction of the short side the light fades over
uniform float u_grain;      // visible film grain; 0 = none (the dither is always on)

// The box in CSS px, y up (GL), and the field: x 0..1 across, y 0..aspect.
vec2 fx_local() { return gl_FragCoord.xy / u_dpr - (u_center - u_box); }
float fx_aspect() { return u_box.y / max(u_box.x, 1.0); }
float fx_isDark() { return fx_oklab(u_base).x < 0.5 ? 1.0 : 0.0; }
// Sharpness as a factor: 0.25 at 0, 1 at 0.5, 4 at 1.
float fx_sharp() { return exp2((u_sharpness - 0.5) * 4.0); }
// The field turned by the angle and sized by the scale, about its centre.
vec2 fx_frame(vec2 uv) {
  vec2 c = vec2(0.5, 0.5 * fx_aspect());
  float a = radians(u_angle);
  return mat2(cos(a), sin(a), -sin(a), cos(a)) * (uv - c) / max(u_scale, 0.05);
}

// A tone derived from the accent: a lightness, and its chroma scaled. Chroma
// shrinks as the tone darkens — a dark tone at full chroma reads electric,
// and a dark yellow at any real chroma reads olive.
vec3 fx_tone(vec3 accent, float lightness, float chroma) {
  return vec3(lightness, accent.yz * chroma * u_chroma * mix(0.45, 1.0, smoothstep(0.3, 0.85, lightness)));
}
// Shadows turn AWAY from yellow-green: a blue accent's go royal, a yellow's
// go amber instead of olive. +1 or -1: the direction a darker tone turns.
float fx_shadowTurn(vec3 accent) {
  float h = degrees(atan(accent.z, accent.y));
  h = h < 0.0 ? h + 360.0 : h;
  return (h > 110.0 && h < 290.0) ? 1.0 : -1.0;
}

// 0 inside the quiet zone's core (the copy), 1 outside it. An ellipse wider
// than tall, because a block of copy is. The core is HALF the radius, so the
// whole copy block sits on the exact base, then the field comes in.
vec2 fx_anchor() { return vec2(u_quietX, (1.0 - u_quietY) * fx_aspect()); }
float fx_quietMask(vec2 uv) {
  if (u_quiet <= 0.0) return 1.0;
  float d = length((uv - fx_anchor()) * vec2(0.75, 1.5));
  return smoothstep(0.5 * u_quiet, u_quiet, d);
}
// On a look that fills the frame, an ellipse of base reads as a stain. These
// make the quiet side part of the composition: light falling away toward the
// copy over a long reach, or light from a direction.
float fx_falloff(vec2 uv) {
  if (u_quiet <= 0.0) return 1.0;
  float d = length((uv - fx_anchor()) * vec2(0.75, 1.5));
  return smoothstep(0.35 * u_quiet, 1.6 * u_quiet, d);
}
float fx_lightFrom(vec2 uv) {
  if (u_quiet <= 0.0) return 1.0;
  return smoothstep(0.02, 0.62, dot(uv - fx_anchor(), normalize(vec2(1.0, 0.75))));
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

// ---- the looks: each returns the field's colour in OKLab

// WASH: broad gaussian pools drifting over a ramp between two derived tones.
// No point is small, so nothing reads as a spot.
vec3 fx_wash(vec2 uv, float t, float dk, vec3 B, vec3 A) {
  float k = fx_aspect();
  vec2 p = fx_frame(uv) + vec2(0.5, 0.5 * k);
  vec3 deep = fx_tone(A, mix(0.74, 0.46, dk), mix(1.35, 1.7, dk));
  vec3 mid = fx_tone(fx_hueTurn(A, radians(16.0)), mix(0.86, 0.64, dk), mix(1.2, 1.5, dk));
  vec3 pale = fx_tone(A, mix(0.95, 0.80, dk), 0.9);
  vec3 ramp = mix(deep, mid, smoothstep(0.0, k, p.y));
  vec2 P[4]; vec3 C[4];
  P[0] = vec2(0.25, 0.75 * k) + 0.18 * vec2(sin(0.7 * t), cos(0.5 * t));             C[0] = pale;
  P[1] = vec2(0.75, 0.30 * k) + 0.20 * vec2(cos(0.6 * t + 1.0), sin(0.4 * t));       C[1] = deep;
  P[2] = vec2(0.85, 0.85 * k) + 0.16 * vec2(sin(0.5 * t + 2.0), cos(0.7 * t));       C[2] = mid;
  P[3] = vec2(0.45, 0.25 * k) + 0.18 * vec2(cos(0.4 * t + 3.0), sin(0.6 * t + 1.0)); C[3] = fx_tone(fx_hueTurn(A, radians(-14.0)), mix(0.80, 0.52, dk), 1.25);
  float spread = 0.09 / fx_sharp();  // sharper: tighter pools
  vec3 sum = ramp * 0.25; float wsum = 0.25;
  for (int i = 0; i < 4; i++) {
    vec2 d = p - P[i];
    float w = exp(-dot(d, d) / spread);
    sum += w * C[i]; wsum += w;
  }
  return mix(B, sum / wsum, fx_falloff(uv));
}

// SWEEP: two big S-shaped forms, each lit across its body — brightest at its
// edge — with a shadow cast in front of the edge.
float fx_sweepForm(vec2 q, float t, float phase, float amp) {
  return q.y - amp * sin(1.15 * q.x + 0.35 * t + phase) - 0.18 * sin(2.3 * q.x - 0.25 * t + 2.0 * phase);
}
vec3 fx_sweep(vec2 uv, float t, float dk, vec3 B, vec3 A) {
  vec2 q = fx_frame(uv) * 2.2;
  float sh = fx_sharp();
  vec3 lab;
  if (dk > 0.5) {
    // Dark stays inside the accent's hue family: mixing the light into a warm
    // near-black base reads as grey-teal fog. The base returns only under the copy.
    float dir = fx_shadowTurn(A);
    vec3 navy = fx_tone(fx_hueTurn(A, radians(22.0 * dir)), 0.20, 0.55);
    vec3 blue = fx_tone(fx_hueTurn(A, radians(18.0 * dir)), 0.56, 1.8);
    vec3 cyan = fx_tone(fx_hueTurn(A, radians(-10.0 * dir)), 0.82, 1.45);
    vec3 hi = fx_tone(fx_hueTurn(A, radians(-6.0 * dir)), 0.95, 0.9);
    lab = mix(navy, blue, 0.25 + 0.3 * smoothstep(-1.2, 1.2, q.y));
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      float f = fx_sweepForm(q + vec2(0.0, 0.55 - 1.1 * fi), t, 1.7 * fi, 0.55 - 0.15 * fi);
      float inside = smoothstep(-0.012 / sh, 0.03 / sh, f);
      lab = mix(lab, navy, (1.0 - inside) * exp(-max(-f, 0.0) * 3.2) * 0.75);
      float body = exp(-max(f, 0.0) * 1.1);
      vec3 tone = fi < 0.5 ? mix(blue, cyan, body) : mix(navy, blue, 0.35 + 0.65 * body);
      tone = mix(tone, hi, exp(-max(f, 0.0) * 14.0 * sh) * (fi < 0.5 ? 0.55 : 0.25));
      lab = mix(lab, tone, inside);
    }
    return mix(navy, lab, fx_lightFrom(uv));
  }
  vec3 deep = fx_tone(fx_hueTurn(A, radians(-14.0)), 0.68, 1.5);
  vec3 bright = fx_tone(fx_hueTurn(A, radians(8.0)), 0.97, 1.15);
  lab = mix(B, deep, 0.55);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float f = fx_sweepForm(q + vec2(0.0, 0.55 - 1.1 * fi), t, 1.7 * fi, 0.55 - 0.15 * fi);
    float inside = smoothstep(-0.02 / sh, 0.05 / sh, f);
    lab = mix(lab, deep, (1.0 - inside) * exp(-max(-f, 0.0) * 5.0) * 0.6);
    lab = mix(lab, mix(deep, bright, exp(-max(f, 0.0) * 2.6)), inside * (0.75 - 0.2 * fi));
  }
  return mix(B, lab, fx_falloff(uv));
}

// FOLD: light panes stacked along slowly bending creases, each a soft body
// behind the crease and a sharp lit rim on it.
vec3 fx_fold(vec2 uv, float t, float dk, vec3 B, vec3 A) {
  vec2 q = fx_frame(uv) * 2.4;
  float px = 2.4 / (2.0 * u_box.x * u_dpr * max(u_scale, 0.05));  // one device pixel in q units
  vec3 Ac = vec3(A.x, A.yz * u_chroma);
  // A small drift only: a wide turn sends a pale-yellow brand's folds to green.
  vec3 A2 = fx_hueTurn(Ac, radians(-20.0)); A2.x = mix(B.x, A.x, 0.85);
  float rimK = 70.0 * fx_sharp();
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
    float rim = exp(-back * rimK);
    vec3 tint = mix(mix(B, Ac, 0.55), mix(Ac, A2, 0.5 + 0.5 * sin(2.1 * fi + 0.8 * q.x)), body);
    lab = mix(lab, tint, pane * (0.42 * body + 0.55 * rim));
  }
  return lab;
}

// RISE: a horizon. A bright rim along a gently moving arc low in the frame,
// a wide glow above it fading into the ground, and the body below falling
// from the glow into a deep tone. One focal edge.
vec3 fx_rise(vec2 uv, float t, float dk, vec3 B, vec3 A) {
  float k = fx_aspect();
  vec2 p = fx_frame(uv);
  float px = 1.0 / (2.0 * u_box.x * u_dpr * max(u_scale, 0.05));
  vec3 deep = fx_tone(fx_hueTurn(A, radians(14.0)), mix(0.62, 0.34, dk), 1.6);
  vec3 glow = fx_tone(A, mix(0.86, 0.74, dk), 1.3);
  vec3 rim = fx_tone(fx_hueTurn(A, radians(-10.0)), 0.97, 0.9);
  float x = p.x;
  float edge = -0.20 * k - 0.55 * x * x + 0.025 * sin(3.1 * x + 0.5 * t) + 0.012 * sin(6.0 * x - 0.4 * t);
  float sd = p.y - edge;                       // > 0 above the horizon
  float above = smoothstep(-px, px, sd);
  float halo = exp(-max(sd, 0.0) / (0.22 * k));
  float core = exp(-abs(sd) * fx_sharp() / 0.010);
  vec3 sky = mix(B, deep, halo * 0.55);
  sky = mix(sky, glow, halo * halo * 0.75);
  vec3 body = mix(glow, deep, smoothstep(0.0, 0.22 * k, -sd));
  return mix(mix(body, sky, above), rim, core * 0.9);
}

// DAWN: a soft horizon — light rising from below the frame, with no rim.
// One smooth field of light (a wide hill and a hot core inside it, with
// calm, slowly moving tops) mapped through a colour ramp whose chroma PEAKS
// near the top of the ramp: the colour is strongest where the core meets the
// halo, as in a real glow, and not spread as flat layers. Sharpness sets how
// long the hills' shoulders are.
float fx_hill(float h, float top, float soft) {
  float g = clamp((top + soft - h) / (1.6 * soft), 0.0, 1.0);
  return g * g * g * (g * (g * 6.0 - 15.0) + 10.0);  // smootherstep: no visible knee
}
vec3 fx_dawn(vec2 uv, float t, float dk, vec3 B, vec3 A) {
  float k = fx_aspect();
  vec2 p = fx_frame(uv);
  float h = p.y + 0.5 * k;                      // 0 at the bottom of the frame
  float x = p.x;
  float sh = fx_sharp();
  float wide = 0.46 * k - 0.08 * x * x + 0.018 * sin(2.1 * x + 0.40 * t + 0.7) + 0.008 * sin(4.6 * x - 0.30 * t);
  float hot = 0.24 * k - 0.06 * x * x + 0.014 * sin(1.7 * x - 0.35 * t + 2.2) + 0.006 * sin(4.0 * x + 0.25 * t + 1.0);
  float e = 0.55 * fx_hill(h, wide, 0.36 * k / sh) + 0.45 * fx_hill(h, hot, 0.14 * k / sh);
  float dir = fx_shadowTurn(A);
  // The ramp, from the sky (e = 0) to the heart of the light (e = 1).
  // Dark: base, a deep saturated halo, the accent at full chroma, near white.
  // Light: base, a pale tint, the accent at full chroma, a lighter tint — on
  // a white page the light is colour at its edge, not brightness.
  vec3 halo = fx_tone(fx_hueTurn(A, radians(16.0 * dir)), mix(0.88, 0.40, dk), mix(0.9, 1.6, dk));
  vec3 vivid = fx_tone(fx_hueTurn(A, radians(-6.0 * dir)), mix(0.74, 0.80, dk), 1.55);
  vec3 heart = fx_tone(fx_hueTurn(A, radians(-10.0 * dir)), mix(0.94, 0.98, dk), mix(0.6, 0.28, dk));
  vec3 lab = mix(B, halo, smoothstep(0.0, 0.42, e));
  lab = mix(lab, vivid, smoothstep(0.34, 0.74, e));
  lab = mix(lab, heart, smoothstep(0.72, 1.0, e));
  return lab;
}

void main() {
  vec2 local = fx_local();
  vec2 uv = local / (2.0 * u_box.x);
  float t = u_time * 0.1, dk = fx_isDark();
  vec3 B = fx_oklab(u_base), A = fx_oklab(u_light);
  vec3 lab = u_look < 0.5 ? fx_wash(uv, t, dk, B, A)
           : u_look < 1.5 ? fx_sweep(uv, t, dk, B, A)
           : u_look < 2.5 ? fx_fold(uv, 1.2 * t, dk, B, A)
           : u_look < 3.5 ? fx_rise(uv, t, dk, B, A)
           : fx_dawn(uv, t, dk, B, A);
  // Back to the base wherever the light must not be (the quiet zone, a
  // dissolving edge, a lower intensity); then grain outside the zone only,
  // so the copy's ground stays exact; then the dither, last.
  float keep = fx_quietMask(uv) * fx_edgeMask(local);
  lab = mix(B, mix(B, lab, u_intensity), keep);
  vec3 rgb = fx_srgb(lab);
  rgb += (fx_rand(uvec3(uvec2(gl_FragCoord.xy), 7u)) - 0.5) * u_grain * keep;
  rgb += fx_tpdf(gl_FragCoord.xy) / 255.0;
  float a = fx_cover(fx_shapeDistance(gl_FragCoord.xy / u_dpr));
  fragColor = vec4(clamp(rgb, 0.0, 1.0) * a, a);
}
`;

export const SHADERS: Record<ShaderName, ShaderDef> = {
  gradient: {
    name: "gradient",
    restTime: 6,
    adaptive: false,
    fps: 30,
    uniforms: {
      u_base: { color: "--ui-fx-gradient-base" },
      u_light: { color: "--ui-fx-gradient-light" },
      u_look: { keyword: "--ui-fx-gradient-look", values: GRADIENT_LOOKS },
      u_angle: { number: "--ui-fx-gradient-angle", fallback: NaN },
      u_sharpness: { number: "--ui-fx-gradient-sharpness", fallback: 0.5 },
      u_scale: { number: "--ui-fx-gradient-scale", fallback: 1 },
      u_chroma: { number: "--ui-fx-gradient-chroma", fallback: 1 },
      u_intensity: { number: "--ui-fx-gradient-intensity", fallback: NaN },
      u_quiet: { number: "--ui-fx-gradient-quiet", fallback: NaN },
      u_quietX: { number: "--ui-fx-gradient-quiet-x", fallback: 0.16 },
      u_quietY: { number: "--ui-fx-gradient-quiet-y", fallback: NaN },
      u_dissolve: { number: "--ui-fx-gradient-dissolve", fallback: 0 },
      u_grain: { number: "--ui-fx-grain-amount", fallback: 0 },
    },
    resolve: (v) => {
      const preset = GRADIENT_PRESETS[GRADIENT_LOOKS[v.u_look as number] ?? "wash"];
      if (Number.isNaN(v.u_angle)) v.u_angle = preset.angle;
      if (Number.isNaN(v.u_intensity)) v.u_intensity = preset.intensity;
      if (Number.isNaN(v.u_quiet)) v.u_quiet = preset.quiet;
      if (Number.isNaN(v.u_quietY)) v.u_quietY = preset.quietY;
    },
    fragment: GRADIENT,
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
