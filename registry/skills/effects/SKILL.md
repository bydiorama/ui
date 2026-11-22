---
name: diorama-effects
description: Applying @bydiorama/ui's effects layer — glass, grain, sheen, glow, shimmer, ink, and the optional shaders: the mesh and fold grounds and halo — to components in a consumer app. Use when someone asks for glass or frosted panels, grain or texture, a shine or sweep on a button, a glow, shimmering status text, gradient headings, an animated gradient or WebGL background, a hero or empty-state ground, a halo while something loads, "make it feel premium", or when adding shaders, WebGL or liquid glass to a Diorama UI.
---

# Effects on @bydiorama/ui

The effects layer (ADR 0022 in `bydiorama/ui`) is materials, light and ambient
motion laid over components that are already finished. Two registry items:

| Item | What | Cost |
| --- | --- | --- |
| `fx` | `fx()` helper + one stylesheet per CSS effect | CSS only. Works before hydration, in every engine, statically rendered |
| `shader` | the grounds `mesh` and `fold`, `halo`, and `startShaders()` | One WebGL2 context, a client script. **Optional** — install only for these |

## Apply an effect: a class on the root, nothing else

```tsx
import { fx } from "@/lib/fx";

<Card className={fx("glass", "edge", "specular")}>…</Card>
<Button className={fx("sheen", "grain")}>Publish</Button>
<p className={fx("shimmer")}>Generating…</p>
<section className={fx("opaque")}>…glass inside stands down…</section>
<section className={fx("fold")}>…a hero on a moving ground, glass on top…</section>
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
| One material across a view: the nav, the cards, the menu opened over them | `glass` on each — the component picks its own thickness | choosing a "thinner" or "thicker" glass yourself: there is no such knob |
| Glass off for one dense region — a billing table, a slow embed | `opaque` on the region | removing `glass` from each part inside, or overriding the fill by hand |
| A flat fill to read as a material | `grain` | grain on an unfilled control: it shows as grey haze |
| Mark a moment — saved, value reached | `sheen` + `sweep(el)` once | a sweep on hover, or on a loop |
| A control that is ON to read as lit | `glow` | glow as a focus indicator |
| "Working…" while an agent runs | `shimmer` on the status text; `halo` on the busy Button | a spinner beside a shimmer — one signal |
| A hero heading with presence | `ink` | ink on body copy |
| A quiet moving ground: an empty state, a sign-in, a panel behind glass | `mesh` on the section | a ground behind dense UI — it is a backdrop for a few things |
| An expressive ground: a hero, a launch, a marketing band | `fold` on the section | more than one ground per view; a ground on a control (grounds are sections only) |

## What the layer guarantees — do not re-solve it

- **Contrast.** Glass paints a tint the resolver derives per brand so the
  inks clear 4.5:1 over **anything** behind it. Do not lower its opacity
  "for more glass"; re-emit the theme instead if the brand changed. A
  ground keeps a **quiet zone** of its exact base around its copy (bottom
  left by default), so the ink keeps its audited contrast — put the copy
  there, or move the zone to the copy (`--ui-fx-ground-quiet-x` / `-y`).
- **Thickness by role.** Sidebar and NavRail are the quietest pane
  (`--ui-nav-bg-glass`, derived from the nav's own colours, 12px blur, no lit
  top edge); Card, Badge and unfilled Buttons are as before; Popover and Menu
  are the thickest (`--ui-bg-glass-overlay`, 32px blur, lit along the top),
  because they open over what the reader was in. No tier is thinner than
  `--ui-bg-glass`. Select, Combobox, Tooltip, Modal, Sheet and Drawer take no
  glass.
- **Accessibility.** Reduced transparency, or `fx("opaque")` on an ancestor
  or the part itself → the component's own opaque fill; the edge light stays.
  Reduced motion → no ambient animation, one still shader frame, `sweep()`
  plays nothing. Forced colours → the plain component. You add nothing.
- **The floor.** No WebGL, before hydration, on the server: every component
  renders exactly as without the effect.

## Tuning

Override tokens on a scope, like any component variable:

| Token | Default | Moves |
| --- | --- | --- |
| `--ui-fx-glass-blur` / `-blur-control` | 24px / 12px | backdrop blur on surfaces / controls |
| `--ui-fx-glass-blur-frame` / `-blur-overlay` | 12px / 32px | backdrop blur on Sidebar and NavRail / Popover and Menu |
| `--ui-fx-grain` + `--ui-fx-grain-amount` | subtle tile, 0.03 | `var(--ui-fx-grain-visible)`, 0.07 for a grainier brand |
| `--ui-fx-ambient-speed` | 1 | 0.5 calm, 1.7 expressive — the grounds, ink, shimmer |
| `--ui-fx-ground-base` / `-light` | `--ui-bg-base` / `--ui-bg-accent` | a ground's two colours; every other tone is derived from them |
| `--ui-fx-ground-intensity` | 0.85 | how far the field leaves the base |
| `--ui-fx-ground-quiet` + `-quiet-x` / `-quiet-y` | 0.42 at 0.16, 0.9 | the quiet zone's radius (a fraction of the width; 0 = none) and centre (0..1 from the top left) — put it where the copy is |
| `--ui-fx-ground-dissolve` | 0 | 0.15–0.25 melts the ground's edge into the page |
| `--ui-fx-fold-angle` / `-sharpness` | 24deg / 70 | the folds' direction / how crisp their lit rims are |
| `--ui-fx-mesh-distortion` | 1 | 0 still points, up to ~1.5 more swirl |

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
| A glass nav or menu in a theme emitted before 2026-11-20 | The nav falls back to the opaque nav, the menu and popover to the opaque surface. Re-emit the theme to get `--ui-nav-bg-glass` and `--ui-bg-glass-overlay` |
| `fx("opaque")` around a menu that stays glass | Popover and Menu portal to the body, out of the region. Put `fx("opaque")` on the panel itself, or portal it into the region with `container` |
| Copy on a ground, outside its quiet zone | The ground is free to be bright there; nothing keeps that text legible. Move the zone (`--ui-fx-ground-quiet-x` / `-y`) to the copy, or the copy into the zone |
| `fx("aurora")` in an app | Retired 2026-11-22 (ADR 0025). On a ground use `mesh` or `fold`; on a control, `sheen`, `grain` or `glow` |
| Clipping a shader canvas with CSS | iOS Safari drops the clip while it animates. The shader draws its own shape; never add `overflow`/`border-radius` hacks to the canvas |
| Judging an effect in headless Chromium | The worst defects of this layer only showed on an iPhone. Look on a device, both schemes |
| Everything carries an effect | An effect is emphasis; emphasis everywhere is none. One glass surface and one lit action per view is plenty |
