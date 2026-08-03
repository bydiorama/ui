# 0007 — Aspekta is the single typeface

**Status:** accepted · **Date:** 2026-08-03 · **Supersedes the face choice in 0003**

## Context

0003 established a two-face model: Manrope (OFL) as the distributable default,
with Saans (licensed) reserved for display roles inside service-portal behind a
never-distributed boundary. That boundary worked, but it meant every design had
a service-portal-only rendering path, Paper/Figma files had to police which
roles used which face, and other projects could never look quite like the
flagship.

## Decision

**[Aspekta](https://github.com/ivodolenc/aspekta)** (© 2025 Ivo Dolenc,
**SIL OFL 1.1**, verified from the repository's LICENSE) replaces **both**
Manrope and Saans. One family everywhere: body, display, every product,
every consumer.

- Distributed as the variable font (`AspektaVF.woff2`, 100–900 weight axis,
  ~30 KB) via the `font-aspekta` registry item, with the OFL text alongside —
  the OFL requires the license to travel with the font.
- `--ui-font-body` and `--ui-font-display` both default to Aspekta. The roles
  **stay separate tokens**: they are the seam that makes a future display face
  a one-line theme change, and brand themes still override them per brand.
- Role differentiation (display vs body vs label) now comes from the variable
  weight axis and the type scale, not from switching families.
- **Saans is retired entirely** — no reserved roles, no app-local override.
  The service-portal migration drops it.

## What does not change

The mechanics of 0003 stay in force: font *roles* over faces, the
`check:licensing` allowlist (now `aspekta` instead of `manrope`), brand-authored
fonts via the consuming app's upload path. The allowlist model proves its worth
here — swapping the system typeface was a one-entry change with every guard
intact, and any Manrope or Saans straggler now fails CI.

## Consequences

- The licensing story collapses to "everything in the tree is freely
  distributable" — no restricted-face boundary left to police.
- Designs render identically in every consumer; Paper/Figma need one family.
- service-portal's Saans files and its display-role override are deleted during
  Phase 4 migration.
