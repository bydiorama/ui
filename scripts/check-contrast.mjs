#!/usr/bin/env node
// Contrast figures are DECLARED as pairs and MEASURED here — never typed by
// hand into a doc.
//
// Three fabricated numbers shipped before this gate existed: Progress claimed
// 3.2:1 against a real 1.24:1, and Card and Tabs each reused a remembered
// figure for the wrong pair. Prose could not hold the line — "measure, then
// write" was added to the review skill and broken within the hour — because a
// plausible number is indistinguishable from a measured one once written.
//
// A wrong pair is now a wrong TOKEN NAME, which is checkable.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

const { resolveThemePair, THEME_ZERO, resolveZeroPairOptions } = await import(
  join(ROOT, "packages/tokens/src/index.ts")
);
const { contrastRatio, flatten } = await import(join(ROOT, "packages/tokens/src/color.ts"));
const { CONTRAST_PAIRS, NONTEXT_CONTRAST_PAIRS } = await import(
  join(ROOT, "packages/tokens/src/contract.ts")
);

const REPORT = join(ROOT, "registry/contrast.generated.json");

/** Floors. `decorative` clears nothing and must say why. */
const FLOORS = { text: 4.5, "non-text": 3, decorative: 0 };

/** Pairs the resolver already audits, as a lookup. */
const audited = new Set(
  [...CONTRAST_PAIRS, ...NONTEXT_CONTRAST_PAIRS].map(([fg, bg]) => `${fg}|${bg}`),
);

const pair = resolveThemePair(THEME_ZERO, resolveZeroPairOptions);

/** Composite a translucent value onto the page before measuring it. */
function measure(scheme, fg, bg) {
  const theme = pair[scheme];
  const page = theme["--ui-bg-base"];
  const a = theme[fg];
  const b = theme[bg];
  if (a === undefined || b === undefined) return null;
  const solidBg = String(b).startsWith("rgba") ? flatten(b, page) : b;
  const solidFg = String(a).startsWith("rgba") ? flatten(a, solidBg) : a;
  return Number(contrastRatio(solidFg, solidBg).toFixed(2));
}

function docFiles() {
  const out = [];
  const uiDir = join(ROOT, "registry/ui");
  for (const dir of readdirSync(uiDir)) {
    const file = join(uiDir, dir, `${dir}.doc.ts`);
    if (existsSync(file)) out.push(file);
  }
  return out;
}

const errors = [];
const report = {};

for (const file of docFiles()) {
  const rel = relative(ROOT, file);
  const mod = await import(file);
  const doc = Object.values(mod).find((v) => v && typeof v === "object" && "name" in v);
  const pairs = doc?.a11y?.contrastPairs;

  if (!Array.isArray(pairs) || pairs.length === 0) {
    errors.push(
      `${rel}: no a11y.contrastPairs. Every component declares the pairs it renders — ` +
        `a doc with prose figures instead is how three fabricated numbers shipped.`,
    );
    continue;
  }

  const rows = [];
  for (const [i, p] of pairs.entries()) {
    const where = `${rel} pair #${i}`;
    if (!p?.fg || !p?.bg) {
      errors.push(`${where}: needs both "fg" and "bg" token names`);
      continue;
    }
    const floor = p.floor ?? "text";
    if (!(floor in FLOORS)) {
      errors.push(`${where}: floor must be one of ${Object.keys(FLOORS).join(", ")}`);
      continue;
    }
    if (floor === "decorative" && !p.why) {
      errors.push(
        `${where}: a decorative pair must say WHY it is exempt — an unexplained ` +
          `exemption is indistinguishable from an oversight`,
      );
    }

    const light = measure("light", p.fg, p.bg);
    const dark = measure("dark", p.fg, p.bg);
    if (light === null || dark === null) {
      errors.push(`${where}: "${p.fg}" or "${p.bg}" is not a token this theme resolves`);
      continue;
    }

    const required = FLOORS[floor];
    for (const [scheme, value] of [["light", light], ["dark", dark]]) {
      if (value < required - 0.005) {
        errors.push(
          `${where} (${scheme}): ${p.fg} on ${p.bg} measures ${value}:1, ` +
            `below the ${required}:1 floor its "${floor}" role requires`,
        );
      }
    }

    // An unlisted pair is an unchecked pair: a component may render a pair the
    // resolver never audits, which is how a dark placeholder sat at 3.2:1 with
    // every gate green.
    if (floor !== "decorative" && !audited.has(`${p.fg}|${p.bg}`)) {
      errors.push(
        `${where}: ${p.fg} on ${p.bg} carries meaning but is absent from ` +
          `CONTRAST_PAIRS/NONTEXT_CONTRAST_PAIRS, so no theme audit covers it. ` +
          `Add it to the contract, or mark the pair decorative with a reason.`,
      );
    }

    rows.push({ fg: p.fg, bg: p.bg, floor, light, dark, ...(p.role ? { role: p.role } : {}) });
  }
  report[doc.name] = rows;
}

const serialised = `${JSON.stringify(report, null, 2)}\n`;

if (errors.length) {
  console.error("Contrast declarations failed:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nDeclare the PAIR; the measurement is this gate's job.");
  process.exit(1);
}

if (process.argv.includes("--check")) {
  const current = existsSync(REPORT) ? readFileSync(REPORT, "utf8") : "";
  if (current !== serialised) {
    console.error("registry/contrast.generated.json is stale — run `pnpm contrast:build`.");
    process.exit(1);
  }
  console.log(
    `contrast ok — ${Object.values(report).flat().length} pair(s) across ` +
      `${Object.keys(report).length} component(s), measured in both schemes`,
  );
} else {
  writeFileSync(REPORT, serialised);
  console.log(`wrote ${relative(ROOT, REPORT)}`);
}
