# Credits

This library is written from scratch (see `ledger/decisions/0002`), but it
stands on prior art, and some of that prior art is close enough to name
precisely.

## Adapted material

- **[jakubkrehel/skills](https://github.com/jakubkrehel/skills)** — © 2026
  Jakub Krehel, MIT. The craft rules in
  `registry/skills/ui-craft/SKILL.md` are adapted from the `better-ui`,
  `better-accessibility` and `better-colors` skills: concentric radius,
  shadows-for-elevation, image outlines, interruptible transitions,
  press-scale 0.96, stagger restraint, icon state rules, and hit-area
  guidance. The interaction tokens `--ui-press-scale`, `--ui-stagger-step`,
  `--ui-hit-area-min` and `--ui-hit-area-touch` encode values from the same
  source. Text was rewritten to reference this system's tokens and
  conventions.
- **[jakubkrehel/make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better)**
  — © 2026 Jakub Krehel, MIT. The predecessor of `better-ui`; same principles,
  credited for completeness.

- **[Aspekta](https://github.com/ivodolenc/aspekta)** — © 2025 Ivo Dolenc,
  SIL Open Font License 1.1. The design system's typeface, redistributed as
  `registry/fonts/aspekta/AspektaVF.woff2` with the OFL text alongside as the
  license requires.

## Inspiration (no text or code reused)

- **[jakubkrehel/oklch-skill](https://github.com/jakubkrehel/oklch-skill)** —
  no published license, so nothing was copied. It informed the choice to do
  all perceptual colour work in OKLCH and to fix failing contrast by moving
  lightness while preserving chroma and hue (`legibleOn` in
  `packages/tokens/src/color.ts` — implemented independently from the OKLab
  reference transforms).
- **[Astryx](https://github.com/facebook/astryx)** (Meta, MIT) — API
  conventions (`is*`/`has*`, `onOpenChange`, `default*`, `isBusy` vs
  `isDisabled`, slot rules), the typed-docs-over-prose stance, and several
  theming ideas (deriving a full palette from seeds, `light-dark()` schemes).
  Conventions were adopted as rules; no code was taken.
- **[shadcn/ui](https://github.com/shadcn-ui/ui)** (MIT) — the registry
  distribution model. `registry.json` / `r/*.json` are generated in its schema
  as a compatibility transport (`ledger/decisions/0001`).
- **[OKLab / OKLCH](https://bottosson.github.io/posts/oklab/)** — Björn
  Ottosson's colour space and published reference transforms, which
  `packages/tokens/src/color.ts` implements.
