import test from "node:test";
import assert from "node:assert/strict";

import { resolveThemePair } from "../resolve.ts";
import { THEME_ZERO } from "../themes/zero.ts";
import { BRANDABLE_TOKENS } from "../contract.ts";
import { FIXED_TOKEN_VALUES } from "../base.ts";
import { toCss, toStyleObject } from "./css.ts";

const pair = resolveThemePair(THEME_ZERO);

test("root CSS carries every token exactly once", () => {
  const css = toCss(pair, { scope: ":root" });
  for (const token of BRANDABLE_TOKENS) {
    const occurrences = css.split(`${token}:`).length - 1;
    assert.equal(occurrences, 1, `${token} appears ${occurrences} times`);
  }
  for (const token of Object.keys(FIXED_TOKEN_VALUES)) {
    // Duration tokens legitimately appear twice: base value + reduced-motion override.
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

test("reduced motion collapses durations at the token layer", () => {
  const css = toCss(pair);
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(/prefers-reduced-motion[\s\S]*--ui-duration-base: 1ms/.test(css));
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
