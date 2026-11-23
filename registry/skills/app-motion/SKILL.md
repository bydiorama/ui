---
name: app-motion
description: Adding motion to an app built with @bydiorama/ui — who owns which animation, how to bring in transitions.dev snippets for product interactions without breaking their licence, and the integration traps (one snippet per element, nested accordions, digit swaps, replay, JS timing, reduced motion). Use when animating a count, label, icon, row, panel or toast in an app, when asked to "add motion", "make it feel alive", or to install transitions.dev, when an animation does not play twice or plays on the wrong element, or when reviewing motion.
---

# Motion in a Diorama app

Two owners, never both on one element:

| Moves | Owned by | You do |
| --- | --- | --- |
| A Diorama component — Modal, Menu, Popover, Tooltip, Select, Switch, Checkbox, Accordion, Toast, Drawer… | the component, from the motion tokens | nothing. Do not add a transition, keyframe or snippet class to it or its parts |
| An effect — shimmering status text, a sheen, a glow | the effects layer, `fx("shimmer")` etc. | apply the class (the `effects` skill) |
| A product interaction the library has no component for — a count changing, a label swapping, a row folding away, an icon toggling, a field shaking on error | the app, with transitions.dev snippets | follow this skill |

Check the first two rows before reaching for the third: a snippet layered on
a component that already animates double-animates it, and two `transition`
declarations on one element do not combine — one silently wins.

## Tokens, not numbers

The craft rules for timing are `craft` rules 6–11 (transitions
for interaction, keyframes for one-shots, exits softer than enters, icon
cross-fades, tokens for every duration). In app code that means:

- Durations and easings are `--ui-duration-*` / `--ui-ease-*` /
  `--ui-motion-*`, or a snippet's own variables. Never a literal `ms` in a
  component, never `transition: all`.
- For a plain Tailwind transition, use the recipes in `@/lib/motion`
  (`motionMicro`, `motionStandard`, `motionDeliberate`) with a literal
  property list: `cn("transition-[opacity,transform]", motionStandard)`.
  A class name assembled at runtime (`` `transition-[${p}]` ``) is never seen
  by Tailwind's scanner and silently does not exist.
- Under `prefers-reduced-motion` the token layer collapses
  `--ui-duration-*` to 1ms. A snippet's own variables do NOT collapse — the
  snippet guards itself in CSS, and your JavaScript must check (below).

## transitions.dev: install, copy, credit — never redistribute

transitions.dev (© Jakub Antalik) is **not MIT**. Its licence lets you use,
copy and modify the transitions inside your own product; it forbids
republishing the collection, or a substantial part of it, as a transitions
library, motion pack or animation kit. Full terms:
<https://transitions.dev/terms.html>. That is why this skill contains no
snippet code — it ships into other people's repositories, which would be
republishing.

1. Install the skill locally, in the app:
   `npx skills add Jakubantalik/transitions.dev`, and load `transitions-dev`
   (snippets), `transitions-polish` (tuning) as needed. **Do not commit the
   skill's files** — `git status` after installing, and ignore whatever it
   added.
2. Copy **only the snippets a screen uses** into one stylesheet (say
   `src/styles/transitions.css`), imported after the theme. Keep each one
   verbatim — selectors, the enumerated `transition` list, its
   reduced-motion guard. Re-point only colours, at Diorama roles.
3. Head that file with the credit: the source URL, © Jakub Antalik /
   Transitions.dev, "Transitions.dev License — not MIT", the terms URL, and a
   line saying it holds only the snippets this app uses. Add the same to the
   app's credits.
4. Never move those snippets into something other apps install — a shared
   package, a registry item, a template, a starter. That is the line.

## Integrating a snippet

- **One snippet per element.** Each snippet owns `transition` (often
  `display` too) on its element. Need two? Two wrappers.
- **Wrap each snippet once**, in a small component that only toggles the
  classes and data attributes the snippet documents — a number, a text swap,
  an icon swap, a collapse, a presence wrapper, an error-shake hook. The CSS
  is the snippet; the component is orchestration. Screens use the wrapper,
  never the raw classes.
- **Accordions do not nest.** The accordion snippet opens its panel with a
  DESCENDANT selector — an open root matches every panel below it, so an
  accordion inside an open accordion opens all of its panels at once. For a
  list whose rows enter and leave, use a separate presence wrapper with its
  own class, not a second accordion.
- **Removed items leave, they do not vanish.** Keep a removed row rendered,
  flagged as leaving, for its exit duration; show the state change first
  (the tick, the new label), then fold it away. Mark leaving or collapsed
  content `inert` so focus cannot land in it.
- **Digit swaps leave debris.** A number animation that injects old and new
  digit spans leaves the old digit in the DOM text: "1 2 1" for copy-paste,
  find-in-page, screen readers and tests. When it settles, restore plain
  `textContent`, and give the element an `aria-label` with the value.
- **Icon swaps keep both glyphs** in the DOM, cross-faded (`craft`
  rule 10), hidden from assistive tech; the button's label carries the state.

## JavaScript-driven motion

- **Replay by reflow.** A class that is already on an element does not
  animate when re-added. Remove it, force a layout read, add it again:
  ```ts
  el.classList.remove("is-playing");
  void el.offsetHeight; // reflow commits the removal
  el.classList.add("is-playing");
  ```
  In React, the same is a state reset followed by `requestAnimationFrame`.
- **Read durations from CSS, never restate them.** A timer that waits for an
  animation reads the variable it waits for, with a fallback:
  ```ts
  const ms = (name: string, fallback: number) => {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  ```
  then waits `ms(...) + 50` before cleaning up. A copied `300` drifts the
  first time someone tunes the CSS.
- **Reduced motion is your job here.** Check
  `matchMedia("(prefers-reduced-motion: reduce)")` and skip the phases —
  swap the text at once, skip the shake — rather than running timers
  against a transition the CSS has already disabled.
- **A JS runtime** only for CONVENTIONS §8's four cases (layout or
  shared-element, gesture, velocity springs, interruptible sequences), and
  then `motion/mini`'s `animate()` — never `<motion.*>` (ADR 0018). The
  `eslint-preset` item enforces it.

## Motion is never the only feedback

Every animated change also changes something static: a label, a colour, an
icon, a count. A count that only pulses, or a row that only fades, says
nothing to someone with reduced motion on, and nothing once it has settled.

## Review

1. **Slow it to 10%.** DevTools → Animations → playback 10%, or
   `Animation.setPlaybackRate` at 0.1 over CDP in a Playwright check.
2. **Walk every state**: enter, exit, reverse mid-flight (toggle twice
   fast), repeat (does it play the second time?), and with reduced motion on.
3. After it settles: the DOM text is the plain value, focus is where it was,
   nothing hidden is focusable, the end frame equals the static design.
4. Look for doubles: any element with two snippets, or a snippet on a
   Diorama component.
