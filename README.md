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

## Quick start

### Install a component

Every item is served as a plain JSON file with its source embedded —
`r/<item>.json`, generated from `ui.manifest.json`. The format is the open
shadcn registry schema, so any client that reads it works; none of them is a
dependency of this library, and nothing shadcn ships is in the code you
receive.

With the shadcn CLI (the most common client today):

```bash
npx shadcn@latest add https://raw.githubusercontent.com/bydiorama/ui/main/r/button.json
```

Or without any third-party tooling — the registry item names everything you
need: copy the `files` it lists (or the same files straight from
[`registry/ui`](registry/ui)) into your app, then repeat for the
`registryDependencies` it declares (`cn`, motion utilities, …).

Either way the item's source, its registry dependencies, and its token
requirements land in your app. From here the code is yours.

### Use it

```tsx
import { Button } from "@/ui/button";

<Button variant="primary" size="md">
  Save changes
</Button>;
```

### Stay in sync

Lock what you installed, then let `sync` report drift per item — `stale`,
`modified`, `forked`, and their combinations — instead of overwriting your
edits:

```bash
node --experimental-strip-types packages/cli/bin/ui.ts lock button --cwd ../your-app --revision $(git rev-parse HEAD)
node --experimental-strip-types packages/cli/bin/ui.ts sync --cwd ../your-app
```

See the [CLI README](packages/cli/README.md) for the full drift model.

## What's inside

| Package / area | What it is |
| --- | --- |
| [`registry/ui`](registry/ui) | 45 components — controls, overlays, navigation, chat, data display — each with source, docs, stories, browser tests, and type tests |
| [`registry/lib`](registry/lib), [`registry/hooks`](registry/hooks) | Utilities and hooks, distributed the same source-first way |
| [`packages/tokens`](packages/tokens) | `@bydiorama/tokens` — token contract, OKLCH theme resolver, CSS/Tailwind/TS emitters, programmatic contrast |
| [`packages/cli`](packages/cli) | The consumer-side sync CLI — lockfile and drift report |
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
packages/cli/        the consumer-side sync CLI
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
