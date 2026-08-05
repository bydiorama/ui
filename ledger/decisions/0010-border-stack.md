# 0010 — Four border weights; inputs sit on `subtle` by choice

**Status:** accepted · 2026-08-03

## Decision

1. The border stack is four structural weights plus focus:

   | Token | Theme zero | On white | Job |
   |---|---|---|---|
   | `--ui-border-subtle` | neutral-80 | 1.5:1 | the everyday hairline: input/select outlines, card edges, dividers |
   | `--ui-border-default` | neutral-70 | 2.1:1 | structure that must read at a glance: table rules, group separators |
   | `--ui-border-control` | neutral-60 | 3.1:1 | the WCAG 2.2 SC 1.4.11-conformant control boundary |
   | `--ui-border-strong` | neutral-40 | 5.9:1 | emphasis, selected/active |

2. **Form inputs default to `border-subtle`.** Decided three times over during
   the handover review, against repeated conformance prompts: a 3:1 outline on
   a resting input reads as an active state and flattens elevation. The field
   is identified by its fill, its persistent visible label, and its padding;
   the border is a hint. This is a knowing trade against SC 1.4.11 on resting
   form controls.

3. `--ui-border-control` exists precisely so that trade is reversible per
   consumer: an engagement that requires strict conformance on forms switches
   one token reference, not a redesign. It currently has no consumer — that is
   its job, not a defect.

4. The resolver derives **every weight opaque, by one construction** — a step
   from the page toward the ink, floored per weight (`default` 2:1, `control`
   3:1, `strong` 4.5:1) — and audits `border-focus`, `focus-ring-color`,
   `border-control` and `border-strong` through `NONTEXT_CONTRAST_PAIRS`.

   Contrast against a translucent value is undefined until composited, and two
   of the four used to be alpha hairlines. On the dark ground `default`
   composited to 1.48:1 — *identical* to `subtle` — so this stack silently had
   three levels in dark while looking like four in light. `strong` was worse:
   it landed below `control`, inverting the order the names promise.

5. `border-subtle` and `border-default` stay exempt from the **3:1 non-text
   floor** by design; nudging them there would undo point 2. They are not
   exempt from being *distinguishable*. A resolver test requires each step to
   clear the one below it by a real margin, in both schemes, across every
   stress brand — because a name is not a separation, and nobody notices two
   identical greys until a component that leans on the difference looks wrong.

## Why

One token was doing two jobs. Tuned quiet, control boundaries failed
conformance; tuned conformant, every card read as a box and "the UI feels less
elevated" (verbatim review feedback). Splitting the role resolves both without
a compromise value that serves neither.
