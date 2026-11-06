---
name: diorama-effects
description: Applying @bydiorama/ui's effects layer — glass, grain, sheen, glow, shimmer, ink, and the optional aurora and halo shaders — to components in a consumer app. Use when someone asks for glass or frosted panels, grain or texture, a shine or sweep on a button, a glow, shimmering status text, gradient headings, animated brand colour, a halo while something loads, "make it feel premium", or when adding shaders, WebGL or liquid glass to a Diorama UI.
---

# Effects on @bydiorama/ui

The effects layer (ADR 0022 in `bydiorama/ui`) is materials, light and ambient
motion laid over components that are already finished. Two registry items:

| Item | What | Cost |
| --- | --- | --- |
| `fx` | `fx()` helper + one stylesheet per CSS effect | CSS only. Works before hydration, in every engine, statically rendered |
| `shader` | aurora, halo, and `startShaders()` | One WebGL2 context, a client script. **Optional** — install only for these two |

## Apply an effect: a class on the root, nothing else

```tsx
import { fx } from "@/lib/fx";

<Card className={fx("glass", "edge", "specular")}>…</Card>
<Button className={fx("sheen", "grain")}>Publish</Button>
<p className={fx("shimmer")}>Generating…</p>
```

Never add a prop to a component for an effect, and never style its inner
parts yourself: the stylesheet reaches the part through `data-slot`. If an
effect does nothing on a component, it is not listed for it — check `EFFECTS`
in `lib/fx.ts`, which says what every effect is **for** and **where** it
applies. Writing it anyway renders the plain component.

Setup, once, after Tailwind and the theme:

```css
@import "tailwindcss";
@import "./theme-zero.css";   /* or the brand's emitted theme */
@import "./fx/fx.css";
@import "./fx/shader.css";    /* only with the shader item */
```

Keep it **after** Tailwind and **outside** any `@layer` of your own: effects
live in `@layer fx`, ordered after `utilities`. Your unlayered CSS still wins
over an effect — that is deliberate.

Shaders, once, in a client component at the root (or a `<script>` in Astro):

```tsx
useEffect(() => startShaders(), []);   // returns its own stop; StrictMode-safe
```

## Choose by job, not by look

| You want | Use | Not |
| --- | --- | --- |
| A panel over a photo, a video or a moving ground | `glass` (+ `edge`, `inner`, `specular`) | glass over a flat page — it is only a tint there |
| A flat fill to read as a material | `grain` | grain on an unfilled control: it shows as grey haze |
| Mark a moment — saved, value reached | `sheen` + `sweep(el)` once | a sweep on hover, or on a loop |
| A control that is ON to read as lit | `glow` | glow as a focus indicator |
| "Working…" while an agent runs | `shimmer` on the status text; `halo` on the busy Button | a spinner beside a shimmer — one signal |
| A hero heading with presence | `ink` | ink on body copy |
| The brand colour alive in the primary action, a fill or an empty ground | `aurora` | aurora on more than one or two things per view |

## What the layer guarantees — do not re-solve it

- **Contrast.** Glass paints `--ui-bg-glass`, a tint the resolver derives per
  brand so primary and muted ink clear 4.5:1 over **anything** behind it. Do
  not lower its opacity "for more glass"; re-emit the theme instead if the
  brand changed. Aurora guards its part's ink per pixel.
- **Accessibility.** Reduced transparency → the component's own opaque fill.
  Reduced motion → no ambient animation, one still shader frame, `sweep()`
  plays nothing. Forced colours → the plain component. You add nothing.
- **The floor.** No WebGL, before hydration, on the server: every component
  renders exactly as without the effect.

## Tuning

Override tokens on a scope, like any component variable:

| Token | Default | Moves |
| --- | --- | --- |
| `--ui-fx-glass-blur` / `-blur-control` | 24px / 12px | backdrop blur on surfaces / controls |
| `--ui-fx-grain` + `--ui-fx-grain-amount` | subtle tile, 0.03 | `var(--ui-fx-grain-visible)`, 0.07 for a grainier brand |
| `--ui-fx-ambient-speed` | 1 | 0.5 calm, 1.7 expressive — aurora, ink, shimmer |
| `--ui-fx-aurora-intensity` | per part | how much light moves through the fill |

**Never** tune `--ui-fx-glass-wash`, `-grade` or `-bloom` up in dark: that
light sits under text, and the resolver's floor counts exactly the current
amount.

## Traps already paid for

| Trap | Rule |
| --- | --- |
| "Liquid glass that bends the content behind it" | Not possible on the web stack outside Chromium: a canvas cannot read the page. Two shader versions were built and removed. Use `glass` |
| A halo cut flat on one side | It reaches 22px outside its part; an `overflow: hidden` ancestor clips it. Give it room |
| Sheen on a pale brand accent | White light lifts a pale fill toward white and it reads disabled. Sheen wants a mid-to-dark fill |
| A glass card in a theme emitted before glass existed | Falls back to the opaque surface. Re-emit the theme to get `--ui-bg-glass` |
| A canvas over a Slider thumb | Fixed in the runtime (the fill's canvas sits right after the fill). If you see it, your `shader` copy is stale — sync it |
| Clipping a shader canvas with CSS | iOS Safari drops the clip while it animates. The shader draws its own shape; never add `overflow`/`border-radius` hacks to the canvas |
| Judging an effect in headless Chromium | The worst defects of this layer only showed on an iPhone. Look on a device, both schemes |
| Everything carries an effect | An effect is emphasis; emphasis everywhere is none. One glass surface and one lit action per view is plenty |
