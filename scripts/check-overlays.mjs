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

import { readdirSync, readFileSync, statSync } from "node:fs";
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
  for (const { what, test, fix } of REQUIRED) {
    if (!test.test(source)) {
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

if (errors.length) {
  console.error("Anchored panels that can render outside the viewport:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    "\nBase UI flips and shifts by default, so this looks handled at a comfortable\n" +
      "window size. Repositioning cannot shrink a panel that is bigger than its space.",
  );
  process.exit(1);
}

console.log(`overlays ok — ${anchored} anchored panel(s), ${ALLOWED.size} declared exemption(s)`);
