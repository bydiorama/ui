#!/usr/bin/env node
// Every declared type-role exception names a part that still exists.
//
// The type-role contract (ADR 0020 §3) is enforced at RUNTIME: every story
// fails if an element naming `text-<role>` renders a weight, leading or
// tracking other than its role's (apps/storybook/.storybook/type-roles.ts).
// That is the only place the check can live — a component's size map and
// its base classes are separate strings that `cn()` joins at runtime.
//
// The runtime cannot see the opposite failure: an exception whose part was
// renamed or removed. It excuses nothing, fires never, and reads as a
// standing decision about a part that no longer exists — the same way an
// allow-list entry rots in check:controls. So the exceptions are checked
// here, against the source, in the cold-clone gate.

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";
import { walk } from "./lib/classes.mjs";

const source = readFileSync(join(ROOT, "apps/storybook/.storybook/type-roles.ts"), "utf8");
const table = source.match(/TYPE_ROLE_EXCEPTIONS[^=]*=\s*\{([\s\S]*?)\n\};/);
if (!table) {
  console.error("type-roles: TYPE_ROLE_EXCEPTIONS not found in .storybook/type-roles.ts");
  process.exit(1);
}
const slots = [...table[1].matchAll(/^\s{2}(?:"([\w-]+)"|([\w]+)):/gm)].map((m) => m[1] ?? m[2]);

const files = walk(join(ROOT, "registry")).filter((f) => !/\.stories\.tsx$/.test(f));
const texts = files.map((f) => ({ rel: relative(ROOT, f), text: readFileSync(f, "utf8") }));

/** A slot is present when it is written out, or when it is composed from a
 *  literal prefix and a template suffix (`data-slot={`${slot}-option`}` with
 *  `slot="calendar-month"`). */
const present = (slot) =>
  texts.some(({ text }) => {
    if (text.includes(`"${slot}"`)) return true;
    const cut = slot.lastIndexOf("-");
    if (cut < 0) return false;
    const prefix = slot.slice(0, cut);
    const suffix = slot.slice(cut);
    return text.includes(`"${prefix}"`) && text.includes(`${suffix}\``);
  });

const errors = slots
  .filter((slot) => !present(slot))
  .map(
    (slot) =>
      `TYPE_ROLE_EXCEPTIONS names data-slot "${slot}", which no file in registry/ renders. ` +
        `Remove the entry, or rename it with the part.`,
  );

if (errors.length) {
  console.error(`type-roles: ${errors.length} stale exception(s)\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`type-roles ok — ${slots.length} declared exception(s), each naming a part that exists`);
