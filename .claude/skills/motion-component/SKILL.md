---
name: motion-component
description: Building, extending or reviewing one of this library's owned motion components (ADR 0028 §6 — Presence, Count, TextSwap, IconSwap, Stagger, Feedback) or any registry component whose job is movement. Use when adding a motion item, when a motion test passes on code that does not animate (or fails on code that does), when an item will not leave, leaves at once, or drops focus, or when a motion level does not reach a component. Covers the API shape, the CSS-first lifecycle, motion levels, and how to MEASURE motion in Chromium.
---

# Motion components

The owned motion components are motion with no look of their own. They
follow `add-component` like everything else — this skill is what that
pipeline does not say about movement. ADR 0028 is the decision record; the
`app-motion` skill is the consumer's view of the result.

## Before code

1. **A sheet exists**, drawn with `design-component` §1d — filmstrips whose
   values come from `../design-component/scripts/motion-frames.mjs`, a
   motion-levels table, a token map. Build from its numbers.
2. **The sheet's open decisions went to the user** (exit length, compound
   order, first-render behaviour, a new distance vs a reused token) and are
   badged `Decided` on it. Do not settle them in code.
3. **Is it actually yours?** Popover, Modal, Sheet, Drawer, Select, Menu and
   Toast own their mount/unmount motion through Base UI; effects own ambient
   loops (`effects` skill). A motion component wraps neither.

## Two shapes that worked

**Keep every state rendered (IconSwap)** when the set is small and known: all
glyphs stay in the DOM, a data attribute picks one, and per-state classes
carry the transition. Nothing mounts, so there is no exit to wait for, no
focus hand-off and no first-render rule to write — the first render simply
has no "before". The DESTINATION state's `duration-*` is the one a transition
runs on, so "arrive on base, leave on fast" is two class strings, not code.

**Mount and unmount (Presence)** when the content is open-ended:

| Decision | Why |
| --- | --- |
| No element of its own; each keyed child is the item | Works inside `<ul>`, a stack or a toolbar without changing layout or validity |
| State on the item as `data-<name>="entering\|present\|leaving"` | The only thing the CSS reads; tests and devtools can see it |
| Classes merged onto the child with `cloneElement` + `cn()` | Keeps tailwind-merge's conflict rules; the child must forward `className`/`ref`/`data-*` (CONVENTIONS §5) |
| Refs merged with Base UI `useRender({ render, ref })` | It merges the element's OWN ref. Hand-merging inside render trips `react-hooks/refs` and `react-hooks/immutability`, and every workaround (useMemo, a state holder) is rejected too |
| Arrival through `starting:` (CSS `@starting-style`) | No JavaScript and no extra frame; added ONLY to items that arrived after mount, which is how first-render items stay still |
| Everything a transition, never a keyframe | A reversed change turns around mid-flight. A keyframe is for a true one-shot (a shake), and then `motion-safe:` |
| Travel × `--ui-motion-travel`, durations from tokens | Reduced and Off then need no code at all |
| A size change measured and set inline, not a wrapper | A wrapper inside `<ul>` is invalid; `auto` cannot transition. Clear the inline value when it settles |
| List state derived DURING render (`if (state.children !== children) setState(…)`) | React's documented pattern; an effect would render one frame in the wrong state |

## Lifecycle traps already paid for

| Trap | Rule |
| --- | --- |
| A leaving item removed instantly | Wait for the item's OWN `getAnimations()` after one frame — a transition is created at the next style pass, not at the attribute write. Never its subtree: a spinner inside never finishes |
| Focus dropped to `<body>` when an item leaves | Setting `inert` on a focused element blurs it at commit. Move focus FIRST, then set `el.inert = true` imperatively in the layout effect — never as a rendered prop |
| Focus target not found | A registry of sibling refs loses the race: React re-attaches refs per fiber, so a sibling's ref can be detached when your effect runs. Items are DOM siblings — walk them (`nextElementSibling`) for the nearest non-leaving item |
| A fold restarting mid-flight | An effect that depends on neighbour data re-runs whenever a sibling changes. Keep such values in a ref; depend only on the item's own state |
| An item added back mid-exit vanishes | The merge must turn `leaving` back to `present` for a returning key, and a size animation must transition from its CURRENT inline value |
| The caller's inline style erased | The component owns the properties it animates on the item. Say so in the doc and the `dont` list; an inline height on a collapsing item is overwritten |
| Removal at Off happening synchronously | Off is 1ms, not 0, precisely so there is still an animation to wait for and a same-frame reversal still works |

## Measuring motion in Chromium

`getComputedStyle` reads the same for a working and a dead transition
(ADR 0018). Every assertion goes through `getAnimations()` or transition
events.

| Trap | Rule |
| --- | --- |
| No transition on code that works | Mount and change in one task and the browser has no "before" style. Wait two frames (`shown()`) between mounting and the change, as any real page has |
| A slide asserted absent fails at Reduced | `0%` and `none` are different values, so Chromium still creates a `translate` transition that moves nothing. Assert where a transition STARTS (`effect.getKeyframes()[0]`), not whether one exists |
| A 1ms transition at Off that "never ran" | It ends before any frame — even before its own `transitionrun` is delivered. Assert the computed `transitionDuration` (`0.001s`) and the event's `propertyName` |
| Reading after the fact | Capture at `transitionrun`, registered synchronously right after the change |
| A neighbour's transition read mid-flight | A settle helper waits for the whole subtree's FINITE animations, twice: movement can start a hover transition on something it passes under |
| A size asserted as a number | Assert the relationship: the item settles at a sibling's own height |
| Console output swallowed in the browser runner | Throw an Error carrying the findings; vitest prints the message |
| A probe that removes `transition-[x]` and the test still passes | Not the test's fault: a `duration-*` with no transition property means `transition-property: all`, which still includes `x`. Break the motion itself — skip the inline value, change the kind |

Then prove each new test bites: break the duration, the focus hand-off, the
travel token — one at a time — watch the named test fail, restore, and never
`git checkout` the probe away.

## First of its kind — gates and pages that will not know it yet

| What | Rule |
| --- | --- |
| `starting:` utilities | In `VARIANT` (`scripts/lib/classes.mjs`) and in both enter/exit rules (`check:utilities`, `check:motion`) since Presence. A new variant gets the same treatment — probe with a class that cannot exist |
| A component that paints nothing | `a11y.rendersNoColour: "<a sentence why>"` instead of an invented contrast pair. `check:contrast` rejects a short reason or one beside pairs |
| `data-slot` contract | Props extend `OwnedSlot` even with no element, and the module is listed in `registry/ui/data-slot.types.test.tsx` — `data-slot.test.ts` fails until it is |
| Visual matrix | One case per component (`check:visual-coverage`); for motion, draw the REST state under every kind — a forgotten inline height or a mid-flight offset shows there. The Linux baseline comes from the "Generate visual baselines" workflow; say so in the handoff |
| Site catalogue | Needs a motif in `apps/site/src/components/motifs/` (one static frame). Draw moving text as a bar: translucent text fails the catalogue's contrast audit even inside an `aria-hidden` tile |
| A slot name that starts with a utility prefix (`text-swap`) | `check:utilities` read it as a `text-*` colour, in the JSX attribute and inside a `[data-slot="…"]` selector string. Data-attribute values are now blanked like prose attributes (`scripts/lib/classes.mjs`) |
| A motion item that imports another (`@/ui/presence`) | The alias is listed by hand in the root and Storybook tsconfigs, `.storybook/main.ts` and `vitest.config.ts` (`uiItems`); the error is "Cannot find module" |
| A component generic over its keys (`IconSwap`'s `show: keyof icons`) | `forwardRef` loses the generic; cast the result to `<K extends string>(props: Props<K> & { ref?: Ref<…> }) => ReactElement`, and type the picked key `NoInfer<K>` so a wrong name errors instead of widening `K` |
| A scaled element's position asserted with `getBoundingClientRect()` | The rect includes the scale: a hidden glyph at 0.5 sits a quarter-size in from its corner. Compare centres |
| Stories | A type role is a composite — `text-label-sm font-semibold` overrides its weight and the story gate fails. Use the role alone |

## Definition of done, beyond `add-component`

The sheet badged `APPROVED`, its gaps updated to what was built, and any
change made at implementation recorded on it · every phase measured at Full,
Reduced and Off · reversal and focus hand-off tested · each new test and each
touched gate probed failing first · `app-motion` updated if consumers should
now reach for the component instead of a snippet.
