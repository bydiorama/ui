#!/usr/bin/env node
// Stroke widths come from the token scale, never from a literal.
//
// Before ADR 0020 the library drew its edges with `border-[1.5px]` ×17,
// `ring-[1.5px]` ×7, `outline-[1.5px]` ×3, `border-2` ×4 and `outline-2` ×43,
// while `shape.borderWidthPx` resolved to a token nothing read. A brand could
// set the knob and change nothing. The scale now exists
// (`--ui-stroke-default|hairline|thick`, `--ui-focus-ring-width`) and every
// width utility has a named form: bare `border`/`ring`/`outline`/`divide-*`
// is the default stroke, `-hairline` and `-thick` the other two, and
// `outline-focus` the focus indicator. This gate keeps it that way — the
// stroke equivalent of check:motion's "no literal durations".
//
// Zero is allowed. "No stroke" is not a weight a brand could want to change.
// Offsets are lengths, not widths, and are not checked here (`outline-offset`
// is out of scope: ADR 0020 tokenised no general offset scale); the one
// exception is `ring-offset`, whose CSS property is `--tw-ring-offset-WIDTH`
// despite the name — it draws a solid layer inside the ring's box-shadow
// stack, the same geometry a border width does. The FOCUS offset has its own
// named utility (`outline-offset-focus`) because it is part of the focus
// indicator's geometry.

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";
import { classesIn, walk } from "./lib/classes.mjs";

/** File → reason. Same contract as check:controls: one line, one sentence. */
const ALLOWED = new Map([]);

/**
 * A width utility with a literal value: `border-2`, `ring-[1.5px]`,
 * `outline-(length:--x)`, `divide-x-4`, `ring-offset-2`. Colours never
 * match — they are words or arbitrary colours, and a literal width starts
 * with a digit, a decimal point, a CSS width keyword, or is an arbitrary
 * LENGTH.
 *
 * Probed against three bypasses a review found: `border-[.5px]` (the
 * bracket branch required a LEADING digit, so a bare decimal point slipped
 * through), `border-[thin]` (a CSS border-width keyword, not a number, so
 * the digit-only bracket branch never matched a keyword at all), and
 * `ring-offset-2` (its own prefix was simply absent from the alternation —
 * `ring-` matched, then failed on `offset-2`, and no other alternative
 * overlapped the text, so the whole anchored match failed silently).
 */
const LITERAL_WIDTH =
  /^-?(?:border(?:-[xytrbles])?|divide-[xy]|ring-offset|ring|inset-ring|outline)-(?:(\d+(?:\.\d+)?)|\[(?:length:)?([\d.][^\]]*|thin|medium|thick)\]|\(length:[^)]+\))$/;

const errors = [];
const files = walk(join(ROOT, "registry")).filter((f) => !/\.stories\.tsx$/.test(f));

for (const file of files) {
  const rel = relative(ROOT, file);
  if (ALLOWED.has(rel)) continue;
  for (const cls of classesIn(readFileSync(file, "utf8"))) {
    const m = cls.match(LITERAL_WIDTH);
    if (!m) continue;
    const value = m[1] ?? m[2];
    if (value !== undefined && /^0(?:px)?$/.test(value)) continue;
    errors.push(
      `${rel}: \`${cls}\` is a literal stroke width. Use the scale (ADR 0020 §2): ` +
        `bare border/ring/outline for the default stroke, -hairline for a control's ` +
        `1.5px edge, -thick for selection and emphasis, outline-focus for a focus ` +
        `indicator.`,
    );
  }
}

if (errors.length) {
  console.error(`strokes: ${errors.length} literal width(s)\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`strokes ok — no literal stroke widths across ${files.length} distributed file(s)`);
