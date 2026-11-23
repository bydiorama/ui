#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, readManifest } from "./lib/manifest.mjs";
import { SITE_CATEGORIES, isPublicItem, GROWTH_METRIC } from "./lib/site.mjs";

const manifest = readManifest();
const output = join(ROOT, "apps/site/src/data/catalog.generated.json");
const hash = createHash("sha256");
function read(path) {
  const source = readFileSync(join(ROOT, path), "utf8");
  hash.update(path).update(source);
  return source;
}
read("ui.manifest.json");
const ledger = readdirSync(join(ROOT, "ledger/entries")).filter(f => f.endsWith(".json")).sort()
  .map(file => JSON.parse(read(`ledger/entries/${file}`)));
const contrast = JSON.parse(read("registry/contrast.generated.json"));
const items = [];
for (const item of manifest.items.filter(isPublicItem)) {
  if (!SITE_CATEGORIES.includes(item.category)) throw Error(`${item.name}: add a category from SITE_CATEGORIES to ui.manifest.json.`);
  if (!item.docs) throw Error(`${item.name}: a public item needs a typed .doc.ts in the manifest.`);
  read(item.docs);
  read(`r/${item.name}.json`);
  const mod = await import(pathToFileURL(join(ROOT, item.docs)).href);
  const docs = Object.values(mod).find(v => v && typeof v === "object" && "name" in v);
  if (!docs?.lead?.trim() || GROWTH_METRIC.test(docs.lead)) throw Error(`${item.docs}: add a public lead without library or test totals.`);
  if (!docs.props || !docs.anatomy || !docs.a11y) throw Error(`${item.docs}: public docs need props, anatomy and accessibility.`);
  items.push({
    name: item.name, title: docs.name, type: item.type, category: item.category,
    status: item.status, lead: docs.lead, docs,
    files: item.files.map(({ path, target }) => ({ path, target })),
    dependencies: item.dependencies ?? [], registryDependencies: item.registryDependencies ?? [],
    contrast: contrast[docs.name] ?? null,
    changes: ledger.filter(entry => entry.item === item.name || entry.affects?.includes(`item:${item.name}`))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
  });
}
items.sort((a, b) => a.title.localeCompare(b.title));
const data = `${JSON.stringify({ sourceHash: hash.digest("hex"), categories: SITE_CATEGORIES, items }, null, 2)}\n`;
if (process.argv.includes("--check")) {
  if (!existsSync(output) || readFileSync(output, "utf8") !== data) {
    console.error("Public library data is stale. Run pnpm site:data after changing the manifest, typed docs, registry or ledger.");
    process.exit(1);
  }
  console.log("public library data is current");
} else {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, data);
  console.log("wrote public library data");
}
