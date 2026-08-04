# 0009 — The type scale is an authored table; `ratio` is reserved

**Status:** accepted · 2026-08-03

## Decision

1. The type scale is the hand-tuned table approved in the Paper handover
   (`TYPE_ROLES` in `resolve.ts`): 14 roles, each carrying size, leading,
   weight and tracking. No modular ratio reproduces 48/32/24/20/16/14/13/12,
   so the previous `baseSize × ratio^n` derivation is retired.
2. Two new roles join the contract: `--ui-text-button-lg` and
   `--ui-text-button-sm` (flat leading, bold). `--ui-text-caption` is 12px —
   the floor; the sheet's 11px rendering was an annotation error.
3. Per-role leading/weight/tracking are **data for the component layer**, which
   pairs them with the shared fixed tokens (`--ui-weight-*` 400/450/500/550/600,
   `--ui-leading-*` 1/1.25/1.3/1.35/1.55, `--ui-tracking-*` −0.02/−0.01em).
   Aspekta's variable axis makes the quarter-weights real cuts (ADR 0007).
4. A brand's `baseSize` scales the whole table proportionally (clamped 13–20).
   **`ratio` is accepted and ignored** — it stays in the seed shape so
   re-activating it later is not a breaking change, and this ADR is the record
   of why setting it currently does nothing.
5. ~~`--ui-text-code-sm` keeps an engineering default pending the mono-face
   decision.~~ **Superseded by ADR 0011 (2026-08-03): there is no mono face,
   and `--ui-text-code-sm` is removed.** Code content uses `body-sm` plus a
   surface treatment.

## Why

The approved specimen is per-role tuned — title-md alone runs 550/1.25 against
its neighbours' 500/1.35. A derivation can only approximate that by growing a
parameter per role, at which point it *is* a table, minus the honesty. Fluid
sizing (display/title clamp between 375–1440px viewports) is unchanged.
