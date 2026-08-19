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

/**
 * Files allowed to render a raw <svg>, each with the sentence saying why it is
 * not iconography. The rule this gate holds is "no private GLYPHS outside the
 * shared set" — an SVG that is a generated pattern surface rather than a
 * drawing is outside that rule, but the exemption must be written down here
 * or the next raw <svg> hides behind the first.
 */
const ALLOWED_RAW_SVG = new Map([
  [
    "registry/ui/dot-pattern/dot-pattern.tsx",
    "the component IS an SVG — a <pattern> tile generated from gap/dotSize props, " +
      "not a glyph. There is nothing here griddy-icons could supply, and CSS cannot " +
      "tile a circle without an image (the sheet records the shader→SVG decision).",
  ],
]);

const manifest = readManifest();
const errors = [];
let scanned = 0;

for (const item of manifest.items.filter(({ type }) => type === "ui")) {
  for (const file of item.files) {
    if (!file.path.endsWith(".tsx") || file.path.endsWith(".doc.tsx")) continue;
    scanned++;
    const source = stripComments(readFileSync(join(ROOT, file.path), "utf8"));
    if (ALLOWED_RAW_SVG.has(file.path)) {
      // An allowlist entry for a file with no <svg> is stale and must go —
      // otherwise the exemption outlives the reason and silently covers the
      // next raw glyph someone adds to that file.
      if (!/<svg\b/.test(source)) {
        errors.push(
          `${file.path}: is allowlisted for a raw <svg> but no longer renders one — remove the stale entry from check-icons.mjs.`,
        );
      }
      continue;
    }
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

console.log(
  `icons ok — ${scanned} distributed component source file(s), no raw SVG outside ${ALLOWED_RAW_SVG.size} recorded exemption(s)`,
);
