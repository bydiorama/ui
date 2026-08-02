# 0006 — The Brand Theme resolver

**Status:** accepted · **Date:** 2026-08-02

## Context

Diorama products let a client author a **Brand Theme**: a small set of colours
that re-skins shared documents, brand guidelines and read-only generators. The
previous generation of this (`buildThemeVars` in service-portal) re-bound only
**seven** semantic tokens, so any component reading one of the other ~90 kept
Diorama's own colours inside a client's branded surface.

The consequence was structural, not cosmetic: `PanelTile` and friends stopped
using the shared components altogether and re-implemented their styling from a
parallel `--portal-*` namespace. One design system became two.

## Decision

`resolveTheme(seed)` is a **total function over `BRANDABLE_TOKENS`**
(`packages/tokens/src/contract.ts`). Its return type is
`Record<BrandableToken, string>`, so a token added to the contract without a
derivation rule fails to compile. "Complete" stops being a thing anyone has to
remember.

Authors supply a **seed** — the same seven colours as before, plus typography,
shape and chrome knobs. Everything else is derived. Diorama's own look is
**theme zero**: the same seed shape, no special case.

Four sub-decisions:

**(a) Categorical data colours are curated, not accent-derived.** The four data
categories (informational, commercial, transactional, navigational) keep fixed
hues, re-toned per background for legibility — exactly how intent colours work.
Deriving a categorical ramp from one accent produces muddy, hard-to-distinguish
series for red or orange accents, and a chart whose categories are hard to tell
apart has failed at its job. Brand purity loses to distinguishability here.

**(b) Dark seeds may be authored, with derivation as fallback.** A theme may
hand-author its dark counterpart; when it does not, the resolver derives one.
This is also what makes app dark mode fall out for free — theme zero simply
authors its dark seed, rather than dark mode being a separate project.

**(c) A theme's `baseSize` and `ratio` re-bind the system's type roles**
(`--ui-text-title-*`, `--ui-text-body-*`, …) inside its scope, within the
clamps in `seed.ts`. This retires the parallel `--portal-text-*` scale: one type
system per page, which is the point of the whole exercise.

**(d) No per-token overrides.** Authors cannot override individual semantic
tokens beyond the seed. Arbitrary overrides break both guarantees this design
rests on — completeness and the contrast audit — and reintroduce the "some
tokens are branded, some are not" failure by the back door. When authors
legitimately need more control, the answer is a **new knob on the seed**, which
is reviewable and derivable, not an escape hatch.

## Contrast

Derivation is followed by an audit over `CONTRAST_PAIRS`. Pairs below the WCAG
AA floor are nudged until they pass, and **every adjustment is reported** so the
theme editor can tell an author "we adjusted your link colour for legibility"
rather than silently shipping either a contrast failure or a colour they did not
pick.

## Consequences

- Any component dropped into a themed scope is correct by construction. The
  reason to bypass the library disappears.
- Adding a semantic token is a deliberate act with a derivation rule attached.
- The old `--portal-*` namespace is absorbed; `themeVars.ts`'s CSP value
  sanitiser moves to seed intake, where a bad value is rejected loudly instead
  of silently dropped at emit time.
