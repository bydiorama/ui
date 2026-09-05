#!/usr/bin/env node
// An anchored panel must never render outside the viewport.
//
// Base UI already does half of this for us, which is precisely why the other
// half went missing: flipping (`side`) and shifting (`align`) are ON by
// default, so a panel near an edge visibly moves to stay in view, and the
// behaviour looks complete. It is not. Repositioning cannot help a panel that
// is simply BIGGER than the space it has — and every panel in this library
// carried a fixed cap (`max-h-64`, a flat 256px) that knew nothing about the
// window. On a short viewport the panel ran off the bottom and the rows past
// the fold were unreachable by pointer.
//
// The positioner measures the space it found and publishes it as
// `--available-width` / `--available-height`. Constraining to those is what
// turns "it moves out of the way" into "it always fits".
//
// Two requirements, because each fails differently:
//
//   collisionPadding      the panel is not flush against the window edge when
//                         it flips or shifts. Cosmetic alone; without it a
//                         panel can sit hard against the chrome.
//   --available-height    the panel is never taller than its space. This is
//                         the one that loses content, and the one no visual
//                         or contrast gate can see, because at a comfortable
//                         window size nothing is wrong.
//
// `--available-width` is required alongside the height for the same reason in
// the other axis: a wide panel anchored to a trigger near the right edge.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

/**
 * Anchored surfaces that deliberately do NOT constrain themselves, with the
 * reason. Empty today, and the entry cost is one sentence — which is the
 * moment to ask whether the surface is really anchored at all.
 *
 * Note what is NOT in scope: Modal, Sheet and Drawer are anchored to the
 * VIEWPORT, not to an element. They cannot collide with an edge they are
 * measured against, and they have no positioner.
 */
const ALLOWED = new Map();

/** The Base UI part that does anchored positioning. */
const POSITIONER = /\.Positioner\b/;

const REQUIRED = [
  {
    what: "collisionPadding",
    test: /collisionPadding/,
    fix: "set `collisionPadding` on the Positioner so the panel keeps a gap from the window edge when it flips or shifts",
  },
  {
    what: "--available-height",
    test: /max-h-\(--available-height\)/,
    fix: "cap the panel with `max-h-(--available-height)` — a fixed `max-h-*` knows nothing about the viewport, and a panel taller than its space loses the rows past the fold",
  },
  {
    what: "--available-width",
    test: /max-w-\(--available-width\)/,
    fix: "cap the panel with `max-w-(--available-width)` for the same reason in the horizontal axis",
  },
];

/** Comments are not code — the lesson check:utilities and check:controls both learned. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * A constraint can live in a RECIPE the component composes.
 *
 * This gate reads one file and asks whether it caps itself. That held while
 * every panel wrote its own classes — and stopped holding the moment Menu and
 * ContextMenu moved their shared panel into `lib/menu-surface`, where both
 * caps are present and correct and neither component file mentions them. The
 * gate reported two components as unconstrained while the browser test was
 * asserting, on both, that the resolved max-height equals the positioner's
 * published measurement.
 *
 * So the file is the wrong unit: what matters is the CSS the panel ends up
 * with. Any `@/lib/*` module the component imports is read alongside it —
 * which is also the first-of-its-kind rule applied to a gate's own input,
 * exactly as check:utilities had to learn that a `.ts` file can be entirely
 * utility classes.
 */
const LIB_IMPORT = /from\s+["']@\/lib\/([\w-]+)["']/g;

function sourceWithRecipes(file, source) {
  let out = source;
  for (const [, name] of source.matchAll(LIB_IMPORT)) {
    const recipe = join(ROOT, "registry/lib", name, `${name}.ts`);
    if (existsSync(recipe)) out += `\n${stripComments(readFileSync(recipe, "utf8"))}`;
  }
  return out;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const errors = [];
let anchored = 0;

for (const file of walk(join(ROOT, "registry/ui"))) {
  if (!file.endsWith(".tsx")) continue;
  if (/\.(test|stories)\.tsx$/.test(file)) continue;
  const rel = relative(ROOT, file);
  const source = stripComments(readFileSync(file, "utf8"));
  if (!POSITIONER.test(source)) continue;
  anchored++;
  if (ALLOWED.has(rel)) continue;
  // Read the panel's actual CSS, recipe included — see sourceWithRecipes.
  const effective = sourceWithRecipes(file, source);
  for (const { what, test, fix } of REQUIRED) {
    if (!test.test(effective)) {
      errors.push(`${rel}: anchors a panel but does not honour ${what} — ${fix}.`);
    }
  }
}

// A stale exemption is how an allowlist stops meaning anything.
for (const [rel] of ALLOWED) {
  const source = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  if (!POSITIONER.test(source)) {
    errors.push(`${rel}: allowlisted in check-overlays but anchors no panel. Remove the entry.`);
  }
}

/* ------------------------------------------------------------------ *
 * RULE 2 — every portalled root declares a layer role.
 *
 * check:utilities already refuses a bare `z-50`. That rule is NEGATIVE,
 * and the five surfaces it most needed to catch declared NOTHING at all,
 * so they sailed through it: Modal, Sheet, Drawer, Popover and Tooltip
 * portalled to <body> with no z-index and layered by DOM order.
 *
 * Which does not work, and the library shipped the counter-example. A
 * positive z-index in the root stacking context paints above a z-auto
 * positioned element WHATEVER the DOM order, so the affix Header — the
 * one thing here that takes a positive z in the page — covered all five.
 * Raising it from z-30 to --ui-z-sticky changed the number, not the
 * category. Only binding the surfaces fixed it.
 *
 * So the missing half is a POSITIVE requirement: if you portal out of the
 * tree, you have left DOM order behind and you must name your layer.
 * ------------------------------------------------------------------ */

const PORTAL = /\.Portal\b/;
const ROLE = /z-\(--ui-z-[a-z-]+\)/;
/** The Base UI parts that can be a portal's own root element. */
const ROOT_PART = /<\w+\.(Backdrop|Positioner|Popup)\b/g;

/**
 * The opening tag starting at `from`, brace-aware.
 *
 * Naive "slice to the next `>`" is wrong here: these tags carry
 * `{...forBaseUI<ComponentPropsWithoutRef<typeof X>>({ … })}`, whose type
 * arguments and arrow functions are full of `>`. Counting braces keeps the
 * scan inside the tag, which is where Menu and Select put their role.
 */
function openingTag(source, from) {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return source.slice(from, i + 1);
  }
  return source.slice(from);
}

let portalled = 0;

for (const file of walk(join(ROOT, "registry/ui"))) {
  if (!file.endsWith(".tsx")) continue;
  if (/\.(test|stories)\.tsx$/.test(file)) continue;
  const rel = relative(ROOT, file);
  const source = stripComments(readFileSync(file, "utf8"));
  if (!PORTAL.test(source)) continue;

  // Two shipped shapes, and the root differs:
  //   Portal > Positioner > Popup   the positioner IS the root (anchored)
  //   Portal > Backdrop + Popup     both are roots (dialog family)
  // So a Popup only needs its own role when the file has no positioner to
  // carry it — otherwise every anchored panel would be asked for it twice.
  const anchoredHere = POSITIONER.test(source);

  for (const match of source.matchAll(ROOT_PART)) {
    const part = match[1];
    if (part === "Popup" && anchoredHere) continue;
    portalled++;
    const tag = openingTag(source, match.index);
    if (!ROLE.test(tag)) {
      errors.push(
        `${rel}: <…${part}> portals out of the tree but declares no layer role. ` +
          `Add z-(--ui-z-*) — a portalled root has left DOM order behind, and a ` +
          `z-auto surface paints under anything in the page holding a positive z.`,
      );
    }
  }
}

if (errors.length) {
  console.error("Overlay surfaces that do not hold their contract:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    "\nBase UI flips and shifts by default, so a fitting problem looks handled at a\n" +
      "comfortable window size — repositioning cannot shrink a panel bigger than its\n" +
      "space. And a portalled surface with no layer role looks correct until something\n" +
      "in the page takes a positive z-index, which the affix Header does.",
  );
  process.exit(1);
}

console.log(
  `overlays ok — ${anchored} anchored panel(s), ${portalled} portalled root(s) on the ` +
    `z scale, ${ALLOWED.size} declared exemption(s)`,
);
