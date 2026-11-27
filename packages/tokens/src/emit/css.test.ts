import test from "node:test";
import assert from "node:assert/strict";

import { resolveThemePair } from "../resolve.ts";
import { THEME_ZERO } from "../themes/zero.ts";
import { BRANDABLE_TOKENS } from "../contract.ts";
import { DENSITY_TOKENS, FIXED_TOKEN_VALUES, MOTION_LEVELS } from "../base.ts";
import { toCss, toStyleObject } from "./css.ts";

const pair = resolveThemePair(THEME_ZERO);

test("root CSS carries every token exactly once", () => {
  const css = toCss(pair, { scope: ":root" });
  for (const token of BRANDABLE_TOKENS) {
    const occurrences = css.split(`${token}:`).length - 1;
    assert.equal(occurrences, 1, `${token} appears ${occurrences} times`);
  }
  for (const token of Object.keys(FIXED_TOKEN_VALUES)) {
    // Motion-level tokens legitimately repeat: the base value, then one block
    // per level (ADR 0028).
    assert.ok(css.includes(`${token}:`), `${token} missing`);
  }
});

test("schemes are expressed as light-dark(), not duplicated blocks", () => {
  const css = toCss(pair);
  assert.ok(css.includes("light-dark("));
  assert.ok(!css.includes("@media (prefers-color-scheme"), "scheme must not use a media query");
  assert.ok(css.includes("color-scheme: light dark;"));
});

test("forcing a scheme is one declaration, not different tokens", () => {
  const auto = toCss(pair, { scheme: "auto" });
  const dark = toCss(pair, { scheme: "dark" });
  assert.ok(dark.includes("color-scheme: dark;"));
  // Identical except for that single declaration.
  assert.equal(
    auto.replace("color-scheme: light dark;", "color-scheme: dark;"),
    dark,
  );
});

test("identical light/dark values collapse to a single value", () => {
  const css = toCss(pair);
  // Radii do not vary by scheme, so they must not be wrapped.
  assert.ok(/--ui-radius-md: \d+px;/.test(css), "scheme-invariant token should be bare");
});

test("a brand scope omits the base tokens the document already has", () => {
  const css = toCss(pair, { scope: '[data-ui-theme="acme"]', includeBase: false });
  assert.ok(css.startsWith('[data-ui-theme="acme"] {'));
  assert.ok(!css.includes("--ui-z-modal"), "base tokens must not repeat in a nested scope");
  assert.ok(!css.includes("@media"), "reduced-motion override lives at the root");
});

/** The declarations inside the first block whose selector list starts with `head`. */
function blockAfter(css: string, head: string): string {
  const start = css.indexOf(head);
  assert.ok(start >= 0, `no block starting ${head}`);
  return css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
}

test("the OS preference gives `reduced`, not `off` (ADR 0028)", () => {
  const css = toCss(pair);
  const os = blockAfter(css, "@media (prefers-reduced-motion: reduce)");
  assert.match(os, /--ui-motion-level: reduced;/);
  assert.match(os, /--ui-motion-travel: 0;/);
  assert.match(os, /--ui-enter-scale: 1;/);
  // Change in place keeps its time, capped at base.
  assert.match(os, /--ui-duration-fast: 120ms;/);
  assert.match(os, /--ui-duration-enter: 200ms;/);
});

test("every level sets every motion key, so a subtree can return to full", () => {
  const css = toCss(pair);
  const keys = Object.keys(MOTION_LEVELS.full);
  for (const [level, head] of [
    ["full", '[data-ui-motion="full"] {'],
    ["reduced", '[data-ui-motion="reduced"],'],
    ["off", '[data-ui-motion="off"],'],
  ] as const) {
    const body = blockAfter(css, head);
    for (const key of keys) assert.ok(body.includes(`${key}:`), `${level} does not set ${key}`);
  }
  assert.match(blockAfter(css, '[data-ui-motion="off"],'), /--ui-duration-base: 1ms;/);
});

test("an explicit level comes after the OS block, and going down wins nesting", () => {
  const css = toCss(pair);
  assert.ok(
    css.indexOf('[data-ui-motion="full"] {') > css.indexOf("@media (prefers-reduced-motion: reduce)"),
    "full must follow the OS block to override it",
  );
  assert.ok(css.includes('[data-ui-motion="reduced"] [data-ui-motion="full"]'), "full inside reduced stays reduced");
  assert.ok(css.includes('[data-ui-motion="off"] [data-ui-motion]'), "anything inside off is off");
  assert.ok(css.indexOf('[data-ui-motion="off"],') > css.indexOf('[data-ui-motion="reduced"],'));
});

test("a nested brand scope never re-declares a motion-level token", () => {
  const css = toCss(pair, { scope: '[data-ui-theme="acme"]' });
  const scope = blockAfter(css, '[data-ui-theme="acme"] {');
  for (const key of Object.keys(MOTION_LEVELS.full)) {
    assert.ok(!scope.includes(`${key}:`), `${key} on a nested scope would reset the level inside it`);
  }
  assert.ok(!css.includes("prefers-reduced-motion"), "the levels live at the root");
});

test("the style object serialises no raw CSS and carries color-scheme", () => {
  const style = toStyleObject(pair, "dark");
  assert.equal(style["colorScheme"], "dark");
  assert.equal(Object.keys(style).length, BRANDABLE_TOKENS.length + 1);
  for (const value of Object.values(style)) {
    assert.ok(!value.includes(";"), "values must be inert (no declaration separators)");
    assert.ok(!value.includes("}"), "values must be inert (no block terminators)");
  }
});

test("composite values carry light-dark() per layer, never around the list", () => {
  const pair = resolveThemePair(THEME_ZERO);
  const css = toCss(pair);
  const shadowLines = css.split("\n").filter((l) => l.includes("--ui-shadow") || l.includes("--ui-focus-ring:"));
  for (const line of shadowLines) {
    assert.ok(!/light-dark\([^)]*px/.test(line.replace(/light-dark\((rgba?\([^)]*\)|#[0-9a-fA-F]+), (rgba?\([^)]*\)|#[0-9a-fA-F]+)\)/g, "PAIR")),
      `light-dark() must wrap colours only: ${line.trim()}`);
  }
  // The merged form is real: geometry outside, pair inside. Both inks are
  // DARK — this literal used to end `rgba(246, 243, 240, 0.16)`, a near-white,
  // and passed for the whole life of the scale because the assertion is about
  // the SHAPE of the pair and any two colours satisfy it (ADR 0016).
  assert.match(css, /--ui-shadow-sm: 0 0\.5px 1\.5px light-dark\(rgba\(29, 27, 25, 0\.16\), rgba\(23, 20, 17, 0\.256\)\);/);
  // And the upward cast merges the same way, negated only in its offsets.
  assert.match(css, /--ui-shadow-sm-up: 0 -0\.5px 1\.5px light-dark\(/);
});

test("density modes are emitted as attribute blocks, default included (ADR 0020 §4)", () => {
  const css = toCss(resolveThemePair(THEME_ZERO));
  for (const density of ["compact", "comfortable", "default"]) {
    assert.match(css, new RegExp(`\\[data-ui-density="${density}"\\] \\{`));
  }
  assert.match(css, /\[data-ui-density="compact"\] \{[^}]*--ui-control-lg-height: 2\.5rem;/);
  // A brand scope nested in a document never re-emits them.
  assert.doesNotMatch(toCss(resolveThemePair(THEME_ZERO), { scope: "[data-ui-theme=x]", includeBase: false }), /data-ui-density/);
});

test("the choice-row floor is density-bound: 24px by default, released only under compact", () => {
  const css = toCss(resolveThemePair(THEME_ZERO));
  // The row keeps its target floor everywhere but compact, where a dense
  // table's rows may fall to their content — the TARGET is carried by a
  // pseudo-element on the label, not by this height.
  assert.match(css, /:root \{[^]*?--ui-choice-row-min-height: var\(--ui-hit-area-min\);/);
  assert.match(css, /\[data-ui-density="compact"\] \{[^}]*--ui-choice-row-min-height: 0px;/);
  assert.match(css, /\[data-ui-density="comfortable"\] \{[^}]*--ui-choice-row-min-height: var\(--ui-hit-area-min\);/);
  // `default` is emitted too, so a default subtree inside a compact one
  // restores the floor by inheritance.
  assert.match(css, /\[data-ui-density="default"\] \{[^}]*--ui-choice-row-min-height: var\(--ui-hit-area-min\);/);
  // Every density-bound token is in every mode, or a mode inherits the last.
  for (const density of ["compact", "comfortable"] as const) {
    assert.deepEqual(Object.keys(DENSITY_TOKENS[density]).sort(), Object.keys(DENSITY_TOKENS.default).sort());
  }
  // The default block IS the fixed table.
  for (const [token, value] of Object.entries(DENSITY_TOKENS.default)) {
    assert.equal(FIXED_TOKEN_VALUES[token as keyof typeof FIXED_TOKEN_VALUES], value, token);
  }
});

test("a nested scope never re-declares control/field sizes, even with includeBase (review finding I2)", () => {
  // Density works by INHERITANCE: an ancestor `[data-ui-density="compact"]`
  // sets these custom properties, and anything nested inherits them — unless
  // something nested declares its own value, which always wins over an
  // inherited one. `includeBase` defaults to true and is documented as the
  // right call for a brand scope ("[data-ui-theme=\"acme\"]"), so if that
  // path re-declared the control/field sizes, EVERY brand scope would reset
  // density back to default for anything under it, silently.
  const css = toCss(resolveThemePair(THEME_ZERO), { scope: '[data-ui-theme="acme"]', includeBase: true });
  const scopeBlock = css.slice(css.indexOf('[data-ui-theme="acme"] {'), css.indexOf("\n}\n") + 3);
  for (const key of Object.keys(DENSITY_TOKENS.default)) {
    assert.ok(!scopeBlock.includes(`${key}:`), `nested scope must not declare ${key}, or it overrides an inherited density`);
  }
  // :root is the one place they DO belong — a document with no density
  // attribute anywhere still needs a value to inherit from.
  const root = toCss(resolveThemePair(THEME_ZERO), { scope: ":root", includeBase: true });
  assert.match(root, /:root \{[^]*?--ui-control-lg-height: 2\.75rem;/);
});
