import test from "node:test";
import assert from "node:assert/strict";

import { toTailwindTheme } from "./tailwind.ts";
import { BRANDABLE_TOKENS } from "../contract.ts";

/**
 * Two contract tokens must never collapse to one utility name.
 *
 * They did: `--ui-border-focus` and `--ui-focus-ring-color` both emitted
 * `--color-edge-focus`, so the second silently overwrote the first. Theme zero
 * gives them the same value, which is exactly why nothing caught it — a brand
 * that moved them apart would lose one with no error anywhere.
 */
test("the emitted theme has no duplicate variable names", () => {
  const names = [...toTailwindTheme().matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name!, (counts.get(name!) ?? 0) + 1);
  const duplicates = [...counts].filter(([, count]) => count > 1);
  assert.deepEqual(duplicates, [], "each contract token needs its own utility name");
});

test("no dimension token is emitted into the colour namespace", () => {
  const theme = toTailwindTheme();
  for (const token of BRANDABLE_TOKENS) {
    if (!/(width|ring$|gap|height)/.test(token)) continue;
    const utility = theme.split("\n").find((l) => l.includes(`var(${token})`) && l.includes("--color-"));
    assert.equal(utility, undefined, `${token} is a dimension and must not become a colour utility`);
  }
});
