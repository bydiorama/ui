#!/usr/bin/env node
// Every distributed component needs a named case in the visual matrix.
//
// A visual suite can stay green while a new component is never rendered. The
// manifest already knows the complete public inventory, so compare the matrix
// against it instead of relying on reviewers to count cases by hand.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

const manifest = JSON.parse(readFileSync(join(ROOT, "ui.manifest.json"), "utf8"));
const source = readFileSync(join(ROOT, "registry/visual/matrix.visual.test.tsx"), "utf8");
const casesSource = source.slice(source.indexOf("const CASES"), source.indexOf('describe("visual baselines"'));

const components = manifest.items.filter((item) => item.type === "ui").map((item) => item.name);
const cases = [...casesSource.matchAll(/name:\s*"([^"]+)"/g)].map((match) => match[1]);
const duplicates = cases.filter((name, index) => cases.indexOf(name) !== index);
const missing = components.filter((name) => !cases.includes(name));
const unknown = cases.filter((name) => !components.includes(name));

const errors = [];
if (source.indexOf("const CASES") === -1 || source.indexOf('describe("visual baselines"') === -1) {
  errors.push("registry/visual/matrix.visual.test.tsx: could not find the CASES matrix");
}
if (duplicates.length) errors.push(`duplicate visual cases: ${[...new Set(duplicates)].join(", ")}`);
if (missing.length) errors.push(`manifest components without a visual case: ${missing.join(", ")}`);
if (unknown.length) errors.push(`visual cases not present as manifest UI items: ${unknown.join(", ")}`);

if (errors.length) {
  console.error("Visual coverage is incomplete:\n");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`visual coverage ok — ${components.length} manifest components have one matrix case each`);
