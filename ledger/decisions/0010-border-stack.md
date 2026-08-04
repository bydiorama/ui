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

4. The resolver audits `border-focus`, `focus-ring-color` and `border-control`
   against a 3:1 non-text floor (`NONTEXT_CONTRAST_PAIRS`) and derives
   `border-control` opaque, because contrast against a translucent value is
   undefined until composited. `border-subtle`/`-default` are exempt from the
   non-text audit **by design** — auto-nudging them would silently undo this
   decision.

## Why

One token was doing two jobs. Tuned quiet, control boundaries failed
conformance; tuned conformant, every card read as a box and "the UI feels less
elevated" (verbatim review feedback). Splitting the role resolves both without
a compromise value that serves neither.
