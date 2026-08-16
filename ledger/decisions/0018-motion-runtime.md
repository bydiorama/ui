# 0018 — Motion earns its runtime; optionality is item granularity

**Status:** accepted · 2026-08-14 · **clause 2 corrected by measurement
2026-08-16** — it named the wrong half of the library, and only a browser
probe could tell.

Amends 0005, which set the motion contract before there was any motion to
contract. Two of its five clauses turned out to describe a mechanism that did
not exist and a guarantee that did not hold.

## The finding

The motion tokens have been right since 0005 and the discipline has held
without anything enforcing it: **`registry/` contains zero hard-coded
durations and zero literal easings**, across 26 component files carrying
transitions. That is the part of 0005 that worked, and it worked because the
token layer made the correct thing also the easy thing.

Three things escape it.

**1. `peerDependencies` was never real.** 0005 §3 permits a JS motion library
"declared as an **optional peer dependency** of the components that need it".
Thirty-five manifest items declared `peerDependencies`; `schemas/ui.manifest.schema.json`
described it as the place for "react, griddy-icons, an optional motion
runtime"; and `buildIndex`/`buildItem` never emitted it. No consumer has ever
received the field and no CLI has ever installed from it.

This is not a new discovery so much as an unheeded one — `check-dependencies.mjs`
names it in its own header as the near miss that hid a real defect, because
seven items on the behaviour layer *looked* like they had declared Base UI. The
field was read as configuration for long enough to write an ADR clause around
it.

**2. `getAnimations()` is the interface, not the transition.** Base UI gates
every exit animation on `useAnimationsFinished` — it awaits `element.getAnimations()`
and then `flushSync`es the unmount. Anything not registered as a WAAPI
`Animation` is invisible to it: the popup unmounts mid-flight and the exit is
never seen. This constrains the choice of runtime far more than bundle size or
API taste, and it is not a constraint 0005 could have known about, because
0005 predates the behaviour layer (0012).

**3. Reduced motion is not fully handled at the token layer.** 0005 §5 says the
collapse of `--ui-duration-*` makes CSS-driven animation compliant
automatically, and that "only the JS tier needs its own check". A **keyframe**
carries its own timing — `animate-spin` does not read a duration token — so
collapsing the tokens cannot reach it. Three spinners ship today; all three
happen to be guarded, by two different idioms, and nothing required either.

## Decision

1. **Motion (motion.dev) is the runtime, when one is earned.** Named now so the
   question is settled, adopted only when a component cannot be built without
   it. 0005's licensing review stands: MIT core, Motion+ denied by
   `check:licensing`, GSAP still requires its own decision.

2. **Through `motion/mini`'s `animate()` — not `motion`'s, and never
   `<motion.*>`.** This clause originally said "the imperative API", on the
   assumption that `animate()` was WAAPI-backed and only the component API ran
   on the main thread. **Measured, that is wrong.** `motion@13.1.0`, Chromium,
   `getAnimations()` after each call:

   | Call | WAAPI animations | Base UI can see it |
   |---|---:|---|
   | `motion` `animate(el, {opacity}, {duration})` | **0** | no |
   | `motion` `animate(el, {x}, {duration})` | **0** | no |
   | `motion` `animate(el, {opacity}, {type:"spring"})` | **0** | no |
   | `motion` `animate(el, {x}, {type:"spring"})` | **0** | no |
   | `motion` `animate(el, {width}, {duration})` | **0** | no |
   | `motion/mini` `animate(el, {opacity}, {duration})` | **1** | yes |
   | `motion/mini` `animate(el, {transform}, {duration})` | **1** | yes |

   The main package's `animate()` drives every property from its own loop and
   registers nothing — a plain opacity tween included. Only the `mini` entry
   produces a real `Animation`. So the split is not imperative-versus-component
   as written; it is **which entry point**, and the difference is invisible in
   the call site, the types and the rendered result. It shows up only as a
   popup that vanishes instead of fading.

   `<motion.*>` stays excluded for the second reason too: it puts a library
   type one prop-spread from a public signature, which 0005 §4 forbids.

3. **The runtime that Base UI can see cannot do most of what 0005 wanted a
   runtime FOR, and that is the useful finding.** 0005 §3 permits a JS library
   for four things: layout/shared-element animation, gesture-driven
   interaction, velocity-aware springs, and interruptible sequences.
   `motion/mini` is WAAPI-only — it covers interruptible tweens and springs
   compiled to a `linear()` easing, and it cannot do layout/shared-element
   work or follow a finger, because both need per-frame main-thread writes.

   So the rule is about **what is gating the element**, not about taste:

   - Inside a Base UI popup whose exit is awaited → `motion/mini`, or CSS.
     Anything else is unmounted mid-flight.
   - A gesture the user is driving → per-frame writes, which is what Drawer
     already does by hand with no library at all. Nothing awaits those,
     because they happen while the surface is open rather than while it
     leaves.

   That leaves layout/shared-element animation as the only genuinely unserved
   case, and nothing in the library needs it yet.

4. **Optionality is ITEM GRANULARITY, not a package field.** This registry
   distributes source, one item at a time. A consumer who never adds `toast`
   never receives its file and never installs its dependencies — which is
   precisely what "optional peer dependency" was reaching for, already
   achieved, by the distribution model itself. The component that needs a
   runtime declares it in `dependencies`; no other item does; nothing else is
   required.

   `peerDependencies` is therefore removed from all 35 items and from the
   schema. It bought nothing that `dependencies` did not already buy: of the
   35, every entry was either `react` (deliberately never installed by the
   registry — see `ASSUMED` in `check-dependencies.mjs`), a package already in
   the item's own `dependencies`, or `griddy-icons` on two items that do not
   import it.

5. **A keyframe carries its own reduced-motion guard.** Either `motion-safe:`
   on the animation or `motion-reduce:animate-none` on the same element. Both
   spellings are accepted, because the requirement is the guard. This is the
   half of 0005 §5 that was missing.

6. **Motion is written down where the component is documented.** Every
   animating component declares a `motion:` note at the **top level** of its
   `*.doc.ts` — not nested inside `a11y`, where two of the three existing notes
   had put it. Motion is a description of what the component does, and a field
   that means one thing at two depths stops being findable.

   This is the only gate on the subject that a person has to satisfy by
   writing, and it is deliberate: motion is the one part of a component no
   other gate can describe. `check:contrast` measures its colours,
   `check:utilities` resolves its classes, and a visual baseline is a single
   frame in which, by construction, nothing is moving.

## What is enforced

- **`check:motion`** — a literal `ms`, a literal `cubic-bezier`, or an
  arbitrary-value timing utility in `registry/`; `transition-all`
  (CONVENTIONS §6, said since the beginning and never enforced); an unguarded
  keyframe; and an animating component with no top-level `motion:` note. It
  reads recipes alongside components, as `check:overlays` does, so Header's
  motion is found in `@/lib/chrome-control` where it actually lives.
- **`check:manifest`** rejects any item key outside `ITEM_KEYS`, which is
  declared beside the builders that emit it. A key nothing emits can no longer
  be added — the general form of the `peerDependencies` defect, rather than a
  patch for that one field.
- The companion rules stay in **`check:utilities`**: a transition list naming
  `transform`, and an enter/exit transform with no transition covering it.
  Those need the resolved Tailwind theme. The split is by what a script must
  load, not by subject.

## Consequences

- **No runtime is added by this decision.** Every high-need component in the
  queue — Skeleton, Toast, Banner, Tooltip, a Tabs indicator, Sidebar's section
  collapse — is reachable with CSS and the measurements Base UI already
  publishes. Adopting a dependency now would put it in the manifest with no
  call site, which is the same reasoning that defers the Paper emitter.
- **No component's rendered motion changes.** 27 docs gain a `motion:` note and
  two have theirs promoted out of `a11y`; `r/*.json` changes because doc
  contents are inlined, and no `.tsx` is touched.
- **`registry.json` is byte-identical on the manifest change**, which is the
  proof that `peerDependencies` was never emitted.

## Known gaps

- ~~The `getAnimations()` probe has not been run.~~ **Run on 2026-08-16**
  against a scratch install of `motion@13.1.0` (MIT confirmed, as 0005 found
  for 12.43.0), driven through Playwright Chromium. It overturned clause 2 as
  originally written — see the table there. Worth noting how close this came
  to shipping as prose: the wrong version was plausible, matched the
  documentation's framing, and would have been discovered by a consumer as a
  popup that disappears instead of fading.
- ~~Nothing tests that motion RUNS.~~ **Built 2026-08-16** —
  `registry/ui/motion.browser.test.tsx`, ten assertions through
  `getAnimations()` covering the duration tokens, two interaction transitions,
  two surface transitions with their PROPERTY asserted as well as their
  timing, and two keyframes. Probed failing-first on all four ways this can
  break.
- ~~Sidebar's collapsible section snaps.~~ **Fixed 2026-08-16** — it moves
  onto Base UI's Collapsible and transitions `height` to
  `--collapsible-panel-height` at `motionStandard`, which is Accordion's
  panel exactly. The hard part turned out not to be the height but the
  ordering of `hidden` around the animation, which is the reason to take the
  behaviour layer's answer rather than write a third.
- ~~Banner uses `transition-colors`, and the repeated triple argues for a
  `lib/motion` recipe.~~ **Both done 2026-08-16.** `lib/motion` exports
  `motionMicro` / `motionStandard` / `motionDeliberate`, adopted at all 49
  sites across 28 files; Banner enumerates `background-color`, which is the
  only property its dismiss control may move. Building it surfaced a live
  disagreement: the library uses `--ui-ease-out` fifty times out of fifty
  while the token layer offers four easings and four `--ui-motion-*` intents
  with **no consumers at all**. The constants are named for the intents and
  deliberately do not read them, so the disagreement sits in one file instead
  of being implied across twenty-eight.

- **The unconsumed motion tokens are now a live question, not a latent one.**
  `--ui-ease-default`, `--ui-ease-in`, `--ui-ease-spring` and all four
  `--ui-motion-*` intents have exactly one consumer between them
  (`--ui-ease-default`, which Skeleton's pulse now uses). A token nothing
  consumes is a guess — the lesson `--ui-nav-rail-width` already taught.
  Either the components are under-using the curve vocabulary or the
  vocabulary is larger than the system needs, and only a designer can say
  which.
