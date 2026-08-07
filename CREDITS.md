# Credits

This library is written from scratch (see `ledger/decisions/0002`), but it
stands on prior art, and some of that prior art is close enough to name
precisely.

## Adapted material

Full licence texts for everything in this section live in `licenses/`. MIT
requires the copyright notice **and** the permission notice to travel with
substantial portions, so naming the licence is not enough on its own — and
where the adapted material is itself DISTRIBUTED (the `ui-craft` skill), the
notice is installed beside it rather than left behind in this file.

- **[jakubkrehel/skills](https://github.com/jakubkrehel/skills)** — © 2026
  Jakub Krehel, MIT. The craft rules in
  `registry/skills/ui-craft/SKILL.md` are adapted from the `better-ui`,
  `better-accessibility` and `better-colors` skills: concentric radius,
  shadows-for-elevation, image outlines, interruptible transitions,
  press-scale 0.96, stagger restraint, icon state rules, and hit-area
  guidance. The interaction tokens `--ui-press-scale`, `--ui-stagger-step`,
  `--ui-hit-area-min` and `--ui-hit-area-touch` encode values from the same
  source. Text was rewritten to reference this system's tokens and
  conventions. Licence: `licenses/jakubkrehel-skills.MIT.txt`. The same
  notice is reproduced at the end of the skill itself, because that file is
  installed into other repositories and a distributed skill is exactly one
  file (ADR 0013).
- **[jakubkrehel/make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better)**
  — © 2026 Jakub Krehel, MIT. The predecessor of `better-ui`; same principles,
  credited for completeness. Licence:
  `licenses/jakubkrehel-make-interfaces-feel-better.MIT.txt`.

- **[Aspekta](https://github.com/ivodolenc/aspekta)** — © 2025 Ivo Dolenc,
  SIL Open Font License 1.1. The design system's typeface, redistributed as
  `registry/fonts/aspekta/AspektaVF.woff2` with the OFL text alongside as the
  license requires.

## Inspiration (no text or code reused)

Nothing here carries a licence obligation — conventions and ideas are not
copyrightable expression — so no licence text is reproduced. They are named
because taking an idea without saying where it came from is its own problem.

- **[jakubkrehel/oklch-skill](https://github.com/jakubkrehel/oklch-skill)** —
  no published license, so nothing was copied. It informed the choice to do
  all perceptual colour work in OKLCH and to fix failing contrast by moving
  lightness while preserving chroma and hue (`legibleOn` in
  `packages/tokens/src/color.ts` — implemented independently from the OKLab
  reference transforms).
- **[Astryx](https://github.com/facebook/astryx)** — © 2026 Meta Platforms,
  Inc., MIT (URL, owner and licence verified 2026-08-07). API
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

## Trademarks

Every name above is used **nominatively** — to say truthfully what informed
this work. Product and company names are the trademarks of their owners, and a
copyright licence grants no trademark rights: MIT licenses the code, never the
name. Nothing here implies sponsorship, endorsement or affiliation, and none
of these projects has reviewed or approved this one.

Practically, that means: word marks only, never a logo or a stylised wordmark;
never one of these names in a package name, repository name, npm scope, domain
or headline; and factual claims about someone else's project stay checkable —
ADR 0012's statement that Astryx ships no third-party behaviour dependency was
verified against its published `package.json` on 2026-08-07 (one dependency,
`intl-messageformat`; StyleX and React as peers).
