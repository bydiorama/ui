#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT, readManifest } from "./lib/manifest.mjs";
import { GROWTH_METRIC, isPublicItem } from "./lib/site.mjs";

const base = join(ROOT, "apps/site/src");
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
const manifest = readManifest();
const targets = new Set(manifest.items.flatMap(item => item.files).map(file => `@/${file.target.replace(/\.[cm]?[jt]sx?$/, "")}`));
const sourceFiles = manifest.items.flatMap(item => item.files).filter(file => /\.[jt]sx?$/.test(file.path) && !file.path.endsWith(".doc.ts"));
const exported = new Set(sourceFiles.flatMap(file => [...readFileSync(join(ROOT, file.path), "utf8").matchAll(/export\s+(?:const|function|class)\s+(\w+)/g)].map(match => match[1])));
const errors = [];
const publicNames = new Set(manifest.items.filter(isPublicItem).map(item => item.name));
for (const name of publicNames) {
  if (!existsSync(join(base, "examples", `${name}.tsx`))) errors.push(`${name}: every public component or block needs a live example in apps/site/src/examples/.`);
}
for (const file of readdirSync(join(base, "examples")).filter(file => file.endsWith(".tsx"))) {
  const name = file.slice(0, -4);
  if (!publicNames.has(name)) errors.push(`apps/site/src/examples/${file}: no public manifest item owns this live example.`);
  if (!/export (?:function|const) Example\b/.test(readFileSync(join(base, "examples", file), "utf8"))) errors.push(`apps/site/src/examples/${file}: export Example so the catalog can discover it.`);
}
if (!existsSync(base)) throw Error("The public site source is missing.");
for (const path of walk(base).filter(path => /\.(?:astro|tsx?|css)$/.test(path))) {
  const source = readFileSync(path, "utf8");
  const file = relative(ROOT, path);
  for (const match of source.matchAll(/from\s+["'](@\/[^"']+)["']/g)) {
    if (!targets.has(match[1])) errors.push(`${file}: ${match[1]} is not an install target in the manifest.`);
  }
  for (const match of source.matchAll(/(?:export\s+)?(?:function|class)\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:forwardRef|Object\.assign)/g)) {
    const name = match[1] ?? match[2];
    if (exported.has(name)) errors.push(`${file}: ${name} already exists in the registry. Import its source instead of copying the implementation.`);
  }
  // ADR 0029: a live example is the code a consumer copies, so a small
  // Button there must name the dense part it sits in. Size follows the
  // control's role; a tighter screen is data-ui-density, not size="sm".
  if (file.startsWith("apps/site/src/examples/")) {
    const lines = source.split("\n");
    lines.forEach((line, i) => {
      if (!/size="sm"/.test(line)) return;
      // The element this prop belongs to: the nearest tag opened at or above
      // it (props may sit on their own lines in a multi-line opening tag).
      const before = lines.slice(Math.max(0, i - 8), i + 1).join("\n");
      const lineStart = before.length - line.length;
      const at = before.lastIndexOf("<", lineStart + line.indexOf('size="sm"'));
      if (!/^<Button\b/.test(before.slice(at))) return;
      const reason = lines.slice(Math.max(0, i - 8), i).some((l) => /size sm:/.test(l));
      if (!reason) errors.push(`${file}:${i + 1}: a <Button size="sm"> in a live example needs a "size sm:" comment above it naming the dense part it sits in (a table cell, an icon toolbar, a chip row). Leave size at md for a composition's actions; make a screen denser with data-ui-density, not size (ADR 0029).`);
    });
  }
  if (/\.astro$/.test(path) && /<code[^>]*>\s*(?:&lt;|<|\{`<)/.test(source)) errors.push(`${file}: JSX samples must come from a type-checked source file via ?raw.`);
  if (path.endsWith("copy.ts") && GROWTH_METRIC.test(source)) errors.push(`${file}: public copy must not include changing component or test totals.`);
}
console.log(errors.length ? errors.join("\n") : "every public item has a live example, the site imports registry source and copy contains no growth metrics");
if (errors.length) process.exit(1);
