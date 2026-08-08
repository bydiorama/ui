#!/usr/bin/env node
// Every Tailwind utility a registry component uses must resolve to a variable
// the token theme actually emits.
//
// This catches the quietest failure mode in a token-bound component library:
// `hover:bg-accent-hover` against a theme with no `--color-accent-hover`
// produces no CSS at all. Nothing errors, nothing looks broken in review — the
// button simply has no hover state. Types cannot see it (they are strings),
// lint cannot see it (it is valid syntax), and a screenshot only shows it if
// someone happens to hover the right element.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

const { toTailwindTheme } = await import(
  join(ROOT, "packages/tokens/src/index.ts")
);

const declared = new Set(
  [...toTailwindTheme().matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]),
);

/** Utility prefix → the theme namespace it resolves against. */
const NAMESPACES = [
  [/^bg-(.+)$/, "--color-"],
  [/^text-ink-(.+)$/, "--color-ink-"],
  [/^text-(button-.+|body-.+|title-.+|display-.+|label-.+|caption)$/, "--text-"],
  [/^ring-(.+)$/, "--color-"],
  // Border COLOUR (widths/styles are numeric or keywords, filtered below).
  // Absent until Input arrived, because Button draws its resting edge with a
  // ring — so every border-* colour in the library was going unchecked.
  [/^border-(?:[xytrbles]-)?([a-z][\w-]*)$/, "--color-"],
  // `outline-offset-*` and the line styles are built-ins, not colours.
  [/^outline-(?!offset-|solid|dashed|dotted|double)(.+)$/, "--color-"],
  // Every spacing-namespace prefix, not a sample of them. `mt-` was absent
  // until Checkbox needed an optical nudge, so a `mt-lg` typo would have
  // emitted nothing and gone unreported — the exact failure this gate exists
  // to catch, one prefix to the left of where it was looking.
  [
    // `inset-x`/`inset-y` come BEFORE `inset`: alternation is left-to-right,
    // so a bare `inset` would match first and look up `--spacing-y-0`. Sheet
    // was the first component to want `inset-y-0` and reported it as missing.
    /^(?:gap|gap-x|gap-y|p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|space-x|space-y|size|w|h|min-w|min-h|max-w|max-h|inset-x|inset-y|inset|top|bottom|left|right|start|end|translate-x|translate-y|scroll-m|scroll-p)-(.+)$/,
    "--spacing-",
  ],
  [/^rounded(?:-[trbl]{1,2})?-(.+)$/, "--radius-"],
  [/^shadow-(.+)$/, "--shadow-"],
  [/^font-(body|display)$/, "--font-"],
  [/^font-(thin|light|regular|book|normal|medium|semibold|bold|black)$/, "--font-weight-"],
  [/^leading-(.+)$/, "--leading-"],
  [/^tracking-(.+)$/, "--tracking-"],
  // Intent inks — `text-danger`, `text-success`, `text-info`. LAST, so the
  // type-role and ink-role patterns above win first; the loop breaks on the
  // first match. Absent until Banner used the full intent set, which means
  // every `text-<intent>` in Badge and Input had been going unchecked since
  // Badge shipped: a `text-dangr` typo would have emitted nothing, silently.
  [/^text-([a-z][\w-]*)$/, "--color-"],
];

/** Tailwind keywords and bare scales that need no theme variable. */
const BUILTIN = new Set([
  "transparent", "current", "inherit", "initial", "unset", "none", "auto",
  "full", "px", "screen", "fit", "min", "max", "offset", "inset", "hidden",
  // Line styles and table keywords that share the border- prefix.
  "solid", "dashed", "dotted", "double", "collapse", "separate",
  // Text alignment, wrapping and overflow keywords share the text- prefix
  // with the intent inks, and are built-ins rather than theme colours.
  "left", "center", "right", "justify", "start", "end",
  "wrap", "nowrap", "balance", "pretty", "ellipsis", "clip",
]);

/**
 * A SIZING utility whose key is a spacing step. It resolves — which is why the
 * namespace check above waves it through — but to 4-32px, and the author
 * almost certainly meant Tailwind's container scale.
 *
 * Tailwind v4 reads `max-w-<name>` from `--container-*` and falls back to
 * `--spacing-*`. This system emits no `--container-*` and names its spacing
 * steps `sm`/`md`/`lg`, exactly the container scale's names — so `max-w-md`
 * silently compiles to `max-width: var(--ui-space-md)`, 12px. Modal shipped
 * `max-w-md` and `max-w-xl` for its two sizes, and both dialogs rendered at
 * the same 320px because `min-w-80` beat a 12px cap. Every gate was green:
 * the CSS existed, the variable existed, and nothing compared the two sizes.
 *
 * Widths and heights therefore take a purpose-named chrome token (`max-w-nav`,
 * `max-w-dialog-md`) or an explicit value — never a bare spacing step.
 */
// WIDTHS only. Tailwind's container scale is width-oriented, so `max-w-md` is
// the ambiguous one; `h-sm` has no competing meaning and is how the Drawer's
// handle binds the 8px height its sheet actually specifies. Narrowed after the
// rule fired on that legitimate use — a gate that cannot tell a real value
// from a mistake teaches people to work around it.
const SIZING = /^(?:size|w|min-w|max-w)-(.+)$/;
const SPACING_STEPS = new Set(["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"]);

/**
 * Motion that is declared and never runs.
 *
 * Tailwind v4's `scale-*`, `translate-*` and `rotate-*` set the STANDALONE CSS
 * properties (`scale: 98% 98%`), not `transform`. So `transition-property:
 * transform` covers none of them — which is exactly why Tailwind's own
 * `transition-transform` expands to `transform, translate, scale, rotate`.
 *
 * Modal and Popover both wrote `transition-[opacity,transform]` beside
 * `data-[starting-style]:scale-98`, and Button wrote its press scale beside a
 * colour-only list. Every one compiled, every gate was green, and the only
 * property actually transitioning was opacity — measured with getAnimations()
 * in Chromium, which is where this became a fact rather than a theory.
 *
 * Two rules, because they catch different halves:
 *  A — a transition list naming `transform` is always wrong here.
 *  B — an ENTER/EXIT scale, translate or rotate must be covered by a
 *      transition, or the surface snaps into place at full size.
 *
 * B is scoped to `data-[starting-style]`/`data-[ending-style]` on purpose.
 * Button's press scale is deliberately NOT transitioned — "press feedback
 * should snap, not ease" — and a broader rule flagged that considered choice
 * as a defect. An entrance that does not animate is always a mistake; a state
 * change that snaps can be a decision.
 */
/**
 * A focus ring drawn with `box-shadow` and nothing else.
 *
 * Forced-colors mode (Windows High Contrast) forces `box-shadow` to `none` —
 * so `shadow-(--ui-focus-ring)` is not merely re-coloured there, it is gone,
 * and the indicator ceases to exist for the users who most depend on it.
 * Eleven of the twelve components shipped exactly that; only Button, which
 * draws its ring with `outline`, survived.
 *
 * The fix is an `outline` under a `forced-colors:` variant, which costs
 * nothing outside forced colours because it never applies there.
 */
const FOCUS_RING = "shadow-(--ui-focus-ring)";
const FORCED_FALLBACK = /forced-colors:outline/;

const TRANSITION_LIST = /^transition-\[([^\]]+)\]$/;
const COVERS_TRANSFORM = new Set(["transition-transform", "transition-all"]);
const ENTER_EXIT = /data-\[(?:starting|ending)-style\]:-?(scale|translate|rotate)-/g;

const VARIANT =
  /^(?:hover|focus|focus-visible|focus-within|active|disabled|enabled|checked|indeterminate|required|invalid|read-only|placeholder|file|selection|marker|before|after|first-line|aria-[a-z-]+|aria-\[[^\]]+\]|data-\[[^\]]+\]|has-\[[^\]]+\]|not-[a-z-]+|group-[a-z-]+|peer-[a-z-]+|motion-reduce|motion-safe|dark|sm|md|lg|xl|2xl|forced-colors|print|first|last|odd|even):/;

/**
 * Comments are not code, and this gate must not read them.
 *
 * Tailwind itself scans comments — a class named in one compiles a dead rule,
 * which is harmless. Here it is not: the SIZING rule below REJECTS names, so a
 * comment explaining why `max-w-md` is wrong would fail the build for saying
 * so. Block comments are where the prose lives; `//` is only treated as one
 * when it is not part of a `://` URL.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Prose attributes hold sentences, and a sentence is not a class list.
 *
 * The same lesson as `stripComments`, one layer over. This gate reads EVERY
 * string literal in a file and splits it on whitespace, so a word in an
 * accessible name is a candidate utility. Most prose escapes by accident —
 * capitals and punctuation fail the shape filter — but an all-lowercase
 * hyphenated word does not: "right-click", in `aria-label="Brand asset —
 * right-click or press Shift+F10 for actions"`, resolved against the spacing
 * namespace as `right-` + `click` and failed the build asking for
 * `--spacing-click`.
 *
 * Rewording the sentence would have been the cheap fix and the wrong one: a
 * gate that makes people write worse accessible names to keep it quiet is a
 * gate that will be worked around. Blanking these VALUES costs no coverage —
 * none of these attributes ever holds a class — while `className` and every
 * recipe array are still read in full.
 */
const PROSE_ATTRIBUTE =
  /\b(?:aria-label|aria-description|aria-placeholder|aria-roledescription|aria-valuetext|title|alt|placeholder|label|accessibleName|description|summary|content)\s*=\s*(?:"[^"\n]*"|'[^'\n]*')/g;

function stripProse(source) {
  return source.replace(PROSE_ATTRIBUTE, (match) => `${match.split("=")[0]}=""`);
}

function classesIn(source) {
  return new Set(
    [...stripProse(stripComments(source)).matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g)]
      .flatMap((m) => (m[1] ?? m[2] ?? m[3] ?? "").split(/\s+/))
      // `:` must be allowed here — variant prefixes are stripped below, and
      // filtering them out first silently skipped every hover/disabled state.
      // A leading `-` must be allowed through. Tailwind spells a negative
      // utility `-ml-xs` / `-space-x-xs`, and an anchored `^[a-z]` filter drops
      // the whole class before any namespace is consulted — so every negative
      // utility in the library was unscanned, and `-space-x-nudge` would have
      // emitted no CSS with the gate green. Avatar.Group is the first component
      // to need one, which is the first-of-its-kind rule landing on a SIGN
      // rather than on a namespace or a file extension.
      .filter((c) => /^-?[a-z][\w:[\]().,%/#-]*$/.test(c))
      .map((c) => {
        let out = c;
        while (VARIANT.test(out)) out = out.replace(VARIANT, "");
        return out;
      }),
  );
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    // `.ts` AND `.tsx`. The chrome control is a `.ts` file that is ENTIRELY
    // utility classes, and a `.tsx`-only filter meant none of them had ever
    // been checked — a probe put two nonexistent utilities in it and the gate
    // reported green. `.doc.ts` is excluded because it is prose: a doc that
    // says "p-lg, gap-sm" is describing the component, not styling anything,
    // and the same rule that keeps comments out keeps documentation out.
    else if (/\.tsx?$/.test(entry) && !/\.(test|doc|d)\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const errors = [];
let checkedFiles = 0;
let checkedClasses = 0;

for (const file of walk(join(ROOT, "registry"))) {
  const rel = file.slice(ROOT.length + 1);
  // cn.ts is merge CONFIGURATION: its strings are tailwind-merge group
  // identifiers — "text-color", "font-size", "leading" — not classes. Reading
  // them as utilities reported `--color-color` as missing, which is true and
  // meaningless. The rest of registry/lib is real styling and is scanned.
  if (rel === "registry/lib/cn/cn.ts") continue;
  checkedFiles++;
  const source = stripComments(readFileSync(file, "utf8"));
  const classes = classesIn(source);

  // A box-shadow focus ring needs an outline fallback for forced colours.
  if (source.includes(FOCUS_RING) && !FORCED_FALLBACK.test(source)) {
    errors.push(
      `${rel}: draws its focus ring with ${FOCUS_RING} but has no \`forced-colors:outline\` fallback — ` +
        `forced-colors mode forces box-shadow to none, so the indicator DISAPPEARS in Windows High Contrast.`,
    );
  }

  // Rule A: `transform` in a transition list transitions nothing here.
  const lists = [...classes].map((c) => c.match(TRANSITION_LIST)).filter(Boolean);
  for (const list of lists) {
    if (/\btransform\b/.test(list[1])) {
      errors.push(
        `${rel}: "${list[0]}" lists \`transform\`, which no scale/translate/rotate utility sets in ` +
          `Tailwind v4 — they set the standalone properties. Name \`scale\`/\`translate\`/\`rotate\`, ` +
          `or use transition-transform.`,
      );
    }
  }
  // Rule B: an enter/exit transform must be covered by some transition.
  const covered = [...classes].some((c) => COVERS_TRANSFORM.has(c));
  for (const property of new Set([...source.matchAll(ENTER_EXIT)].map((m) => m[1]))) {
    if (covered || lists.some((l) => new RegExp(`\\b${property}\\b`).test(l[1]))) continue;
    errors.push(
      `${rel}: enters or exits with \`${property}-*\` but no transition names \`${property}\` — ` +
        `it will snap, not animate. Add it to the transition list, or use transition-transform.`,
    );
  }

  for (const rawCls of classes) {
    // `-ml-xs` resolves the SAME theme key as `ml-xs`; the sign is Tailwind's,
    // not the token's. Normalise it away for the lookup so a negative utility
    // is checked exactly as its positive twin is.
    const cls = rawCls.startsWith("-") ? rawCls.slice(1) : rawCls;
    // Arbitrary values name their own value and bypass the theme by design,
    // in BOTH syntaxes: brackets for literals (`ring-[1.5px]`) and parens for
    // custom properties (`shadow-(--ui-focus-ring)`). Skipping only brackets
    // made every parens utility a false positive — which is also the syntax
    // the motion tokens had to move to, so the two are easy to conflate.
    if (cls.includes("[") || cls.includes("(")) continue;
    const sizing = cls.match(SIZING);
    if (sizing && SPACING_STEPS.has(sizing[1])) {
      errors.push(
        `${rel}: "${rawCls}" resolves to the SPACING step --ui-space-${sizing[1]}, not a width. ` +
          `Use a purpose-named chrome token (max-w-nav, max-w-dialog-md) or an explicit value.`,
      );
      continue;
    }
    for (const [pattern, namespace] of NAMESPACES) {
      const match = cls.match(pattern);
      if (!match) continue;
      // `bg-accent/10` is the accent colour at 10% — the opacity modifier is
      // not part of the token name, so strip it before the lookup or every
      // tinted utility reports as missing.
      const key = match[1].replace(/\/\d+(\.\d+)?$/, "");
      checkedClasses++;
      // Numeric keys are Tailwind's built-in scale (ring-1, p-0, size-6).
      if (BUILTIN.has(key) || /^\d/.test(key)) break;
      if (!declared.has(namespace + key)) {
        errors.push(`${rel}: "${rawCls}" needs ${namespace}${key}, which the token theme does not emit`);
      }
      break;
    }
  }
}

if (errors.length) {
  console.error("Utilities that do not do what they say:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nEach one compiles. None of them has the effect its name implies.");
  process.exit(1);
}

console.log(
  `utilities ok — ${checkedClasses} themed utilities across ${checkedFiles} component file(s) all resolve`,
);
