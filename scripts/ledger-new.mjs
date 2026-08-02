#!/usr/bin/env node
// Scaffold a change-ledger entry.
//
//   pnpm ledger:new --item button --kind breaking --summary "Renamed variant"
//
// Writing entries by hand is how ledgers rot, so this makes the correct shape
// the path of least resistance.

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const item = flag("item");
const kind = flag("kind");
const summary = flag("summary");

if (!item || !kind || !summary) {
  console.error("usage: pnpm ledger:new --item <name|system> --kind <breaking|addition|fix|visual|a11y|token|decision> --summary <text>");
  process.exit(1);
}

const slug = summary
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .split("-")
  .slice(0, 6)
  .join("-");

const date = new Date().toISOString().slice(0, 10);
const id = `${date}-${slug}`;
const dir = join(ROOT, "ledger", "entries");
const path = join(dir, `${id}.json`);

if (existsSync(path)) {
  console.error(`Entry already exists: ${id}.json — ids are permanent; pick a distinct summary.`);
  process.exit(1);
}

const entry = {
  $schema: "../../schemas/ledger.entry.schema.json",
  id,
  date,
  item,
  kind,
  summary,
  affects: [],
  ...(kind === "breaking" ? { migration: { manual: "TODO: what a consumer must do." } } : {}),
};

mkdirSync(dir, { recursive: true });
writeFileSync(path, `${JSON.stringify(entry, null, 2)}\n`);
console.log(`wrote ledger/entries/${id}.json`);
if (kind === "breaking") console.log("Fill in migration.manual (or add a codemod) — check:ledger enforces it.");
