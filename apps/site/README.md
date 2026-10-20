# apps/site

The public site for `@bydiorama/ui` at **https://ui.bydiorama.com**: landing
page, component catalogue, docs, and the registry JSON. Built with Astro,
deployed static.

**Status: folders only.** No `package.json` yet, so pnpm does not see this as a
workspace package and the lockfile is unchanged. Why the site lives here, and
the rules it follows, is
[ADR 0022](../../ledger/decisions/0022-docs-site-in-this-repo.md).

## Layout

Astro's conventional layout. Every folder below exists and is empty.

```
apps/site/
  public/            Copied verbatim: favicon, robots.txt, OG images.
                     Never a copy of r/*.json — those are generated at build.
  src/
    pages/           File-based routes (see Routes).
    layouts/         Page shells: landing, catalogue, docs.
    components/      Site chrome only (nav, catalogue card, props table).
                     Built from registry components; never imported by them.
    content/docs/    Hand-written guides: getting started, theming, CLI.
    lib/             Loaders that turn repo sources into typed data.
    styles/          Site CSS on top of the emitted token CSS.
```

## Where the content comes from

The site writes as little as possible itself. Everything per-component is
read from sources that already exist and are already gated:

| Source | Becomes |
|---|---|
| `ui.manifest.json` | Routes, the catalogue grid, categories |
| `registry/ui/<name>/<name>.doc.ts` | Summary, anatomy, props, do/don't, a11y, known gaps |
| `registry/ui/<name>/<name>.stories.tsx` | Live demos (Storybook's `composeStories`) |
| `r/<name>.json` | Install snippet, and `/r/<name>.json` itself |
| `ledger/entries/` | Changelog |
| `packages/tokens` | Token CSS, the theming page |

A new component therefore gets its page with no edit here. Hand-maintained:
the landing page and `content/docs/`.

## Routes (planned)

| Route | Content |
|---|---|
| `/` | Landing page |
| `/components` | Catalogue: one card per manifest item, live demo |
| `/components/[name]` | Generated component page |
| `/docs/[...slug]` | Guides from `content/docs/` |
| `/changelog` | Ledger entries |
| `/r/[name].json` | Registry items, generated from the manifest at build |
| `/llms.txt` | Index for agents; per-page markdown follows it |

## Before the first page

In this order:

1. **Extend the licensing gate.** Add `.astro`, `.md` and `.mdx` to `TEXT_EXT`
   in `scripts/lint-licensing.mjs` (ADR 0022 § Consequences).
2. **Add `package.json` and `astro.config.mjs`** with
   `site: "https://ui.bydiorama.com"` and static output; run `pnpm install` so
   the lockfile records the new importer. Ignore `dist/` and `.astro/`.
3. **Add a CI job** that builds the site, separate from `verify` so the
   dependency-free gates stay dependency-free.
4. **Choose hosting** with a preview deploy per pull request, and point
   `ui.bydiorama.com` at it.

## Open decisions

- Hosting provider (Vercel, Netlify or Cloudflare Pages).
- Whether consumers' registry URL moves to `ui.bydiorama.com/r/` — a CLI change
  and a ledger entry of its own.
- Whether any marketing material forces a separate landing page (ADR 0022 §
  Revisit when).
