// Class extraction shared by every gate that reads utilities out of source.
//
// Moved out of check-utilities.mjs when the stroke, type-role and
// token-consumer gates needed the SAME reading of a file: three private
// copies of "what counts as a class" would drift, and a gate that disagrees
// with its siblings about what a class is reports on a different library.

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const VARIANT =
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
export function stripComments(source) {
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

export function stripProse(source) {
  return source.replace(PROSE_ATTRIBUTE, (match) => `${match.split("=")[0]}=""`);
}

export function classesIn(source) {
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
      // A leading `[` must also be allowed through: an ARBITRARY PROPERTY
      // (`[transition-property:translate,scale]`) is a class too, and the
      // transition rules above read it. The anchored `^-?[a-z]` filter dropped
      // every one of them, so Toast's longhand transition — the first in the
      // library — was invisible to rule B and the gate demanded a shorthand
      // the component deliberately avoids.
      .filter((c) => /^-?[a-z][\w:[\]().,%/#-]*$/.test(c) || /^\[[a-z-]+:[^\s\]]+\]$/.test(c))
      .map((c) => {
        let out = c;
        while (VARIANT.test(out)) out = out.replace(VARIANT, "");
        return out;
      }),
  );
}

export function walk(dir, out = []) {
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

