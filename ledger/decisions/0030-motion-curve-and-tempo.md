# 0030 — A stronger ease-out, a quicker stagger, and a tick of its own

**Status:** accepted · 2026-11-27 · amends ADR 0028 §7. Raised by the
maintainer ("the Presence example feels laggy"); the token changes were chosen
by the maintainer after a study of three motion libraries.

## Context

The maintainer asked for motion that feels more elevated and seamless, and we
studied three libraries that do it well: transitions.dev, bencho and
animate-ui. They were built separately and use different stacks (plain CSS;
framer-motion; WAAPI with springs converted to CSS `linear()`). Yet they
agree on the two values this system had furthest from theirs.

**The curve.** `--ui-ease-out` was `cubic-bezier(0, 0, 0.2, 1)`. Sampled at the
same duration:

| Curve | 10% of the time | 25% | 50% |
|---|---|---|---|
| ours, `(0, 0, 0.2, 1)` | 0.30 | 0.58 | 0.84 |
| transitions.dev and bencho, `(0.22, 1, 0.36, 1)` | 0.40 | 0.76 | 0.96 |
| animate-ui, `(0.23, 1, 0.32, 1)` | 0.40 | 0.78 | 0.97 |

The eye judges speed from the first frames, so a 200ms move of ours read like
about 300ms of theirs. About 58 call sites use the token, so this was the most
consequential value in the motion layer. ADR 0028 §7 had made micro, standard
and deliberate all ease out, which was right; the curve itself was too weak.

**The stagger.** `--ui-stagger-step` was 100ms. All three libraries use
30–45ms; bencho's comment calls 40ms "a stagger you feel rather than one you
wait through". At our cap of six items, the last one started 500ms late.

**One token, two jobs.** `--ui-stagger-step` was also the clock of
StatusMatrix and the beat of the site's home plates. Both are computed,
repeating animations, not staggers. Retuning it alone would have run every
StatusMatrix 2.5× faster.

## Decision

1. **`--ui-ease-out` becomes `cubic-bezier(0.22, 1, 0.36, 1)`.** Durations are
   unchanged (120 / 200 / 320 / 400ms); with this curve they fall in the
   references' range. The `--ui-motion-*` intents follow, since they compose
   the token.
2. **`--ui-stagger-step` becomes 40ms.** It is a stagger only. Stagger's
   six-item cap now lands in 200ms.
3. **`--ui-tick` (100ms) is the beat of a computed, repeating animation.**
   StatusMatrix's shared clock and the home plates read it. Like the stagger
   step, it is 0 at Reduced and Off, so a clock that reads it does not start.
4. **Unchanged:** `--ui-ease-default`, `--ui-ease-in` and `--ui-ease-spring`.
   The maintainer kept the easing vocabulary as it is earlier the same day.

## Consequences

- Every arrival, hover response and move covers about three-quarters of its
  journey in the first quarter of its time, and lands more softly.
- The visual baselines don't change, since they are shot at rest. Tests that
  assert the curve literally (Button, Thumbnail, Toast, the token emitter)
  now expect the new one. None was loosened.
- A brand that retuned `--ui-stagger-step` to slow StatusMatrix now retunes
  `--ui-tick` instead.
- `motion-frames.mjs` (the `design-component` filmstrip helper) defaults to
  the new curve, so new Paper sheets match what ships.
- Sheets drawn before today show frames computed with the old curve.
  Positions at rest are unchanged; mid-transition frames are slightly behind
  what now renders.
