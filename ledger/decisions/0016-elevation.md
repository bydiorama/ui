# 0016 — Elevation is a role scale, cast dark in both schemes

**Status:** accepted · 2026-08-10

Supersedes the note in `resolve.ts` that read "the larger steps are engineering
defaults extrapolated from it plus the draft modal's overlay geometry, **pending
an elevation sheet**". This is that sheet's decision half; the drawing is
`Spec --- Elevation` on the Creative Editor page.

## Decision

1. **Four steps, each with a job — not a size.** The names are a scale, but
   what an implementer needs is "which one does this surface take", and until
   now nothing answered that. It is why one Paper board grew five distinct
   shadow values across five surfaces, four of them claiming `shadow-lg` in
   their layer names.

   | Token | Job | Ships on |
   |---|---|---|
   | `--ui-shadow-sm` | A control lifted off its own surface | Switch thumb, Slider thumb, Modal, Sheet, Calendar |
   | `--ui-shadow-md` | A panel attached to the thing that opened it | Card, Popover, Select, Multiselect, Menu, Drawer |
   | `--ui-shadow-lg` | A surface floating free of the layout — it has no anchor and must read as *over* the page | The editor's islands, its selection toolbar, its sheets |
   | `--ui-shadow-xl` | A surface that has taken the whole screen, or document artwork lying on the canvas | The editor's artboard |

   `lg` and `xl` had no consumer in `registry/` before the editor. That is why
   they drifted: an unused role is an unmeasured one.

2. **A shadow is OCCLUSION, so its ink is dark in both schemes.** It was
   `colors.textPrimary`, which inverts. In theme zero's dark scheme that
   resolves to `#F6F3F0`, so all four steps cast a **white glow**, and because
   every offset is positive the glow pooled *below* the element — precisely
   where occlusion belongs. A light puddle under a card reads as a reflection,
   not depth. It was wrong on every step, in every brand, on every dark page,
   for the whole life of the scale.

   Nothing could have caught it. `check:contrast` measures ink on grounds and a
   shadow is neither; the emit test asserted the *shape* of the `light-dark()`
   pair and any two colours satisfy that. It took an assertion that says what a
   shadow **is**.

3. **The ink is a ceiling, not a copy.** The first run of that assertion failed
   on the low-contrast stress seed in **light**: its `textPrimary` is a mid grey
   (`#8A8A8A`), so its shadows were grey smudges. A shadow does not get paler
   because a brand's type does. The resolver now takes the theme's own darkest
   colour — its ink in light, its page in dark — and floors it to
   `SHADOW_INK_MAX_L` (0.24 in OKLCH), keeping hue and chroma so a brand's
   shadow stays that brand's colour rather than reverting to neutral.

   Theme zero's `#1D1B19` already sits under the ceiling, so **every light value
   is unchanged to the byte**. Only the 12 dark visual baselines moved.

4. **Dark is deeper — 1.6× — not equal.** The two surfaces a shadow separates
   sit far apart in light (`#FFFFFF` page against a near-black ink: the whole
   range to spend) and close together in dark (`#423E3A` page, `#2F2C29`
   surface). At the light alphas the dark shadow measures as nothing against the
   page it falls on, which is how "elevation separates by tint, the shadow is a
   whisper" quietly becomes "in dark there is only tint".

5. **`-up` is the same elevation, lit from below.** A surface anchored to the
   BOTTOM edge of the viewport — a bottom sheet, a docked drawer — casts a
   downward shadow off-screen and reads as having no edge at all. Both mobile
   editor sheets hand-wrote a negated copy of `--ui-shadow-lg` before this
   existed, which is exactly how a pair drifts.

   It is **derived, never authored twice**: `shadow(layers, cast)` negates the Y
   offsets and nothing else, and a test flips one back and asserts it equals the
   other, so a drifted blur, spread or alpha cannot survive.

6. **A border is not elevation.** Kept from `ui-craft`: surfaces separate by
   tint first, the shadow is the whisper on top, and a structural hairline
   (ADR 0010) is a boundary rather than a lift. Every floating surface in the
   editor carries `border-subtle` *and* a shadow — the hairline says where the
   surface ends, the shadow says how far off the page it is.

## What is enforced

Four assertions in `resolve.test.ts`, each across every stress seed and both
schemes:

- the ink of every layer is dark (contrast > 10 against white);
- dark's alpha exceeds light's, layer for layer;
- each `-up` value equals its own step with the Y offsets negated and nothing
  else changed;
- the scale is ordered by reach (offset + blur), so `sm < md < lg < xl`.

The last one had never been asserted: four steps named sm/md/lg/xl are a claim
about ordering, the geometry is authored by hand one row each, and a transposed
digit would have read as deliberate.

## Known gaps

- **`--ui-shadow-*-up` has no component consumer yet.** Its first is the
  editor's bottom sheet, which is specified and not built; `Sheet` is
  `left | right` today. When `Sheet` gains `side="bottom"` it takes
  `shadow-lg-up`. Recorded here so the role does not read as a dormant escape
  hatch — the mistake ADR 0010 point 3 had to be amended for.
- **`sm-up` and `xl-up` exist for completeness of the construction**, not
  because a surface needs them. They cost one line each and a hole in a derived
  pair is worse than an unused member of it.
- **Paper cannot hold a shadow token.** It has no shadow type
  (`design/paper/README.md`), so a sheet can only carry the resolved value. The
  convention is: paste the resolved value, and put the role in the LAYER NAME —
  `Inspector (shadow-lg)`. That name is the only record the implementer gets,
  which is why a name claiming a token it does not use is a defect rather than
  untidiness.
