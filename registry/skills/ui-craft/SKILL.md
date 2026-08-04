---
name: diorama-ui-craft
description: Craft rules for building interfaces with @bydiorama/ui. Use when building or reviewing UI components, animations, hover states, shadows, radii, icons, or micro-interactions in a project that consumes the Diorama design system. Triggers on UI polish, "feels off", border radius, shadows, press feedback, enter/exit animations, icon states, motion review.
---

# Diorama UI craft

The small details that make interfaces built with `@bydiorama/ui` feel
finished. These rules complement — never override — the system's binding
conventions (`CONVENTIONS.md` in `bydiorama/ui`) and its semantic tokens:
when a rule below names a value, use the token that carries it, not the number.

Adapted for the Diorama design system from **"skills" by Jakub Krehel**
(github.com/jakubkrehel/skills, MIT). See CREDITS.md in `bydiorama/ui`.

## Review method

Slow the interface down: replay motion at 10% speed in the browser's
Animations panel and walk every state — hover, focus, active, loading, empty.
What feels off at 10% speed is what is subtly wrong at full speed.

## Rules

### Radii

1. **Concentric border radius.** Nested rounded elements share a centre:
   `outerRadius = innerRadius + padding`. Equal radii on a card and the button
   inside it is the single most common thing that makes a layout feel off.
   Derive from the `--ui-radius-*` scale; never invent a radius.
2. **Optical over geometric alignment.** Icons in buttons, play triangles and
   asymmetric glyphs need manual nudging when geometric centring looks wrong.
   Trust your eye, then encode the nudge in the component, not the call site.

### Elevation

3. **Shadows for elevation, borders for structure.** A border whose only job is
   depth should be a layered translucent shadow (`--ui-shadow-*`). Keep borders
   that communicate structure or state: dividers, separators, selection, focus.
4. **Image outlines.** Give images a 1px translucent outline so they hold their
   edge on any surface — pure black in light scheme, pure white in dark, never
   a tinted neutral (a tinted outline picks up the surface underneath and reads
   as dirt on the image edge).

### Motion

5. **Transitions for interaction, keyframes for one-shots.** CSS transitions
   retarget mid-flight, so a toggle reversed halfway reverses smoothly;
   keyframes restart and feel broken. Keyframes are for staged sequences that
   run once.
6. **Press feedback is `scale(var(--ui-press-scale))`** — 0.96, exactly.
   Below 0.95 feels exaggerated; above 0.97 is imperceptible. Components take
   `staticTap` to opt out where even this is noise.
7. **Stagger only infrequent entrances.** Staged entry (split into semantic
   chunks, `--ui-stagger-step` apart) is for first loads, success and empty
   states — never for row hovers, keystrokes or repeated tab switches. The
   attention cost of motion repeats on every trigger.
8. **Exits softer than enters.** A small fixed `translateY` and a fade, not a
   full-height collapse. `--ui-ease-out` both ways.
9. **Icon state changes cross-fade** (`opacity` + slight `scale`), both icons in
   the DOM — never a hard swap. Skip entrance animation on first render.
10. **Durations and easings come from tokens** (`--ui-motion-*`,
    `--ui-duration-*`, `--ui-ease-*`). Never a hard-coded `ms`. Never
    `transition: all` — enumerate properties. Reduced motion is already handled
    at the token layer; JS-driven animation must check it explicitly.

### Icons

11. **One SVG, recoloured per state.** Icons use `currentColor`; hover,
    selected and disabled states come from CSS colour and opacity, never
    separate assets. Outline is the default; fill marks the active state.
12. **Match stroke to text weight.** An icon beside text carries the text's
    optical weight. One stroke weight per surface — and in Diorama projects,
    `griddy-icons` only.

### Hit areas

13. **If it looks clickable, all of it is clickable.** No dead zones — a
    checkbox and its label are one target. The conformance floor is
    `--ui-hit-area-min` (24px); primary controls aim for `--ui-hit-area-touch`
    (44px). The visible element may stay small — extend the hit area with a
    pseudo-element on the wrapping label or button (replaced elements don't
    render `::before`/`::after` reliably).

### Pointer and disabled states

14. **Set `cursor: pointer` on anything clickable — always, explicitly.** No
    browser gives `<button>` a pointer cursor by default, and no reset in this
    stack adds one. It is the only signal a control is clickable *before* the
    click, so a missing pointer reads as "this isn't a button". Disabled
    controls get `cursor: not-allowed`.
15. **Disable with the attribute, not `pointer-events: none`.** `disabled`
    already blocks activation and removes the control from the tab order.
    Killing pointer events on top of that only makes the control unhoverable,
    which silently removes the tooltip that would explain *why* it is
    unavailable. Gate hover/press styling behind `enabled:` instead.
16. **Don't expect a press animation on Enter.** Pointer-press and Space-hold
    paint `:active`; Enter activates instantaneously, so the UA applies
    `:active` for at most a frame. That is browser behaviour, not a bug worth
    "fixing" with JS state — the focus ring is the static cue and the resulting
    action is the acknowledgement. Rule 8 already requires a non-motion channel.

### Colour

17. **Semantic tokens only.** `--ui-*` roles, never raw values, never palette
    names. One colour, one meaning: if the link colour shows up as decoration,
    the decoration gets a neutral instead. Only the single primary action in a
    view gets a filled accent background.
18. **Contrast fixes move lightness.** When a pair fails, adjust L and keep
    chroma and hue — that keeps the colour recognisably itself. (This is what
    the theme resolver's audit does; do the same in one-off fixes.)

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Equal nested radii | `outer = inner + padding`, from the `--ui-radius-*` scale |
| Border faking elevation | Layered translucent `--ui-shadow-*`; keep structural borders |
| Keyframes on a toggle | CSS transition, so it reverses mid-flight |
| `scale(0.9)` on press | `var(--ui-press-scale)` |
| Stagger on every hover | Instant feedback, or ≤150ms opacity/colour |
| Hard-coded `200ms` | `var(--ui-motion-standard)` |
| Separate icon file per state | One `currentColor` SVG, states via CSS |
| 16px icon-button with a 16px hit area | Pseudo-element hit area ≥ `--ui-hit-area-min` |
| Raw hex in a component | The `--ui-*` role token that means it |
| Clickable element with the default arrow cursor | `cursor: pointer` — never inherited, always explicit |
| `pointer-events: none` on a disabled control | The `disabled` attribute + `enabled:` gated hover, so tooltips survive |
| Asserting interaction in jsdom | A real browser — jsdom doesn't implement implicit activation |
