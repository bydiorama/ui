# 0022 — The docs site lives in this repo

**Status:** accepted · 2026-10-20

## Context

Phase 3's exit gate asks for a public docs site, and nothing exists yet
(`PLAN.md` § Phase 3). We want a landing page plus a component catalogue that
costs close to nothing to maintain as the library grows. The first question is
where the site's code lives: in this repo or in a repo of its own.

References we looked at (scraped 2026-10-20):

| Site | Where its code lives | What it teaches |
|---|---|---|
| base-ui.com | In the library repo — `docs/` in `mui/base-ui`, deployed by a root `netlify.toml` | A calm landing page, then docs |
| heroui.pro | Closed source, because Pro is a paid product. The open-source HeroUI keeps `apps/docs` in `heroui-inc/heroui` | Pro is separate for licensing, not for maintenance |
| transitions.dev | Not public; it is a product (studio, community, paid tier), not a library's docs | The catalogue card: a small live demo plus one action |
| Radix (counter-example) | `radix-ui/website`, apart from the primitives | Every component change needs a second PR in a second repo |

Common practice is the same monorepo. Libraries split the site out when a
different team owns it, when it carries content that cannot be public, or when
it covers several products.

## Decision

1. **The site is `apps/site` in this repo,** a pnpm workspace package beside
   `apps/storybook`. It serves the landing page, the catalogue, the docs, the
   registry JSON and `llms.txt` from one build.
2. **It is built with Astro, starting from Diorama's own boilerplate**
   ([`bydiorama/diorama-2026-astro-boilerplate`](https://github.com/bydiorama/diorama-2026-astro-boilerplate)),
   and deployed as a static site to Cloudflare Workers at
   **`https://ui.bydiorama.com`**. The boilerplate is copied in as a snapshot
   at a recorded commit, not depended on. It ships no design, so it inherits
   nothing ADR 0002 forbids. What is kept, dropped and adapted is in
   `apps/site/README.md`.
3. **Per-component pages are generated, never hand-written.** Routes come from
   `ui.manifest.json`; content comes from each item's `*.doc.ts`; live demos
   come from its `*.stories.tsx`. Adding a component through the
   `add-component` pipeline must produce its page with no site edit. Only the
   landing page and a few guides are written by hand.
4. **The site imports from `registry/` and `packages/`; nothing there imports
   from the site.** The "no `next/*`, no data layer" boundary covers `registry/`
   only, so Astro and its integrations are fine inside `apps/site`.
5. **Storybook stays the workbench** (contracts, story a11y, visual
   baselines). It is not published as the public catalogue.

## Why this repo, specifically

- `*.doc.ts` was written for this: each one says it is the source "for the docs
  site, Storybook autodocs and MCP answers". In the same repo the site imports
  it; a separate repo would have to publish, fetch and version it.
- CI can build the site on every component PR, the way it builds Storybook
  today, so a change that breaks its own page fails before merge instead of
  after it. This is AGENTS.md's "typed sources beat prose" applied to docs.
- The site can serve `r/*.json` and `llms.txt` from the same deploy and the same
  commit as the source they describe.
- `@bydiorama/tokens` resolves through `workspace:*`, so the site always shows
  the current tokens without a publish step.

## Consequences

- **The licensing gate covers the site.** `lint-licensing` scans `apps/`, so
  the site uses Aspekta, griddy-icons and nothing paid. It also does not yet
  read `.astro`, `.md` or `.mdx` files (`TEXT_EXT` in
  `scripts/lint-licensing.mjs`), so those extensions must be added before the
  first page is written, or a `font-family` in an Astro `<style>` block goes
  unchecked.
- **Nothing that cannot be MIT goes here.** Client logos, case studies,
  licensed brand fonts and photography stay out of this public repo. If the
  landing page needs them, it moves to a separate marketing site that links to
  `ui.bydiorama.com` — the catalogue and docs stay here regardless.
- **CI cost is contained, not avoided.** The site builds in its own job.
  `pnpm verify` stays dependency-free and must not gain a step that needs the
  site's `node_modules`.
- **The boilerplate adapts to the monorepo, not the other way round.** It
  is written for a standalone repo: Bun instead of pnpm, a `prepare` script
  that would repoint this whole repo's git hooks, `@/*` aimed at its own `src/`
  where registry source needs `@/` for consumer install targets, and a newer
  ESLint major. Each is resolved on import (README § Importing the
  boilerplate and § The four conflicts); none is a reason to keep the site
  elsewhere. The resolutions follow this repo's existing rules: one package
  manager, checks instead of local hooks, and `@/` meaning only what it means
  to a consumer.
- **Analytics is Simple Analytics** — cookieless, no consent banner,
  production deploy only. The privacy policy stays.
- **The registry URL can move.** Consumers fetch from
  `raw.githubusercontent.com/bydiorama/ui/main/r/` today. Moving to
  `ui.bydiorama.com/r/` touches the CLI and every consumer's instructions, so
  it is its own decision and its own ledger entry — not a side effect of the
  site going live. The analysis and a recommended order are in
  `apps/site/README.md` § Registry URL.

## Revisit when

- the site becomes Diorama's general marketing site, covering more than this
  library;
- a different team owns it, with its own review and release cadence;
- it needs content that cannot be public (a paid tier, client material,
  licensed assets).

Even then, split only the marketing landing page; keep the catalogue and docs
here.

No ledger entry: no distributed item changes.
