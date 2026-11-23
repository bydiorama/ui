import test from "node:test";
import assert from "node:assert/strict";

import { toTailwindTheme } from "./tailwind.ts";
import { BRANDABLE_TOKENS } from "../contract.ts";
import { STEPPED_ROLES, TYPE_ROLES } from "../resolve.ts";

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

test("bare border, ring and outline read the brand's default stroke (ADR 0020 §2)", () => {
  // Tailwind 4 reads `--default-*-width` for the bare utilities. Mapping them
  // onto the stroke token is what makes the everyday 1px edge brandable with
  // no call-site change at all.
  const theme = toTailwindTheme();
  for (const key of ["--default-border-width", "--default-ring-width", "--default-outline-width"]) {
    assert.match(theme, new RegExp(`${key}: var\\(--ui-stroke-default\\);`));
  }
  assert.match(theme, /--ring-width-hairline: var\(--ui-stroke-hairline\);/);
  assert.match(theme, /--outline-width-focus: var\(--ui-focus-ring-width\);/);
  assert.match(theme, /--outline-offset-focus: var\(--ui-focus-ring-offset\);/);
  // A width must never land in the colour namespace, where it would mint
  // `bg-stroke-hairline` — a colour whose value is 1.5px.
  assert.doesNotMatch(theme, /--color-(stroke|focus-ring-(width|offset))/);
});

test("a type role is a composite: size plus weight, leading and tracking companions", () => {
  const theme = toTailwindTheme();
  assert.match(theme, /--text-body-md: var\(--ui-text-body-md\);/);
  assert.match(theme, /--text-body-md--font-weight: var\(--ui-text-body-md-weight\);/);
  assert.match(theme, /--text-body-md--line-height: var\(--ui-text-body-md-leading\);/);
  assert.match(theme, /--text-body-md--letter-spacing: var\(--ui-text-body-md-tracking\);/);
  // The attribute tokens share the --ui-text- prefix with sizes AND inks;
  // neither namespace may claim them.
  assert.doesNotMatch(theme, /--text-body-md-weight:/, "a font size of 400");
  assert.doesNotMatch(theme, /--color-ink-body-md-weight:/, "a colour of 400");
});

test("every role in the type table is a size, never an ink", () => {
  const theme = toTailwindTheme();
  for (const token of Object.keys(TYPE_ROLES)) {
    const role = token.replace(/^--ui-text-/, "");
    assert.match(theme, new RegExp(`--text-${role}: var\\(${token}\\);`), `${role} is not a size`);
    assert.doesNotMatch(theme, new RegExp(`--color-ink-${role}:`), `${role} became a colour`);
  }
});

test("a stepped role mixes its two table roles on --ui-type-step, attribute by attribute (ADR 0025)", () => {
  const theme = toTailwindTheme();
  for (const [name, step] of Object.entries(STEPPED_ROLES)) {
    const a = `--ui-text-${step.default}`;
    const b = `--ui-text-${step.compact}`;
    const mix = (x: string, y: string) =>
      `calc(var(${x}) + (var(${y}) - var(${x})) * var(--ui-type-step))`.replace(/[()*+]/g, "\\$&");
    assert.match(theme, new RegExp(`--text-${name}: ${mix(a, b)};`));
    assert.match(theme, new RegExp(`--text-${name}--font-weight: ${mix(`${a}-weight`, `${b}-weight`)};`));
    assert.match(theme, new RegExp(`--text-${name}--line-height: ${mix(`${a}-leading`, `${b}-leading`)};`));
    assert.match(theme, new RegExp(`--text-${name}--letter-spacing: ${mix(`${a}-tracking`, `${b}-tracking`)};`));
    // A stepped role's name must not also be a COLOUR: Tailwind resolves
    // `text-<name>` against both namespaces, and `text-nav` would have
    // painted the row in the rail's background colour.
    assert.doesNotMatch(theme, new RegExp(`--color-${name}:`));
  }
});

test("the row sizes are purpose-named spacing (ADR 0025)", () => {
  const theme = toTailwindTheme();
  for (const [key, token] of [
    ["row-inset", "--ui-row-inset"],
    ["row-block-inset", "--ui-row-block-inset"],
    ["row", "--ui-row-min-height"],
    ["nav-row", "--ui-nav-row-min-height"],
    ["nav-rail-item", "--ui-nav-rail-item-size"],
  ] as const) {
    assert.match(theme, new RegExp(`--spacing-${key}: var\\(${token}\\);`));
  }
});
