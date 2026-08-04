#!/usr/bin/env node
// Generates `.claude/skills/` from `registry/skills/`.
//
// `--check` verifies freshness without writing — the same contract as
// `build-registry.mjs`, and for the same reason: a generated artifact that is
// committed must be provably current, or reviewers start trusting a stale copy.
//
// Files are written BYTE-IDENTICAL to their source. A "generated, do not edit"
// banner inside the file would make the copy differ from what a consumer
// installs, so the warning lives in .claude/skills/README.md and in this
// script's failure message instead.

import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";
import { readSkills, installName, SKILL_INSTALL_DIR } from "./lib/skills.mjs";

const README = `# Generated — do not edit

Every file here is copied from \`registry/skills/<dir>/SKILL.md\` by
\`pnpm skills:build\`. Edit the source, not this copy; \`pnpm check:skills\`
fails if the two drift.

Skills live in one tree so there is one source of truth. The manifest — not
the folder — decides which of them ship to consumers, exactly as it does for
components. See \`ledger/decisions/0013-skills.md\`.
`;

const check = process.argv.includes("--check");
const skills = readSkills();

/** path → contents. */
const expected = new Map([[join(SKILL_INSTALL_DIR, "README.md"), README]]);
for (const skill of skills) {
  if (!skill.source) continue;
  expected.set(join(SKILL_INSTALL_DIR, installName(skill), "SKILL.md"), skill.source);
}

/** Everything currently in .claude/skills, so removals are caught too. */
function actualFiles() {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(SKILL_INSTALL_DIR);
  return out;
}

if (check) {
  const stale = [];
  for (const [path, contents] of expected) {
    if (!existsSync(path)) stale.push(`${relative(ROOT, path)} (missing)`);
    else if (readFileSync(path, "utf8") !== contents) stale.push(`${relative(ROOT, path)} (differs from source)`);
  }
  for (const path of actualFiles()) {
    if (!expected.has(path)) stale.push(`${relative(ROOT, path)} (not generated from any skill)`);
  }

  if (stale.length) {
    console.error("Generated skills are stale:\n");
    for (const s of stale) console.error(`  - ${s}`);
    console.error(
      "\nEdit registry/skills/<dir>/SKILL.md — the source — then run `pnpm skills:build`.",
    );
    process.exit(1);
  }
  console.log(`skills up to date (${expected.size} file(s))`);
} else {
  // Remove first, so a renamed or deleted skill does not linger and keep
  // loading into every agent that opens this repo.
  if (existsSync(SKILL_INSTALL_DIR)) rmSync(SKILL_INSTALL_DIR, { recursive: true });
  for (const [path, contents] of expected) {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, contents);
    console.log(`wrote ${relative(ROOT, path)}`);
  }
}
