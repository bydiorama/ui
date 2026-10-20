# apps/site

The public site for `@bydiorama/ui` at **https://ui.bydiorama.com**: landing
page, component catalogue, docs, and the registry JSON. Built on Diorama's
Astro boilerplate
([`bydiorama/diorama-2026-astro-boilerplate`](https://github.com/bydiorama/diorama-2026-astro-boilerplate)),
static output, deployed to Cloudflare Workers.

**Status: folders only.** No `package.json` yet, so pnpm does not see this as a
workspace package and the lockfile is unchanged. Why the site lives here is
[ADR 0022](../../ledger/decisions/0022-docs-site-in-this-repo.md).

## Why the boilerplate fits

It ships **no design** — no tokens, no fonts, no layouts — only unstyled
semantic markup and the infrastructure under it. That is what ADR 0002 asks
for: the design comes from this library, not from a starter. What it brings
that the site needs anyway:

- Astro 6, static output, MPA navigation; React islands only where state lives.
  The catalogue's live demos are exactly that case.
- Content collections behind Zod schemas — the same "typed source, not prose"
  rule this repo runs on.
- Complete SEO: meta, canonical, Open Graph, JSON-LD, sitemap, robots.
- Cloudflare Workers static-asset deploy with cache headers and a locked URL
  shape (`trailingSlash: 'never'` + `build.format: 'file'`).
- Tailwind v4 — the same version the registry and Storybook use.

## Layout

The boilerplate's tree, trimmed, plus three site-specific folders (marked
**new**). Every folder below exists and is empty.

```
apps/site/
  public/                 favicon, OG image, robots.txt, _headers (from the boilerplate)
  scripts/                compress-media.mjs — for the ui-motion-media videos
  src/
    config/               site.ts: identity, SEO defaults, analytics
    content/
      schemas/            Zod contracts for every collection
      pages/en/           landing page as YAML sections
      docs/en/            hand-written guides                          new collection
      settings/en/        navigation
    i18n/                 UI strings; single locale, structured for more
    layouts/              BaseLayout
    components/
      primitives/         Link, Picture, Video
      sections/           landing page sections + SectionRenderer
      chrome/             Header, Footer
      islands/            React: live demos of registry components
      seo/                BaseHead, Analytics
      catalogue/          card, props table, install snippet       new
    lib/
      registry/           loaders: manifest, *.doc.ts, stories, ledger  new
    pages/
      components/         /components and /components/[name]
      docs/               /docs/[...slug]
      r/                  /r/[name].json, generated at build
    styles/               global.css: Tailwind entry + emitted token CSS
```

The boilerplate's `ARCHITECTURE.md` explicitly allows a new component layer
when a project needs one; `catalogue/` is that layer.

## Where the content comes from

Everything per-component is read from sources that already exist and are
already gated, so a new component gets its page with no edit here:

| Source | Becomes |
|---|---|
| `ui.manifest.json` | Routes, the catalogue grid, categories |
| `registry/ui/<name>/<name>.doc.ts` | Summary, anatomy, props, do/don't, a11y, known gaps |
| `registry/ui/<name>/<name>.stories.tsx` | Live demos (Storybook's `composeStories`, as islands) |
| `r/<name>.json` | Install snippet, and `/r/<name>.json` itself |
| `ledger/entries/` | Changelog page and its RSS feed |
| `packages/tokens` | Token CSS, the theming page |
| `registry/fonts/aspekta` | The site's only typeface, via the Astro Fonts API `local` provider |

Hand-maintained: the landing page (`content/pages/`) and the guides
(`content/docs/`).

## Routes (planned)

| Route | Content |
|---|---|
| `/` | Landing page |
| `/components` | Catalogue: one card per manifest item, live demo |
| `/components/[name]` | Generated component page |
| `/docs/[...slug]` | Guides |
| `/changelog`, `/changelog.xml` | Ledger entries, page and RSS |
| `/r/[name].json` | Registry items |
| `/llms.txt` | Index for agents; per-page markdown follows it |
| `/404` | Required by the Workers `404-page` handling |

## Importing the boilerplate

Take a **snapshot** of the template, not a dependency on it: copy the files at
a recorded commit (`40e4cbf`, 2026-10-20) and note that commit here, so later
template improvements can be diffed and ported by hand.

**Keep as is:** `astro.config.mjs` structure, `content.config.ts`,
`components/{primitives,sections,chrome,seo}`, `layouts/`, `i18n/`,
`lib/content.ts`, `lib/seo.ts`, `public/_headers`, `404.astro`,
`[...slug].astro`, `wrangler.jsonc`, `tsconfig.json`, `.prettierrc`.

**Drop:**

- The contact form: `islands/ContactForm.tsx`, `islands/FormField.tsx`,
  `lib/forms/`, `sections/Contact.astro`, `pages/en/contact.yaml`,
  `.env.example`.
- The blog: `pages/blog/`, `content/posts/`, `schemas/post.ts`,
  `lib/readingTime.ts`. `rss.xml.ts` becomes the changelog feed.
- `pages/en/about.yaml`. `content/legal/` only if no analytics is turned on.
- `bun.lock` and `package-lock.json` — this workspace is pnpm.

**Adapt — each of these conflicts with the monorepo:**

1. **Package manager.** Bun → pnpm. Rename the package to `@bydiorama/site`,
   drop the `bun` engine, change `deploy` to `pnpm run build && wrangler deploy`.
   Astro 6 needs Node ≥ 22.12; `.nvmrc` says `22`, which resolves to a newer
   22.x, but the root `engines` (`>=22.0.0`) should say so too.
2. **Git hooks — must not come across.** The template's `prepare` script runs
   `git config core.hooksPath .githooks`. Inside this repo that repoints the
   hooks of the **whole** repository on every `pnpm install`. Drop `prepare` and
   `.githooks/`. If the 20 MB video cap is still wanted, it becomes a
   dependency-free `scripts/check-media.mjs` in `pnpm verify` — this repo
   enforces rules with checks, not local hooks.
3. **The `@/` alias.** The template maps `@/*` → `src/*` and imports
   `@/config/site`, `@/lib/seo`. Registry source imports `@/lib/cn`,
   `@/lib/motion`, `@/ui/button`, … — the consumer's install targets, which
   Storybook resolves item by item in `.storybook/main.ts`. Both cannot own
   `@/lib/*`. The site's own code moves to **`~/*`**, and `@/` keeps meaning
   exactly what it means to a consumer. Storybook's alias map moves into a
   shared helper both apps import, so the two cannot drift.
4. **ESLint.** The template uses ESLint 10; the root uses 9, and the root
   `eslint .` would also lint `apps/site`. Add `apps/site/**` to the root
   `ignores`, let the site lint itself with its own config, and align the two
   majors in a separate change.
5. **Identity.** `site.ts`, `site` in `astro.config.mjs`, the `Sitemap:` line
   in `robots.txt` and the custom domain in `wrangler.jsonc` all say
   `https://ui.bydiorama.com`. `name` in `wrangler.jsonc` becomes the Worker's
   name.
6. **Styles.** `global.css` imports Tailwind and the CSS emitted by
   `@bydiorama/tokens` — the same emitter Storybook runs (`pnpm tokens`).
   Nothing else is a design decision at this step.

## Order of work

1. **Extend the licensing gate.** Add `.astro`, `.md` and `.mdx` to `TEXT_EXT`
   in `scripts/lint-licensing.mjs`; it already scans `apps/`.
2. **Import the boilerplate** as described above, then `pnpm install` so the
   lockfile records the new importer. `dist/` is already ignored; add `.astro/`
   and `.wrangler/`.
3. **Add a CI job** that runs `astro check` and builds the site, separate from
   `verify` so the dependency-free gates stay dependency-free.
4. **Connect Cloudflare:** the Worker, the `ui.bydiorama.com` custom domain,
   and a preview URL per pull request.

Only then: `lib/registry/` loaders, the catalogue, the landing page.

## Open decisions

- Analytics: none, Plausible or Umami (the template supports both, cookieless).
  Decides whether `content/legal/` stays.
- Whether consumers' registry URL moves to `ui.bydiorama.com/r/` — a CLI change
  and a ledger entry of its own.
- The boilerplate has no LICENSE file. Copying it here publishes that copy
  under this repo's MIT license — Diorama owns both, so this is a choice to
  make knowingly, not a blocker.
