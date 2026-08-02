#!/usr/bin/env node
// Validate change-ledger entries.
//
// The ledger is what downstream apps compute their drift from, so a malformed
// entry is not cosmetic — it is a change that silently fails to propagate.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readManifest, ROOT } from "./lib/manifest.mjs";

const ENTRY_DIR = join(ROOT, "ledger", "entries");
const KINDS = ["breaking", "addition", "fix", "visual", "a11y", "token", "decision"];
const ID_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/;

const manifest = readManifest();
const knownItems = new Set(manifest.items.map((i) => i.name));
knownItems.add("system");

const errors = [];
const ids = new Set();

const files = existsSync(ENTRY_DIR)
  ? readdirSync(ENTRY_DIR).filter((f) => f.endsWith(".json")).sort()
  : [];

for (const file of files) {
  const where = `ledger/entries/${file}`;
  let entry;
  try {
    entry = JSON.parse(readFileSync(join(ENTRY_DIR, file), "utf8"));
  } catch (e) {
    errors.push(`${where}: not valid JSON — ${e.message}`);
    continue;
  }

  if (!ID_RE.test(entry.id ?? "")) {
    errors.push(`${where}: id must be YYYY-MM-DD-slug (got ${JSON.stringify(entry.id)})`);
  } else if (ids.has(entry.id)) {
    errors.push(`${where}: duplicate id "${entry.id}" — ids are permanent and never reused`);
  } else {
    ids.add(entry.id);
  }

  if (`${entry.id}.json` !== file) {
    errors.push(`${where}: filename must match id (${entry.id}.json)`);
  }
  if (!KINDS.includes(entry.kind)) {
    errors.push(`${where}: kind must be one of ${KINDS.join(", ")}`);
  }
  if (!entry.summary?.trim()) {
    errors.push(`${where}: summary is required`);
  }
  if (!entry.item || !knownItems.has(entry.item)) {
    errors.push(`${where}: item "${entry.item}" is not in the manifest (use "system" for repo-wide changes)`);
  }
  if (entry.kind === "breaking" && !entry.migration?.codemod && !entry.migration?.manual) {
    errors.push(`${where}: a breaking entry must carry a migration (codemod or manual) — that is the whole point of recording it`);
  }
  if (entry.migration?.codemod && !existsSync(join(ROOT, entry.migration.codemod))) {
    errors.push(`${where}: codemod not found — ${entry.migration.codemod}`);
  }
}

for (const file of files) {
  const entry = JSON.parse(readFileSync(join(ENTRY_DIR, file), "utf8"));
  for (const sup of entry.supersedes ?? []) {
    if (!ids.has(sup)) errors.push(`ledger/entries/${file}: supersedes unknown entry "${sup}"`);
  }
}

if (errors.length) {
  console.error("Ledger invalid:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`ledger ok — ${files.length} entr${files.length === 1 ? "y" : "ies"}`);
