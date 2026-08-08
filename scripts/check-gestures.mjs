#!/usr/bin/env node
// A pointer gesture needs a keyboard path, or a reason why not.
//
// CONVENTIONS §9 already says it — "an accessible reorder needs a keyboard
// path (SC 2.1.1), not just a pointer one" — and until now nothing enforced
// it. Prose is the floor: the same sentence was written about drag-and-drop
// before CardSorting existed, and the next pointer-driven component still had
// to be told by a reviewer rather than by the build.
//
// It is worth a gate specifically because a gesture LOOKS finished. A drag
// that works with a mouse passes every other check here: its classes resolve,
// its contrast is declared, its stories render, and axe has nothing to say
// about a div that responds to pointer events. The users who cannot use it are
// the ones no automated check is standing in for.
//
// Only INITIATORS count. `onPointerMove`/`onPointerUp` track a gesture that
// something else began, so a file holding those alone is following an
// interaction, not offering one.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

/**
 * Gestures that BEGIN an interaction by pointer.
 *
 * `onDrop` is here because a dropzone is the same problem wearing different
 * events: a file that can only arrive by being dragged onto a target cannot
 * arrive at all from a keyboard, and the fix — a real `<button>` that opens
 * the file picker — is the exact counterpart of CardSorting's arrow keys.
 */
const INITIATOR_NAMES = ["onPointerDown", "onMouseDown", "onTouchStart", "onDragStart", "onDrop"];

/**
 * REGISTERED, not merely named — the trailing `[=:(]` again.
 *
 * Badge declares `Omit<HTMLAttributes, "onMouseDown" | "onKeyDown" | …>` to
 * strip interaction props from a span that must never be interactive. A bare
 * word match read that REMOVAL as a registration and reported Badge — a
 * component that handles nothing — as an inaccessible gesture. Both halves of
 * this gate had the same bug in opposite directions, which is why both are
 * matched the same way now.
 */
const INITIATORS = INITIATOR_NAMES.map(
  (name) => [name, new RegExp(`\\b${name}\\s*[=:(]`)],
);

/**
 * What a keyboard path looks like in this library.
 *
 * The trailing `[=:(]` is not decoration. A bare `\bonKeyDown\b` also matches
 * the STRING "onKeyDown" in a type — Badge has `| "onKeyDown"` in an Omit —
 * so a component could have satisfied this gate with a type annotation and no
 * handler at all. Found by probing: Badge, which renders a span and handles
 * nothing, read as having a keyboard path.
 */
const KEYBOARD = /\bonKey(?:Down|Up)\s*[=:(]/;

/**
 * Components whose gesture is deliberately an ADDITION to a keyboard path
 * that already exists somewhere else.
 *
 * The reason is the point, and it has to name where the keyboard path is.
 * "It is hard to do with a keyboard" is not one.
 */
const ALLOWED = new Map([
  [
    "registry/ui/image-upload/image-upload.tsx",
    "The drop target is an ADDITION to a real <input type=\"file\">, which is in the tab order, carries the field's accessible name and opens the native picker — and to a real `browse` button that clicks it. Everything a file can do by being dragged onto the target it can also do by being chosen from the keyboard. The gate cannot see this because a <button> and an <input> are keyboard-operable NATIVELY, with no onKeyDown to detect; that is the correct implementation, so it is declared here rather than by adding a handler that does nothing.",
  ],
  [
    "registry/ui/drawer/drawer.tsx",
    "Drag-to-dismiss is a SHORTCUT to a dismissal that already exists without it: the behaviour layer's Dialog gives Escape and a scrim press, and Drawer.Close is a real button in the panel. The gesture adds reach for a thumb, not capability — nothing can only be done by dragging. (Contrast CardSorting, where the pointer gesture is the only way to reorder, which is why it grew arrow keys.)",
  ],
]);

/**
 * Comments are not code — the same lesson check:utilities and check:controls
 * each learned separately. A doc comment saying "there is no onDrop here"
 * would otherwise be read as a gesture.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const errors = [];
let scanned = 0;
let withGestures = 0;

for (const dir of ["registry/ui", "registry/lib", "registry/hooks"]) {
  for (const file of walk(join(ROOT, dir))) {
    // `.ts` as well as `.tsx`: a hook is where a gesture most naturally lives,
    // and a `.tsx`-only filter is how check:utilities missed the chrome
    // control for its whole life.
    if (!/\.tsx?$/.test(file)) continue;
    if (/\.(test|stories|doc|d)\.tsx?$/.test(file)) continue;
    const rel = relative(ROOT, file);
    scanned++;

    const source = stripComments(readFileSync(file, "utf8"));
    const found = INITIATORS.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);
    if (found.length === 0) continue;
    withGestures++;

    if (KEYBOARD.test(source)) continue;
    if (ALLOWED.has(rel)) continue;

    errors.push(
      `${rel}: starts a pointer gesture (${found.join(", ")}) and registers no keyboard handler. ` +
        `WCAG 2.2 SC 2.1.1 — everything doable by pointer must be doable from a keyboard. ` +
        `Add the keyboard path, or add this file to ALLOWED in scripts/check-gestures.mjs ` +
        `naming where the keyboard path already is.`,
    );
  }
}

// An exemption for a file that no longer has a gesture is stale, and a stale
// exemption is how an allowlist stops meaning anything — check:controls learned
// this one first.
for (const [rel] of ALLOWED) {
  const source = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  if (!INITIATORS.some(([, pattern]) => pattern.test(source))) {
    errors.push(`${rel}: allowlisted in check-gestures but starts no pointer gesture. Remove the entry.`);
  }
}

if (errors.length) {
  console.error("Pointer gestures with no keyboard path:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nA gesture that works with a mouse passes every other gate in this repo.");
  process.exit(1);
}

console.log(
  `gestures ok — ${withGestures} pointer-driven file(s) of ${scanned} scanned, ` +
    `${ALLOWED.size} declared exemption(s)`,
);
