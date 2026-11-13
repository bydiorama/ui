# Plan

Where this library is, what is left, and what closes each gate.

Everything below is measured. Each section names the command that produced its
numbers, so a stale claim here is a reproducible error rather than a matter of
opinion — that is the whole reason the last status went five times out of date
without anyone noticing.

## Why this file exists

The implementation plan was written in the consumer,
`bydiorama/service-portal` → `docs/ui-design-system-plan.md`. Its §4 (target
architecture) and §5 (phases) governed **this** repository. On 2026-08-08 that
document was rewritten as a portal-migration plan and §4/§5 were removed, so
the library's own half survived only in git history — which is how `README.md`
came to announce "Status: Phase 0" three days after the 34th component shipped.

It lives here now. **References to `plan.md §4.6` elsewhere in this repo mean
[Change ledger](#change-ledger) below.** The ledger entries that cite it are
append-only history and keep the old name on purpose.

Settled architecture is deliberately **not** restated here. It is in
`ledger/decisions/` and `CONVENTIONS.md`, both enforced by gates rather than
read for compliance. This file carries only what is not yet true.

Phases 0.5 and 4 are consumer-side and belong to the portal's own plan.

## Status — 2026-09-24

| | |
|---|---:|
| Distributed items (`ui.manifest.json`) | 55 |
| — components | 45 |
| — lib / hook / font / skill | 5 / 3 / 1 / 1 |
| Generated registry items (`r/*.json`) | 55 |
| Ledger entries / ADRs | 201 / 20 |
| `pnpm verify` gates | 21, green |
| Node tests | 130, green |
| Browser tests — contract + story a11y + type roles | 1276 across 104 files; green except two outline-offset assertions that fail only on an older Chromium build than CI pins |
| Declared design gaps | 171, across 45 of 45 docs |
| Visual baselines | 180 (45 cases x 2 schemes, darwin + linux) — **stale by design after ADR 0020**: the type-role restyle moves 64 cases and the new `density` case has none yet. Regenerate linux with the workflow and darwin locally |
| Consumer drift (service-portal, 26 items) | not re-measured since 2026-08-16 — needs a consumer checkout |

Reproduce with `pnpm verify`, `pnpm test`, `pnpm test:browser`,
`pnpm design:gaps`, and — from a checkout of this repo — `node
--experimental-strip-types packages/cli/bin/ui.ts sync --cwd <consumer>`.

## Phase 0 — repo and rules · **done**

Delivered past its gate. The plan asked for a CI skeleton of type-check, lint,
registry validate, Storybook build and an a11y run; what exists is **16 gates**,
enumerated individually in `.github/workflows/ci.yml` rather than hidden behind
`pnpm verify`, because a gate added to `verify` alone would never run in CI.

The registry is public and resolves:
`raw.githubusercontent.com/bydiorama/ui/main/r/button.json` → 200. That closes
the plan's open question 2 in the only way that matters, and makes
`check:licensing` load-bearing rather than precautionary.

## Phase 1 — tokens and theme resolver · **done bar one emitter**

`@bydiorama/tokens` ships the resolver, OKLCH ramp derivation, seed bounds and
sanitisation, a completeness check (`missingTokens`, plus `check:utilities`),
and programmatic contrast — `check:contrast` measures **169 pairs across 35
components in both schemes**, so no contrast figure in this repo is typed by
hand.

Three of four emitters are built: `emit/css.ts`, `emit/tailwind.ts`,
`emit/ts.ts`.

- [ ] **Paper payload emitter.** Still unbuilt, and still with no consumer
      waiting on it — unchanged since 2026-08-08. Tokens reach Paper today via
      `design/paper/tokens.snapshot.json`. Build it when something needs a live
      push, not before.

### Non-colour theming (ADR 0020) · **done**

The seed could re-skin every colour and radius but not the geometry under
them. Three knobs and one mode now reach components, each behind a gate:

- [x] **Strokes** — `--ui-stroke-default|hairline|thick` and the focus pair,
      from `shape.borderWidthPx` (1–2) and `shape.focusRingWidthPx` (2–4).
      `check:strokes` bans literal widths.
- [x] **Type roles are composites** — `text-<role>` sets size, weight,
      leading and tracking. The table is the truth; nine declared
      exceptions. Enforced in every story at runtime; `check:type-roles`
      keeps the exceptions current.
- [x] **Control sizes and density** — two families (control, field) and
      `[data-ui-density]` modes, floored at 24px.
- [x] **`check:token-consumers`** — a contract token nothing reads fails
      unless declared with a reason. 79 are declared; twelve colour roles,
      `--ui-weight-book` and two leadings are listed for review, not settled.
- [ ] **Regenerate the visual baselines** the restyle moved (see Status).

## Phase 2 — core primitives · **in progress, exit gate not met**

35 components, each with the same five files (`.tsx`, `.doc.ts`,
`.stories.tsx`, `.browser.test.tsx`, `.types.test.tsx`); Select carries a sixth.
The discipline has held across every addition.

Two of the three exit-gate items the 2026-08-07 assessment added:

- [x] **Base UI migrated to `@base-ui/react@1.7.0`** (`3a672a5`). This was the
      top blocker — every overlay component sat on a dead release candidate
      under a retired package name, and the manifest handed that pin to every
      consumer. ADR 0012's wrapper rule is what made it cheap.
- [x] **Linux visual baselines** (2026-09-02). All 90 `-chromium-linux`
      PNGs recorded by the **Generate visual baselines** workflow (run
      33672099176, pinned `playwright:v1.62.1-noble` container), spot-checked
      against the darwin set, and committed — one per darwin baseline, so the
      CI `visual` job compares every component in both schemes. The same PR
      fixed the two `verify` steps that had masked this (registry tests ran
      before install; Playwright installed from the wrong workspace).
      *(task #42)*

      The count in this row was **124** until 2026-08-16 and had never been
      true — there are 35 cases in two schemes, and `ls` says 70. It is the
      exact failure this file's preamble describes, sitting in the file that
      describes it.
- [x] **Five stale darwin baselines regenerated** (2026-08-16) — `badge`,
      `header`, `sidebar`, `nav-rail`, `sheet`, both schemes. Each had drifted
      from the 2026-08-10 styling commits (`d9e8ab2`, `de3d367`, `4096ba8`) and
      no one had re-run the gate since. Reviewed old against new before
      committing: badge's neutral chip gains its edge, header's bar joins the
      page ground and its nav items recede, sidebar and nav-rail drop the
      current row's bold weight — all four are the committed changes, and every
      image kept its exact pixel dimensions, so neither the crop nor the
      downscale defect has returned.
- [ ] **Ship the primitives the consumer actually renders** — see below.

### The build queue is not ordered by need

The plan asked, on 2026-08-07, that the remaining queue be re-ordered by real
consumer call sites. It was not, and the gap has widened rather than closed.

Re-measured against `service-portal/src` on 2026-08-13:

| Unbuilt | Call sites (2026-08-07) | Call sites (2026-08-13) |
|---|---:|---:|
| **InlineAlert** | 10 | **13** |
| **Toast** | 10 | **12** |
| Tag | 4 | 6 |
| Typography | 5 | 5 |
| Radio | 2 | 4 |
| Tooltip | 0 | 2 |
| Divider | 0 | 0 |

Shipped in the same window: Accordion, AspectRatio, ContextMenu, DatePicker,
EmptyState, ImageEdit, ImageOverlay, ImageUpload, NavRail, Table, Textarea,
Thumbnail. Table and EmptyState were on the priority list and are real wins.
The rest came from `TODO.md`'s design list, which is ordered by when something
was drawn — so **that list, not the consumer, is currently setting the order.**

**Skeleton shipped on 2026-08-16 — and NOT for the portal.** It was asked for
as preparation for a different project, with the portal's 46 call sites
explicitly out of scope. Worth recording, because those 46 sites were this
file's headline argument for building it and they are still unserved: the
portal has to adopt it deliberately, and until it does the queue below is
shorter without being any closer to what the consumer renders.

`Divider` remains a "quick win" with zero consumers; build it, and Tooltip,
last or not at all.

- [ ] Decide whether **Banner covers InlineAlert.** Banner is already "an inline
      message attached to the surface it belongs to — not a toast, not a dialog"
      with five intents and a dismiss control. If it does, close InlineAlert
      explicitly and reduce the queue by 13 call sites; if it does not, say what
      differs. Leaving it implied means nobody can tell whether the 13 sites are
      served.

### The declared-gap backlog is growing faster than it is cleared

127 gaps across all 35 docs, up from 22 across 21 on 2026-08-07 — roughly nine
per component shipped, and no component is now without one. The gate is working exactly as designed: every value the
code derived because a sheet did not answer it is attributed rather than
silently invented, and `pnpm design:gaps` prints the current set.

But it is a queue only a person can clear, four of them are already blocked on a
decision nobody has made (`TODO.md`), and Phase 3 inherits all of it. Worth a
triage pass before the block work starts, not during it.

### Motion · **tokens, CSS, gate and test done; runtime deferred deliberately**

Measured 2026-08-16 with `pnpm check:motion` and
`registry/ui/motion.browser.test.tsx`. The token tier from ADR 0005 held
without enforcement — **zero hard-coded durations and zero literal easings** —
and 29 of 35 components animate something.

ADR 0018 settles the runtime and amends 0005 twice; its own clause 2 was then
corrected by measurement, which is the part worth reading.

- [x] `check:motion` — literals, `transition-all`, unguarded keyframes, and an
      animating component with no `motion:` note. 17 gates.
- [x] 28 doc files carry a `motion:` note; two were promoted out of `a11y`.
- [x] `peerDependencies` removed from 35 items; `check:manifest` rejects any
      key the builders do not emit.
- [x] **The `getAnimations()` probe is run.** `motion@13.1.0` in Chromium: the
      main package's `animate()` registers **zero** WAAPI animations for every
      property tried, `motion/mini`'s registers one. ADR 0018 said the
      imperative API was the safe half; it is the `mini` ENTRY POINT, and
      nothing in the call site, the types or the rendered result distinguishes
      them. A consumer would have met it as a popup that vanishes instead of
      fading.
- [x] **Motion is tested.** Ten assertions through `getAnimations()` — the only
      thing that can tell a working transition from a declared one.
- [x] `lib/motion` — 49 hand-assembled timings across 28 files, now three
      constants.
- [x] Sidebar's collapsible section animates against
      `--collapsible-panel-height`, as Accordion does.
- [x] `--ui-duration-loop`, so Skeleton's pulse stops being Tailwind's 2s.

What is left is a question for a person, not a task:

- [ ] **The curve vocabulary has almost no consumers.** `--ui-ease-default`,
      `--ui-ease-in`, `--ui-ease-spring` and all four `--ui-motion-*` intents
      have one consumer between them, while `--ui-ease-out` is used fifty
      times out of fifty. Either the components under-use the vocabulary or
      the vocabulary is bigger than the system needs. A token nothing consumes
      is a guess — the lesson `--ui-nav-rail-width` already taught.
- [ ] **No runtime is adopted, and none is needed.** Layout/shared-element
      animation is the only case neither CSS nor `motion/mini` covers, and
      nothing in the library asks for it.

### Effects layer (ADR 0022) · **shipped experimental, not yet on a device**

Measured 2026-11-06 with `pnpm check:fx`, `registry/lib/fx/fx.browser.test.tsx`
and `registry/lib/shader/shader.browser.test.tsx`, in Chromium on SwiftShader.

- [x] `fx` — nine CSS effects, one stylesheet each, in `@layer fx`; every one
      changes every component it lists and steps aside exactly under forced
      colours, reduced motion and reduced transparency (asserted per pair).
- [x] Glass's tint is a resolver token, derived per brand against a floor
      that counts the material's own light (theme zero: 0.90 / 0.92).
- [x] `shader` — aurora and halo, optional, one WebGL2 context, server-safe;
      the guard holds every inked part at its floor on drawn pixels, in both
      schemes and under the pale-yellow stress brand, and the test proves it
      can fail.
- [ ] **On a phone and in Safari.** Two of the lab's worst defects showed only
      on an iPhone. `experimental` until someone has looked.
- [ ] **A brand knob.** Which effects a brand turns on, and its ambient speed,
      are tokens a product sets today, not a seed field the resolver reads.

### Charts layer (ADR 0023) · **V0–V2 built, V2 exit not met**

The working plan is `docs/charts-and-graphs-plan.md`; this is its summary, as
that file asked for once the work moved into code (branch `charts`,
2026-11-11).

- [x] V0: ADR 0023, the ADR 0008 data-palette amendment, the Paper sheets.
      Aspekta's `tnum` checked: **absent** — `tabular-nums` is a no-op until
      the face ships it (ADR 0011 item 5; `registry/fonts/aspekta/aspekta.test.ts`).
- [ ] V0: the renderer spike. It gates the Canvas/WebGL tiers (V4), not charts.
- [x] V1: eight data slots, `lib/viz`, Sparkline, Meter.
- [x] V2: Chart with Bar, Line and Area, legend toggles, tooltip, table,
      keyboard and announcer, time axis; StatTiles and ChartCard, the first
      blocks; geometry for frame, plot row, plot column and legend entry.
- [ ] V2: Linux visual baselines for chart, chart-card and stat-tiles.
- [ ] **V2 exit: a product screen adopts these.** The service portal's Market
      intelligence section is the candidate. A stand-in rebuilt from library
      parts (`registry/screens/market-intelligence`) maps every one of its
      chart call sites and lists the seven parts it would still miss.

## Phase 3 — molecules, blocks and patterns · **started: two blocks**

`registry/blocks/` exists with StatTiles and ChartCard (charts V2). The rest of
the named molecules are not built: FormField / FieldGrid / FormActions,
DataTable, DetailHeader / DetailRail, StatusBadge, WizardLayout,
ChipSelect, ConfirmDeleteModal, EmptyState patterns.

Design is ahead of code here — `design/paper/README.md` already carries the
index-page contract, the app-header contract, a shipping-width specimen, and
(uncommitted at the time of writing) a gallery body and a sidebar-shell
application of the same pattern. That is the right order.

Its exit gate is untouched:

- [ ] **Docs site.** No `apps/site`. `apps/` holds `registry/visual` and
      `storybook` only. Briefed and sequenced on 2026-11-11 — see
      [Docs site](#docs-site--uibydioramacom--briefed-not-started) below.
- [ ] **`llms.txt` and per-page markdown.** Absent. The plan rated this
      tertiary and sequenced it behind the site. The 2026-11-11 research
      moves the **per-page Markdown** half up: it is what agents actually
      request (93–94% of agent traffic on hosted docs), while `llms.txt`
      itself is a small and falling share. Both are generated from the same
      data as the pages, so they ship with S2, not after it.
- [x] **MCP.** Reachable now via the public registry, which is what §4.5 item 2
      actually asked for. Per-component doc data (`*.doc.ts`, item 3) exists and
      feeds `design:gaps` and the contrast gate; it has no site consuming it yet.

### Docs site — ui.bydiorama.com · **initial local implementation**

The brief, the benchmark behind it and its sources are in
[`docs/site-design-brief.md`](docs/site-design-brief.md). This section carries
only the build order and what closes each step. All six decisions in the brief's
§9 were accepted on 2026-11-11 and the lasting three are ADR 0024 (Astro 7 with custom
chrome, ADR 0011 kept pending a CodeBlock specimen, the registry moved to
`ui.bydiorama.com/r/`, the CLI published, a later listing in the shadcn
directory, `experimental` items shown with a badge).

Measured on 2026-11-11, the starting point:

| | |
|---|---:|
| `ui` items in the manifest | 52 |
| — with a `*.doc.ts` | 52 |
| — with a stories file | 52 |
| Manifest fields that could group them | 0 — there is no `category` |
| Doc fields the page template needs and no doc has | `lead`, `usage`, `keyboard`, a rendering class |
| Components the `static-rendering` skill classifies | 45 of 52 |
| `registry.json` beside the items in `r/` | no — it is at the repo root, which the shadcn MCP server and directory do not accept |
| Files naming `raw.githubusercontent.com`, outside this file and the brief | 7 |
| `https://ui.bydiorama.com/` | resolves through Cloudflare, answers **403** |

Reproduce with `node -e` over `ui.manifest.json`, `ls registry/ui/*/*.doc.ts`,
`grep -rl raw.githubusercontent.com` and `curl -I https://ui.bydiorama.com`.

The site **is consumer #2** for the purposes of this file. It installs
nothing — it imports registry source in place — so it does not unlock the
ledger's consumption gates in [Change ledger](#change-ledger). It does unlock
something the portal never could: every component rendered in public under a
theme switch, on every push.

Implementation on `library-public-page` (2026-11-12): `apps/site` builds
Home, a filterable gallery, templated component and block references, Markdown
twins, agent indexes, changelog and `/r/` from repository sources. Live
examples are a featured subset with code read from their type-checked files;
remaining catalog entries have references. The template is now preview,
installation, API reference and accessibility, with no per-item changelog.
API rows stack on phones and navigation rows share their left edge. Appearance
uses library Button/Popover/RadioGroup/Switch; browser tests assert rendered
scheme colors under each brand and persistence after reload.
Manifest `category`/`docs` and typed-doc `lead` are required, and `site:data`
joins the sources with a freshness gate in `verify`. Site alias maps also come
from manifest targets. `site:build` checks output coverage and local links.
See `docs/public-library-workflow.md` for upkeep. Public copy and the Paper
variants no longer carry changing component, test or contrast-pair totals.

Design review follow-through (2026-11-13, ADR 0025): the public catalog adds
status filters, a list view and all existing live examples. The search field
uses registry Input. Hockney now selects default capsule controls via the seed,
including field insets; explicit shape props win. Tabs derives concentric
corners without changing density. Browser checks cover these brand contracts,
and WebKit interaction checks expose and fix locale-dependent example hydration.
The full gallery specimen pipeline and full theme playground remain open.
See `docs/public-site-design-review-2026-11-12.md` for evidence and the existing
visual-baseline drift; do not treat this as a clean library-wide visual gate.

The owned CLI now has `init` and `ui.config.json`, supports existing shadcn
configuration, and ships a runnable preview tarball with the local site.
`pnpm test:cli-package` exercises the packed executable through npm exec in a
fresh app, including install, sync and local edits. The shadcn route remains
an alternative. No npm package has been published.

This is not a public release: hosting, the canonical address change, npm
publication, per-item interactive examples, the full theme playground, release
smoke checks and deployed performance measurements remain open. The Paper
page exists; the separate distributable CodeBlock pipeline is still open.

#### S0 — decisions and data · unblocks everything, no UI

- [x] Settle the six decisions in the brief's §9 (2026-11-11, all as
      recommended). 1, 3 and 4 are recorded in one record, ADR 0024:
      they are a framework choice, a public address and a public npm name.
- [ ] Find out why `ui.bydiorama.com` answers 403 and who owns the record.
- [x] **`category` in the manifest**, validated by `check:manifest` against a
      closed list. A grouping that lives only in the site is prose.
- [ ] **Four doc fields**, typed, with a gate each so they cannot be skipped:
      `lead` (one public sentence), `usage` (a snippet compiled by
      `type-check`), `keyboard` (interactive components only), and the
      rendering class that today is a table in the `static-rendering` skill.
      Generate the skill's table from the field once it exists.
- [ ] Classify the 7 components the skill does not cover: combobox,
      media-toggle, site-header, sparkline, chart, meter, range-slider.
- [x] **A doc-data build step**: a generated catalog joining each typed doc,
      the manifest entry, registry file list, contrast pairs and item ledger.
      The component references, `.md` twins and agent indexes read this data.
      `--check` mode is in `pnpm verify` (2026-11-12).

**Closes when:** `pnpm verify` is green with the new fields required on all
52 docs, and the doc-data step produces 52 files from a cold clone.

#### S1 — the components the site needs · design first

Five items from `TODO.md`'s undrawn list finally have a consumer: **CodeBlock,
Callout, Color tiles, Type scale and Type styles**. Each goes through
`design-component` and then `add-component` like any other; the site does not
get a private shortcut.

- [ ] **CodeBlock specimen in Paper before anything else**: a forty-line
      file, a diff and a shell command, set in Aspekta on `bg-sunken`, both
      schemes. This is the test of ADR 0011 on the page type that needs
      monospace most. Readable: the ADR stands. Not readable: amend it for
      code blocks only, with an OFL face, before S2 is designed around it.
- [ ] Syntax colours as contract tokens, with their pairs in
      `check:contrast`.
- [ ] The composition trees in `*.doc.ts` are box-drawing text that only
      aligns in monospace. Redraw as a nested list, or change the field to
      structured data. Decide with the specimen.
- [ ] Site patterns, drawn on the Patterns page: preview frame with its
      control bar, props table, gallery tile, file tree, search dialog. Built
      in `apps/site` first and promoted to the registry only when a second
      surface wants one.
- [ ] Page designs in Paper: home, gallery, component page, example page,
      theme playground. Both schemes, 320 and 1280.

**Closes when:** the five components ship with all five files each, and the
five page designs are exported to `design/paper/`.

#### S2 — registry, gallery and component pages · **the first public release**

- [x] `apps/site`: Astro 7, static output, the same `@/ui` aliases as
      Storybook, the theme-zero stylesheet, Aspekta from the font item.
- [ ] **The registry at `/r/`**: the items, a `registry.json` beside them
      with no file `content`, `Access-Control-Allow-Origin: *`, revalidating
      cache headers. `packages/cli/src/registry-source.ts` and the other
      six files move to the new address; the GitHub path keeps
      working.
- [ ] Chrome from the library: `SiteHeader`, `Sidebar`, `Tabs`, `Combobox`.
- [ ] **Gallery**: 52 live tiles by category, filterable, with site-wide
      scheme, density and brand controls. Needs one `Thumbnail` specimen per
      component and a `check:` gate that fails when one is missing.
- [x] **Minimal component page template** over the doc data: preview where
      available, installation, API reference and accessibility (brief §5.3
      revised 2026-11-12). Examples are plain type-checked files imported by
      the preview and read verbatim by its code view. Full example coverage
      and reuse from stories remain open.
- [x] A `.md` twin of every component page, `llms.txt` and `llms-full.txt`.
- [ ] Search on Pagefind's JS API behind our own dialog.
- [ ] Deploy on Cloudflare Workers Static Assets with a preview per pull
      request. `ui.manifest.json`'s `homepage` becomes the site.
- [ ] Publish `@bydiorama/ui` to npm (decision 4). The site may not print an
      install command that needs a checkout of this repo. Until publication,
      the downloadable compiled tarball is the working preview route; CI
      smoke-tests that packed artifact through npm exec.

Gates added to CI in this step, each a script and not a review habit:

| Gate | Fails when |
|---|---|
| `check:site-source` | `apps/site` holds a copy of a registry component, or a code sample that is not read from a type-checked file |
| `check:site-data` | the doc data, `registry.json` or the ledger feed is stale at build |
| site a11y | axe finds a violation on any generated page, either scheme |
| site links | an internal link or anchor does not resolve |
| site budget | JavaScript on a component page before interaction exceeds the budget set from the first measured page |
| registry smoke | `shadcn add --dry-run` against the preview deployment fails for a sample of items |

**Closes when:** all 52 component pages build from data with no hand-written
page, the six gates are green, a fresh agent given only the URL installs
Button into an empty Vite app, and Core Web Vitals on the deployed gallery
meet LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.

#### S3 — theme playground and tokens

- [ ] `/theme/`: the resolver running in the browser, seed controls bounded
      by `SEED_BOUNDS`, live measured contrast, copy seed, copy CSS, a
      shareable URL fragment, presets.
- [ ] `/tokens/`: generated from the contract, each token listing its
      consumers from `check:token-consumers`.
- [ ] Brand control on every preview reads the playground's current seed.
- [ ] `/effects/`.

**Closes when:** a seed pasted from the playground into a consumer resolves
to byte-identical CSS, asserted by a test.

#### S4 — examples

This is where the rest of Phase 3 lands, and it is gated by Phase 3's own
work, not by the site.

- [ ] `registry/blocks/` and `block` items in the manifest, starting with the
      patterns already drawn: index page, app header, gallery body, sidebar
      shell.
- [ ] Example page: iframe preview on a standalone route, viewport switcher,
      file tree, install line. No install line until the block is in the
      manifest.
- [ ] `/charts/` when the visualisation layer leaves `experimental`.

**Closes when:** every block in the manifest has a page, and every example
page without a block says so.

#### S5 — changelog, status and upkeep

- [ ] `/changelog/` from the ledger, filterable, with a feed.
- [ ] `/status/` generated at build. **The Status table at the top of this
      file moves there** and this file links to it; a number that is
      generated on every push cannot go five times out of date.
- [ ] Frozen registry snapshots at `/r/<tag>/`.
- [ ] Storybook published at `/storybook/` for deep links.
- [ ] Cookieless EU analytics with three events: search used, code copied,
      install copied. Review after 30 days and re-order the component page if
      the data disagrees with the brief.
- [ ] Apply to the shadcn directory after 30 days of the registry answering
      at its new address without a failed health check of our own.
- [ ] Feeds Phase 5: the scheduled doc-drift sweep has a concrete target at
      last — the deployed site against the repo.

**Closes when:** `README.md` and this file carry no hand-typed count that the
status page also shows.

#### What this plan deliberately leaves out

Versioned docs, localisation, a hosted MCP endpoint, "Open in v0" (it does
not support `cssVars` or namespaced registries, so it cannot represent this
library), an in-browser editor and a blog. Each has a reason in the brief's
§7; none is a quiet omission.

### Consumer-reported gaps · **all five closed**

The service portal filed five upstream gaps out of its Fade adoption, written
against `8ea7fec`. Two were answered on 2026-08-31; re-measured against
`a99099b` on 2026-09-04, one of those two had not actually closed. All five
are closed now, and the work turned up two rules this repo was getting wrong
in its own source — both corrected by measurement rather than by argument.

- [x] **The z scale has consumers, and the ladder is right** (2026-09-04).
      `d3308bf` bound seven of them and recorded the remaining five — Modal,
      Sheet, Drawer, Popover, Tooltip — as layering by portal order, "which
      works". It does not: a positive z-index in the root stacking context
      paints above a z-auto positioned element whatever the DOM order, so the
      affix `Header` covered all five, exactly as it had at `z-30`. Measured
      before the fix with real components — header `sticky/100`, sheet panel
      `fixed/auto`, header topmost in their overlap. The ladder had to be
      reordered first, because binding the five while `dropdown` sat under
      `modal` would have put every `Select` inside a dialog behind it. Now
      `sticky 100 < overlay 1000 < modal 1100 < toast 1200 < dropdown 1300 <
      tooltip 1400`, forced by one rule: a surface outranks anything it can be
      opened from. `check:overlays` gained the positive half of the gate, and
      two paint-order tests assert the effect rather than the source.
- [x] **`cn` merges the purpose-named chrome widths** (`d3308bf`).
- [x] **The `cn` spacing list cannot drift** (2026-09-04). It was hand-maintained, and
      its own comment says the emitter and the list must move together with
      nothing enforcing that — the failure mode is silent. It cannot be derived
      at runtime: `cn.ts` ships to consumers as `lib/cn.ts`, and
      `@bydiorama/tokens` appears in `registry/` only in stories and tests. So
      the drift becomes a build failure instead. `check:utilities` already
      imports `toTailwindTheme()` and extracts every emitted property, so it is
      three lines from knowing the answer, so rule D now diffs the minted
      names against the list in BOTH directions and was probed failing-first
      each way. The misdiagnosis comments at `sheet.tsx` and `modal.tsx` are
      corrected: nothing was ever "dropped", both classes survived
      unclassified and the cascade decided.
- [x] **Fade's two recorded `knownGaps`** (2026-09-04). Scroll binding was deferred "until a
      second consumer exists"; the portal has six across both axes and wrote
      two hooks (`useIsStuck`, `useScrollEdges`) offered upstream as-is. Adopt
      them under `registry/hooks/` and refactor `Header` onto `useIsStuck` —
      the bar already implements that exact technique inline, so the refactor
      proves the hook against a shipped consumer. Carry the two traps found in
      use, and both are pinned by tests. Two more surfaced only when
      measured. With `threshold: [1]` Chromium reports a PARKED bar as
      `isIntersecting: false` — that flag tracks whether the ratio reached the
      lowest threshold, not whether the boxes overlap — so the obvious
      `display: none` guard is never true and the hook silently never fires;
      the empty rect is what separates hidden from parked. And `Math.abs` on
      an RTL `scrollLeft` is necessary and not sufficient: the magnitude is
      the distance from the INLINE start, which in RTL is the physical right,
      so an abs-only version swaps both horizontal fades. Mask mode shipped as
      `fadeMask`, a style helper rather than a prop, because a mask applies to
      the element being masked.
- [x] **The `Header` ground invariant is stated** (2026-09-04). The bar hardcodes
      `ground="base"` and that is right, but nothing tells a consumer their
      page must be `--ui-bg-base`. Two portal shells disagreed and nothing
      said so; in dark the two grounds are 20% apart and the ramp is a visible
      smudge. Documented rather than made configurable — moving the fade's
      ground without the bar's own fill is worse than the hardcoding.
- [x] **The affix blur is kept and RULE 23 IS CORRECTED** (2026-09-04). The
      bar puts a persistent `backdrop-blur-sm` on the `<header>` carrying the
      nav labels, which `ui-craft` rule 23 forbade. Measured in Chromium
      rather than argued, and the rule was wrong: `backdrop-filter: blur(4px)`
      on a text-bearing element changes **zero** glyph pixels, while
      `filter: blur(0.4px)` on the same element changes 9.31% of them with a
      peak delta of 139/255. `filter` filters the element including its text;
      `backdrop-filter` filters only what is behind it and composites the
      element's content on top untouched. The blur also earns its place —
      `--ui-bg-affix` is the page fill at 0.9, and blurring what shows through
      moves ~9.7/255 over hard-edged content. Rule 23 now carries both
      numbers. It had banned a real technique on a plausible mechanism nobody
      had measured, which is the failure the rule itself is about.

## Phase 5 — governance and agent ops · **partial**

- [x] Changesets configured; ledger discipline is the strongest part of the repo.
- [x] Six skills, `check:skills` gating the contract and the generated
      `.claude/skills/` copies (ADR 0013). One is distributed (`ui-craft` →
      `diorama-ui-craft`); five are authoring-only.
- [ ] **Scheduled agent routines** — the weekly dependency / a11y / doc-drift
      sweep. Nothing exists. A doc-drift sweep would have caught this file's
      predecessor.
- [ ] **Vibe tests** (§4.5 item 6) — no evidence anywhere in the repo. This is
      the only proposed measure of whether an agent handed this system actually
      produces correct UI, and it is unbuilt.
- [ ] **Consumer #2.** Still one consumer, so the ledger's CI gate and
      SessionStart injection stay correctly deferred (see below).

## Change ledger

The cross-project propagation design — formerly `plan.md §4.6`. Source
distribution creates a problem npm does not have: once an app copies a
component, nothing tells it the upstream changed. Four parts:

1. **The ledger** — `ledger/entries/` (155) plus `ledger/decisions/` (17 ADRs),
   validated by `check:ledger`. **Done.**
2. **Provenance in the consumer** — `ui.lock.json`, schema in
   `schemas/ui.lock.schema.json`. Live in service-portal: 26 items. The content
   hash is what separates *stale* from *deliberately forked*; without it every
   drift report is noise, and noisy reports get muted. **Done.**
3. **`npx @bydiorama/ui sync`** — `packages/cli`. Working end to end: the last
   run reported 22 current, 4 stale, 0 modified. Still `"private": true` and
   unpublished, deliberately — a public npm name is a real external commitment.
   **Done.**
4. **Non-optional consumption** — a consumer CI gate failing on unapplied
   `breaking`/`a11y` entries, a SessionStart hook injecting the delta, and
   `ledger.since(revision)` as an MCP tool. **Not built, correctly:** all three
   are sequenced to consumer #2, and with one consumer they are ceremony.

The reverse channel is the part that pays for itself: aggregate `modified`
across consumers and "5 of 7 apps patched Button locally" becomes a roadmap
item rather than five teams misbehaving. It needs consumer #2 to say anything.

## What would close the current phase

In the order that removes the most risk per unit of work:

1. Commit the Linux visual baselines. One workflow run; turns a gate that
   currently measures nothing into protection for all 35 components.
2. Adopt **Skeleton** in the portal (46 call sites — the component shipped
   2026-08-16 for another project; the portal has not taken it up), then
   resolve **Banner vs InlineAlert** (13), then **Toast** (12).
3. Triage the 127 declared gaps — starting with the four blocked on a person,
   which no amount of implementation effort can clear.
4. Re-order `TODO.md`'s design queue by consumer call sites, so the next twelve
   components are not chosen by drawing order either.

### Public review decisions — 2026-11-13

API notes now use full-width Table detail rows with fixed column lanes and a
no-JavaScript fallback. Table's nested clip includes the frame border; the
corrected light/dark public Paper reference is recorded in
`design/paper/specs/table.geometry.json` and exercised in the render-side gate.
Catalog previews are discovered from example source files and their coverage
is checked in the browser. This covers all existing public live examples; it
does not manufacture specimens for the remaining reference-only items.

The visual runner now installs its resolved theme instead of reading an
obsolete emitter API. The review's isolated-HEAD comparison separates existing
baseline drift from this patch. Only intentional Tabs/Table macOS baselines
were updated; unrelated failures and Linux regeneration remain open. See
`docs/public-site-design-review-2026-11-12.md` for evidence and commands.


Appearance now shares a validated preference store between the pre-paint
script and React examples. The Effects setting changes actual library
materials. Browser checks exercise every brand/density/effects combination,
both explicit schemes and System under each OS scheme, plus persistence,
keyboard operation and short-viewport dialogs. Reproduce with
`node apps/site/scripts/test-browser.mjs --appearance-only` (add `--webkit`
for the second engine) after `pnpm site:build`.
