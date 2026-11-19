# 0022 — The effects layer: CSS materials first, shaders only by admission

**Status:** accepted · 2026-11-06 · items `fx` and `shader` ship as
`experimental` · amendment **proposed** 2026-11-19 (glass by role, an
opaque scope)

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

## Amendment — 2026-11-19 (proposed): glass by role, an opaque scope

**Status of this section: proposed, not accepted.** Nothing below ships until
the owner accepts it and the device check at the end has been run. Until then
the decision above stands unchanged.

### Context

A review of Solid Glass (`deeplethe/solid-glass`, MIT), a glass theme for
shadcn/ui, turned up three ideas that could extend this layer and several that
conflict with it. A prototype built on the shipped `glass.css` and `base.css`,
unchanged, with theme zero's tokens, put each idea beside today's glass on
identical markup. The figures below come from it (Chromium, desktop and phone
widths, both schemes). Ideas are taken, code is not. Two survived the
prototype; the third is recorded under Rejected.

Two gaps it made visible:

- **Glass stops at Card.** `EFFECTS.glass.on` is Button, Card and Badge. A
  sidebar, a menu or a modal over moving content stays opaque however the
  page is styled, so one view mixes two materials.
- **The only off switch is the reader's.** Reduced transparency drops glass
  for the whole page. An app cannot drop it for one dense region (a billing
  table, a slow embed) without overriding the layer by hand.

### 1. Glass takes its thickness from the component's role

`fx("glass")` stays the whole API. What changes is how many components it
reaches, and that the component, not the caller, decides how thick the pane
is.

| Tier | Role | Parts (root slot) | Tint | Blur | Light |
|---|---|---|---|---|---|
| Frame | Lays the page out | `sidebar`, `nav-rail` | `--ui-bg-glass` | 12px | A hairline of light on the side facing the content; no top rim, so a column of frames never outshines what is read |
| Surface | Content on the page | `card`, `badge`, unfilled `button` | `--ui-bg-glass` | 24px / 12px | As shipped, unchanged to the byte |
| Overlay | Opens over content it is not about | `popover-panel`, `menu-panel`, `modal-surface`, `sheet-panel`, `drawer-panel` | `--ui-bg-glass-overlay` | 32px | Light along the top, shade along the foot |

- **Role, not elevation step.** ADR 0016 puts Card, Popover, Menu, Modal,
  Sheet and Drawer on the same step (`--ui-shadow-md`), so the shadow scale
  cannot tell a card from the menu opened over it. The role can: an overlay
  covers content the reader was in the middle of, and has to win over it.
- **No tier is thinner than the floor.** The frame reuses the surface tint;
  only the overlay changes it, and only toward opaque. Solid Glass makes its
  thinnest pane the most transparent; ours cannot, because `--ui-bg-glass` is
  already the least alpha at which the inks clear AA (decision 4).
- **A tier never changes elevation.** The shadow stays the component's own;
  ADR 0016 owns it. Glass changes how thick the pane at that elevation looks.
- **New token, derived like its pair.** `--ui-bg-glass-overlay` is the overlay's
  own fill, `--ui-bg-elevated`, at alpha `a + 0.6 × (1 − a)`, where `a` is
  `--ui-bg-glass`'s alpha. Theme zero: 0.96 light, 0.97 dark. `check:contrast`
  audits it over the worst backdrop the same way as `--ui-bg-glass`, white
  light under text included (`GLASS_LIGHT_UNDER_TEXT`). The overlay adds no
  wash, grade or bloom, so the constant does not move.

Muted ink over the worst backdrop, measured in the prototype:

| Tier | Light | Dark |
|---|---|---|
| Frame | 4.61:1 (opaque today: 5.78:1) | 4.62:1 (6.56:1) |
| Surface | 4.61:1, unchanged | 4.62:1, unchanged |
| Overlay | 5.06:1 (opaque today: 5.36:1) | 4.88:1 (5.68:1) |

The prototype mixed the overlay tint toward `--ui-bg-elevated` instead of
setting its alpha, so the resolver's figures may differ in the second decimal.
Its audit, not this table, is the number that counts.

Out of scope, recorded so they are not re-proposed by accident:

- **Select, Multiselect and Combobox popups.** Their `className` lands on the
  field wrapper, not on the popup in the portal, so a class cannot reach the
  popup and a prop is what decision 1 forbids. Glass reaches them only if their
  API changes for another reason.
- **Tooltip.** It is `bg-emphasis`, an inverse fill, excluded for the same
  reason filled Buttons are.
- **`edge` and `specular` on overlays.** Not extended until a design asks for
  them; `specular` adds light under text and would need the floor recounted.

### 2. An opaque scope: `fx("opaque")`

On any element. Every glass part inside it, or on it, goes back to its
component: fill and blur revert, the light along the edges stays. It is the
reader's reduced-transparency path, scoped by the app.

- **One mechanism, nested.** Each glass rule carries the step-aside inside
  itself (`.fx-opaque &, &.fx-opaque { background-color: revert-layer;
  backdrop-filter: revert-layer }`), as `base.css` already requires of every
  step-aside, so it has the rule's exact selector and specificity. Solid
  Glass's equivalent only removes the blur and leaves the fill translucent;
  `revert-layer` gets the opaque fill back for free.
- **A scope, not a component effect.** `FxTarget` gains `"scope"`: any element,
  reaching the glass inside it.

### Open, not decided: saturation in dark

Glass saturates its backdrop 1.6× in both schemes. In dark, a boosted backdrop
under a near-black pane can read as a second palette; Solid Glass drops the
boost there. At theme zero's 0.92 tint the difference is small, and brands
that tint their surfaces may want the boost. Saturation does not move the
contrast floor (it is measured over pure black and white). If adopted it is a
per-scheme value, and `light-dark()` cannot carry a number, so the theme
emitter would write it per scheme. Decide on a phone, not here.

### Rejected from Solid Glass

Settled, so not to be re-proposed without new evidence:

- **Glass keyed to colour utilities** (`.bg-card` is glass wherever it
  appears), in rules **outside any layer** so nothing can switch them off.
  Contradicts decisions 1–3: an effect is opted into, the app's CSS wins, and
  the component is the floor.
- **Glass on the primary action.** `glass.css` keeps stepping aside for
  filled Buttons: on one, glass would replace the one accent action in view.
- **Hover, selected and open drawn as one state.** A state model, not a
  material; it would be a second dialect beside CONVENTIONS.
- **Ambient light painted under the page.** Art direction for a page, not
  something the system ships.
- **Translucent panes without a floor.** Its dark card is 46% opaque over
  whatever passes behind it; nothing here ships below the audited tint.
- **Lit grooves on input controls** (a proposed `fx("well")`: shade under a
  track's upper lip, light along its lower one, the fill lit as a raised
  strip, on Switch, Slider, Progress and Checkbox). Prototyped and declined by
  the owner on 2026-11-19: on a glass card it read as a regression from the
  shipped controls. Switch, Slider, Progress and Checkbox keep what ships, and
  glass stays a material for surfaces, not for the controls on them.

### What would be enforced

- `EFFECTS`: `glass.on` gains the frame and overlay targets; a new row
  `opaque` (`on: ["scope"]`). `FxTarget` gains `sidebar`, `nav-rail`,
  `popover`, `menu`, `modal`, `sheet`, `drawer`, `scope`.
- `check:fx`: a map from target to root slot, because a compound part's slot is
  not its name (`popover` → `popover-panel`); `"scope"` exempt from the
  slot-reach rule; every rule that sets `backdrop-filter` must carry the
  opaque step-aside.
- `fx.browser.test.tsx`: each tier's computed alpha is at least
  `--ui-bg-glass`'s; a glass Card inside `fx("opaque")` paints its component's
  fill.
- `resolve.test.ts` and `check:contrast`: `--ui-bg-glass-overlay` is at least
  as opaque as `--ui-bg-glass` in every stress seed and both schemes, and both
  inks clear AA over its floor.

### Consequences

- **Additive.** One new brandable token and its audited floor; Card, Badge and
  Button glass unchanged. A theme emitted before this has no overlay tint, so
  overlay glass falls back to the opaque `--ui-bg-elevated`, as decision 4's
  fallback does for the surface tint.
- **Ledger.** `fx` and `theme-zero-css` each take a `feature` entry when it
  lands; nothing is breaking.
- **Acceptance**, as above: visual, on a device, in both schemes, with the
  frame and overlay tiers checked over real content in Safari on iOS before
  the status line says accepted.
