# 0003 — Manrope is the distributable typeface; Saans is not

**Status:** accepted; face choice superseded by [0007](0007-aspekta.md) — Aspekta replaces both Manrope and Saans. The role model and enforcement below remain in force. · **Date:** 2026-08-02

## Context

Diorama's current products use Saans (a licensed typeface) and Geist. A design
system distributed to multiple projects — potentially from a public repository —
cannot carry a font it is not licensed to redistribute.

## Decision

- The manifest defines font **roles** (`--ui-font-body`, `--ui-font-display`,
  `--ui-font-display`). Components reference roles, never faces.
  *(The `--ui-font-mono` role named here was removed by ADR 0011.)*
- **Manrope (SIL OFL)** is the distributed default for every role, shipped as a
  registry item (variable `woff2` + `@font-face`). It replaces Geist as the body
  face. The legacy `--font-serif` alias is retired rather than remapped.
- **Saans never enters this repository** — not the files, not a `font-family`
  reference. It stays in service-portal and is applied there as an app-local
  override of the display role, scoped to the type roles reserved for it, with
  Manrope as the fallback so a load failure degrades to the system's own face
  rather than to a system font.
- Brand-authored fonts (client brands) continue to flow through the consuming
  app's own font-upload path. They are data, not distribution.

## Enforcement

`pnpm check:licensing` (`scripts/lint-licensing.mjs`) scans `registry/`,
`packages/` and `apps/` for font binaries and `font-family` declarations against
an **allowlist** — a new typeface requires a deliberate decision rather than
slipping in. The same check covers paid-tier assets from third-party libraries
(see 0005). Prose is out of scope: docs may name Saans, because docs are not
shipped to consumers.

## Consequences

- Any consuming project gets correct typography with zero licensing exposure.
- Designs drawn in Saans render correctly **only** inside service-portal, so
  Paper/Figma work should use Saans strictly for the reserved display roles.
