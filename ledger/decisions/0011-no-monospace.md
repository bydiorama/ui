# 0011 — No monospace face; Aspekta is the only typeface

**Status:** accepted · 2026-08-03
**Refines:** 0007 (Aspekta as the single typeface); closes the open question left by 0009 §5.

## Decision

There is **no monospace face** in the design system, and no token that implies
one. Specifically:

1. `--ui-font-mono` is **removed** from the token contract. It previously
   defaulted to a system stack (`ui-monospace, SFMono-Regular, Menlo, …`) —
   a face the system does not ship, does not control the metrics of, and had
   never designed against.
2. `--ui-text-code-sm` is **removed**. Without a mono face it was
   `--ui-text-body-sm` under a second name.
3. `SeedTypography.fontMono` is removed from the seed shape, so a brand author
   cannot introduce one either.
4. Code content — token names, snippets, IDs, URLs — is set in the body face
   and distinguished by **surface treatment** (a `bg-sunken` ground, inset
   padding, `--ui-radius-sm`), not by family. The approved handover already
   does exactly this: token labels throughout the style guide are Aspekta.
5. **Numeric alignment**, the one genuine engineering reason to reach for
   mono, is served by `font-variant-numeric: tabular-nums` rather than a
   second family. Verify Aspekta ships the `tnum` feature before relying on it
   for data tables; if it does not, that is a gap to file against the face, not
   a reason to reintroduce a mono stack.

## Enforcement

`pnpm check:licensing` already reads every `font-family` in distributed source.
Monospace families move from its allowlist to its **restricted** map, so any
mono stack in `registry/`, `packages/` or `apps/` fails CI with an explanatory
message. This is a design restriction enforced by the licensing gate because
that gate is the existing font-family reader — a rule that lives only in prose
is a rule that gets skipped (AGENTS.md §2).

## Why

Two faces means two licensing surfaces, two loading costs, and a second set of
metrics to design against — for a role that appears in this product mainly as
short inline strings. Aspekta's variable axis already supplies the tonal range
those strings need. Keeping a token for a face we neither ship nor style
against is the kind of quiet lie the contract exists to prevent.
