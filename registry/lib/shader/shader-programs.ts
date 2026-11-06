/**
 * The shader programs of the effects layer (ADR 0022): aurora and halo, and
 * the GLSL they share. Paired with `@/lib/shader`, which runs them.
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
 *   4. It guards the contrast of the ink its part carries, per pixel
 *      (`fx_guard`), and the browser test samples the result.
 *
 * The GLSL prelude — hashing, noise, OKLab, the guard, the shape — is kept
 * as measured in the effects lab. Hash: lowbias32 by Chris Wellons (public
 * domain). OKLab: Björn Ottosson's published matrices (public domain).
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
float fx_fbm(vec2 p, uint salt) {
  float sum = 0.0, amp = 0.5;
  for (int o = 0; o < 4; o++) { sum += amp * fx_noise(p, salt + uint(o)); p = mat2(1.6, 1.2, -1.2, 1.6) * p; amp *= 0.5; }
  return sum;
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
float fx_luma(vec3 lin) { return dot(lin, vec3(0.2126, 0.7152, 0.0722)); }

// Soft limit: identity below 75% of 'lim', then eases toward 'lim' and never
// reaches it. Continuous slope at the knee, so a gradient that runs into the
// limit bends instead of flattening into a plateau with a visible edge.
float fx_softLimit(float y, float lim) {
  float k = 0.75 * lim;
  if (y <= k) return y;
  float r = max(lim - k, 1e-5);
  return k + r * (1.0 - exp(-(y - k) / r));
}

// The contrast guard. Keeps 'color' at least 'ratio' away from 'avoid', on
// the side where 'side' lies (lighter or darker). Contrast is a ratio of
// luminances and scaling linear RGB scales luminance exactly, so the pixel
// moves in one step. 2% margin covers 8-bit rounding. ratio 0 = off.
vec3 fx_guard(vec3 color, vec3 avoid, vec3 side, float ratio) {
  if (ratio <= 0.0) return color;
  float target = ratio * 1.02;
  vec3 lin = fx_toLinear(clamp(color, 0.0, 1.0));
  float y = fx_luma(lin);
  float ay = fx_luma(fx_toLinear(avoid));
  if (ay > fx_luma(fx_toLinear(side))) {
    float maxY = max((ay + 0.05) / target - 0.05, 0.0);
    float want = fx_softLimit(y, maxY);
    if (want < y) {
      // Darken in OKLab, KEEPING chroma: scaling linear RGB alone would grey
      // the light out exactly where the guard works hardest (a dark ground).
      // Then rescale to the exact luminance the limit allows.
      vec3 lab = fx_oklab(fx_toSrgb(lin));
      lab.x *= pow(want / max(y, 1e-5), 1.0 / 3.0);
      lin = fx_toLinear(fx_srgb(lab));
      lin *= want / max(fx_luma(lin), 1e-5);
    }
  } else {
    float minY = min(target * (ay + 0.05) - 0.05, 1.0);
    float want = 1.0 - fx_softLimit(1.0 - y, 1.0 - minY);
    if (want > y) lin = mix(lin, vec3(1.0), (want - y) / max(1.0 - y, 1e-4));
  }
  return fx_toSrgb(lin);
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
 * The aurora field. Light gathers in RIBBONS along two level lines of a
 * slowly folding noise field: crisp at the core, falling off over a long,
 * smooth tail. A broad haze sits under them so the light never stops
 * abruptly.
 */
const FIELD = `
vec2 fx_auroraMasks(vec2 p, float t) {
  vec2 warp = vec2(fx_fbm(0.8 * p + vec2(0.0, t), 11u), fx_fbm(0.8 * p + vec2(5.2, -t), 12u));
  vec2 q = p + 1.4 * warp;
  float f = fx_fbm(q + vec2(0.5 * t, 0.0), 13u);
  float g = fx_fbm(0.6 * q + vec2(7.0, -0.4 * t), 14u);
  float x1 = abs(f - 0.04);
  float x2 = abs(g + 0.03);
  float r1 = exp(-pow(x1 / 0.032, 2.0)) * 0.7 + exp(-x1 / 0.13) * 0.45;
  float r2 = exp(-pow(x2 / 0.045, 2.0)) * 0.6 + exp(-x2 / 0.16) * 0.4;
  float haze = smoothstep(-0.4, 0.5, f) * 0.22;
  float m1 = clamp(r1 + haze, 0.0, 1.0);
  return vec2(m1, clamp(r2, 0.0, 1.0) * (1.0 - 0.55 * r1));
}`;

export const SHADERS: Record<ShaderName, ShaderDef> = {
  aurora: {
    name: "aurora",
    restTime: 6,
    uniforms: {
      u_base: { color: "--ui-fx-aurora-base" },
      u_light: { color: "--ui-fx-aurora-light" },
      u_avoid: { color: "--ui-fx-aurora-guard-ink" },
      u_guard: { number: "--ui-fx-aurora-guard", fallback: 4.5 },
      u_intensity: { number: "--ui-fx-aurora-intensity", fallback: 0.7 },
      u_scale: { number: "--ui-fx-aurora-scale", fallback: 420 },
      u_grain: { number: "--ui-fx-grain-amount", fallback: 0 },
      u_dissolve: { number: "--ui-fx-aurora-dissolve", fallback: 0 },
      u_on: { number: "--ui-fx-on", fallback: 1, live: true },
    },
    idle: (v) => (v.u_on as number) <= 0.001,
    fragment: `
uniform vec3 u_base;      // the fill the effect replaces
uniform vec3 u_light;     // the brand light moving through it
uniform vec3 u_avoid;     // the ink that sits on it (guarded against)
uniform float u_guard;    // the contrast that ink keeps
uniform float u_intensity;
uniform float u_scale;    // feature size, CSS px
uniform float u_grain;
uniform float u_dissolve; // 0 = fill to the edge; >0 = fraction of the shape the light fades over
uniform float u_on;       // 0..1, follows the component's own state transition
${FIELD}
void main() {
  vec2 css = gl_FragCoord.xy / u_dpr;
  float d = fx_shapeDistance(css);
  vec2 m = fx_auroraMasks(css / u_scale, u_time * 0.05);
  // Dissolve: the light thins out toward the shape's edge, so a ground melts
  // into the page around it instead of ending at its border.
  float reach = u_dissolve * 2.0 * min(u_box.x, u_box.y);
  float fade = u_dissolve > 0.0 ? smoothstep(0.0, 1.0, clamp(-d / max(reach, 1.0), 0.0, 1.0)) : 1.0;
  vec3 base = fx_oklab(u_base);
  vec3 light = fx_oklab(u_light);
  vec3 lab = mix(base, light, m.x * u_intensity * fade);
  lab = mix(lab, fx_hueTurn(light, radians(55.0)), m.y * u_intensity * 0.8 * fade);
  vec3 rgb = fx_srgb(lab);
  // Static: grain that changes every frame reads as flicker, not texture.
  float n = fx_rand(uvec3(uvec2(gl_FragCoord.xy), 0u)) - 0.5;
  rgb += n * (1.5 / 255.0 + u_grain);
  rgb = fx_guard(rgb, u_avoid, u_base, u_guard);
  float a = fx_cover(d) * u_on;
  fragColor = vec4(rgb * a, a);
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
  float a = clamp(alpha, 0.0, 1.0);
  fragColor = vec4(fx_srgb(lab) * a, a);
}`,
  },
};
