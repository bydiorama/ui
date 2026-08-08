#!/usr/bin/env node
// Licensing guard for everything this repo distributes.
//
// Two failure modes it exists to prevent, both of which are license breaches
// rather than style problems:
//
//   1. A non-distributable typeface shipping in the registry. Aspekta (OFL)
//      is the system's single face (ledger/decisions/0007); the retired
//      licensed faces (Saans, PT Serif) must never reappear, even as a
//      font-family reference that would send a consumer looking for them.
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
    "aspekta",
    "aspekta variable",
    "aspektavf",
    // Generic and system stacks — no licensing implications.
    "ui-sans-serif", "system-ui", "-apple-system", "blinkmacsystemfont",
    "segoe ui", "roboto", "helvetica neue", "helvetica", "arial",
    "ui-serif", "georgia", "times new roman", "times",
    "sans-serif", "serif", "system-ui", "emoji", "math",
    "inherit", "initial", "unset", "revert",
  ].map((f) => f.toLowerCase()),
);

/** Named explicitly so the failure message can say *why*, not just "not allowed". */
const MONO_REASON =
  "no monospace face — Aspekta is the only typeface (ledger/decisions/0011). " +
  "For numeric alignment use `font-variant-numeric: tabular-nums`, not a mono stack";

const RESTRICTED_FAMILIES = new Map([
  ["saans", "retired licensed face — replaced by Aspekta everywhere (ledger/decisions/0007)"],
  ["pt serif", "not licensed for redistribution; retired from the token set"],
  // Monospace is a *design* restriction rather than a licensing one, enforced
  // here because this is the gate that already reads every font-family in
  // distributed source (AGENTS.md: prefer a check over a convention).
  ["monospace", MONO_REASON],
  ["ui-monospace", MONO_REASON],
  ["sfmono-regular", MONO_REASON],
  ["sf mono", MONO_REASON],
  ["menlo", MONO_REASON],
  ["monaco", MONO_REASON],
  ["consolas", MONO_REASON],
  ["liberation mono", MONO_REASON],
  ["courier new", MONO_REASON],
  ["courier", MONO_REASON],
  ["geist mono", MONO_REASON],
]);

/** Import specifiers that are paid entitlements rather than MIT cores. */
const PAID_SPECIFIERS = new Map([
  ["motion-plus", "Motion+ is a paid entitlement — only the MIT `motion` core may be distributed"],
  ["motion-plus-react", "Motion+ is a paid entitlement — only the MIT `motion` core may be distributed"],
  ["@gsap/shockingly", "GSAP paid tier"],
]);

/**
 * Icons that cannot take the ink — and are almost always someone's trademark.
 *
 * griddy-icons ships ~1160 glyphs, 73 of which hard-code `fill: "black"`
 * instead of `currentColor`: the brand marks (Apple, Android, Airbnb, Bluesky)
 * and a handful of others. Two problems, one check.
 *
 * The visible one: a hard-coded fill ignores `color` entirely, so the glyph
 * stays black on a dark surface. A Sheet shipped with griddy's `X` as its
 * close control — which is the X/Twitter wordmark, not a cross — and it
 * rendered black-on-charcoal beside a correctly-lit back arrow.
 *
 * The one that matters more: distributing a third-party brand mark inside a
 * UI kit is a trademark question nobody asked, which is exactly the class of
 * problem this gate exists for. `Close` is the cross glyph; the logos are for
 * consumers to reach for deliberately, in their own code.
 */
const ICON_DIR = join(ROOT, "node_modules/griddy-icons/dist/icons");

function checkIcons(file, source) {
  if (!existsSync(ICON_DIR)) return; // dependency-free CI runs this before install
  for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']griddy-icons["']/g)) {
    for (const raw of match[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0]?.trim();
      if (!name) continue;
      const glyph = join(ICON_DIR, name, "regular.js");
      if (!existsSync(glyph)) continue;
      const fills = [...readFileSync(glyph, "utf8").matchAll(/fill:\s*"([^"]+)"/g)].map((m) => m[1]);
      const fixed = fills.filter((f) => f !== "currentColor" && f !== "none");
      if (fixed.length) {
        errors.push(
          `${relative(ROOT, file)}: icon "${name}" hard-codes fill "${fixed[0]}" instead of currentColor ` +
            `— it cannot take the ink colour, and a fixed-fill griddy glyph is almost always a brand mark. ` +
            `For a close control use "Close".`,
        );
      }
    }
  }
}

const FONT_EXT = new Set([".woff", ".woff2", ".ttf", ".otf", ".eot"]);
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".scss", ".json", ".html"]);

const errors = [];

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    // BUILD OUTPUT is not source, and scanning it fails on other people's
    // fonts. `storybook-static` bundles Storybook's own UI, which ships Nunito
    // Sans and a mono stack — so a local `pnpm verify` run any time after a
    // Storybook build reported fifteen licensing violations in code this repo
    // does not write and does not distribute. CI never saw it because it
    // builds Storybook AFTER this gate; the ordering was hiding it.
    if (
      name === "node_modules" ||
      name === "dist" ||
      name === "storybook-static" ||
      name.startsWith(".")
    ) {
      continue;
    }
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

  checkIcons(file, source);

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
  console.error("\nSee ledger/decisions/0007-aspekta.md");
  process.exit(1);
}

console.log(`licensing ok — ${scanned} distributable file(s) scanned`);
