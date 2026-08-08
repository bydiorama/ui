import test from "node:test";
import assert from "node:assert/strict";

import { resolveThemePair } from "../resolve.ts";
import { THEME_ZERO } from "../themes/zero.ts";
import { BRANDABLE_TOKENS, SCHEME_ONLY_TOKENS } from "../contract.ts";
import { FIXED_TOKEN_VALUES } from "../base.ts";
import { toTsConstants } from "./ts.ts";

const pair = resolveThemePair(THEME_ZERO);

test("every contract token is emitted exactly once", () => {
  const ts = toTsConstants(pair);
  for (const token of [...BRANDABLE_TOKENS, ...SCHEME_ONLY_TOKENS, ...Object.keys(FIXED_TOKEN_VALUES)]) {
    const occurrences = ts.split(`"${token}":`).length - 1;
    assert.equal(occurrences, 1, `${token} appears ${occurrences} times`);
  }
});

test("no var() reference survives into the emitted literals", () => {
  const ts = toTsConstants(pair);
  assert.ok(!ts.includes("var("), "a plain object cannot resolve var() at runtime");
});

test("a composite alias chain resolves to its final literal value", () => {
  // --ui-motion-micro: "var(--ui-duration-fast) var(--ui-ease-out)" in
  // base.ts — both parts must be substituted, not just the first.
  const ts = toTsConstants(pair);
  assert.ok(ts.includes('"--ui-motion-micro": "120ms cubic-bezier(0, 0, 0.2, 1)"'));
});

test("a single alias resolves too, not only composites", () => {
  // --ui-space-stack-md: "var(--ui-space-lg)" — 1rem in base.ts.
  const ts = toTsConstants(pair);
  assert.ok(ts.includes('"--ui-space-stack-md": "1rem"'));
});

test("the emitted module is syntactically valid TypeScript/JS", () => {
  const ts = toTsConstants(pair, { exportName: "zeroTokens" });
  // Strip the `export`/`as const`/type-alias lines new Function() can't parse
  // as a module, and evaluate the object literal itself.
  const objectLiteral = ts
    .replace(/^export const zeroTokens = /m, "")
    .replace(/ as const;\s*\n\nexport type TsTokenName[\s\S]*$/, "");
  assert.doesNotThrow(() => new Function(`return (${objectLiteral})`)());
});

test("scheme selection changes values that actually differ between schemes", () => {
  const light = toTsConstants(pair, { scheme: "light" });
  const dark = toTsConstants(pair, { scheme: "dark" });
  assert.notEqual(light, dark, "light and dark output must differ for theme zero");
  // --ui-bg-base is never the same string in both schemes for a real theme.
  const bgBaseLine = (ts: string) => ts.split("\n").find((l) => l.includes('"--ui-bg-base":'));
  assert.notEqual(bgBaseLine(light), bgBaseLine(dark));
});

test("defaults to light when no scheme is given", () => {
  assert.equal(toTsConstants(pair), toTsConstants(pair, { scheme: "light" }));
});

test("export name is configurable", () => {
  const ts = toTsConstants(pair, { exportName: "brandTokens" });
  assert.ok(ts.includes("export const brandTokens = {"));
  assert.ok(ts.includes("export type TsTokenName = keyof typeof brandTokens;"));
});
