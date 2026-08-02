# 0002 — Built from scratch; tools are interoperated with, not inherited

**Status:** accepted · **Date:** 2026-08-02

## Context

Modern design systems are frequently assembled by copying an existing library
and re-skinning it. Diorama's library is a company asset intended to outlive any
single product and to carry the brand, so borrowed design is a liability.

## Decision

Every component, its API, its visual design, its tokens, its docs and its tests
are written here. **No third-party component library, design language, block
set, style or theme preset is copied into this repo.**

Third-party tooling is used where it is genuinely infrastructure, in three
categories that are explicitly *not* design:

| Kind | Examples | Why it is acceptable |
|---|---|---|
| Rendering / language | React, TypeScript, Tailwind | The substrate any design system stands on |
| Distribution transport | registry format + CLIs that read it | Generated output; replaceable (0001) |
| Behaviour mechanics | a headless a11y layer, a motion runtime | Unstyled, no design opinions, wrapped behind our own API |

Where a behaviour library is used, **no third-party type may appear in a public
prop signature.** That is what keeps it swappable rather than load-bearing.

## Consequences

- "Independence" here means no borrowed design and no borrowed component code,
  plus the ability to drop any single tool without rewriting the library. It
  does not mean reimplementing focus traps or a rendering library, and claiming
  otherwise would be theatre.
- Reviewers and agents may reject any change that introduces a third-party
  component or visual style, citing this record.
