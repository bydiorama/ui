# 0022 — The effects layer: CSS materials first, shaders only by admission

**Status:** accepted · 2026-11-06 · items `fx` and `shader` ship as
`experimental`

## Context

Brands ask for more than colour, shape and type: grain on a fill, glass over a
hero, light moving through a primary action, a halo while an agent works. The
system had nowhere to put any of it. Each product would have reached into
components with one-off CSS, a canvas library, or a prop added to the
component that needed it first — the "prop explosion" CONVENTIONS §3 forbids.

An effects lab (`design/effects/`, local, seven versions) prototyped the layer
on the registry's real components, under theme zero and five stress brands,
and on an iPhone. What it established is the substance of this record:

- **Most of what brands ask for is CSS.** Glass, grain, sheen, glow, shimmer
  and gradient ink need no runtime, work before hydration and in every
  engine, and degrade by declaration.
- **Refraction is outside the web stack.** Versions 5 and 6 built liquid and
  frosted glass as shaders. A canvas cannot read the DOM behind it, so the
  glass could bend only what the shaders themselves had drawn; every demo
  needed a background invented for it, and over real content it fell back to
  CSS glass anyway. Both versions passed every automated check and were a
  regression on a phone. `backdrop-filter: url()` with an SVG displacement
  map bends the DOM in Chromium only.
- **Text effects are CSS too.** Ink began as a canvas masked by glyphs (one
  font per element, a measured box per word, a compositing quirk in
  Chromium). `background-clip: text` with a gradient between two text roles
  does the same in every browser.
- **Light under text is not free.** Glass's tint had a per-brand floor from
  the start; the lab's glass studio then measured muted ink at the floor
  falling from 4.57:1 to 4.02:1 under a 4% white wash in dark. The floor has
  to count the material's light, not just its tint.
- **iOS Safari breaks two obvious techniques.** It drops a CSS `border-radius`
  clip on a canvas while the layer animates (square corners in every
  transition), and it paints a `drop-shadow` filter's region as a rectangle.
- **A gate that measures nothing passes.** The lab's contrast table once read
  "Passes –:1" for a card that was never drawn.

## Decision

1. **An effect is a class on a component's root, written `fx(…)`.**
   `className` is the one prop CONVENTIONS §5 guarantees lands on the
   outermost node; from there the stylesheet reaches the part it paints
   through `data-slot` (§6). No component grows a prop. Every component a
   shipped effect lists therefore needs a `data-slot` on its ROOT — Slider
   and RangeSlider gained one here; the slot that name had held moved to
   their header rows.

2. **The floor of every effect is the component.** An effect is a layer over
   a finished component. Reduced transparency, forced colours, reduced
   motion, no WebGL, before hydration, on the server: the part is exactly
   what the component draws, and nothing else has to be drawn or kept in
   sync. In CSS this is `revert-layer`, which is why rule 3 exists.

3. **The CSS lives in `@layer fx`, one stylesheet per effect.** Imported
   after Tailwind, the layer is ordered after `utilities`, so an effect wins
   over a component's own classes for the properties it owns, the app's
   unlayered CSS still wins over the effect, and `revert-layer` hands a
   property back to the component. Effects that paint a background compose
   in one fixed stack in `base.css` (light · sweep · specular · grade · grain
   · the part's own image), on layer variables that do not inherit, so two
   effects never overwrite each other and a grained Card does not grain the
   Switch inside it.

4. **Glass's tint is a token the resolver derives.** `--ui-bg-glass` is the
   surface at the least alpha (never below 0.78) at which primary and muted
   ink clear AA over `--ui-bg-glass-floor`: the tint over black in light,
   over white in dark, plus — in dark — the white the material lays under
   text (`GLASS_LIGHT_UNDER_TEXT`, 0.04). The same non-circular construction
   as the affix pair; `check:contrast` audits ink on the floor, and
   `check:fx` holds the glass stylesheet's light to the constant. Theme zero
   derives 0.90 light and 0.92 dark.

5. **A shader is admitted only if it:**
   1. paints only pixels it owns — its part's fill, or a ground — and never
      reads the page, a backdrop or another canvas;
   2. takes every input from a token, read where the part sits;
   3. keeps the component as its floor;
   4. guards the contrast of the ink its part carries, per pixel, and is
      measured doing so.

   Anything that fails a clause is a CSS effect, a design job, or a gap.
   Today two effects pass: **aurora** and **halo**.

6. **Shaders are a separate, optional item.** `shader` depends on `fx`; `fx`
   never depends on `shader`. A product that wants no WebGL installs none,
   and `fx("aurora")` still type-checks and renders the component. The
   runtime is one WebGL2 context for the page, one canvas per part, drawn
   from tokens, server-safe and reference-counted (`startShaders()` returns
   its stop). The shader draws the part's own rounded shape and the canvas
   covers the border box (the iOS findings); a fill's canvas is inserted
   directly after the fill, so a Slider's thumb paints above it. State
   (`--ui-fx-on`, `--ui-fx-halo-strength`) is CSS, eased on the canvas with
   the component's own motion tokens; the runtime only reads it while it
   transitions, and its loop sleeps when nothing moves.

7. **Motion follows ADR 0005 and 0018.** Durations and easings are tokens;
   every keyframe sits inside `prefers-reduced-motion: no-preference`; a
   one-shot (sheen's sweep) is a keyframe restarted on demand, never a
   hover; ambient loops run on `--ui-duration-loop`. Timings were chosen by
   usage with transitions.dev's polish rules and mapped onto existing tokens
   (`--ui-ease-spring` is its smooth-out curve).

8. **Enforced, not described.** `EFFECTS` in `fx.ts` is the single source of
   what exists, what each is for and where it applies. `check:fx` holds the
   stylesheets and shader sources to it and to rules 3, 5.1, 5.2 and 7;
   `fx.browser.test.tsx` asserts every CSS effect visibly changes every
   component it lists and steps aside exactly; `shader.browser.test.tsx`
   asserts rules 5.3 and 5.4 on drawn pixels, fails on "no pixel sampled",
   and proves the measurement can fail by switching the guard off.

## Consequences

- **Token contract:** two brandable tokens, `--ui-bg-glass` and
  `--ui-bg-glass-floor`, and two audited pairs. A brand theme emitted before
  this change has no glass tint; `fx("glass")` then falls back to the opaque
  surface — blurred backdrop, no transparency — until the theme is re-emitted.
- **Breaking, small:** `[data-slot="slider"]` and `[data-slot="range-slider"]`
  now name the roots; the header rows are `slider-header` and
  `range-slider-header` (ledger entries carry the migration).
- **Known limits, on record:** sheen washes out a pale accent toward white
  (a mid-to-dark fill wants it); a halo needs 22px of room outside its part,
  and an `overflow: hidden` ancestor cuts it flat; halo, glow and the focus
  ring share one colour role (`--ui-border-focus`); grain on glass is
  texture under text that the contrast arithmetic does not model.
- **Measured in Chromium (SwiftShader), not on a GPU, a phone or Safari.**
  The phone found what headless Chromium could not, twice. Acceptance of a
  change to this layer is visual, on a device, in both schemes.
- **Revisit refraction** when an engine other than Chromium can bend the DOM
  behind an element, or when HTML-in-Canvas leaves its flag — and then only
  through clause 5.
