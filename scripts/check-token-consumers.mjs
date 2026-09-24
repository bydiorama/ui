#!/usr/bin/env node
// Every token in the contract must have a consumer in `registry/`, or say why
// it does not.
//
// `shape.borderWidthPx` resolved to `--ui-border-width` for the whole life of
// the knob, and nothing read it. A brand that set it changed nothing and was
// told nothing — the resolver's completeness guarantee held, the contract was
// total, every gate was green, and the knob was a lie. `--ui-hit-area-*` had
// the same shape. PLAN.md had already written the rule down twice ("a token
// nothing consumes is a guess", about `--ui-nav-rail-width` and the motion
// curves); this is the rule as a gate (ADR 0020 §6).
//
// A token is CONSUMED when a distributed file reads it — by name
// (`var(--ui-x)`, `z-(--ui-z-modal)`), or through a Tailwind utility the
// emitter maps onto it (`bg-surface` → `--color-surface` → `--ui-bg-surface`),
// or through another consumed token whose value references it
// (`--ui-space-stack-md` → `var(--ui-space-lg)`). Stories and tests are not
// consumers: a token only a story reads ships to nobody.
//
// It does not ban unconsumed tokens. Some are right — chrome the consumer's
// own shell draws, a value an app sets on `::selection`. It bans UNDECLARED
// ones: ALLOWED costs one line and one sentence, which is exactly the moment
// to ask whether the token should exist.

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";
import { classesIn, stripComments, walk } from "./lib/classes.mjs";

const { BRANDABLE_TOKENS, FIXED_TOKENS, SCHEME_ONLY_TOKENS, FIXED_TOKEN_VALUES, toTailwindTheme } = await import(
  join(ROOT, "packages/tokens/src/index.ts")
);

/**
 * Tokens that are deliberately not read inside `registry/`, each with the
 * reason. "Nothing uses it yet" is not a reason; "the consumer's shell draws
 * this, not a component" is.
 */
const ALLOWED = new Map([
  // ── Consumer-side chrome and document-level styling ──
  ["--ui-content-width", "Consumer-side chrome (ADR 0006): the width of an app's main column. No component owns the page column."],
  ["--ui-section-gap", "Consumer-side chrome (ADR 0006): the gap between an app page's sections. Page layout is the consumer's."],
  ["--ui-logo-height", "Consumer-side chrome (ADR 0006): the height a brand's logo renders at in the app's header slot. The library renders logos through a slot and never sizes them."],
  [/^--ui-selection-(bg|fg)$/, "Applied once per document by the consuming app's root stylesheet to `::selection`. A component that set it would fight the app."],
  [/^--ui-measure-/, "Line-length caps for long-form text in consumer pages. No component sets running prose."],
  [/^--ui-text-(display-lg|display-md|title-md)(-weight|-leading|-tracking)?$/, "Page-heading roles of the authored type table (ADR 0009), with their attributes (ADR 0020 §3). Components do not set page headings; consumer pages do."],

  // ── Families whose consumers live outside registry/ by design ──
  [/^--ui-data-/, "Categorical data colours (ADR 0006(a)) for consumer charts. The library ships no chart component."],
  [/^--ui-shadow-(xl|(sm|md|lg|xl)-up)$/, "Elevation roles ADR 0016 assigns to the editor's artboard (xl) and to bottom-anchored surfaces (-up). Their consumers are the editor, not a distributed component."],
  ["--ui-radius-2xl", "Top of the approved radius scale and of the brand's `radiusPx` knob. CONVENTIONS §6 names it for large panels; no distributed component draws one yet."],
  [/^--ui-z-(below|base)$/, "Ends of the stacking scale, for consumer layouts that need to sit under or reset to the page plane. Every floating surface in the library takes a positive role."],
  [/^--ui-hit-area-(min|touch)$/, "WCAG 2.5.8 target sizes for consumer layouts. Inside the library the floor is enforced where sizes are DERIVED — the density modes clamp at 24px (ADR 0020 §4) — rather than read at a call site."],

  // ── Open questions already on record, not new ones ──
  [/^--ui-(ease-in|stagger-step|motion-(micro|standard|deliberate|choreographed))$/, "PLAN.md § Motion records it: the curve vocabulary has almost no consumers, and whether it is too big is an open question for a person. Listed here so that question is visible, not settled."],
  [/^--ui-space-(3xl|(stack|inline|inset)-[a-z0-9]+)$/, "ADR 0020 §5: components use the base steps directly; the intent layer is kept for a future brand `rhythm` knob. 3xl is reached only through stack-xl."],
  [/^--ui-leading-(tight|relaxed)$/, "Steps of the leading ladder `leading-*` utilities resolve against. Roles carry their own leading since ADR 0020 §3, and no declared exception takes these two; kept for consumer prose, listed so the question stays visible."],
  ["--ui-weight-book", "A step of the weight ladder (Aspekta's 450 cut) that no role in TYPE_ROLES sits on and no component names since ADR 0020 §3. Kept so `font-book` and a brand's `weights.book` keep a meaning; listed for review, not settled."],
  [/^--ui-(text-link-hover|text-on-muted|text-on-danger-solid|bg-danger-solid|bg-muted|bg-overlay|bg-affix-floor|bg-accent-subtle-hover|bg-emphasis-hover|bg-emphasis-active|nav-border|nav-active-ink)$/, "A colour role in the vocabulary apps style their own screens with, and contrast-audited as such. Unread inside the library at ADR 0020; removing a role is a breaking change owed its own ledger entry, so this lists it for review rather than deleting it."],
]);

/** Exact names and patterns share one table; this answers "is it declared". */
const allowedReason = (token) => {
  for (const [key, reason] of ALLOWED) {
    if (typeof key === "string" ? key === token : key.test(token)) return reason;
  }
  return null;
};

const contract = new Set([...BRANDABLE_TOKENS, ...FIXED_TOKENS, ...SCHEME_ONLY_TOKENS]);

// ── The emitted utility namespace ──────────────────────────────────────────

/** `--color-surface` → `--ui-bg-surface`, straight from the emitter's output. */
const themeKeyToToken = new Map();
for (const [, key, value] of toTailwindTheme().matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
  for (const [, token] of value.matchAll(/var\((--ui-[\w-]+)\)/g)) {
    if (!themeKeyToToken.has(key)) themeKeyToToken.set(key, new Set());
    themeKeyToToken.get(key).add(token);
  }
}

/** Utility prefix → the theme namespaces a class with that prefix resolves
 *  against. One class can hit several (`border-hairline` is a width,
 *  `border-edge-subtle` a colour), so every candidate is tried. */
const SPACING_PREFIX =
  "gap|gap-x|gap-y|p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|space-x|space-y|size|w|h|min-w|min-h|max-w|max-h|inset-x|inset-y|inset|top|bottom|left|right|start|end|translate-x|translate-y|scroll-m|scroll-p|basis|border-spacing";
const FAMILIES = [
  [new RegExp(`^(?:bg|text|border(?:-[xytrbles])?|ring|outline|fill|stroke|divide|from|via|to|decoration|caret|accent|placeholder|shadow|inset-ring|ring-offset)-(.+)$`), ["--color-"]],
  [/^text-(.+)$/, ["--text-"]],
  [new RegExp(`^(?:${SPACING_PREFIX})-(.+)$`), ["--spacing-"]],
  [/^rounded(?:-[trblse]{1,2})?-(.+)$/, ["--radius-"]],
  [/^shadow-(.+)$/, ["--shadow-"]],
  [/^font-(.+)$/, ["--font-", "--font-weight-"]],
  [/^leading-(.+)$/, ["--leading-"]],
  [/^tracking-(.+)$/, ["--tracking-"]],
  [/^border(?:-[xytrbles])?-(.+)$/, ["--border-width-"]],
  [/^divide-[xy]-(.+)$/, ["--border-width-", "--divide-width-"]],
  [/^ring-(.+)$/, ["--ring-width-"]],
  [/^outline-(?!offset-)(.+)$/, ["--outline-width-"]],
  [/^outline-offset-(.+)$/, ["--outline-offset-"]],
];
/** Bare width utilities read Tailwind's `--default-*` keys. */
const BARE = [
  [/^border(?:-[xytrbles])?$/, "--default-border-width"],
  [/^divide-[xy]$/, "--default-border-width"],
  [/^ring$/, "--default-ring-width"],
  [/^outline$/, "--default-outline-width"],
];

function themeKeysFor(cls) {
  const base = cls.replace(/^!/, "").replace(/^-/, "").replace(/\/[\w.[\]()-]+$/, "");
  const keys = [];
  for (const [pattern, key] of BARE) if (pattern.test(base)) keys.push(key);
  for (const [pattern, namespaces] of FAMILIES) {
    const m = base.match(pattern);
    if (!m) continue;
    for (const ns of namespaces) keys.push(`${ns}${m[1]}`);
  }
  return keys;
}

// ── Reading the library ────────────────────────────────────────────────────

const files = walk(join(ROOT, "registry"))
  .filter((f) => !/\.stories\.tsx$/.test(f));

const consumed = new Map(); // token → first file that reads it
const note = (token, file) => {
  if (contract.has(token) && !consumed.has(token)) consumed.set(token, relative(ROOT, file));
};

const usedThemeKeys = new Set();
for (const file of files) {
  const source = stripComments(readFileSync(file, "utf8"));
  for (const [token] of source.matchAll(/--ui-[\w-]+(?![\w-])/g)) note(token, file);
  for (const cls of classesIn(source)) {
    for (const key of themeKeysFor(cls)) {
      if (themeKeyToToken.has(key)) {
        usedThemeKeys.add(key);
        for (const token of themeKeyToToken.get(key)) note(token, file);
      }
    }
  }
}

// A `--text-<role>` utility also applies the role's companions
// (`--text-<role>--font-weight` …), so reading the size reads them too.
for (const [key, tokens] of themeKeyToToken) {
  const owner = key.match(/^(--text-[\w]+(?:-[a-z0-9]+)*?)--[a-z-]+$/)?.[1];
  if (owner && usedThemeKeys.has(owner)) {
    for (const token of tokens) if (!consumed.has(token)) consumed.set(token, `via ${owner}`);
  }
}

// Closure over token-to-token references: a consumed token keeps alive every
// token its own value reads. Only values this repo authors are walked.
let grew = true;
while (grew) {
  grew = false;
  for (const [token, value] of Object.entries(FIXED_TOKEN_VALUES)) {
    if (!consumed.has(token)) continue;
    for (const [, ref] of value.matchAll(/var\((--ui-[\w-]+)\)/g)) {
      if (contract.has(ref) && !consumed.has(ref)) {
        consumed.set(ref, `via ${token}`);
        grew = true;
      }
    }
  }
}

// ── Verdict ────────────────────────────────────────────────────────────────

const errors = [];
for (const token of contract) {
  if (consumed.has(token) || allowedReason(token)) continue;
  errors.push(
    `${token}: no file in registry/ reads it, by name or through a utility. ` +
      `A token nothing consumes is a knob that does nothing — wire a consumer, ` +
      `remove the token, or add it to ALLOWED in this script with the reason.`,
  );
}
// Stale entries fail too, or the table becomes a list of things that used to
// be true: an exact name that is now read, or a pattern that no longer
// excuses a single unconsumed token.
for (const [key] of ALLOWED) {
  const matches = [...contract].filter((t) => (typeof key === "string" ? key === t : key.test(t)));
  const label = typeof key === "string" ? key : String(key);
  if (matches.length === 0) {
    errors.push(`ALLOWED lists ${label}, which matches no contract token. Remove the entry.`);
  } else if (matches.every((t) => consumed.has(t))) {
    errors.push(
      `ALLOWED lists ${label}, but every token it covers is now read ` +
        `(${matches.map((t) => `${t} by ${consumed.get(t)}`).join(", ")}). Remove the entry.`,
    );
  }
}

if (errors.length) {
  console.error(`token-consumers: ${errors.length} problem(s)\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(
  `token-consumers ok — ${consumed.size} of ${contract.size} contract token(s) read by registry/, ` +
    `${[...contract].filter((t) => !consumed.has(t)).length} declared unconsumed with a reason`,
);
