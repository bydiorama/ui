#!/usr/bin/env node
// Motion is declared in tokens, guarded for reduced motion, and written down.
//
// The token layer already carries the numbers (`--ui-duration-*`,
// `--ui-ease-*`, `--ui-motion-*`) and already collapses durations under
// `prefers-reduced-motion` — ADR 0005 §5. That covers every CSS TRANSITION in
// the library for free, which is why the discipline has held with nothing
// enforcing it: at the time of writing, `registry/` contains zero hard-coded
// durations. A gate that only ratified the status quo would not be worth its
// run time.
//
// What it catches is the three ways motion escapes that layer:
//
//   1. A literal duration or easing. The first one costs nothing and is
//      invisible in review; the tenth is a second motion system. This is the
//      cheap ratchet on a discipline that is currently perfect and has no
//      other reason to stay that way.
//
//   2. A KEYFRAME animation, which does not read the duration tokens at all.
//      `animate-spin` has its own timing baked into the utility, so the
//      token-layer collapse cannot reach it — ADR 0005's "only the JS tier
//      needs its own check" is half a rule, and the missing half is here.
//      Three spinners ship today and all three are guarded, by two different
//      idioms; both are accepted below, because the requirement is the guard,
//      not the spelling.
//
//   3. Motion nobody wrote down. `*.doc.ts` has carried a `motion:` field
//      since Sheet, and 3 of 34 components use it — so the field reads as
//      handled and documents almost nothing. Motion is the one part of a
//      component that no other gate can describe: `check:contrast` measures
//      its colours, `check:utilities` resolves its classes, and the visual
//      baselines capture a single static frame in which nothing is moving.
//
// SCOPE: this gate reads SOURCE. The companion rules in `check:utilities` —
// a transition list naming `transform`, and an enter/exit transform with no
// transition covering it — stay there deliberately: those need the resolved
// Tailwind theme, which is why that script runs under
// `--experimental-strip-types` and this one does not. Both are motion rules;
// they are split by what they have to load, not by subject.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

/**
 * A literal where a token belongs.
 *
 * `cubic-bezier(` and `\d+ms` are the raw CSS forms; the bracketed utilities
 * are Tailwind's arbitrary-value escape hatch, which resolves to the same
 * thing. `duration-(--ui-duration-fast)` uses PARENTHESES — the custom-property
 * form — so it does not match, which is the whole distinction being drawn.
 *
 * Deliberately NOT matched: a bare `\d+s`. Nothing in this library writes a
 * duration in seconds, and the pattern collides with too much that is not a
 * duration to be worth the false positives.
 */
const LITERALS = [
  { test: /\b\d+ms\b/, what: "a literal duration in milliseconds" },
  { test: /cubic-bezier\s*\(/, what: "a literal cubic-bezier easing" },
  { test: /\b(?:duration|delay|ease)-\[/, what: "an arbitrary-value timing utility" },
];

/**
 * A DELAY, handed to a behaviour-layer prop as a bare number.
 *
 * The three rules above all look for CSS. Tooltip was the first component whose
 * timing is not CSS at all: Base UI's tooltip takes `delay`, `closeDelay` and
 * `timeout` as numbers of milliseconds, and a custom property cannot be read by
 * a JavaScript prop without a `getComputedStyle` round trip per trigger. So the
 * values live in `@/lib/motion` as named constants — and `delay={600}` would
 * slip past every pattern here, because `600` is just a number.
 *
 * This is the ratchet for that. It is narrow on purpose: only these three prop
 * names, and only when the value is a numeric literal, so it cannot fire on an
 * unrelated `timeout` variable. Anything else in `registry/ui` that starts
 * waiting before it acts will want the same constants rather than its own
 * answer, which is the whole reason the first one is worth a gate.
 *
 * Zero is allowed: `closeDelay={0}` is the absence of a delay rather than a
 * choice about one, and forcing a named constant for "immediately" would be
 * ceremony. `HOVER_INTENT_CLOSE_MS` exists anyway, and Tooltip uses it.
 *
 * BOTH SPELLINGS, and the second one is why this was probed. The first version
 * matched only `delay={600}` — the JSX attribute — and Tooltip hands its
 * trigger props as an OBJECT (`delay: 600`) through the `forBaseUI` shim that
 * every Base UI wrapper here uses. So the gate fired on the Provider, reported
 * the file, and was blind to the exact form the component it was written for
 * actually writes. Found by breaking it deliberately, which is the only way
 * that class of hole is ever found.
 */
const NUMERIC_DELAY = /\b(delay|closeDelay|timeout)\s*(?:=\s*\{\s*|:\s*)[1-9]\d*/;

/**
 * CONVENTIONS §6: never `transition: all` — enumerate the animated properties.
 *
 * `all` animates whatever happens to change, which on a component that gains a
 * shadow, a border colour and a layout shift in the same state flip is three
 * animations nobody chose. It also silently starts animating any property a
 * LATER change introduces.
 */
const TRANSITION_ALL = /\btransition-all\b|transition\s*:\s*all\b/;

/**
 * A keyframe animation, which the token layer cannot collapse.
 *
 * `animate-none` is the guard itself, not an animation.
 */
const KEYFRAME = /\banimate-(?!none\b)[a-z][a-z-]*/g;
const MOTION_SAFE = /\bmotion-safe:animate-/;
const REDUCE_GUARD = /\bmotion-reduce:animate-none\b/;

/** Anything that moves. Used to decide whether a doc owes a `motion:` note. */
const ANIMATES = [
  /\btransition-(?!none\b)[a-z[]/,
  /\banimate-(?!none\b)[a-z]/,
  /data-\[(?:starting|ending)-style\]/,
  /@starting-style/,
  /\bmotion-safe:/,
];

/**
 * The `motion:` note, at the TOP LEVEL of the doc object.
 *
 * Two spaces, because that is where a top-level key sits in every `*.doc.ts`
 * in this repo. The indent is doing real work rather than standing in for a
 * parser: `motion:` also appears nested inside `a11y:` in two docs, at four
 * spaces, and those two are the reason this gate distinguishes them at all.
 * Motion is not solely an accessibility concern — it is a description of what
 * the component does — and having the same field mean different things at two
 * depths is how a field stops being findable.
 */
const MOTION_NOTE = /^ {2}motion:/m;

/** Comments are not code — the lesson check:utilities, controls and overlays all learned. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Class lists, one at a time.
 *
 * The reduced-motion guard has to be found on the SAME element as the
 * animation it guards, and a string literal is the closest this gate can get
 * to an element without parsing JSX. Checking per FILE instead would pass a
 * component that spins one thing and guards another.
 */
function stringLiterals(source) {
  return [...source.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g)].map(
    (m) => m[1] ?? m[2] ?? m[3] ?? "",
  );
}

/**
 * A component's motion can live in a RECIPE it composes.
 *
 * Header animates nothing in its own file and everything through
 * `@/lib/chrome-control`. Same reasoning as check:overlays, and the same
 * failure if it is skipped: the gate would ask Header to document motion it
 * appears not to have, or — worse, once the rule is inverted — let it away
 * with motion the recipe really does apply.
 */
const LIB_IMPORT = /from\s+["']@\/lib\/([\w-]+)["']/g;

function sourceWithRecipes(source) {
  let out = source;
  for (const [, name] of source.matchAll(LIB_IMPORT)) {
    const recipe = join(ROOT, "registry/lib", name, `${name}.ts`);
    if (existsSync(recipe)) out += `\n${stripComments(readFileSync(recipe, "utf8"))}`;
  }
  return out;
}

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const errors = [];
let scanned = 0;
let animating = 0;
let documented = 0;

// ---------------------------------------------------------------- source rules

for (const dir of ["registry/ui", "registry/lib", "registry/hooks"]) {
  for (const file of walk(join(ROOT, dir))) {
    if (!/\.tsx?$/.test(file)) continue;
    if (/\.(test|stories|doc)\.tsx?$/.test(file)) continue;
    const rel = relative(ROOT, file);
    const source = stripComments(readFileSync(file, "utf8"));
    scanned++;

    for (const { test, what } of LITERALS) {
      if (test.test(source)) {
        errors.push(
          `${rel}: ${what}. Motion timing comes from --ui-duration-* / --ui-ease-* ` +
            `(ADR 0005) — use the custom-property form, e.g. duration-(--ui-duration-base).`,
        );
      }
    }

    const delay = source.match(NUMERIC_DELAY);
    if (delay) {
      errors.push(
        `${rel}: \`${delay[0]}\` hands a behaviour-layer prop a bare number. ` +
          `A delay is not a duration — nothing is animating while it runs, and it is read by ` +
          `JavaScript rather than CSS, so it cannot be a --ui-duration-* token. Import the named ` +
          `constant from @/lib/motion instead: HOVER_INTENT_DELAY_MS, HOVER_INTENT_CLOSE_MS, ` +
          `HOVER_INTENT_SKIP_MS.`,
      );
    }

    if (TRANSITION_ALL.test(source)) {
      errors.push(
        `${rel}: transitions \`all\`. Enumerate the animated properties (CONVENTIONS §6) — ` +
          `\`all\` animates whatever a later change happens to introduce.`,
      );
    }

    for (const literal of stringLiterals(source)) {
      const keyframes = literal.match(KEYFRAME);
      if (!keyframes) continue;
      const unguarded = keyframes.filter((k) => !literal.includes(`motion-safe:${k}`));
      if (unguarded.length && !REDUCE_GUARD.test(literal) && !MOTION_SAFE.test(literal)) {
        errors.push(
          `${rel}: \`${unguarded[0]}\` runs under prefers-reduced-motion. A keyframe carries ` +
            `its own timing, so the token layer cannot collapse it — prefix \`motion-safe:\` ` +
            `or add \`motion-reduce:animate-none\` on the same element.`,
        );
      }
    }
  }
}

// ------------------------------------------------------------ documented rules

for (const name of readdirSync(join(ROOT, "registry/ui"))) {
  const dir = join(ROOT, "registry/ui", name);
  if (!statSync(dir).isDirectory() || name === "__screenshots__") continue;

  const impl = join(dir, `${name}.tsx`);
  const doc = join(dir, `${name}.doc.ts`);
  if (!existsSync(impl) || !existsSync(doc)) continue;

  const effective = sourceWithRecipes(stripComments(readFileSync(impl, "utf8")));
  if (!ANIMATES.some((r) => r.test(effective))) continue;
  animating++;

  if (MOTION_NOTE.test(readFileSync(doc, "utf8"))) {
    documented++;
    continue;
  }
  errors.push(
    `${relative(ROOT, doc)}: ${name} animates and declares no top-level \`motion:\` note. ` +
      `Say what moves, what drives it, and what reduced motion does to it — the visual ` +
      `baselines capture one static frame and can never describe this.`,
  );
}

if (errors.length) {
  console.error("Motion that escapes the token layer, or is never written down:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    "\nDurations and easings are tokens (ADR 0005); keyframes need their own reduced-motion\n" +
      "guard because the token collapse cannot reach them.",
  );
  process.exit(1);
}

console.log(
  `motion ok — ${scanned} source file(s) scanned, ` +
    `${documented}/${animating} animating component(s) documented`,
);
