# 0018 — Motion earns its runtime; optionality is item granularity

**Status:** accepted · 2026-08-14

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

2. **Through `animate()` / `useAnimate`, never `<motion.*>` components.** Two
   reasons, and the first is the load-bearing one. A `motion.div` running a
   spring on the main thread writes inline styles that `getAnimations()` never
   reports, so Base UI unmounts underneath it — the imperative API is the one
   that can produce a WAAPI animation the behaviour layer will wait for.
   Second, a `motion.div` puts a library type one prop-spread from a public
   signature, which 0005 §4 forbids.

   **This must be probed, not assumed.** Before the first adoption, assert
   `element.getAnimations().length > 0` for the actual call at the pinned
   version. A runtime whose animation the behaviour layer cannot see is
   disqualified regardless of what its documentation claims.

3. **Optionality is ITEM GRANULARITY, not a package field.** This registry
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

4. **A keyframe carries its own reduced-motion guard.** Either `motion-safe:`
   on the animation or `motion-reduce:animate-none` on the same element. Both
   spellings are accepted, because the requirement is the guard. This is the
   half of 0005 §5 that was missing.

5. **Motion is written down where the component is documented.** Every
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

- **The `getAnimations()` probe has not been run.** Base UI's half is read from
  its source; Motion's half is not, and no version of it is installed here. The
  decision above is safe without it — nothing adopts a runtime yet — but clause
  2 is an assumption until that assertion exists.
- **Nothing tests that motion RUNS.** `check:motion` reads source, so it proves
  a class is present and documented, not that a property moves. The assertion
  that would — comparing a resolved animation's duration against the token —
  belongs in a shared browser probe beside `icon-slot` and `overlay-viewport`,
  and is not built. Until it is, this gate is the same kind of evidence the
  visual baselines are: real, and about the wrong layer.
- **Sidebar's collapsible section snaps** where Accordion animates the
  identical interaction against Base UI's published height. Recorded in
  Sidebar's `motion:` note as a gap rather than fixed here, because it is a
  component change and this is a decision.
- **Banner uses `transition-colors`** where the rest of the library enumerates
  properties. Legal — a fixed group, not `all` — but it is a second dialect for
  the same idea, and the repeated
  `transition-[…] duration-(--ui-duration-fast) ease-(--ui-ease-out)` triple
  appearing in 20+ places is the argument for a `lib/motion` recipe in the
  shape of `chrome-control`. Not built.
