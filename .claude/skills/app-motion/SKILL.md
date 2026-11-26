---
name: app-motion
description: Adding motion to an app built with @bydiorama/ui — who owns which animation, how to bring in transitions.dev snippets for product interactions without breaking their licence, and the integration traps (one snippet per element, nested accordions, digit swaps, replay, JS timing, reduced motion). Use when animating a count, label, icon, row, panel or toast in an app, when asked to "add motion", "make it feel alive", or to install transitions.dev, when adding a motion setting (reduce or turn off motion) or a calm region with data-ui-motion, when an animation does not play twice or plays on the wrong element, or when reviewing motion.
---

# Motion in a Diorama app

Two owners, never both on one element:

| Moves | Owned by | You do |
| --- | --- | --- |
| A Diorama component — Modal, Menu, Popover, Tooltip, Select, Switch, Checkbox, Accordion, Toast, Drawer… | the component, from the motion tokens | nothing. Do not add a transition, keyframe or snippet class to it or its parts |
| An effect — shimmering status text, a sheen, a glow | the effects layer, `fx("shimmer")` etc. | apply the class (the `effects` skill) |
| Something arriving or leaving — a row added to a list, a row folding away once done, a message landing in a stream | `Presence` (`fade` · `rise` · `collapse`) | wrap the keyed items; see § Presence |
| A short label changing in place — Save changes → Saved, Follow → Following, a status word | `TextSwap` | `<Button><TextSwap>{label}</TextSwap></Button>`; one line of text, a string |
| A product interaction the library has no component for yet — a count changing, an icon toggling, a field shaking on error | the app, with transitions.dev snippets | follow this skill |

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
- The token layer handles three motion levels — `full`, `reduced`, `off`
  (ADR 0028; next section). A snippet's own variables do NOT follow them —
  the snippet guards itself in CSS against the OS preference only, so wrap it
  in a `motion-safe:`/`@variant motion-safe` guard if it must respect the
  app's setting, and your JavaScript must check (below).

## Presence: arrivals and removals

`Presence` from `@/ui/presence` is the library's answer for anything that
enters or leaves, so it replaces a snippet for those cases:

```tsx
<ul>
  <Presence kind="collapse">
    {rows.map((row) => <li key={row.id}>{row.title}</li>)}
  </Presence>
</ul>
```

- `fade` (default) in place; `rise` for content landing in a stream;
  `collapse` for list rows, so the rows below glide instead of jumping.
- Keys from the DATA, never the index — the key is how a removal is told
  from a change. Items present on the first render do not animate; `appear`
  opts the first render in.
- Show the change, then remove the row: update its label or tick, wait for it
  to land, then drop it. Presence owns the exit, not that order.
- The item must forward `className` and `ref`; Presence owns `transition` on
  it, so put no other transition or snippet on the same element.
- Never wrap a Popover, Modal, Sheet, Drawer, Select, Menu or Toast — they
  animate themselves.

## The motion levels, and a motion setting in the app

| Level | What the library does |
| --- | --- |
| `full` | everything, at the tokens |
| `reduced` | nothing travels (slides become fades, scale-ins start full size, no stagger), loops stop; change in place still eases |
| `off` | every duration is 1ms |

- With no attribute, the OS preference decides: `reduced` if it asks for
  less, otherwise `full`.
- `data-ui-motion="reduced"` or `"off"` on any element sets its subtree, and
  is always honoured — even when an outer element says `full`. Use it freely
  for a region that must stay calm (a dashboard of live tiles).
- `data-ui-motion="full"` overrides the OS preference. Set it **only** from a
  choice the user made in your app's settings, never as a default, a theme
  or a marketing page's wish.
- An app motion setting is one attribute on `<html>`: offer "Follow the
  system" (no attribute), "Full", "Reduced" and "Off"; persist the choice;
  apply it before first paint (an inline script reading the stored value), so
  the page does not animate once at the wrong level.

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
- **The motion level is your job here.** Ask `motionLevel(element)` from
  `@/lib/motion` — never `matchMedia("(prefers-reduced-motion: reduce)")`,
  which ignores the app's setting — and below `full` skip the phases: swap
  the text at once, skip the shake, rather than running timers against a
  transition the CSS has already shortened. Something long-lived (a clock, a
  ticker) re-asks through `subscribeMotionLevel`.
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
   fast), repeat (does it play the second time?), and at each level:
   `data-ui-motion` set to `reduced` and to `off` on `<html>`, and with the OS
   preference on.
3. After it settles: the DOM text is the plain value, focus is where it was,
   nothing hidden is focusable, the end frame equals the static design.
4. Look for doubles: any element with two snippets, or a snippet on a
   Diorama component.
