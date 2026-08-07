#!/usr/bin/env node
// The visual runner's container must match the Playwright in the lockfile.
//
// Visual baselines are recorded by one Chromium and compared by another only
// if nobody notices, and nothing else in this repo can notice. Bump
// `playwright` without bumping the image tag and every case in the matrix
// diffs at once — which reads as a library-wide visual regression, sends
// someone hunting through token changes, and ends with the baselines being
// re-recorded to match a browser nobody chose.
//
// The failure is silent in the direction that matters: the run is RED, so it
// looks like the gate working. It is the gate measuring the wrong thing.
//
// This started life as a comment in ci.yml telling people to keep the two in
// step. A rule that depends on remembering is not a rule (see the ratchet in
// the add-component skill), so it is a gate.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

/**
 * The lockfile, not `node_modules` — this check has to run in CI's
 * dependency-free block, before `pnpm install`. The lockfile is also the
 * honest source: it is what CI will actually install.
 */
const LOCKFILE = "pnpm-lock.yaml";
const WORKFLOWS = [".github/workflows/ci.yml", ".github/workflows/visual-baselines.yml"];

/** e.g. `mcr.microsoft.com/playwright:v1.62.1-noble` */
const IMAGE = /image:\s*mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)(-[a-z]+)?/g;

const lock = readFileSync(join(ROOT, LOCKFILE), "utf8");
const versions = [...lock.matchAll(/^ {2}playwright@(\d+\.\d+\.\d+):/gm)].map((m) => m[1]);
const resolved = [...new Set(versions)];

const errors = [];

if (resolved.length === 0) {
  errors.push(`${LOCKFILE}: no resolved \`playwright\` version found. Has the dependency moved?`);
} else if (resolved.length > 1) {
  // Two Playwrights means two Chromiums, and the image can only match one.
  errors.push(
    `${LOCKFILE}: resolves ${resolved.length} playwright versions (${resolved.join(", ")}). ` +
      `The container can only pin one, so the visual baselines would be ambiguous.`,
  );
}

const want = resolved[0];
let pinned = 0;

for (const rel of WORKFLOWS) {
  const source = readFileSync(join(ROOT, rel), "utf8");
  const found = [...source.matchAll(IMAGE)];
  if (found.length === 0) {
    errors.push(`${rel}: pins no Playwright container image, so the visual job is not reproducible.`);
    continue;
  }
  for (const [, version] of found) {
    pinned++;
    if (want && version !== want) {
      errors.push(
        `${rel}: pins playwright:v${version} but ${LOCKFILE} resolves ${want}. ` +
          `Recording baselines against one Chromium and comparing against another diffs every ` +
          `case at once, which looks like a library-wide visual regression.`,
      );
    }
  }
}

if (errors.length) {
  console.error("Visual runner and Playwright have drifted apart:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nBump the image tag in every workflow WITH the dependency.");
  process.exit(1);
}

console.log(`visual runner ok — ${pinned} container pin(s) match playwright ${want}`);
