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

The primary channel is this registry's own CLI, published as
[`@bydiorama/ui`](https://www.npmjs.com/package/@bydiorama/ui). From inside
your app, `add` resolves an item and its registry dependencies, writes their
source through your own `components.json` aliases and `tsconfig.json` `@/*`
mapping, locks what it installed into `ui.lock.json` (so drift tracking
starts at install, not as an afterthought), and prints the npm dependencies
left for you to install:

```bash
npx @bydiorama/ui add button
```

It never overwrites a local edit without `--force`, and never overwrites a
declared fork at all — the two things a generic registry client cannot
promise, because it reads no lockfile.

**Alternative — any shadcn-compatible client.** Every item is also served as
a plain JSON file with its source embedded (`r/<item>.json`, the open shadcn
registry schema), so the shadcn CLI works unchanged; nothing shadcn ships
ends up in the code you receive:

```bash
npx shadcn@latest add https://raw.githubusercontent.com/bydiorama/ui/main/r/button.json
```

Either way the item's source, its registry dependencies (`cn`, motion
utilities, …), and its token requirements land in your app. From here the
code is yours.

### Use it

```tsx
import { Button } from "@/ui/button";

<Button variant="primary" size="md">
  Save changes
</Button>;
```

### Stay in sync

`add` already locked what it installed (items installed another way get
`lock`), so `sync` can report drift per item — `stale`, `modified`, `forked`,
and their combinations — instead of overwriting your edits:

```bash
npx @bydiorama/ui sync
```

See the [CLI README](packages/cli/README.md) for the full drift model.

## What's inside

| Package / area | What it is |
| --- | --- |
| [`registry/ui`](registry/ui) | 45 components — controls, overlays, navigation, chat, data display — each with source, docs, stories, browser tests, and type tests |
| [`registry/lib`](registry/lib), [`registry/hooks`](registry/hooks) | Utilities and hooks, distributed the same source-first way |
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
