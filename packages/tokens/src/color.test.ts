import test from "node:test";
import assert from "node:assert/strict";

import {
  parseColor, toHex, formatColor, rgbToOklch, oklchToRgb, toOklch,
  shiftL, towardL, withAlpha, flatten, contrastRatio, readableInkOn,
  legibleOn, isDark, AA_TEXT,
} from "./color.ts";

const INKS = ["#111111", "#ffffff"] as const;

test("parses every colour form a brand seed can arrive in", () => {
  assert.deepEqual(parseColor("#fff"), { r: 1, g: 1, b: 1, a: 1 });
  assert.equal(toHex(parseColor("#1a1a2e")!), "#1a1a2e");
  assert.equal(parseColor("rgba(255, 0, 0, 0.5)")!.a, 0.5);
  assert.equal(parseColor("rgb(0 0 0)")!.r, 0);
  assert.equal(parseColor("#00000080")!.a, 128 / 255);
  assert.equal(parseColor("not a colour"), null);
  assert.equal(parseColor("chartreuse"), null, "named colours are deliberately unsupported");
});

test("OKLCH round-trips without visible drift", () => {
  for (const hex of ["#000000", "#ffffff", "#1a1a2e", "#e11d48", "#2d6a4f", "#f4f4f2"]) {
    const back = toHex(oklchToRgb(rgbToOklch(parseColor(hex)!)));
    assert.equal(back, hex, `${hex} round-tripped to ${back}`);
  }
});

test("lightness matches perception at the extremes", () => {
  assert.ok(toOklch("#ffffff")!.L > 0.99);
  assert.ok(toOklch("#000000")!.L < 0.01);
  // The sRGB trap this whole module exists to avoid: equal nominal value,
  // very different apparent lightness.
  assert.ok(toOklch("#ffff00")!.L > toOklch("#0000ff")!.L + 0.3);
});

test("contrast ratio matches the WCAG reference points", () => {
  assert.equal(Math.round(contrastRatio("#000000", "#ffffff")), 21);
  assert.equal(Math.round(contrastRatio("#ffffff", "#ffffff")), 1);
  assert.ok(Math.abs(contrastRatio("#767676", "#ffffff") - 4.54) < 0.05);
});

test("translucent colours are composited before measuring", () => {
  // Meaningless without compositing; must not throw or return 1.
  const ratio = contrastRatio("#111111", "rgba(255, 255, 255, 0.5)");
  assert.ok(ratio > 1);
});

test("shiftL moves lightness in the requested direction", () => {
  assert.ok(toOklch(shiftL("#808080", 0.1))!.L > toOklch("#808080")!.L);
  assert.ok(toOklch(shiftL("#808080", -0.1))!.L < toOklch("#808080")!.L);
  assert.equal(shiftL("#ffffff", 0.5), "#ffffff", "clamps rather than wrapping");
});

test("towardL fades toward a target while keeping its own hue", () => {
  const faded = towardL("#e11d48", "#ffffff", 0.5);
  const original = toOklch("#e11d48")!;
  const result = toOklch(faded)!;
  assert.ok(result.L > original.L);
  assert.ok(Math.abs(result.h - original.h) < 1, "hue preserved");
});

test("alpha and compositing", () => {
  assert.equal(withAlpha("#000000", 0.5), "rgba(0, 0, 0, 0.5)");
  assert.equal(flatten("rgba(0, 0, 0, 0.5)", "#ffffff"), "#808080");
  assert.equal(flatten("#123456", "#ffffff"), "#123456", "opaque input is unchanged");
});

test("readableInkOn picks the legible ink for accents nobody anticipated", () => {
  assert.equal(readableInkOn("#0b1e3f", INKS), "#ffffff", "navy takes white");
  assert.equal(readableInkOn("#ffe066", INKS), "#111111", "pale yellow takes dark");
});

test("legibleOn reaches the AA floor from either side", () => {
  for (const [color, bg] of [
    ["#7dd3fc", "#ffffff"], // too light on white
    ["#1e3a5f", "#0b1220"], // too dark on near-black
    ["#e11d48", "#f4f4f2"],
  ] as const) {
    const fixed = legibleOn(color, bg);
    assert.ok(
      contrastRatio(fixed, bg) >= AA_TEXT - 0.01,
      `${color} on ${bg} reached only ${contrastRatio(fixed, bg).toFixed(2)}`,
    );
  }
});

test("legibleOn leaves an already-passing colour alone", () => {
  assert.equal(legibleOn("#111111", "#ffffff"), "#111111");
});

test("legibleOn degrades gracefully when the target is unreachable", () => {
  // Nothing clears 21:1 against mid-grey; must return its best effort.
  const result = legibleOn("#808080", "#808080", 21);
  assert.ok(parseColor(result) !== null);
});

test("isDark decides which way raised and recessed point", () => {
  assert.equal(isDark("#0a0a0a"), true);
  assert.equal(isDark("#f4f4f2"), false);
});

test("formatColor emits the shortest form a browser reads identically", () => {
  assert.equal(formatColor({ r: 1, g: 0, b: 0, a: 1 }), "#ff0000");
  assert.equal(formatColor({ r: 1, g: 0, b: 0, a: 0.25 }), "rgba(255, 0, 0, 0.25)");
});
