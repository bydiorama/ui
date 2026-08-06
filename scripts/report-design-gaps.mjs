#!/usr/bin/env node
// Collect what the library is waiting on from design, and say it out loud.
//
// This exists because "needs design" was prose. Every component's doc carries
// a `knownGaps` list, several entries in each are really design requests, and
// nothing ever read them together — so the fact that FOUR components each
// wanted the same undrawn 32px control was four separate paragraphs nobody
// cross-read. The pattern was visible only in aggregate, and nothing
// aggregated.
//
// It reports; it does not fail. A design gap is not a defect in the code —
// it is a question for a person, and a gate that blocked on it would just
// teach people to stop declaring them.

import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./lib/manifest.mjs";

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const gaps = [];
let docs = 0;

for (const file of walk(join(ROOT, "registry/ui"))) {
  if (!file.endsWith(".doc.ts")) continue;
  const module = await import(pathToFileURL(file).href);
  const doc = Object.values(module).find((v) => v && typeof v === "object" && "name" in v);
  if (!doc) continue;
  docs++;
  for (const entry of doc.needsDesign ?? []) {
    gaps.push({ component: doc.name, entry, file: relative(ROOT, file) });
  }
}

if (!gaps.length) {
  console.log(`design gaps — none declared across ${docs} component doc(s)`);
  process.exit(0);
}

console.log(`Design gaps — ${gaps.length} across ${docs} component doc(s):\n`);
for (const { component, entry } of gaps) {
  console.log(`  ${component.padEnd(14)} ${entry}`);
}
console.log(
  "\nThese are questions for design, not defects. Two components asking for the\n" +
    "same thing is the signal worth acting on — it was invisible while these\n" +
    "lived as prose in separate knownGaps lists.",
);
