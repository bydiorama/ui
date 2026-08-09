#!/usr/bin/env node
// Print the geometry every shipped primitive actually uses, read from source.
//
// This exists because a Paper sheet drew Buttons as pills, fields with a 1px
// `border-control` edge and segmented controls at 32px rows — all of it
// token-clean, none of it what ships. `shape` defaults to `soft`, a field's
// resting edge is a 1.5px `border-subtle` hairline, and a Tab is `min-h-6`.
// The designer had read CONVENTIONS.md and the token contract and neither one
// carries a single one of those numbers: they live in the components, in
// `const` maps nobody thought to open.
//
// The fix is NOT a table in a skill. A transcribed table is a second copy of
// `button.tsx` that drifts the first time someone edits the real one, and the
// sheet built from the stale copy looks approvable. So this reads the source
// every time it runs and has nothing of its own to go stale.
//
// It reports; it does not fail. There is no correct answer to diff against —
// the output IS the answer, and its only job is to be in front of someone
// before they draw a control that already exists.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

const UI = join(ROOT, "registry/ui");

/**
 * The `const` maps worth surfacing. Anything named like geometry — sizes,
 * radii, variants — plus the default values of the props that select between
 * them, which is where `shape = "soft"` hides.
 */
const MAP_NAME = /^(SIZE|SIZES|SOFT_RADIUS|RADIUS|ICON_SIZE|VARIANT|VARIANTS|TONE|LEVEL|PAD|PADDING)$/;

/** `const NAME = { … } as const satisfies …` / `= { … };` */
function readConstMaps(source) {
  const out = [];
  const re = /^const\s+([A-Z_][A-Z0-9_]*)\s*(?::[^=]+)?=\s*\{$/gm;
  for (const m of source.matchAll(re)) {
    const name = m[1];
    if (!MAP_NAME.test(name)) continue;
    // Walk braces from the opening one so nested objects survive.
    let depth = 0;
    let i = source.indexOf("{", m.index);
    const start = i;
    for (; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    const body = source.slice(start + 1, i);
    const entries = [];
    // `key: "value"` — one per line is the house style; a value may wrap.
    for (const e of body.matchAll(/^\s{2}([A-Za-z][\w-]*)\s*:\s*([\s\S]*?),?\s*$(?=\n\s{2}[A-Za-z][\w-]*\s*:|\n?$)/gm)) {
      const value = e[2]
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\s+/g, " ")
        .replace(/"\s*\+?\s*"/g, "")
        .replace(/^"|",?$/g, "")
        .trim();
      if (value) entries.push([e[1], value]);
    }
    if (entries.length) out.push({ name, entries });
  }
  return out;
}

/** Base classes: the `cn(` argument list that is not size- or variant-keyed. */
function readBaseClasses(source) {
  const hits = [];
  for (const m of source.matchAll(/^\s*"((?:font-body|inline-flex|flex )[^"]*)",?\s*$/gm)) {
    hits.push(m[1]);
  }
  return [...new Set(hits)];
}

/** `{ shape = "soft", size = "md" }` in the destructured props. */
function readPropDefaults(source) {
  const out = [];
  for (const m of source.matchAll(/\b(variant|size|shape|tone|level|orientation)\s*=\s*"([\w-]+)"/g)) {
    out.push(`${m[1]} = "${m[2]}"`);
  }
  return [...new Set(out)];
}

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const names = readdirSync(UI)
  .filter((n) => existsSync(join(UI, n, `${n}.tsx`)))
  .filter((n) => !only.length || only.includes(n))
  .sort();

if (!names.length) {
  console.error(
    only.length ? `no component named ${only.join(", ")} in registry/ui` : "no components found",
  );
  process.exit(1);
}

console.log("Primitive geometry, read from registry/ui at run time.");
console.log("Draw these numbers. A control you draw from memory is an invention.\n");

for (const name of names) {
  const source = readFileSync(join(UI, name, `${name}.tsx`), "utf8");
  const maps = readConstMaps(source);
  const defaults = readPropDefaults(source);
  const base = readBaseClasses(source);
  if (!maps.length && !defaults.length) continue;

  console.log(`── ${name} ${"─".repeat(Math.max(0, 60 - name.length))}`);
  if (defaults.length) console.log(`   defaults   ${defaults.join("  ·  ")}`);
  for (const line of base) console.log(`   base       ${line}`);
  for (const map of maps) {
    console.log(`   ${map.name}`);
    for (const [key, value] of map.entries) {
      console.log(`     ${key.padEnd(10)} ${value}`);
    }
  }
  console.log();
}

console.log("Tailwind → CSS: h-8=32px h-10=40px h-11=44px h-6=24px size-8=32px square");
console.log("               p/px/py-xs=4 -sm=8 -md=12 -lg=16 -xl=24  ·  gap-* the same scale");
console.log("               rounded-sm=4 -md=8 -lg=16 -full  ·  ring-[1.5px] is an INSET ring,");
console.log("               drawn in Paper as `box-shadow: inset 0 0 0 1.5px <role>`, not a border.");
