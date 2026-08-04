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
  // `outline-offset-*` and the line styles are built-ins, not colours.
  [/^outline-(?!offset-|solid|dashed|dotted|double)(.+)$/, "--color-"],
  [/^(?:gap|gap-x|gap-y|p|px|py|pt|pb|pl|pr|m|mx|my|space-x|space-y)-(.+)$/, "--spacing-"],
  [/^rounded(?:-[trbl]{1,2})?-(.+)$/, "--radius-"],
  [/^shadow-(.+)$/, "--shadow-"],
  [/^font-(body|display)$/, "--font-"],
  [/^font-(thin|light|regular|book|normal|medium|semibold|bold|black)$/, "--font-weight-"],
  [/^leading-(.+)$/, "--leading-"],
  [/^tracking-(.+)$/, "--tracking-"],
];

/** Tailwind keywords and bare scales that need no theme variable. */
const BUILTIN = new Set([
  "transparent", "current", "inherit", "initial", "unset", "none", "auto",
  "full", "px", "screen", "fit", "min", "max", "offset", "inset", "hidden",
]);

const VARIANT = /^(?:hover|focus|focus-visible|focus-within|active|disabled|aria-busy|data-\[[^\]]+\]|motion-reduce|motion-safe|dark|sm|md|lg|xl|2xl|group-hover|peer-focus|forced-colors|print|first|last|odd|even):/;

function classesIn(source) {
  return new Set(
    [...source.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g)]
      .flatMap((m) => (m[1] ?? m[2] ?? m[3] ?? "").split(/\s+/))
      // `:` must be allowed here — variant prefixes are stripped below, and
      // filtering them out first silently skipped every hover/disabled state.
      .filter((c) => /^[a-z][\w:[\]().,%/#-]*$/.test(c))
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
    else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

const errors = [];
let checkedFiles = 0;
let checkedClasses = 0;

for (const file of walk(join(ROOT, "registry"))) {
  checkedFiles++;
  const rel = file.slice(ROOT.length + 1);
  for (const cls of classesIn(readFileSync(file, "utf8"))) {
    // Arbitrary values (`ring-[1.5px]`, `duration-[--ui-duration-fast]`) name
    // their own value and bypass the theme by design.
    if (cls.includes("[")) continue;
    for (const [pattern, namespace] of NAMESPACES) {
      const match = cls.match(pattern);
      if (!match) continue;
      const key = match[1];
      checkedClasses++;
      // Numeric keys are Tailwind's built-in scale (ring-1, p-0, size-6).
      if (BUILTIN.has(key) || /^\d/.test(key)) break;
      if (!declared.has(namespace + key)) {
        errors.push(`${rel}: "${cls}" needs ${namespace}${key}, which the token theme does not emit`);
      }
      break;
    }
  }
}

if (errors.length) {
  console.error("Unresolvable utilities — these produce NO css:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nAdd the token to the contract, or use a role that exists.");
  process.exit(1);
}

console.log(
  `utilities ok — ${checkedClasses} themed utilities across ${checkedFiles} component file(s) all resolve`,
);
