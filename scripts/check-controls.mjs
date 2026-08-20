#!/usr/bin/env node
// Interactive controls must come from the library, or say why not.
//
// Every gate in this repo asks "is this value legal?". None asked "should this
// have been a component?" — and that is the question a hand-rolled `<button>`
// inside a component fails. A bespoke control is invisible to check:utilities
// (its classes all resolve), to check:contrast (it declares its own pairs) and
// to the type system (it has no props to get wrong).
//
// The cost was concrete. A 32px softly-rounded control filled with
// --ui-bg-elevated was independently reinvented FOUR times — Header's menu
// toggle and avatar frame, the Sheet nav group's back button, Calendar's
// previous/next — before anyone noticed it was one thing. Each came out
// slightly different, none appeared in Storybook, and the Button component
// had `shape` defaulting to `pill` so none of them could have come from it.
//
// This gate does not ban bespoke controls. Several are correct: a drag handle
// is not a Button, a tab is not a Button, a calendar day is not a Button. It
// bans UNDECLARED ones. Adding a file to ALLOWED costs one line and one
// sentence, which is exactly the moment to ask whether Button should grow
// instead.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT } from "./lib/manifest.mjs";

/**
 * Controls that are deliberately NOT Buttons, each with the reason.
 *
 * The reason is the point. "It needed different padding" is not one; "it must
 * inherit the surrounding intent's ink, which every Button variant would
 * override" is.
 */
const ALLOWED = new Map([
  [
    "registry/ui/banner/banner.tsx",
    "The dismiss inherits the banner's INTENT ink (text-current) so it reads correctly on all five variants. Every Button variant sets its own colour, which would break exactly that.",
  ],
  [
    "registry/ui/drawer/drawer.tsx",
    "The drag handle is a full-width 32px band carrying the pointer gesture, not an action. It has no Button geometry at all.",
  ],
  [
    "registry/ui/sidebar/sidebar.tsx",
    "Two, both nav chrome rather than actions. A section header is a disclosure spanning the rail at the row's own inset and type. The profile row is a full-width composite — avatar, name, address and a trailing chevron — that opens the rail's second layer; no Button variant has that anatomy, and the layer's BACK control does use the shared chrome control.",
  ],
  [
    "registry/ui/image-upload/image-upload.tsx",
    "Three, none of which is an action in Button's vocabulary. `browse` is a word INSIDE a sentence — it has to inherit the prompt's type and baseline, and any Button variant would put a box in the middle of a line of prose. The file row's cancel is a 24px mark pinned to a row, sized by the row. The add tile is a 92px square that sits in a line of image thumbnails and is sized by them; the shared chrome control is a fixed 32px page-chrome tile, a third of that. Replace / Remove / Choose another file — the ones that ARE actions — are a slot, so the call site passes real Buttons.",
  ],
  [
    "registry/ui/thumbnail/thumbnail.tsx",
    "The remove affordance is a 16px mark pinned into the corner of the 48px tile it belongs to — it is sized by that tile, not by a control scale, and its 24px hit area is a pseudo-element rather than its box. The shared chrome control is a fixed 32px square, two thirds of the whole thumbnail. Asked whether chromeControl should take a size: it should not, because 16px is below SC 2.5.8's floor and a sanctioned recipe that fails the target-size rule by default is worse than a declared exception here.",
  ],
  [
    "registry/ui/table/table.tsx",
    "The sort control IS the column header. It fills a `<th>` — the sheet's hover fill is the whole lane, at the header row's height and the table's own inline padding — and the `aria-sort` state it drives lives on its parent cell. A Button inside a th would put a control-shaped box, with its own height, radius and padding, in the middle of a lane whose whole job is to line up with the cells beneath it.",
  ],
  [
    "registry/ui/chat-questionnaire/chat-questionnaire.tsx",
    "Two, and both are SELECTION rather than action. An option row is a card in the library's selection language \u2014 Card Sorting's active card, where the fill does not move and a 1.5px border-focus edge plus a check carries the state \u2014 and every Button variant either fills or rings on its own terms, which would put a second edge inside the one that means \"chosen\". A tile is a 1:1 picture with a caption under it, sized by its column in a four-across grid, with the selection outline OUTSIDE the media so the photograph keeps its own edge. The controls that ARE actions here \u2014 Confirm and Skip \u2014 are real Buttons.",
  ],
  [
    "registry/ui/calendar/calendar.tsx",
    "A day is a gridcell in an ARIA grid with a roving tabindex, sized by its column rather than by a size prop. The month arrows DO use the shared chrome control.",
  ],
]);

/**
 * Elements that are interactive by nature.
 *
 * LIMITATION, stated rather than discovered later: this matches literal
 * `<button` in JSX. A component choosing its element dynamically —
 * `const Row = isLink ? "a" : "button"` — renders `<Row>` and slips past.
 * Header and Sidebar both do that, and both are nav rows that would be
 * allowlisted anyway. Widening the pattern to catch it would mean parsing,
 * and the honest trade is to say so here.
 */
const CONTROL = /<button\b/;

/**
 * Comments are not code — the same lesson check:utilities learned.
 *
 * Badge's doc comment says "pass a real `<button>` into iconEnd", which is
 * advice AGAINST rendering one, and the first version of this gate reported
 * Badge for saying so. A gate that cannot tell code from the prose explaining
 * the code teaches people to stop writing the prose.
 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const errors = [];
let scanned = 0;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

for (const file of walk(join(ROOT, "registry/ui"))) {
  if (!file.endsWith(".tsx")) continue;
  if (/\.(test|stories)\.tsx$/.test(file)) continue;
  const rel = relative(ROOT, file);
  scanned++;
  // `button/button.tsx` IS the button.
  if (rel === "registry/ui/button/button.tsx") continue;
  const source = stripComments(readFileSync(file, "utf8"));
  if (!CONTROL.test(source)) continue;
  // A `<button>` styled with the shared recipe IS the sanctioned path — the
  // gate's own error message says so. Without this it would demand an
  // allowlist entry for doing exactly the right thing, and an allowlist that
  // fills up with correct code stops being read.
  if (/chromeControl/.test(source)) continue;
  if (ALLOWED.has(rel)) continue;
  errors.push(
    `${rel}: renders a bare <button>. Use Button, or the shared chrome control ` +
      `(@/lib/chrome-control), or add this file to ALLOWED in scripts/check-controls.mjs ` +
      `with the reason it cannot be either.`,
  );
}

// An allowlist entry for a file that no longer has a control is stale, and a
// stale exemption is how an allowlist stops meaning anything.
for (const [rel] of ALLOWED) {
  const source = stripComments(readFileSync(join(ROOT, rel), "utf8"));
  if (!CONTROL.test(source)) {
    errors.push(`${rel}: allowlisted in check-controls but renders no <button>. Remove the entry.`);
  }
}

if (errors.length) {
  console.error("Controls that should come from the library:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nA bespoke control is invisible to every other gate in this repo.");
  process.exit(1);
}

console.log(`controls ok — ${scanned} component file(s), ${ALLOWED.size} declared exemption(s)`);
