#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { ROOT, readManifest } from "./lib/manifest.mjs";
import { isPublicItem, GROWTH_METRIC } from "./lib/site.mjs";

const out = join(ROOT, "apps/site/dist");
const errors = [];
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
if (!existsSync(out)) throw Error("Build the site before checking its output.");
for (const item of readManifest().items.filter(isPublicItem)) {
  for (const path of [`components/${item.name}/index.html`, `components/${item.name}.md`, `r/${item.name}.json`]) {
    if (!existsSync(join(out, path))) errors.push(`Missing public output: ${path}`);
  }
}
const index = JSON.parse(readFileSync(join(out, "r/registry.json"), "utf8"));
if (index.items.some(item => item.files.some(file => "content" in file))) errors.push("Registry index must not embed file content.");
for (const file of walk(out).filter(path => path.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  // Only authored page copy: historic ledger records and code reference can
  // contain measurements, fixture values and historic test totals.
  if (file === join(out, "index.html") && GROWTH_METRIC.test(html.replace(/<[^>]*>/g, " "))) errors.push("Home page includes a changing library metric.");
  const from = `/${relative(out, file).replace(/index\.html$/, "")}`;
  for (const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
    const href = match[1].replaceAll("&amp;", "&");
    if (!href || /^(?:https?:|mailto:|tel:|data:|javascript:)/.test(href)) continue;
    const url = new URL(href, `https://local.test${from}`);
    const target = resolve(out, `.${decodeURIComponent(url.pathname)}`);
    const disk = existsSync(target) && !url.pathname.endsWith("/") ? target : join(target, "index.html");
    if (!existsSync(disk)) { errors.push(`${relative(out, file)}: broken local link ${href}`); continue; }
    if (url.hash && disk.endsWith(".html")) {
      const content = readFileSync(disk, "utf8");
      const id = decodeURIComponent(url.hash.slice(1));
      if (!content.includes(`id="${id}"`)) errors.push(`${relative(out, file)}: missing anchor ${href}`);
    }
  }
}
if (errors.length) { console.error([...new Set(errors)].join("\n")); process.exit(1); }
console.log("public routes, registry index, local links and home copy checked");
