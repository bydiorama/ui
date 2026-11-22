# 0025 — A parametric gradient of our own replaces aurora

**Status:** accepted · 2026-11-22 · amends ADR 0022 (rules 5 and 6) · item
`shader` stays `experimental`

## Context

The generated grounds looked poor: muddy on dark, veined, with visible bands
and an X-shaped crease in the corners. The research in
`docs/webgl-gradients.md` measured why, with a lab that renders the shipped
GLSL and the candidates under the same conditions:

- **No real dither.** Aurora added uniform white noise of ±1.5/255 *before*
  its contrast guard. Bands up to 103 px wide on dark; a blurred-circle
  ground showed 284 px.
- **The per-pixel guard crushed dark grounds.** Holding muted ink at 4.5:1
  on *every* pixel left aurora 23 luminance levels on dark. A clean mesh
  gradient, guarded the same way, kept 5.
- **fbm ribbons** read as veins and dirt: mid-frequency detail no ground
  wants.
- **A fade by the box's distance field** creases along the diagonals.

The owner pointed at two references, gradflow and MagicPattern's shader
background generator, and decided: **use no gradient library; treat them as
inspiration and a quality benchmark; write our own; retire aurora
completely.** After the parametric design landed, the owner asked for
gradflow's horizon itself: soft light rising from the bottom, with no rim.
It became a fifth look, `dawn`, which made the point of the design: a new
look is one form function, one preset row and one keyword. gradflow declares MIT but ships no LICENSE file or copyright
line. MagicPattern exports bitmaps and video from a closed tool, so its
output can follow neither tokens nor schemes. Neither one considers text:
with our tokens, gradflow's looks left muted ink at 1.0–2.4:1.

Of gradflow's looks the owner picked **mesh, stripe and horizon**. Measured,
they share a recipe: few *large* forms, a *wide* lightness range, *real*
chroma. Our first two grounds (mesh, fold) were busier, flatter and greyer.
Three prototypes on that recipe (wash, sweep, rise) followed, then a polish
of sweep's dark mode (§9 of the research).

Separate effects per look were then built and set aside **before merge**,
because the owner asked: why not one parametric gradient? The looks share
the palette, the quiet zone, the dither, the edge, motion and grain. Only
the form differs.

## Decision

1. **Aurora is retired.** `fx("aurora")`, its program, recipes, tokens
   (`--ui-fx-aurora-*`), the registered `--ui-fx-on` and its tests and
   stories are removed. A control that wants light has `sheen`, `grain` and
   `glow`.

2. **One ground effect, parametric: `fx("gradient")`.** It runs on the
   existing runtime, as one program. A **look** picks the form, from a
   keyword token:

   | `--ui-fx-gradient-look` | Form |
   | --- | --- |
   | `wash` (default) | broad gaussian pools drifting over a ramp: a calm field |
   | `sweep` | two big S-shaped forms lit across their bodies, each casting a shadow |
   | `fold` | light panes along slow folds, a soft body and a sharp lit rim |
   | `rise` | a horizon: a bright rim low in the frame, glow above, body below |
   | `dawn` | a soft horizon: light rising from below the frame, no rim; the colour peaks where the core meets the halo |

   Every other knob is shared and tunes any look: `-angle`, `-sharpness`,
   `-scale`, `-chroma`, `-intensity`, the quiet zone (`-quiet`, `-quiet-x`,
   `-quiet-y`) and `-dissolve`. Four knobs follow the look when left at
   **`auto`** (`GRADIENT_PRESETS`): angle, intensity, and the zone's size
   and height. So `--ui-fx-gradient-look: rise` alone is a finished horizon
   with its copy in the sky. The other knobs have one default for every
   look.

   The knobs' defaults are declared on `:root` and **inherited**, so a
   wrapper or a brand scope can set them. The colours are not declared;
   they fall back to the scope's own `--ui-bg-base` and `--ui-bg-accent`.
   Numbers are read with their CSS unit (`deg`, `turn`, `rad`, `%`, `ms`),
   an unreadable value (a `calc()`, an unknown unit or keyword) is said once
   in the console and reads as the default, and every knob is clamped to
   the range its GLSL is written for. The horizons (rise, dawn) use
   a smaller zone: their sky is already quiet, and a large ellipse there
   reaches down into the light. The looks do not blend into each other: they are
   different forms. Everything around the form is one piece of code.

   The runtime gains what this needs: a **keyword** uniform (a token whose
   value is one of a list, sent as its index); `auto` read as NaN and filled
   in by the program's `resolve`; and the resolved values returned by
   `sampleShader`, so a test measures what was drawn.

3. **Two colour tokens, everything else derived in OKLab.** These are
   `--ui-fx-gradient-base` (default `--ui-bg-base`) and
   `--ui-fx-gradient-light` (default `--ui-bg-accent`).
   - **Chroma falls with lightness.** A dark tone at full chroma reads
     electric, and a dark yellow reads olive.
   - **Darker tones turn their hue away from yellow-green.** A blue's
     shadows go royal; a yellow's go amber.
   - **Other hue drifts stay within ±24°.** A wide turn sends a pale-yellow
     brand to green.

   No fbm octaves: every look is low-frequency by construction.

4. **Every shader ends with a dither.** After the field is mixed in OKLab and
   encoded to sRGB, a static triangular-PDF dither of one 8-bit step is added
   last (`fx_tpdf`). It is static because a slow ground has no motion to hide
   a dither that changes every frame. Halo dithers its alpha the same way.
   Visible grain stays a separate choice (`--ui-fx-grain-amount`, set by
   `fx("grain")`).

5. **Rule 5.4 of ADR 0022 changes for grounds: a quiet zone, not a per-pixel
   guard.** The gradient keeps an ellipse of its *exact* base around the
   copy's anchor. Its core (half the radius) is the base ± one dithered step,
   so the ink keeps the contrast the token pair is audited at.
   - On looks that fill the frame (wash, sweep), the light also *falls away*
     toward the copy over a long reach, or comes from a direction, so the
     quiet side reads as composition, not a stain.
   - A zone of 0 is allowed for a ground whose copy sits on glass, which
     keeps its own ink legible over anything (ADR 0022 rule 4).

   The browser test samples the core for every look, both schemes, theme
   zero and the pale-yellow stress brand, for primary and muted ink. It
   proves the measurement can fail by switching the zone off.

6. **A fade by separable falloff.** `--ui-fx-gradient-dissolve` multiplies
   two 1D smoothsteps. Never a fade by the distance field.

7. **Grounds run at full resolution, at most 30fps.** A `ShaderDef` may set
   `adaptive: false` (exempt from the quality step-down: a scaled dither
   smears and the bands return) and `fps` (a cap; the clock keeps running,
   and a state change never waits).

8. **The floor of a ground is a still CSS version of its light.**
   `.fx-gradient` paints the base and a faint two-stop
   `radial-gradient(in oklab, …)` in the top-right corner. Forced colours: no
   image.

## Consequences

- **Breaking, for apps that used aurora.** `fx("aurora")` no longer
  type-checks. On a ground, use `fx("gradient")` and pick a look; on a
  control, drop it, or use `sheen`, `grain` or `glow`. `--ui-fx-aurora-*`
  overrides do nothing and can go.
- **One effect to learn, test and keep in sync.** A new look is a form
  function, a preset row and a value in the keyword list. It is not a new
  effect, class, stylesheet rule or test matrix. The browser test's loops
  pick it up from `GRADIENT_LOOKS`.
- **All looks compile into one program.** The branch on the look is uniform
  control flow, so a pixel runs only its look's code.
- **Copy outside the quiet zone is unguarded.** That is the trade for a
  ground that can be bright. The skill says to place the zone where the copy
  is, or to put the copy on glass.
- **No contract token was added or removed.** The gradient's tokens are
  effect-local custom properties, like every `--ui-fx-*` knob.
- **The runtime's `over` layer and per-part recipes remain** for future
  control effects. Today only halo uses a part recipe.
- **Measured in Chromium (SwiftShader).** Performance and the look on a phone
  are still to be checked on devices, as ADR 0022 requires of this layer.
