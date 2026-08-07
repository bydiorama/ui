#!/usr/bin/env node
// Distributed components use the one icon set chosen in ADR 0004.
//
// Import restrictions catch foreign libraries and miss the quieter escape
// hatch: drawing a private inline SVG. That is how four components acquired
// glyphs outside the shared set while every existing gate stayed green.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { readManifest, ROOT } from "./lib/manifest.mjs";

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const manifest = readManifest();
const errors = [];
let scanned = 0;

for (const item of manifest.items.filter(({ type }) => type === "ui")) {
  for (const file of item.files) {
    if (!file.path.endsWith(".tsx") || file.path.endsWith(".doc.tsx")) continue;
    scanned++;
    const source = stripComments(readFileSync(join(ROOT, file.path), "utf8"));
    if (/<svg\b/.test(source)) {
      errors.push(
        `${file.path}: renders a raw <svg>. Use griddy-icons, or use CSS for a ` +
          `non-icon visual state such as a spinner. A missing glyph is an icon-set gap, not a private asset.`,
      );
    }
  }
}

if (errors.length) {
  console.error("Raw iconography in distributed components:\n");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`icons ok — ${scanned} distributed component source file(s), no raw SVG`);
