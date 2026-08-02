# 0005 — Motion tokens are owned; the runtime is optional

**Status:** accepted · **Date:** 2026-08-02

## Context

Motion is part of the visual identity, but animation runtimes are easy to make
load-bearing by accident — and a source-distributed component that hard-depends
on one forces the dependency on every consumer, including those that installed a
Button.

## Decision

1. **Motion tokens are the contract** (`--ui-duration-*`, `--ui-ease-*`,
   `--ui-motion-*`). CSS custom properties: no dependency, usable by CSS
   transitions and readable by any JS library. This is the layer the designer
   authors and the system owns.
2. **CSS first** — `@starting-style`, `transition-behavior: allow-discrete`,
   `interpolate-size`, view transitions. No bundle cost, no `'use client'`,
   works under RSC.
3. A **JS motion library only** for layout/shared-element animation,
   gesture-driven interaction, velocity-aware springs, or interruptible
   sequences — declared as an **optional peer dependency** of the components
   that need it.
4. **No motion-library type in a public prop signature** (see 0002).
5. **`prefers-reduced-motion` is handled at the token layer**: reduced motion
   collapses the duration tokens, so CSS-driven animation complies
   automatically and only the JS tier needs an explicit check.

## Licensing

Motion (motion.dev) ships its core as **MIT** (verified: `motion@12.43.0`).
Motion One and React Spring are MIT. Two boundaries:

- **Motion+ is a paid entitlement** — its premium material must not be copied
  into this repository. `check:licensing` denies its specifiers.
- **GSAP is not MIT.** Free for most uses, but under its own license; adopting
  it requires a deliberate review, not a "it's free now" wave-through.
