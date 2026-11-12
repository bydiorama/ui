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
  [
    "registry/ui/chart/chart.tsx",
    "the component IS a data plot — bars, lines, areas, gridlines and marker " +
      "shapes computed from the data prop (ADR 0023), not glyphs. Its one icon, " +
      "the table toggle's, comes from griddy-icons. The plot SVG is aria-hidden; " +
      "the figure, the announcer and the table carry the values.",
  ],
  [
    "registry/ui/meter/meter.tsx",
    "the radial shape IS a data plot — an arc computed from the value prop " +
      "(ADR 0023), not a glyph. The SVG is aria-hidden; the role=meter element " +
      "around it carries the name and the value.",
  ],
  [
    "registry/ui/sparkline/sparkline.tsx",
    "the component IS a data plot — paths and dots computed from the `data` prop " +
      "(ADR 0023), not a glyph. No icon set can draw a series, and the SVG is " +
      "aria-hidden behind a role=img root that carries the name and description.",
  ],
  [
    "registry/ui/status-matrix/status-matrix.tsx",
    "the component IS a computed screen — 25 dots whose levels are recomputed " +
      "every tick from the status's signal, not a glyph. No icon set can draw a " +
      "frame that does not exist until it is simulated; the settled list glyphs " +
      "beside it (check, ring, close) stay griddy icons.",
  ],
  [
    "registry/ui/diagram/diagram.tsx",
    "the edge layer IS a drawing — paths and arrow heads computed from node " +
      "positions (lib/graph), and the legend's line swatches, which are those same " +
      "strokes in miniature. Every glyph (group toggle, controls, list toggle) comes " +
      "from griddy-icons. The SVG is aria-hidden; the announcer and list carry it.",
  ],
  [
    "registry/ui/network/network.tsx",
    "the drawing IS an SVG — node discs, rings and edges computed from the layout " +
      "(lib/graph). Node glyphs are the caller's griddy-icons, cloned in; the " +
      "controls' and chip's glyphs are griddy-icons. The SVG is aria-hidden; the " +
      "announcer and the table carry the graph.",
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
