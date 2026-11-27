# Contributing

Start with [`AGENTS.md`](AGENTS.md) for the ground rules and
[`CONVENTIONS.md`](CONVENTIONS.md) for the component API. Both are binding.

## Where the library stands

Maturity is tracked in phases. [`PLAN.md`](PLAN.md) carries the measured
detail — every number there names the command that produced it, so this table
stays coarse on purpose:

| Phase | Scope | State |
| --- | --- | --- |
| 0 — repo and rules | manifest → generated registry, change ledger, ADRs, CI | **done** — delivered past its gate: the planned five checks became 25 enumerated gates |
| 1 — tokens | `@bydiorama/tokens`: OKLCH resolver, CSS/Tailwind/TS emitters, measured contrast | **done bar one emitter** — the Paper payload emitter waits until something needs a live push |
| 2 — core primitives | the components, five files each, visual baselines on both platforms | **in progress, exit gate not met** — 60 components ship; the queue that remains is ordered by real consumer call sites |
| 3 — blocks and docs site | `registry/blocks/`, a public docs site | **in progress** — local public reader and owned CLI preview; release gates remain in `PLAN.md` |

## What CI enforces

The badge at the top is live — a red badge means a gate below is failing
right now, not that the library is broken for consumers (installed source
never moves under you; that is what the lockfile is for). Every push runs
two jobs:

- **verify** — the 25 dependency-free gates first (among them manifest integrity,
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

## Development

```bash
pnpm verify           # all 25 CI gates — dependency-free, runs on a cold clone
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
  fonts/ skills/     Aspekta (OFL); agent skills — the source (ADR 0013)
plugins/ui/          the `ui` agent plugin — skills GENERATED from registry/skills (ADR 0027)
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

## Public library site

The public reader lives in `apps/site`. Run `pnpm site:dev` to preview it or
`pnpm site:build` to produce the static site. Components are registered through
the manifest and documented from their typed docs; `pnpm site:data` updates the
generated catalog after a change. See [the public library workflow](docs/public-library-workflow.md).

The site uses the owned CLI preview as its primary installation route, with
shadcn as an alternative for existing apps. `pnpm test:cli-package` verifies
the packed executable without a repository checkout in the consumer. Npm
publication and hosting remain release work in `PLAN.md`.
