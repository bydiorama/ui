import test from "node:test";
import assert from "node:assert/strict";

import { FADE_RAMP_DARK, FADE_RAMP_LIGHT, maskRamp, paintRamp } from "./fade-ramp.ts";

/*
 * The derivation, kept beside the tables it produced. The shipped module
 * carries the numbers only — the colour model and the error function stay
 * out of every bundle — and this file is what stops them being edited by
 * hand: change the curve or the calibration pair, and the tables must be
 * regenerated from here or the suite fails.
 */

/** Abramowitz & Stegun 7.1.26 — max error 1.5e-7, far under a stop's 0.001. */
function erf(x: number): number {
  const sign = Math.sign(x);
  const a = Math.abs(x);
  const k = 1 / (1 + 0.3275911 * a);
  const poly = ((((1.061405429 * k - 1.453152027) * k + 1.421413741) * k - 0.284496736) * k + 0.254829592) * k;
  return sign * (1 - poly * Math.exp(-a * a));
}

const MU = 0.55;
const SIGMA = 0.22;
const cdf = (t: number) => 0.5 * (1 + erf((t - MU) / (SIGMA * Math.SQRT2)));
const curve = (t: number) => (cdf(t) - cdf(0)) / (cdf(1) - cdf(0));

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function oklabL(rgb: number[]): number {
  const [r, g, b] = rgb.map(toLinear) as [number, number, number];
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  return 0.2104542553 * Math.cbrt(l) + 0.7936285728 * Math.cbrt(m) - 0.0040720461 * Math.cbrt(s);
}

/**
 * The fraction of ink's perceptual distance from the ground still visible
 * under a veil of that ground at `alpha` — composited as browsers do, in
 * gamma-encoded sRGB, then read in OKLab lightness.
 */
function visible(ink: string, ground: string, alpha: number): number {
  const i = hex(ink);
  const g = hex(ground);
  const mixed = i.map((v, k) => v * (1 - alpha) + g[k]! * alpha);
  return (oklabL(mixed) - oklabL(g)) / (oklabL(i) - oklabL(g));
}

function alphaFor(ink: string, ground: string, target: number): number {
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 48; k++) {
    const mid = (lo + hi) / 2;
    if (visible(ink, ground, mid) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Theme zero's text-secondary on bg-surface, light and dark — the middle of
// the five role pairs measured (see the polarity test below).
const LIGHT_PAIR = ["#2F2C29", "#FDFCFB"] as const;
const DARK_PAIR = ["#e1dedb", "#2F2C29"] as const;

const ts = FADE_RAMP_LIGHT.map((_, i) => i / (FADE_RAMP_LIGHT.length - 1));

test("the light table is the Gaussian penumbra, sampled at sixteenths", () => {
  ts.forEach((t, i) => {
    assert.ok(
      Math.abs(FADE_RAMP_LIGHT[i]! - curve(t)) <= 0.0006,
      `stop ${i}: shipped ${FADE_RAMP_LIGHT[i]}, curve ${curve(t).toFixed(4)}`,
    );
  });
});

test("the dark table leaves the same perceptual fraction of ink as the light one", () => {
  ts.forEach((t, i) => {
    const target = visible(...LIGHT_PAIR, curve(t));
    const expected = alphaFor(...DARK_PAIR, target);
    assert.ok(
      Math.abs(FADE_RAMP_DARK[i]! - expected) <= 0.0006,
      `stop ${i}: shipped ${FADE_RAMP_DARK[i]}, derived ${expected.toFixed(4)}`,
    );
  });
});

test("both ramps run exactly 0 → 1 and never turn back", () => {
  for (const [name, table] of [["light", FADE_RAMP_LIGHT], ["dark", FADE_RAMP_DARK]] as const) {
    assert.equal(table[0], 0, `${name} starts fully transparent`);
    assert.equal(table.at(-1), 1, `${name} ends on the solid ground`);
    for (let i = 1; i < table.length; i++) {
      assert.ok(table[i]! > table[i - 1]!, `${name} rises at stop ${i}`);
    }
  }
});

test("no corner at either end — the reason the ramp is not linear", () => {
  // A linear ramp's first and last steps are 1/16 = 0.0625. The eased ends
  // must be a fraction of that, or the Mach band this replaced is back.
  const first = FADE_RAMP_LIGHT[1]! - FADE_RAMP_LIGHT[0]!;
  const last = FADE_RAMP_LIGHT.at(-1)! - FADE_RAMP_LIGHT.at(-2)!;
  assert.ok(first < 0.0625 / 4, `the trail enters at ${first}`);
  assert.ok(last < 0.0625 / 2, `the edge arrives at ${last}`);
  // And the long side is the trail: the content half carries less of the
  // ramp than the edge half.
  assert.ok(curve(0.5) < 0.5, "the mean sits past the middle");
});

test("dark needs MORE alpha than light at every inner stop — the polarity effect", () => {
  for (let i = 1; i < FADE_RAMP_LIGHT.length - 1; i++) {
    assert.ok(FADE_RAMP_DARK[i]! > FADE_RAMP_LIGHT[i]!, `stop ${i}`);
  }
});

test("the correction is the polarity's, not the pair's — one table serves every ground", () => {
  // Same role on both sides, theme zero's light and dark values. If a pair
  // ever needs a materially different correction, one table is wrong.
  const pairs = [
    [["#1D1B19", "#FFFFFF"], ["#F6F3F0", "#423E3A"]], // primary / base
    [["#2F2C29", "#F6F3F0"], ["#e1dedb", "#373430"]], // secondary / elevated
    [["#69635D", "#FDFCFB"], ["#B7B0A9", "#2F2C29"]], // muted / surface
    [["#1D1B19", "#EDE8E3"], ["#F6F3F0", "#282522"]], // primary / sunken
  ] as const;
  for (const [light, dark] of pairs) {
    ts.forEach((t, i) => {
      const derived = alphaFor(dark[0], dark[1], visible(light[0], light[1], curve(t)));
      assert.ok(
        Math.abs(derived - FADE_RAMP_DARK[i]!) <= 0.03,
        `${light.join("/")} stop ${i}: ${derived.toFixed(3)} vs ${FADE_RAMP_DARK[i]}`,
      );
    });
  }
});

test("paintRamp: one stop per table entry, solid at the edge, switching per scheme", () => {
  const ramp = paintRamp("to bottom", "var(--ui-bg-base)");
  assert.match(ramp, /^linear-gradient\(to bottom, /);
  // 17 stops, 15 of which differ by scheme.
  assert.equal(ramp.match(/color-mix\(/g)?.length, 2 + 15 * 2);
  assert.equal(ramp.match(/light-dark\(/g)?.length, 15);
  assert.ok(ramp.endsWith("color-mix(in srgb, var(--ui-bg-base) 100%, transparent) 100%)"));
  assert.ok(ramp.includes(" 6.25%"), "stop positions are exact sixteenths");
});

test("maskRamp: cut at the edge, opaque at the depth — the paint's complement", () => {
  const ramp = maskRamp("to top", "var(--ui-space-3xl)");
  assert.match(ramp, /^linear-gradient\(to top, rgb\(0 0 0 \/ 0\) calc\(var\(--ui-space-3xl\) \* 0\)/);
  assert.ok(ramp.endsWith("rgb(0 0 0 / 1) calc(var(--ui-space-3xl) * 1))"));
  // The first inner stop from the edge is 1 − the paint's last inner alpha.
  assert.ok(ramp.includes(`rgb(0 0 0 / ${+(1 - FADE_RAMP_LIGHT[15]).toFixed(3)})`));
});
