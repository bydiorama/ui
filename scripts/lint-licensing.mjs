#!/usr/bin/env node
// Licensing guard for everything this repo distributes.
//
// Two failure modes it exists to prevent, both of which are license breaches
// rather than style problems:
//
//   1. A licensed typeface shipping in the registry. Saans is licensed to
//      Diorama for its own products; putting the files — or even a font-family
//      reference that would make a consumer go find them — into a distributed
//      item breaches that. Manrope (OFL) is the distributable face.
//   2. Paid-tier assets from third-party libraries. The MIT core of a library
//      is fine; premium material behind a paid entitlement is not ours to
//      redistribute.
//
// Scope is deliberately the DISTRIBUTABLE paths only. Prose may name Saans all
// it likes — docs are not shipped to consumers.

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

const SCAN_DIRS = ["registry", "packages", "apps"];

/** Font families that may appear in distributed source. Allowlist, not denylist:
 *  a new typeface should require a deliberate decision, not slip in unnoticed. */
const ALLOWED_FAMILIES = new Set(
  [
    "manrope",
    // Generic and system stacks — no licensing implications.
    "ui-sans-serif", "system-ui", "-apple-system", "blinkmacsystemfont",
    "segoe ui", "roboto", "helvetica neue", "helvetica", "arial",
    "ui-serif", "georgia", "times new roman", "times",
    "ui-monospace", "sfmono-regular", "menlo", "monaco", "consolas",
    "liberation mono", "courier new", "courier",
    "sans-serif", "serif", "monospace", "system-ui", "emoji", "math",
    "inherit", "initial", "unset", "revert",
  ].map((f) => f.toLowerCase()),
);

/** Named explicitly so the failure message can say *why*, not just "not allowed". */
const RESTRICTED_FAMILIES = new Map([
  ["saans", "licensed to Diorama — service-portal only, never distributed (see ledger/decisions/0003)"],
  ["pt serif", "not licensed for redistribution; retired from the token set"],
]);

/** Import specifiers that are paid entitlements rather than MIT cores. */
const PAID_SPECIFIERS = new Map([
  ["motion-plus", "Motion+ is a paid entitlement — only the MIT `motion` core may be distributed"],
  ["motion-plus-react", "Motion+ is a paid entitlement — only the MIT `motion` core may be distributed"],
  ["@gsap/shockingly", "GSAP paid tier"],
]);

const FONT_EXT = new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".scss", ".json", ".html"]);

const errors = [];

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

function checkFontFile(file) {
  const base = file.split("/").pop().toLowerCase();
  const family = base.replace(/[-_].*$/, "").replace(/\.[^.]+$/, "");
  if (!ALLOWED_FAMILIES.has(family)) {
    const reason = RESTRICTED_FAMILIES.get(family) ?? "not on the distributable-font allowlist";
    errors.push(`${relative(ROOT, file)}: font file "${base}" — ${reason}`);
  }
}

function checkText(file) {
  const source = readFileSync(file, "utf8");

  const declarations = [
    ...source.matchAll(/font-family\s*:\s*([^;}\n]+)/gi),
    ...source.matchAll(/fontFamily\s*:\s*["'`]([^"'`]+)["'`]/g),
  ];

  for (const match of declarations) {
    for (const raw of match[1].split(",")) {
      const family = raw.trim().replace(/^["'`]|["'`]$/g, "").toLowerCase();
      if (!family || family.startsWith("var(") || family.startsWith("--")) continue;
      if (ALLOWED_FAMILIES.has(family)) continue;
      const reason = RESTRICTED_FAMILIES.get(family) ?? "not on the distributable-font allowlist";
      errors.push(`${relative(ROOT, file)}: font-family "${family}" — ${reason}`);
    }
  }

  for (const [specifier, reason] of PAID_SPECIFIERS) {
    if (source.includes(`"${specifier}"`) || source.includes(`'${specifier}'`)) {
      errors.push(`${relative(ROOT, file)}: imports "${specifier}" — ${reason}`);
    }
  }
}

let scanned = 0;
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const ext = extname(file).toLowerCase();
    if (FONT_EXT.has(ext)) { checkFontFile(file); scanned++; }
    else if (TEXT_EXT.has(ext)) { checkText(file); scanned++; }
  }
}

if (errors.length) {
  console.error("Licensing check failed:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nSee ledger/decisions/0003-typography-licensing.md");
  process.exit(1);
}

console.log(`licensing ok — ${scanned} distributable file(s) scanned`);
