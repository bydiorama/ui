# ui.bydiorama.com — research and design brief

**Status:** accepted direction, 2026-11-11. Nothing is built and nothing is
drawn. The six decisions in §9 were accepted as recommended on 2026-11-11;
the three lasting ones are recorded in ADR 0024, and `PLAN.md` § *Docs site*
sequences the work.

This document has two jobs:

1. Record what a public component-library site needs to be in late 2026,
   from a benchmark of fourteen live sites and a check of the current tooling.
2. Brief the design and build of the Diorama UI site: who it is for, what it
   contains, how each page is put together, and what it must not do.

The build order, gates and measured status live in `PLAN.md`. When the site
ships, this file becomes history, the same way
`docs/charts-and-graphs-plan.md` will.

---

## 1. What the site is for

Diorama UI is distributed as source. A person or an agent copies an item into
an app and owns it from then on. Today the only public surface is a GitHub
repository and raw JSON files, so three things are missing:

- **Nobody can see a component without cloning the repo** and running
  Storybook.
- **The registry has no stable address.** `r/*.json` is served from
  `raw.githubusercontent.com/bydiorama/ui/main/`, which ties every consumer's
  `components.json` to a branch name on a third-party host.
- **The typed docs have no reader.** All 52 components carry a `*.doc.ts`
  (summary, anatomy, composition tree, props, do and don't, accessibility,
  motion, declared design gaps). `CONVENTIONS.md` §11 says that file feeds
  "the docs site, Storybook and the MCP server". Only the gates read it.

The site closes all three. It is also the library's second consumer in
practice: the first product surface built entirely from the registry, in
public.

### Audiences, in priority order

| Reader | Comes to | Needs first |
|---|---|---|
| **Engineer or agent installing an item** | copy a command, check a prop, see what an item depends on | install line, complete props, source, Markdown twin |
| **Designer or product person evaluating the system** | see what exists and how it behaves under a brand | a visual gallery, the theme playground, examples of whole screens |
| **Engineer maintaining a consumer** | learn what changed since they installed | per-item change history from the ledger, sync instructions |
| **Prospective client or hire** | judge the craft | the home page, the examples, the measured-quality pages |

### What success looks like

- An agent given only the site URL can install Button and compose a correct
  form without reading the repository.
- A designer can answer "do we have a date picker, and what does it look like
  in our brand colours" in under a minute.
- A consumer's `components.json` points at `ui.bydiorama.com`, not at GitHub.
- No number on the site is typed by hand.

---

## 2. Research findings

Two research passes on 2026-11-11: a visitor-side benchmark of fourteen
library sites, and a check of current framework, registry, agent and hosting
documentation. Sources are in §11. Items that could not be verified are
marked there.

### 2.1 Table stakes

Present on nearly every source-distributed library site (shadcn/ui, coss ui,
Kibo UI, Magic UI, Park UI, Untitled UI React):

1. A left sidebar listing every component, an "On this page" rail, previous
   and next links.
2. Search from the header on ⌘K.
3. A light and dark toggle.
4. A live preview with a code view and a copy button on every snippet.
5. Installation as *CLI* and *Manual* tabs, with a one-line command.
6. A minimal usage snippet straight after install.
7. One live example per variant or state, each with its own anchor.
8. A props table.
9. `llms.txt` and a "copy page as Markdown" control.
10. A changelog, and "New" badges in the sidebar.
11. Links to source on GitHub.
12. A second surface of composed examples (blocks, patterns) installed with
    the same CLI.

### 2.2 What the best sites do that most do not

| Differentiator | Who does it | Do we have the raw material? |
|---|---|---|
| A prop playground whose code tab is the installed source | React Aria, React Spectrum | Yes. Every component has a `Playground` story and the registry JSON is the installed source |
| A whole-system playground with a theme panel and "copy theme" | Radix Themes, shadcn `/create` | Yes, and stronger. The resolver derives a full theme from eight seed colours, with bounds and measured contrast |
| Per-preview toggles beyond dark mode | shadcn (RTL), Carbon (theme) | Yes. Scheme, density (`[data-ui-density]`) and brand theme are all data attributes. **No benchmarked site has a density toggle** |
| Accessibility as first-class content | Radix, Ark, React Aria, Carbon | Yes. Every doc has `a11y`; contrast is measured per component |
| Trust signals: status, health, roadmap | Primer, shadcn directory, coss | Yes. `status`, the ledger, `PLAN.md`, declared gaps |
| A Markdown twin of every page | Base UI, Ark | Not yet. Deterministic to generate from `*.doc.ts` |
| Guidance *and* code on one page | Carbon and Primer only | Yes. `do` and `dont` are already typed |

### 2.3 Failures seen repeatedly

- **No real gallery.** shadcn and Magic UI index pages are link lists. Kibo's
  index URLs redirect to the first item. Visual browsing exists only for
  blocks.
- **Static-image galleries** that drift from the code (Untitled UI's index,
  all of Material 3).
- **Flat alphabetical sidebars of 60 items** with no grouping.
- **A heading per variant**, fifteen to nineteen near-identical sections,
  where one matrix would do.
- **No accessibility or keyboard content** on the styled, source-distributed
  libraries, even where the primitive underneath documents it.
- **Thin props tables** that send the reader to another site.
- **Client-rendered chrome.** On shadcn and coss, code blocks and previews
  were empty without JavaScript, which is also what a non-Markdown agent
  sees.

### 2.4 Who reads docs now

- Agents are now the majority reader on hosted docs platforms. Fern reports
  60.6% of requests in September 2026; 93–94% of agent requests go to
  Markdown pages; `llms.txt` itself fell from 29% to 5.7% of agent requests.
  These figures come from docs-hosting vendors with an interest in the
  conclusion.
- Agents spend 31% of their reading on API reference, people 18%.
- People still arrive mostly by direct navigation (66%) and in-product links
  (54%), ahead of search engines (45%) and AI search (35%).
- Observation studies agree on one thing: developers start from example code
  and scan. They do not read.
- No component-library site has published click-level analytics. We will have
  to measure our own.

**Three things are supported by both the human and the agent evidence:**
examples and copyable source first, complete reference tables, and a clean
Markdown twin of every page.

### 2.5 Tooling, as of November 2026

- **Framework.** Astro 7 (Vite 8, the version this repo already uses) is the
  best fit for static output with per-island JavaScript. Custom content
  loaders can feed typed objects such as `*.doc.ts` into collections.
  Starlight, Nextra, Vocs and Docusaurus own the page chrome, which rules
  them out for a site that must be built from the library. shadcn's own site
  runs Next 16 with Fumadocs.
- **Highlighting.** Shiki 4 emits dual-scheme CSS variables at build time.
  No client JavaScript and no re-highlight on scheme switch.
- **Search.** Pagefind 1.6 builds a static index and exposes a JavaScript
  API, so the search UI can be our own Combobox.
- **Storybook.** A static build can be embedded by iframe. Rendering stories
  in a plain page through `composeStories` is documented only for test
  runners. It probably works, but it is unsupported.
- **Registry.** The shadcn namespace format is
  `"@bydiorama": "https://ui.bydiorama.com/r/{name}.json"`. The MCP server
  and the public directory both expect `registry.json` to sit **next to** the
  items, and the directory requires the index to omit file `content`. Ours
  sits at the repo root, one level above `r/`. Listed registries are
  health-checked hourly.
- **"Open in v0"** does not support `cssVars`, `css` or namespaced
  registries. It is a poor fit for a token-driven library.
- **Agent surface.** Prebuilt `.md` routes are the robust path. `Accept:
  text/markdown` negotiation needs an edge function and its use is falling.
- **Hosting.** `bydiorama.com` is already a Cloudflare zone and
  `ui.bydiorama.com` already resolves through it (it answers 403 today).
  Cloudflare Workers Static Assets is Cloudflare's recommended product for
  new static sites: free static requests, preview URLs per branch, and
  `_headers` for CORS and caching.

---

## 3. Positioning

**One sentence:** a design system you can inspect, measure and own.

Every benchmarked site says what it has. Almost none shows evidence. This
library's distinguishing trait is that its claims are computed: contrast is
measured from the resolver, every story runs through axe, interaction is
tested in a real browser, and every value the code derived because a design
sheet did not answer it is declared as a gap. The site's job is to put that
evidence one click from every component.

Three ideas carry the design:

1. **Show the thing, then the proof.** Every component page leads with the
   live component and ends with its measured facts.
2. **Brand it in front of the reader.** The theme playground is the home
   page's second screen, and every preview on the site can be re-themed.
   A component that only looks right in Diorama's colours is not finished
   (`AGENTS.md`); the site demonstrates that rule on itself.
3. **Honest status.** Experimental items, declared gaps and known limits are
   shown plainly. This is unusual, and it is the point.

### Voice

Plain, specific, short. State what a thing does and where it stops. No
superlatives, no "beautiful", no "blazing fast". The `*.doc.ts` summaries
were written for maintainers and are too long and too internal for a page
lead. Each component needs a **one-sentence public summary**; the existing
text stays as the design rationale further down the page.

---

## 4. Information architecture

```
/                       Home
/docs/                  Get started: install, tokens, theming, CLI and sync,
                        static rendering, agents, conventions
/components/            Gallery (the index)
/components/<name>/     Component page
/examples/              Composed examples: patterns and whole screens
/examples/<name>/       Example page (preview, file tree, install)
/theme/                 Theme playground
/tokens/                Token reference: colour, type, space, radius,
                        stroke, motion, elevation
/effects/               The fx layer and shaders
/charts/                Data-visualisation layer (when it leaves experimental)
/changelog/             The ledger, by date; filter by item and by kind
/status/                Measured status: counts, gates, gaps, roadmap
/r/                     Registry: registry.json and <name>.json
/llms.txt  /llms-full.txt  /<any page>.md
```

Header: Docs · Components · Examples · Theme · Changelog, then search, the
scheme toggle and a GitHub link. It is `SiteHeader`, which was built for
exactly this bar.

### Component categories

A flat list of 52 fails the reader. The manifest has no category field today;
it gains one, because a category that lives only in the site would be prose
(`AGENTS.md` ground rule 2). Proposed grouping, to be confirmed in design:

| Category | Items |
|---|---|
| Actions | button, media-toggle |
| Forms | input, textarea, checkbox, radio, switch, select, multiselect, combobox, slider, range-slider, date-picker, calendar |
| Navigation | header, site-header, sidebar, nav-rail, tabs, menu, context-menu |
| Overlays | modal, sheet, drawer, popover, tooltip, toast |
| Display | avatar, badge, card, table, accordion, empty-state, thumbnail, aspect-ratio, image-overlay, skeleton, progress, meter |
| Feedback | banner, toast (listed once, linked twice) |
| Media | image-upload, image-edit |
| Data | chart, sparkline |
| Conversation | chat-composer, chat-message, chat-progress, chat-widget, chat-questionnaire |
| Utilities | fade, dot-pattern, card-sorting |

---

## 5. Page briefs

### 5.1 Home

Purpose: in one screen, say what this is and let the reader touch it.

1. **Lead.** One sentence, the install command with a copy button, two
   actions: *Browse components* and *Read the docs*.
2. **A live composition**, not a screenshot: a small working screen built from
   six to eight components, with scheme, density and brand controls beside
   it. Changing the accent re-themes the whole composition.
3. **Three proof tiles** with generated numbers: components and their status
   split, measured contrast pairs, browser tests. Each links to `/status/`.
4. **How it is distributed**: three steps (add, own, sync), with the real
   commands.
5. **Gallery strip**: a row of live component tiles leading to
   `/components/`.
6. **For agents**: where `llms.txt`, the `.md` routes, the registry and the
   skills live.

No carousel, no testimonial block, no animated hero that does not show the
product.

### 5.2 Component gallery

This is the page no benchmarked site does well, so it is where the design
effort goes.

- **A grid of live tiles**, grouped by category. Each tile renders the real
  component in a fixed frame at a curated resting state, with its name,
  one-line summary and status badge.
- Tiles are **static HTML, not hydrated**. The `diorama-static-rendering`
  skill classifies 45 of the 52 components: 18 are static-safe and 7 render
  correctly while inert. Overlay components show their trigger and an open-state
  specimen rendered inline. The components the skill does not yet classify
  need classifying first (see §5.3, row 11).
- **Controls above the grid**: filter by text, category chips, a status
  filter, and the global scheme, density and brand controls. Flipping the
  scheme re-themes all 52 tiles at once. That single interaction is the
  gallery's argument.
- A **list view** toggle for readers who know the name they want.
- Each tile needs one new exported story or specimen: a `Thumbnail` case.
  A gate fails when a component has none, the same way
  `check:visual-coverage` works.

### 5.3 Component page

One page per item, generated from the doc file, the manifest, the stories and
the ledger. Section order follows the evidence in §2.4: example first,
source second, reference third, proof last.

| # | Section | Source |
|---|---|---|
| 1 | Name, status badge, one-sentence summary, actions: copy page as Markdown, view source, open in Storybook | `doc.name`, `doc.status`, new `doc.lead` |
| 2 | **Playground**: the live component with controls for its main props, and scheme, density and brand toggles. Code tab shows the JSX for the current control state | the `Playground` story's args |
| 3 | **Install**: CLI and Manual tabs. CLI shows the `shadcn` command and the `@bydiorama/ui` CLI command. Manual shows the files, from the registry JSON, and lists dependencies and registry dependencies as links | `r/<name>.json` |
| 4 | **Usage**: minimal import and JSX | new `doc.usage`, type-checked |
| 5 | **Anatomy and composition**: the composition tree and the parts table | `doc.composition`, `doc.anatomy` |
| 6 | **Examples**: curated cases, each live with its code. Variants are shown as **one matrix**, not a heading each | selected stories |
| 7 | **Props**: complete table with type, default and notes. Compound components get one table per part | `doc.props` |
| 8 | **Do and don't** | `doc.do`, `doc.dont` |
| 9 | **Accessibility**: notes, keyboard table, measured contrast pairs for this component in both schemes | `doc.a11y`, `contrast.generated.json` |
| 10 | **Motion**: what animates, on which tokens, and what happens under reduced motion | `doc.motion` |
| 11 | **Rendering**: static-safe, inert until hydrated, or needs hydration | new typed field (today a table in a skill) |
| 12 | **Design notes and declared gaps**: the rationale, and every derived value | `doc.summary`, `doc.design`, `doc.knownGaps` |
| 13 | **Changes**: this item's ledger entries, newest first | `ledger/entries` |

Rules for the page:

- Sections 1 to 4 fit in the first two screens on a laptop.
- The preview is the same source file the registry ships. No docs-only copy
  of a component may exist.
- Every code sample is copied from a file that is type-checked. No snippet is
  typed into a page.
- A keyboard table is new typed data (`doc.keyboard`) for interactive
  components. It does not exist yet.

### 5.4 Examples

Composed screens and patterns: the part of Phase 3 that is designed but not
built (index page, app header, gallery body, sidebar shell, forms, detail
page, empty states, a chat surface, a dashboard once charts settle).

- Index: cards with a live, scaled preview.
- Example page: a **framed preview in an iframe** with a viewport switcher
  (phone, tablet, desktop, and a drag handle), scheme and brand controls,
  "open in a new tab", a **file tree with source**, and a one-line install.
- The iframe is required. Tailwind breakpoints follow the window, so an
  inline preview cannot show a responsive layout honestly.
- Examples become `block` items in the manifest when they are installable.
  Until then they are shown as source with no install line. The site must
  not offer a command that does not work.

### 5.5 Theme playground

The strongest thing this library can show, and the page most likely to be
shared.

- **Left**: seed controls. Eight colours per scheme, base size and ratio,
  radius, border width, focus ring width, shadow intensity, density. Every
  control is bounded by `SEED_BOUNDS`.
- **Right**: a live specimen of the system, switchable between *components*
  (a dense board), *a screen* (one example) and *type and colour* (ramps and
  roles).
- **Contrast, live**: the resolver's measured pairs update as the seed moves.
  A failing pair is flagged where it occurs, with the ratio.
- **Output**: copy the seed as JSON, copy the resolved CSS, and a link that
  encodes the seed in the URL fragment so a theme can be shared without a
  server.
- **Presets**: theme zero, the stress theme used in stories, and two or three
  deliberately different brands.

The resolver runs in the browser; it is a pure function in
`@bydiorama/tokens`. No backend.

### 5.6 Tokens

Reference pages generated from the contract: colour roles with resolved
values in both schemes, the type roles as live specimens, space, radius,
strokes, elevation, motion durations and curves (with a small animated
sample each, paused under reduced motion). Each token lists the components
that read it, which `check:token-consumers` already computes.

### 5.7 Changelog and status

- **Changelog**: the ledger, rendered. Filter by item and by kind
  (`breaking`, `a11y`, and so on). Each entry links to the item. An RSS feed.
- **Status**: the generated numbers that today live in `PLAN.md`'s status
  table, the gates and whether CI is green, the declared-gap count, and the
  roadmap as a short list. It is generated at build, so it cannot go stale
  the way `README.md` did.

### 5.8 Docs

Short, task-shaped pages. Get started; install with the shadcn CLI or ours;
tokens and theming; the sync loop and lockfile; static rendering (Astro and
SSR); effects; working with agents (skills, `llms.txt`, MCP, the registry);
conventions; contributing. Most of this prose exists in `README.md`,
`CONVENTIONS.md`, `packages/cli/README.md` and the product skills. The work
is editing for an outside reader, not writing from nothing.

---

## 6. Visual direction

The site is not a new design language. It is theme zero, applied.

- **Type**: Aspekta only. Type roles from the contract; no site-only sizes.
- **Colour**: semantic tokens only. The page is quiet, near-monochrome.
  Colour on a page comes from the components being shown, so the specimens
  stay the loudest thing on screen.
- **Grounds**: previews sit on a framed stage that makes the boundary between
  docs chrome and specimen obvious. `DotPattern` is the candidate ground,
  as the motion-media skills already use it.
- **Density**: docs chrome at the default density. The reader's density
  toggle affects specimens only.
- **Effects**: at most one use of the fx layer on the home page. The site is
  evidence for the components, not for glass.
- **Motion**: from the motion tokens, through `lib/motion`. Page transitions
  are optional and must not delay navigation.

### Code without a monospace face

ADR 0011 removes monospace from the system, and `check:licensing` fails any
mono `font-family` under `apps/`. A docs site is the hardest test that
decision will meet. The brief's position: **keep the rule and design for
it.**

- Code is set in Aspekta on a `bg-sunken` ground with inset padding, as the
  ADR prescribes.
- Indentation survives a proportional face. Column alignment does not, so
  samples must not rely on aligned comments or ASCII tables. The composition
  trees in `*.doc.ts` use box-drawing characters and **will not align**; they
  are redrawn as a real nested list component.
- Syntax colour carries more of the load than usual. The Shiki themes are
  built from tokens and their contrast is measured like any other pair.
- This needs a designed **CodeBlock** component and a specimen review at
  real sizes before the site is built on it. If the specimen is not good
  enough to read a forty-line file, that is the moment to amend ADR 0011 for
  code blocks only, with an OFL face. It is decision 2 in §9.

### Components the site needs that do not exist

All five are already on `TODO.md`'s undrawn list. The site is the consumer
that finally orders them:

| Needed | For |
|---|---|
| **CodeBlock** (with copy, file name, line highlight) | every page |
| **Callout** | docs prose, experimental notices |
| **Color tiles / palette** | tokens, theme playground |
| **Type scale and type style specimens** | tokens |
| **Color picker** | theme playground (a native colour input is acceptable for a first release) |

Also needed, and not on any list: a preview frame with its control bar, a
props table pattern on top of `Table`, a file tree, and a search dialog on
top of `Combobox` and `Modal`. These are site patterns first. Any that prove
general are promoted into the registry afterwards, never the other way
round.

---

## 7. Requirements

### Functional

- Every preview renders registry source. A gate fails if `apps/site`
  contains a copy of a registry component.
- Every page has a `.md` twin generated from the same data. `llms.txt` lists
  them; `llms-full.txt` inlines them.
- The registry is served at `/r/` with `registry.json` beside the items,
  `Access-Control-Allow-Origin: *`, and short revalidating cache headers.
- Tagged snapshots are frozen at `/r/<tag>/` so a consumer can pin.
- Search covers components, props, tokens and docs, and works from the
  keyboard.
- Scheme, density and brand choices persist per reader and apply before first
  paint.
- The site reads and works with JavaScript off, apart from the playgrounds
  and overlays: navigation, content, code and resting-state previews are in
  the HTML.

### Quality bars

| Bar | Target |
|---|---|
| Core Web Vitals, 75th percentile | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 |
| JavaScript on a component page before interaction | a measured budget, set after the first page exists and then gated |
| Accessibility | WCAG 2.2 AA. Skip link, focus never hidden under the sticky header, 24 px minimum targets, reflow at 320 px including code and tables, titled iframes, a pause control on anything that loops |
| axe | zero violations on every generated page, both schemes, in CI |
| Links | no broken internal link; a gate, not a hope |
| Freshness | the site build fails if `registry.json`, the doc data or the ledger is stale |

### Out of scope for the first release

Versioned documentation, localisation, accounts, comments, a hosted MCP
endpoint, "Open in v0", an in-browser code editor, and a blog.

---

## 8. Technical approach, in brief

Detail and sequencing are in `PLAN.md`. The shape:

- **`apps/site`**, Astro 7, static output. Layout in `.astro`; every
  interactive region is one React island importing registry source through
  the same `@/ui/...` aliases Storybook uses.
- **Data, not MDX, for components.** A content loader reads `*.doc.ts`, the
  manifest, `r/*.json`, the ledger and `contrast.generated.json`. Component
  pages are a template over that data. Only `/docs/` is hand-written prose.
- **Examples are plain exported components** that both a story and a page
  import. The site does not depend on `composeStories`.
- **Storybook stays** as the maintainer's workbench and is published at
  `/storybook/` for deep links. It is not the public docs.
- **Hosting** on Cloudflare Workers Static Assets, with a preview URL per
  pull request.
- **Analytics** cookieless and EU-hosted, with three custom events worth
  having from day one: search used, code copied, install command copied.

The known tension: Base UI compound components must live inside one React
island, so chrome that uses Sidebar, Tabs or Menu is hydrated React. The
budget in §7 is what keeps that honest. If the chrome cannot meet the budget
as islands, the fallback is React Router v7 with static prerender, which
trades JavaScript weight for a fully React shell.

---

## 9. Decisions — all six accepted, 2026-11-11

| # | Decision | Accepted | Why it matters |
|---|---|---|---|
| 1 | **Framework** | Astro 7, custom chrome | Static-first, Vite 8 already in the repo, every Diorama marketing site is already Astro, and it exercises the static-rendering skill in public |
| 2 | **Code typography** | Keep ADR 0011; decide after a CodeBlock specimen | Reversible only before the site is designed around it |
| 3 | **Registry address** | Move the canonical registry to `ui.bydiorama.com/r/`, keep the GitHub raw path working | A stable address is a public commitment. The CLI default and every consumer's config change once |
| 4 | **Public npm name for the CLI** | Publish `@bydiorama/ui` when the site ships | The site cannot show an install command that needs a repo checkout. `PLAN.md` has held this back deliberately |
| 5 | **Listing in the shadcn directory** | Yes, after one month of the registry being stable at its new address | Listing brings hourly health checks and makes outages visible |
| 6 | **What is public** | Everything `stable`; `experimental` items shown with a badge; the service-portal call-site tables and other consumer detail stay out | The repo is public already, but a site is read by people the repo is not |

Open design questions that do not block the plan: the category names in §4,
whether the gallery defaults to grid or list, and how many brand presets the
playground ships.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| The site becomes a second place where facts go stale | Every number and table is generated; a freshness gate fails the build |
| Dogfooding exposes gaps faster than they can be designed | That is a benefit. Site-only patterns are allowed, labelled, and promoted later |
| Proportional code is hard to read | Specimen first (decision 2), with a defined exit |
| Hydration cost of docs chrome | A measured budget and a named fallback |
| A public registry address breaks under a consumer | Health check in CI, frozen snapshots, the GitHub path kept as a mirror |
| Internal rationale reads as noise to outsiders | A public one-line lead per component; rationale moves to *Design notes* |
| Scope: 52 pages, a playground and examples at once | Phased release in `PLAN.md`; the first public release is the registry, the gallery and component pages |

---

## 11. Sources

Fetched 2026-11-11 unless marked.

**Library sites**
- shadcn/ui: https://ui.shadcn.com/ · /docs/components · /docs/components/base/button · /blocks · /create · /docs/directory · /docs/registry/health · /docs/mcp · /docs/skills · /llms.txt
- coss ui: https://coss.com/ui/docs/components/button · https://coss.com/ui/particles
- Base UI: https://base-ui.com/ · /react/components/dialog · /llms.txt
- Radix: https://www.radix-ui.com/primitives/docs/components/dialog · https://www.radix-ui.com/themes/playground
- React Aria and Spectrum: https://react-aria.adobe.com/Button · https://react-spectrum.adobe.com/Button
- Ark UI and Park UI: https://ark-ui.com/docs/components/dialog · https://park-ui.com/docs/components/button
- HeroUI: https://heroui.com/docs/react/components/button
- Kibo UI: https://www.kibo-ui.com/components/avatar-stack
- Magic UI: https://magicui.design/docs/components
- Untitled UI React: https://www.untitledui.com/react/components
- Geist: https://vercel.com/geist/button
- Primer: https://primer.style/product/components/button/
- Carbon: https://carbondesignsystem.com/components/button/usage/
- Material 3: https://m3.material.io/components/buttons/overview
- Not reviewed: Tailwind Plus and Catalyst (login wall), Polaris React
  (redirects), Aceternity. The search engine behind each site's ⌘K could not
  be verified.

**Readership**
- https://buildwithfern.com/post/biggest-reader-of-your-docs
- https://www.mintlify.com/library/how-to-help-ai-coding-agents-find-your-docs (excerpt only)
- https://www.stateofdocs.com/2026/docs-and-product
- https://survey.stackoverflow.co/2026/community/data/learn-code-how
- https://dl.acm.org/doi/10.1145/3358931.3358937
- https://ahrefs.com/blog/llmstxt-study/ · https://seranking.com/blog/llms-txt/

**Tooling**
- Astro 7: https://astro.build/blog/astro-7/ · https://docs.astro.build/en/reference/content-loader-reference/
- shadcn's site stack: https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/package.json
- Shiki: https://shiki.matsu.io/guide/dual-themes
- Pagefind: https://github.com/Pagefind/pagefind/blob/main/CHANGELOG.md
- Storybook embedding and portable stories: https://storybook.js.org/docs/sharing/embed · https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest
- Registry: https://ui.shadcn.com/docs/registry/registry-item-json · /namespace · /registry-index · /health · /mcp · /open-in-v0 · /github
- React Router prerender: https://reactrouter.com/how-to/pre-rendering
- Cloudflare: https://developers.cloudflare.com/workers/static-assets/headers/ · https://developers.cloudflare.com/workers/platform/limits/ · https://developers.cloudflare.com/workers/ci-cd/builds/
- Core Web Vitals: https://web.dev/articles/vitals

**Not verified in this pass**
- CORS, content-type and cache expectations for registry hosts are not
  specified by shadcn. The header set in §7 is our recommendation.
- Serving a Storybook build under a sub-path, Astro's sitemap integration and
  build-time OG images are standard but were not re-checked.
- The WCAG 2.2 criteria in §7 were listed from memory. Check them against
  https://www.w3.org/TR/WCAG22/ when the a11y gate is written.
- Cloudflare Web Analytics' current privacy terms. Plausible's EU hosting and
  cookieless claims were checked: https://plausible.io/cookieless-web-analytics
- Why `ui.bydiorama.com` answers 403 today (an Access rule, a placeholder or
  a bot rule). It needs a look in the Cloudflare dashboard.
