# apps/site

The public site for `@bydiorama/ui` at **https://ui.bydiorama.com**: landing
page, component catalogue, docs, and the registry JSON. Built on Diorama's
Astro boilerplate
([`bydiorama/diorama-2026-astro-boilerplate`](https://github.com/bydiorama/diorama-2026-astro-boilerplate)),
static output, deployed to Cloudflare Workers, measured with Simple Analytics.

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
      legal/en/           privacy policy (kept — see Analytics)
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
      r/                  /r/[name].json
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
| `r/<name>.json` | Install snippet, and `/r/<name>.json` itself, byte for byte |
| `ledger/entries/` | Changelog page and its RSS feed |
| `packages/tokens` | Token CSS, the theming page |
| `registry/fonts/aspekta` | The site's only typeface, via the Astro Fonts API `local` provider |

Hand-maintained: the landing page (`content/pages/`), the guides
(`content/docs/`) and the privacy policy (`content/legal/`).

## Routes (planned)

| Route | Content |
|---|---|
| `/` | Landing page |
| `/components` | Catalogue: one card per manifest item, live demo |
| `/components/[name]` | Generated component page |
| `/docs/[...slug]` | Guides |
| `/changelog`, `/changelog.xml` | Ledger entries, page and RSS |
| `/legal/privacy-policy` | Privacy policy |
| `/r/[name].json`, `/registry.json` | The committed registry files, copied verbatim — never regenerated |
| `/llms.txt` | Index for agents; per-page markdown follows it |
| `/404` | Required by the Workers `404-page` handling |

## Importing the boilerplate

Take a **snapshot** of the template, not a dependency on it: copy the files at
a recorded commit (`40e4cbf`, 2026-10-20) and note that commit here, so later
template improvements can be diffed and ported by hand. Diorama wrote the
template, so publishing this copy under the repo's MIT license is our call to
make; the template gets its own LICENSE file later.

**Keep as is:** `astro.config.mjs` structure, `content.config.ts`,
`components/{primitives,sections,chrome,seo}`, `layouts/`, `i18n/`,
`lib/content.ts`, `lib/seo.ts`, `content/legal/`, `public/_headers`,
`404.astro`, `[...slug].astro`, `wrangler.jsonc`, `.prettierrc`,
`.prettierignore`, `scripts/compress-media.mjs`, `ARCHITECTURE.md`,
`docs/content-authoring.md`, `docs/i18n.md`.

**Drop:**

- The contact form: `islands/ContactForm.tsx`, `islands/FormField.tsx`,
  `lib/forms/`, `sections/Contact.astro`, `pages/en/contact.yaml`,
  `.env.example`, and `forms` in `site.ts`.
- The blog: `pages/blog/`, `content/posts/`, `schemas/post.ts`,
  `lib/readingTime.ts`. `rss.xml.ts` becomes the changelog feed.
- `pages/en/about.yaml`, `docs/migrating.md`, `docs/cms-migration.md` — no
  migration and no CMS here.
- `bun.lock`, `package-lock.json`, `.githooks/`, `.gitattributes` (the root
  one governs).

**Adapt:** `site.ts`, `site` in `astro.config.mjs`, the `Sitemap:` line in
`robots.txt` and the custom domain in `wrangler.jsonc` all say
`https://ui.bydiorama.com`. `global.css` imports Tailwind and the CSS emitted by
`@bydiorama/tokens` — the same emitter Storybook runs (`pnpm tokens`). Nothing
else is a design decision at this step. Then the four conflicts below.

## The four conflicts, and how each is solved

The template is written for a standalone repo. Inside this workspace four of
its choices collide with rules that already exist. In every case the site
adapts; the monorepo does not.

### 1. Bun → pnpm

The workspace is pnpm (`packageManager: pnpm@10.33.0`, one `pnpm-lock.yaml`).
A second package manager would mean a second lockfile nobody runs.

- `package.json`: name `@bydiorama/site`, `private: true`, `type: module`.
  Add `"@bydiorama/tokens": "workspace:*"`. Remove the `bun` engine and the
  `prepare` script (see 2).
- Scripts keep their names; only the runner changes:
  `"deploy": "pnpm run build && wrangler deploy"`. `compress-media.mjs` already
  runs on plain Node; its two `bun run` messages become `pnpm`.
- **Node.** Astro 6 needs ≥ 22.12. `.nvmrc` says `22`, which resolves to the
  latest 22.x and is fine, but the root `engines` says `>=22.0.0` and would
  accept a version Astro refuses. Raise it to `>=22.12.0` in the same change.
- Run `pnpm install` once; the lockfile gains one importer. Commit it.

### 2. Git hooks → a check in `pnpm verify`

The template's `prepare` script runs `git config core.hooksPath .githooks`.
`prepare` runs on every `pnpm install`, so inside this repo it would silently
repoint the hooks of **the whole repository** to a folder that is not there.
It must not come across.

What the hook protected is still worth protecting: no video ≥ 20 MB enters the
repo. It moves to where this repo enforces everything else — a check:

- `scripts/check-media.mjs`, dependency-free like every other gate: every
  tracked video file (`git ls-files`, by extension) must be under the cap.
- The cap lives in one place, `apps/site/scripts/media-limits.mjs`, imported
  by both `compress-media.mjs` and the check. Today the template keeps it in
  sync between two files by a comment.
- Registered as `pnpm check:media`, added to `verify`, **and** as its own step
  in `.github/workflows/ci.yml` — a gate added to `verify` alone never runs in
  CI (PLAN.md § Phase 0).

The trade: a hook stopped the commit on the author's machine; the check stops
the pull request in CI. It needs no setup, so it works for every contributor
and every agent, which a hook does not.

### 3. The `@/` alias → `#site/` for the site, `@/` stays the registry's

The template maps `@/*` → `src/*` and uses it in 24 files (`@/config/site`,
`@/lib/seo` …). Registry source imports `@/lib/cn`, `@/lib/motion`,
`@/ui/button` … — a **consumer's** install targets, which this repo resolves
item by item so the source we ship is the source we type-check. Both cannot
own `@/lib/*`; `@/lib/content` would be ambiguous the day the registry ships
an item called `content`.

**The site's own code uses Node subpath imports, `#site/*`.** In
`apps/site/package.json`:

```json
"imports": { "#site/*": "./src/*" }
```

Node, TypeScript (`moduleResolution: "bundler"`, which Astro's base config
sets) and Vite all resolve this with no plugin and no `paths` entry. The
template's `baseUrl` and `@/*` path are deleted, and the 24 imports are
rewritten `@/` → `#site/` once, on import.

**`@/` keeps exactly one meaning — the registry's — from one generated
table.** Today Storybook carries that table twice by hand (Vite aliases in
`.storybook/main.ts`, TypeScript paths in its `tsconfig.json`). A third
hand-kept copy in the site is how they would drift. Instead:

- `pnpm registry:build` also writes the table from `ui.manifest.json`, which
  already knows every file's `path` and `target`:
  - `apps/tsconfig.registry-paths.json` — a `paths` fragment, written
    relative to that file, which each app's `tsconfig.json` `extends`
    (TypeScript allows an array of bases: `["astro/tsconfigs/strict",
    "../tsconfig.registry-paths.json"]`). Neither app may set its own `paths`
    or `baseUrl`, because either would replace the inherited table rather
    than add to it.
  - `apps/registry-aliases.mjs` — the same table as an ordered Vite alias
    list (folder form before bare form, the trap `.storybook/main.ts` already
    documents), imported by both `.storybook/main.ts` and
    `astro.config.mjs`.
- `check:registry` already fails on a stale `r/`; it fails on a stale alias
  table the same way.

This is a prerequisite change on its own, before the site: move Storybook onto
the generated table first and prove nothing moved (`pnpm type-check`,
`pnpm test:browser`, the Storybook build).

### 4. ESLint 10 vs 9 → one major, nested configs

The template uses ESLint 10; the root resolves 9.39. The root `eslint .` also
reaches into `apps/`, so today it would lint the site with the registry's
config.

ESLint 10 looks up the config **nearest to each linted file**, walking up from
its directory — the documented monorepo behaviour. So the fix is to align, not
to fence off:

- **Prerequisite change:** raise the root to `eslint@^10` (typescript-eslint
  8.x already declares `^10` support in the lockfile) and confirm `pnpm lint`
  is unchanged.
- The site brings its own `eslint.config.js` (astro + react-hooks rules).
  Root `pnpm lint` then lints site files with the site's config and everything
  else with the root's — one command, two configs, no ignore list to maintain.
- Its React rule scope widens from `src/components/islands/**` to include the
  demo islands; nothing else changes.

Prettier is not a conflict: the root has none, so the template's
`.prettierrc` governs `apps/site` only.

## Analytics: Simple Analytics

Cookieless and collects no personal data, so there is no consent banner.

- **Code.** The template's `Analytics.astro` knows Plausible and Umami. Add a
  third provider, `'simpleanalytics'`: the script
  `https://scripts.simpleanalyticscdn.com/latest.js` (async), plus the
  documented `<noscript>` pixel. It needs no site id — Simple Analytics keys
  on the hostname. Worth porting back to the boilerplate afterwards.
- **Only production counts.** Render the tag only when the build is the
  production deploy (an env var set by that deploy alone), so per-PR preview
  URLs never reach the dashboard. Simple Analytics already ignores `localhost`
  with the default script.
- **Dashboard.** Add `ui.bydiorama.com` as the website.
- **Privacy policy stays.** No banner is needed, but saying what is measured
  is still owed to visitors; `content/legal/en/privacy-policy.md` is rewritten
  for this site and linked from the footer.
- **Headers.** The template's `_headers` sets no Content-Security-Policy. If
  one is added later, it must allow `scripts.simpleanalyticscdn.com` and
  `queue.simpleanalyticscdn.com`.

## Registry URL: should it move to `ui.bydiorama.com/r/`?

Today consumers fetch `https://raw.githubusercontent.com/bydiorama/ui/main/r/{name}.json`,
from the `registries["@bydiorama"]` entry in their own `components.json`. The
CLI has no URL of its own; it also asks `api.github.com` for two things:
`main`'s current sha (the revision `add` locks) and the ledger entries.

**Gains**

- A URL Diorama owns. A repo rename, transfer or change of visibility stops
  breaking every consumer's install.
- A shorter install line:
  `npx shadcn@latest add https://ui.bydiorama.com/r/button.json`.
- Headers under our control: cache lifetime and CORS for `/r/*`.
- The chance to stop calling the GitHub API at all — unauthenticated, it
  allows 60 requests an hour per IP, which a consumer's CI can exhaust.

**Costs, and what each needs**

1. **Deploy lag breaks the lock's revision.** raw.githubusercontent serves
   `main` within minutes of a merge; the site serves whatever deployed last.
   If a deploy lags or fails, `add` would lock `main`'s sha while installing
   older content, and `sync` would report drift against the wrong baseline.
   **Needs:** the site publishes the commit it was built from
   (`/r/_meta.json`), and the CLI reads the revision from the same origin as
   the items.
2. **Ledger and items can disagree** for the same reason. **Needs:** the site
   also serves the ledger (`/ledger/index.json` and the entries), and the CLI
   reads it from the same origin. Items, revision and ledger then come from
   one deploy and are consistent by construction.
3. **Bytes must not change.** The lockfile stores a sha256 of every installed
   file. **Needs:** `/r/*` is the committed `r/` copied verbatim (as planned
   above), plus a post-build CI step that compares `dist/r/` with `r/`. An
   empty or partial copy would otherwise 404 every install.
4. **Pinning and branch testing remain on raw.** raw URLs can name a commit or
   a branch; the site serves only its latest deploy. Keep the raw form
   documented for those two cases (and `--registry-path` for local work).
5. **Each consumer edits one line** in `components.json`. Nothing else
   migrates: `ui.lock.json`'s `registry` field is a label that the next
   `add` or `lock` rewrites. The old URL keeps working for as long as `r/`
   stays committed on `main`, so the change is **not breaking** and has no
   deadline.
6. **The domain becomes permanent.** Once it is in consumers' config,
   `ui.bydiorama.com/r/` must answer for good, or redirect.
7. **Headers.** `/r/*` gets a short cache (about five minutes, what raw gives
   today) and `Access-Control-Allow-Origin: *` (raw sends it; browser-based
   tools need it).
8. **Docs to update:** `README.md`, `packages/cli/README.md`, the CLI's
   source comments, the `ui.lock.schema.json` description, PLAN.md.

**Recommendation: yes, after the site is live, in this order.** (1) The site
serves `/r/`, `/registry.json`, `/r/_meta.json` and the ledger, with the
byte-comparison step. (2) The CLI reads revision and ledger from the registry's
origin when it offers them, falling back to the GitHub API — released before
anyone switches. (3) Docs change and a `system` ledger entry tells consumers
the one line to edit. (4) raw stays as a working fallback.

## Order of work

Each step is its own pull request, gated as usual.

1. **Licensing gate.** Add `.astro`, `.md` and `.mdx` to `TEXT_EXT` in
   `scripts/lint-licensing.mjs`; it already scans `apps/`.
2. **ESLint 10 at the root** (conflict 4).
3. **Generated alias table**, Storybook moved onto it (conflict 3).
4. **Import the boilerplate:** keep/drop/adapt above, pnpm (conflict 1),
   `#site/` imports (conflict 3), `check:media` (conflict 2), the Simple
   Analytics provider. Ignore `.astro/` and `.wrangler/` (`dist/` already is).
5. **CI job** that runs `astro check` and builds the site, separate from
   `verify` so the dependency-free gates stay dependency-free.
6. **Cloudflare:** the Worker, the `ui.bydiorama.com` custom domain, a preview
   URL per pull request, the production-only analytics variable.

Only then: `lib/registry/` loaders, the catalogue, the landing page. The
registry URL move comes after the site is live.

## Open decisions

- The registry URL move — recommended above, decided when the site is live.
