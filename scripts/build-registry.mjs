#!/usr/bin/env node
// Generate registry.json + r/*.json from ui.manifest.json.
//
//   node scripts/build-registry.mjs          # write
//   node scripts/build-registry.mjs --check  # fail if what's committed is stale
//
// The generated files ARE committed, because the GitHub-registry model serves
// them straight out of the repo. `--check` is what stops them drifting from the
// manifest — the same contract a lockfile has.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, relative } from "node:path";
import { readManifest, buildAll, binaryViolations, ROOT } from "./lib/manifest.mjs";

const check = process.argv.includes("--check");
const manifest = readManifest();

const binaries = binaryViolations(manifest);
if (binaries.length) {
  console.error("Binary assets cannot go through the JSON transport (they would be corrupted):");
  for (const b of binaries) console.error(`  ${b.item}: ${b.path}`);
  console.error("\nDistribute the asset by URL alongside a text install note instead.");
  process.exit(1);
}
const artifacts = buildAll(manifest);

if (check) {
  const stale = [];
  for (const [path, content] of artifacts) {
    const current = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (current !== content) stale.push(relative(ROOT, path));
  }
  if (stale.length) {
    console.error("Generated registry is stale:");
    for (const f of stale) console.error(`  ${f}`);
    console.error("\nRun `pnpm registry:build` and commit the result.");
    process.exit(1);
  }
  console.log(`registry up to date (${artifacts.size} file(s))`);
  process.exit(0);
}

for (const [path, content] of artifacts) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`wrote ${relative(ROOT, path)}`);
}
