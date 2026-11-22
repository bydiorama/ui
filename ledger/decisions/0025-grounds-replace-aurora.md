# 0025 — Grounds of our own: mesh and fold replace aurora

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

The owner then pointed at two references, gradflow and MagicPattern's shader
background generator, and decided: **use no gradient library; treat them as
inspiration and a quality benchmark; write our own; retire aurora
completely.** gradflow declares MIT but ships no LICENSE file or copyright
line. MagicPattern exports bitmaps and video from a closed tool, so its
output can follow neither tokens nor schemes. Neither one considers text: with
our tokens, gradflow's fold, silk and mesh left muted ink at 1.0–1.1:1.

## Decision

1. **Aurora is retired.** `fx("aurora")`, its program, recipes, tokens
   (`--ui-fx-aurora-*`), the registered `--ui-fx-on` and its tests and
   stories are removed. It no longer exists on controls either: a control
   that wants light has `sheen`, `grain` and `glow`.

2. **Two grounds, written for this library, on the existing runtime.**
   - **`mesh`** is quiet. Five colour points drift over a field bent by two
     low sine swirls, blended by inverse distance.
   - **`fold`** is expressive. Light panes run along slow folds, each a soft
     body behind the crease and a sharp lit rim on it, in one direction.

   Both apply to `ground` only, an unslotted surface. Both read two colour
   tokens, `--ui-fx-ground-base` (default `--ui-bg-base`) and
   `--ui-fx-ground-light` (default `--ui-bg-accent`), and derive every other
   tone from them in OKLab: a mix, a lightness step, a hue turn. A brand gets
   a ground without a new contract token. No fbm octaves: the field is
   low-frequency by construction.

3. **Every shader ends with a dither.** After the field is mixed in OKLab and
   encoded to sRGB, a static triangular-PDF dither of one 8-bit step is added
   last (`fx_tpdf` in the prelude). It is static because a slow ground has no
   motion to hide a dither that changes every frame. Halo dithers its alpha
   the same way. Visible grain stays a separate choice
   (`--ui-fx-grain-amount`, set by `fx("grain")`).

4. **Rule 5.4 of ADR 0022 changes for grounds: a quiet zone, not a per-pixel
   guard.** A ground keeps an ellipse of its *exact* base around the copy's
   anchor:
   - `--ui-fx-ground-quiet` is its radius as a fraction of the width;
   - `--ui-fx-ground-quiet-x` and `-quiet-y` place it from the top left,
     bottom left by default.

   In the core (half the radius) the pixel is the base ± one dithered step,
   so the ink keeps the contrast the token pair is audited at. Outside it,
   the light is free to be bright. The browser test samples the core in both
   grounds, both schemes, theme zero and the pale-yellow stress brand, for
   primary and muted ink. It proves the measurement can fail by switching the
   zone off.

5. **A fade by separable falloff.** `--ui-fx-ground-dissolve` melts the edge
   into the page with the product of two 1D smoothsteps. Never a fade by the
   distance field.

6. **Grounds run at full resolution, at most 30fps.** A `ShaderDef` may set
   `adaptive: false` (exempt from the runtime's quality step-down: a scaled
   dither smears and the bands return) and `fps` (a cap; the clock keeps
   running, and a state change never waits). The grounds set both.

7. **The floor of a ground is a still CSS version of itself.** `.fx-mesh` and
   `.fx-fold` paint the base and a two-stop `radial-gradient(in oklab, …)` of
   the same light in the far corner, so the quiet corner is the base before
   hydration and without WebGL too. Forced colours: no image.

## Consequences

- **Breaking, for apps that used aurora.** `fx("aurora")` no longer
  type-checks. On a ground, use `fx("mesh")` or `fx("fold")`; on a control,
  drop it, or use `sheen`, `grain` or `glow`. `--ui-fx-aurora-*` overrides do
  nothing and can go.
- **Copy outside the quiet zone is unguarded.** That is the trade for a
  ground that can be bright. The skill and the token table say to place the
  zone where the copy is.
- **No contract token was added or removed.** The ground's tokens are
  effect-local custom properties, like every `--ui-fx-*` knob.
- **The runtime's `over` layer and per-part recipes remain** for future
  control effects. Today only halo uses a part recipe.
- **Measured in Chromium (SwiftShader).** Performance and the look on a phone
  are still to be checked on devices, as ADR 0022 requires of this layer.
