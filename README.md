# Diorama UI

**The Diorama design system: design tokens, 45 React components, and the
tooling that keeps consumers in sync — distributed as source you own.**

[![CI](https://github.com/bydiorama/ui/actions/workflows/ci.yml/badge.svg)](https://github.com/bydiorama/ui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/react-19-149eca.svg)](https://react.dev)
[![Node ≥ 22](https://img.shields.io/badge/node-%E2%89%A522-339933.svg)](package.json)

> **Status: Phase 2 — core primitives, gate not yet met.** Foundations, the
> token layer, and 45 components ship today, consumed by a real app through a
> working lockfile-and-sync loop. Visual baselines cover every component in
> both colour schemes on both platforms — macOS locally, Linux in CI. Still
> open: the primitives the consumer renders most, and Phase 3's blocks and
> docs site. [`PLAN.md`](PLAN.md) tracks it — measured, with the command
> behind every number.

## Why this exists

- **Source distribution, not a dependency.** A consuming app installs an
  item and owns the code from that point on — no wrapper layers, no version
  treadmill. Tokens are the one real package (`@bydiorama/tokens`), because
  they must be identical everywhere and change centrally. ([ADR 0001](ledger/decisions/0001-source-distribution.md))
- **Built from scratch.** No third-party component library, design language,
  block set, or theme preset is copied in. Tooling is interoperated with —
  never inherited as design. ([ADR 0002](ledger/decisions/0002-independence.md))
- **Drift is tracked, not hoped away.** A lockfile CLI computes three-way
  drift (installed / locked / registry), telling a deliberate fork apart from
  staleness and reporting which change-ledger entries apply.
- **Measured, not asserted.** Contrast is computed from the token resolver
  (169 pairs, both schemes), every story runs through axe, interaction
  contracts run in a real browser, and visual baselines cover every
  component in both colour schemes.
- **Agent-ready.** [`AGENTS.md`](AGENTS.md), distributable agent skills, and
  a dependency-free `pnpm verify` a fresh clone (or a fresh agent) can run
  before installing anything.

## Where it stands

Maturity is tracked in phases. [`PLAN.md`](PLAN.md) carries the measured
detail — every number there names the command that produced it, so this table
stays coarse on purpose:

| Phase | Scope | State |
| --- | --- | --- |
| 0 — repo and rules | manifest → generated registry, change ledger, ADRs, CI | **done** — delivered past its gate: the planned five checks became 18 enumerated gates |
| 1 — tokens | `@bydiorama/tokens`: OKLCH resolver, CSS/Tailwind/TS emitters, measured contrast | **done bar one emitter** — the Paper payload emitter waits until something needs a live push |
| 2 — core primitives | the components, five files each, visual baselines on both platforms | **in progress, exit gate not met** — 45 components ship; the queue that remains is ordered by real consumer call sites |
| 3 — blocks and docs site | `registry/blocks/`, a public docs site | **not started** |

### What CI enforces

The badge at the top is live — a red badge means a gate below is failing
right now, not that the library is broken for consumers (installed source
never moves under you; that is what the lockfile is for). Every push runs
two jobs:

- **verify** — the 18 dependency-free gates first (manifest integrity,
  registry freshness, declared imports, change ledger, licensing,
  iconography, token utilities, behaviour-layer boundaries, controls,
  keyboard paths for gestures, motion rules, story hygiene, overlay
  viewport behaviour, visual coverage, runner/browser version match,
  skills, measured contrast, design-geometry laws) and the package unit
  tests — all runnable on a cold clone with no `node_modules`. Then, after
  install: registry unit tests, type-check, lint, the browser suite
  (interaction contracts plus every story through axe at error severity)
  and a full Storybook build.
- **visual** — every component rendered in both colour schemes and compared
  against committed Linux baselines at **zero tolerated pixels**
  (`allowedMismatchedPixels: 0`), inside a pinned Playwright container so
  neither the browser build nor the font set can drift under the
  comparison. macOS baselines serve the same role locally.

## Quick start

### Install a component

> **Nothing here is on npm yet.** `@bydiorama/ui` (the CLI) and
> `@bydiorama/tokens` are both unpublished — `npx @bydiorama/ui …` returns
> E404 (issue #30). The paths below are the ones that work today.

The primary channel is this registry's own CLI, run from a checkout of this
repo against your app. `add` resolves an item and its registry dependencies,
writes their source through your own `components.json` aliases and
`tsconfig.json` `@/*` mapping, locks what it installed into `ui.lock.json`
(so drift tracking starts at install, not as an afterthought), and prints the
npm dependencies left for you to install:

```bash
# from a bydiorama/ui checkout
node --experimental-strip-types packages/cli/bin/ui.ts add button \
  --cwd ../my-app --registry-path . --revision "$(git rev-parse HEAD)"
```

It never overwrites a local edit without `--force`, and never overwrites a
declared fork at all — the two things a generic registry client cannot
promise, because it reads no lockfile. `--help` on any command explains its
flags; `lock --all` records every item already installed some other way.

**Alternative — a shadcn-compatible client, with one caveat.** Every item is
also served as a plain JSON file with its source embedded (`r/<item>.json`,
the open shadcn registry schema), so the shadcn CLI installs it:

```bash
npx shadcn@latest add https://raw.githubusercontent.com/bydiorama/ui/main/r/button.json
```

It is **not byte-exact**: shadcn drops a file's leading comment block (seen on
`*.doc.ts` and `lib/motion.ts`), so `lock`/`sync` will report those files as
diverging from the registry. If you want drift tracking, install with the CLI
above, or reinstall with `add <item> --force` before locking.

Either way the item's source, its registry dependencies (`cn`, motion
utilities, …), and its token requirements land in your app. From here the
code is yours.

### Install the tokens

Components style themselves with token utilities (`bg-surface`,
`text-ink-primary`, …), so the app needs the theme. Theme zero ships as a
registry item:

```bash
node --experimental-strip-types packages/cli/bin/ui.ts add theme-zero-css \
  --cwd ../my-app --registry-path . --revision "$(git rev-parse HEAD)"
```

and is imported once, after Tailwind:

```css
@import "tailwindcss";
@import "./theme-zero.css";
```

**Tailwind must see the installed source — and normally already does.**
Components style themselves with utilities, which Tailwind v4 only emits for
class names it finds by scanning files. Its automatic detection scans the
project root — Vite's `root` with `@tailwindcss/vite`, the working directory
for the PostCSS plugin and the CLI — and skips `node_modules`, anything your
`.gitignore` excludes, binaries and CSS. The CLI installs into `src/ui`,
`src/lib` and `src/hooks` (your `components.json` aliases), which is inside
that root and not ignored, so **a standard app needs no `@source` line**.
Measured with Tailwind 4.3.5's scanner on the first consumer: all 40 installed
files were scanned without its three `@source` lines. Add one only when
detection cannot reach the files, pointing at the folder relative to the
stylesheet:

| Situation | Fix |
| --- | --- |
| The install folder is git-ignored (a generated or vendored path) | `@source "../ui";` — an explicit `@source` is scanned even when ignored |
| The source lives outside the root: a monorepo package, a shared folder, a sibling checkout | `@source "../../../packages/ui";` (this repo's Storybook does exactly this for `registry/`) |
| The stylesheet narrows the base: `@import "tailwindcss" source("../app")` or `source(none)` | `@source` each folder the installed items land in |

The symptom of a miss is quiet: components render unstyled or half-styled,
and nothing errors. A utility built at runtime from a template string is
missed in every setup — that is why the library keeps class names literal.

A **brand** theme is the same file generated from the brand's seed: write a
`ThemeSeed` (a `.ts` module exporting it, or a `.json`), then let the CLI emit
the stylesheet — the same `@theme inline` map and token layer theme zero
ships, under a GENERATED header that names the command to regenerate it:

```bash
node --experimental-strip-types ../ui/packages/cli/bin/ui.ts theme \
  --cwd . --seed theme/brand.seed.ts --out src/styles/brand-theme.css
```

```css
@import "tailwindcss";
@import "./brand-theme.css";
```

Add the same command with `--check` to CI: it exits 1 when the committed CSS
no longer matches the seed (or the tokens it resolves through), the way
`pnpm check:theme-css` guards theme zero. `--scheme light|dark` forces a
scheme instead of following the OS. `@bydiorama/tokens` is unpublished, so
the command reads it from the checkout it runs from (or `--registry-path`);
there is no hand-written emitter script to keep in step any more. See
[`packages/cli/README.md`](packages/cli/README.md#theme---seed-file---out-css).

`typography.baseSize` is the scale's 16px reference, **not** the body size:
body copy is the 14px row, so `baseSize: 13` gives 11.375px body text. The
table is on `SeedTypography.baseSize`, and `theme` prints an `info` note for
anything under 15.

### Use it

```tsx
import { Button } from "@/ui/button";

<Button variant="primary" size="md">
  Save changes
</Button>;
```

### Dense screens

Density is a mode, not a size prop (ADR 0020 §4, ADR 0026). Set
`data-ui-density="compact"` and every control, field, row and stepped type
role under it re-binds — no `className` per component. What compact gives,
measured in Chromium against theme zero:

| Part | Default | Compact |
|---|---|---|
| Button `lg` / `md` / `sm` | 44 / 32 / 24px | 40 / 28 / 24px (24 is the SC 2.5.8 floor) |
| Input, Select, Multiselect, Combobox field `lg` / `md` / `sm` | 48 / 40 / 32px | 44 / 36 / 28px |
| Field label (`text-field-label`) | 13px / 600 | 12px / 600 |
| Field value at `md` (`text-row`) | 14px | 13px (`lg` keeps 14, `sm` 12) |
| Textarea `md` | 14px value, 8px inset | 13px value, 4px inset |
| Menu, ContextMenu, Select / Combobox option row | ~46px, 14px / 400 | **32px**, 13px / 400, 8px inline inset |
| Multiselect option row | drawn by its 12px padding, 12px / 600 | **32px**, type unchanged |
| Sidebar item, section heading, layer title | 46px, 16px | **32px**, 13px; labels on a 16px lane |
| Sidebar search | 40px, 14px | 36px, 13px |
| NavRail item | 32px square | 28px square |
| Checkbox, Radio, Switch row | 24px | 19–20px (target stays 24px) |
| Tabs | 24px tab in a 32px list | unchanged |

Apply it to the whole app on `<body>` — portalled panels inherit it from
there:

```html
<body data-ui-density="compact">
```

or to a subtree, such as a dense inspector inside a default page. A
**portalled** surface (Menu, Popover, Modal, Sheet, Drawer, ContextMenu)
leaves that subtree, so pass the attribute to its popup part too
(CONVENTIONS §6); Select carries its trigger's density onto its list by
itself. `data-ui-density="default"` inside a compact subtree restores the
drawn sizes.

```tsx
<aside data-ui-density="compact">
  <Menu>
    <Menu.Trigger render={<Button size="md">Actions</Button>} />
    <Menu.Panel data-ui-density="compact">
      <Menu.Item onSelect={archive}>Archive</Menu.Item>
    </Menu.Panel>
  </Menu>
</aside>
```

For 13px or 12px **regular** text in your own screens, use `text-dense-md`
and `text-dense-sm` rather than `text-[13px] font-normal`: they follow a
brand's `baseSize` and weights like every other role.

### Lint the boundaries

The library's own import rules — griddy-icons only, no second component
library, CSS-first motion (CONVENTIONS §7–8) — ship as an ESLint flat-config
preset, so the app is held to them too:

```bash
node --experimental-strip-types packages/cli/bin/ui.ts add eslint-preset \
  --cwd ../my-app --registry-path . --revision "$(git rev-parse HEAD)"
```

```js
// eslint.config.mjs
import tseslint from "typescript-eslint";
import diorama from "./eslint.diorama.mjs";

export default tseslint.config(
  ...tseslint.configs.recommended,
  ...diorama, // after the presets it should override
);
```

It is plain objects with no plugin. If your config also sets
`no-restricted-imports`, ESLint keeps only the LAST object's options — merge
instead, from the exported `restrictedImports.paths` and `.patterns`. Add
package names to `paths`, never to `patterns`: patterns match like
`.gitignore`, so `"motion"` there also catches `@/lib/motion`, which every
installed component imports.

### Check it against the design

Install the `visual-review` skill (it brings the `visual-diff` script): it
diffs the running app against 1× exports of the design's frames and
components, and teaches the agent to read the result. The `app-motion` skill
covers motion beyond what the components already do.

### Stay in sync

`add` already locked what it installed (items installed another way get
`lock`), so `sync` can report drift per item — `stale`, `modified`, `forked`,
and their combinations — instead of overwriting your edits:

```bash
node --experimental-strip-types packages/cli/bin/ui.ts sync --cwd ../my-app --registry-path .
```

See the [CLI README](packages/cli/README.md) for the full drift model.

## What's inside

| Package / area | What it is |
| --- | --- |
| [`registry/ui`](registry/ui) | 45 components — controls, overlays, navigation, chat, data display — each with source, docs, stories, browser tests, and type tests |
| [`registry/lib`](registry/lib), [`registry/hooks`](registry/hooks) | Utilities and hooks, distributed the same source-first way |
| [`registry/lib/fx`](registry/lib/fx), [`registry/lib/shader`](registry/lib/shader) | The effects layer (ADR 0022): CSS materials applied as `fx(…)` classes, and an optional WebGL runtime for the parametric gradient ground and halo (ADR 0025) — experimental |
| [`packages/tokens`](packages/tokens) | `@bydiorama/tokens` — token contract, OKLCH theme resolver, CSS/Tailwind/TS emitters, programmatic contrast |
| [`packages/cli`](packages/cli) | The consumer-side CLI — owned install channel (`add`), lockfile, drift report |
| [`apps/storybook`](apps/storybook) | Stories, interaction contracts, story a11y, visual-regression runner |

Browse the components locally:

```bash
pnpm install
pnpm --filter @bydiorama/storybook dev   # Storybook on :6006
```

## Development

```bash
pnpm verify           # all 18 CI gates — dependency-free, runs on a cold clone
pnpm test             # unit tests (Node's runner)
pnpm test:browser     # interaction contracts + every story through axe
pnpm test:visual      # visual regression against committed baselines
pnpm type-check
pnpm lint
pnpm registry:build   # regenerate registry.json and r/*.json from the manifest
pnpm ledger:new       # scaffold a change-ledger entry
pnpm design:gaps      # what the library is waiting on from design
```

`ui.manifest.json` is the source of truth for everything distributed;
`registry.json` and `r/*.json` are generated from it and never hand-edited.
Every change that affects consumers gets a [ledger entry](ledger/entries/)
saying what moved and what consumers must do.

## Repository layout

```
ui.manifest.json     source of truth for everything distributed
registry.json, r/    GENERATED — never hand-edited
registry/            the distributed source itself
  ui/                one directory per component, five files each
  lib/ hooks/        utilities and hooks
  fonts/ skills/     Aspekta (OFL); agent skills, per ADR 0013
  visual/            the visual-regression matrix and its baselines
packages/tokens/     @bydiorama/tokens — token contract, resolver, emitters
packages/cli/        the consumer-side CLI — add, lock, sync
apps/storybook/      stories, contract tests, story a11y, visual runner
design/paper/        exported design artifacts; Paper source stays in its cloud
ledger/decisions/    architecture decision records
ledger/entries/      change ledger
schemas/             JSON Schemas for the manifest and ledger entries
scripts/             dependency-free checks and generators
```

## Documentation

- [`CONVENTIONS.md`](CONVENTIONS.md) — the component API rulebook. Binding.
- [`PLAN.md`](PLAN.md) — where the library is and what closes each gate.
- [`TODO.md`](TODO.md) — defects, undrawn components, open design questions.
- [`AGENTS.md`](AGENTS.md) — instructions for AI coding agents.
- [`ledger/decisions/`](ledger/decisions/) — why things are the way they are.
  Read these before re-proposing a settled question.

## License

MIT — see [LICENSE](LICENSE). Adapted third-party material and inspirations
are itemised in [CREDITS.md](CREDITS.md); the one asset class that is *not*
MIT-distributable (licensed typefaces) is enforced out of the tree by
`pnpm check:licensing` ([ADR 0003](ledger/decisions/0003-typography-licensing.md)).
