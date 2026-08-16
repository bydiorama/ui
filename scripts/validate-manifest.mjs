#!/usr/bin/env node
// Structural checks on ui.manifest.json.
//
// Deliberately checks the things a JSON Schema cannot: that every declared file
// exists on disk, that two items don't fight over the same install target, and
// that internal dependencies resolve. Those are the failures that reach a
// consumer as a broken `add`; a missing description is merely untidy.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { readManifest, ROOT, ITEM_TYPES, ITEM_KEYS, BINARY_EXTENSIONS } from "./lib/manifest.mjs";

const errors = [];
const manifest = readManifest();

if (!manifest.name?.startsWith("@")) {
  errors.push(`manifest.name must be a namespace like "@bydiorama" (got ${JSON.stringify(manifest.name)})`);
}
if (!Array.isArray(manifest.items)) {
  errors.push("manifest.items must be an array");
}

const seenNames = new Set();
const targets = new Map();

for (const [i, item] of (manifest.items ?? []).entries()) {
  const where = item?.name ? `item "${item.name}"` : `item #${i}`;

  if (!item?.name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.name)) {
    errors.push(`${where}: name must be kebab-case`);
  } else if (seenNames.has(item.name)) {
    errors.push(`${where}: duplicate item name`);
  } else {
    seenNames.add(item.name);
  }

  if (!ITEM_TYPES.includes(item?.type)) {
    errors.push(`${where}: type must be one of ${ITEM_TYPES.join(", ")} (got ${JSON.stringify(item?.type)})`);
  }

  // A key nothing emits is documentation wearing configuration's clothes —
  // see ITEM_KEYS. `peerDependencies` sat here for 35 items and reached no
  // consumer; the schema even described it as the place an optional motion
  // runtime would go (ADR 0018).
  for (const key of Object.keys(item ?? {})) {
    if (!ITEM_KEYS.has(key)) {
      errors.push(
        `${where}: unknown key "${key}". The manifest's vocabulary is ITEM_KEYS in ` +
          `scripts/lib/manifest.mjs — add it there and teach buildIndex/buildItem to ` +
          `emit it in the same edit, or it will not reach a consumer.`,
      );
    }
  }

  if (!item?.description?.trim()) {
    errors.push(`${where}: description is required — it is what an agent reads when choosing a component`);
  }

  if (!Array.isArray(item?.files) || item.files.length === 0) {
    errors.push(`${where}: at least one file is required`);
    continue;
  }

  for (const file of item.files) {
    if (!file?.path || !file?.target) {
      errors.push(`${where}: every file needs both "path" and "target"`);
      continue;
    }
    if (!existsSync(join(ROOT, file.path))) {
      errors.push(`${where}: declared file does not exist on disk — ${file.path}`);
    }
    // The manifest — not the repo — is the distribution boundary. Stories,
    // tests and fixtures live next to the components they describe so they
    // cannot drift, and they must never reach a consumer: shipping them would
    // drag Storybook and a test runner into an app that only wanted a Button.
    // Co-location is safe exactly because this check exists.
    if (/\.(stories|test|spec)\.[jt]sx?$/.test(file.path)) {
      errors.push(`${where}: ${file.path} is a story/test — those stay in this repo. Distribution is the manifest, not the folder`);
    }
    const ext = (file.path.match(/\.[^.]+$/) ?? [""])[0].toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) {
      errors.push(`${where}: ${file.path} is binary — the JSON transport corrupts binary content; distribute it by URL with a text install note`);
    }
    const claimedBy = targets.get(file.target);
    if (claimedBy && claimedBy !== item.name) {
      errors.push(`${where}: install target "${file.target}" already claimed by "${claimedBy}"`);
    } else {
      targets.set(file.target, item.name);
    }
  }

  if (item.docs && !existsSync(join(ROOT, item.docs))) {
    errors.push(`${where}: docs file does not exist — ${item.docs}`);
  }
}

for (const item of manifest.items ?? []) {
  for (const dep of item.registryDependencies ?? []) {
    if (!seenNames.has(dep)) {
      errors.push(`item "${item.name}": registryDependency "${dep}" is not an item in this manifest`);
    }
  }
}

if (errors.length) {
  console.error("Manifest invalid:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`manifest ok — ${manifest.items.length} item(s), ${targets.size} install target(s)`);
