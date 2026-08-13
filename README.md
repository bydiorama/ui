# @bydiorama/ui

The Diorama design system: design tokens, React components, and the tooling
around them.

> **Status: Phase 2 — core primitives, gate not yet met.** The foundations
> (conventions, manifest, registry pipeline, change ledger, 16 CI gates) and
> the token layer (`@bydiorama/tokens` — resolver, three emitters, measured
> contrast) are done. **34 components** ship, consumed by one app through a
> working lockfile-and-sync loop. Still open: Linux visual baselines, the
> primitives the consumer renders most, and Phase 3's blocks and docs site.
> See [`PLAN.md`](PLAN.md) — measured, with the command behind every number.

## How it is distributed

Components are distributed as **source**, not as a versioned package. A
consuming app installs an item and owns the code from that point on.

`ui.manifest.json` is the source of truth. `registry.json` and `r/*.json` are
generated from it (`pnpm registry:build`) in a format existing CLIs and coding
agents already understand — a transport we ship for convenience, not a
foundation. Tokens are the one real package (`@bydiorama/tokens`), because they
must be identical everywhere and change centrally.

See [`ledger/decisions/0001`](ledger/decisions/0001-source-distribution.md).

## Independence

Built from scratch. No third-party component library, design language, block
set, style or theme preset is copied into this repository. Tooling is
interoperated with — a rendering library, a distribution format, and (where
justified) unstyled behaviour mechanics wrapped behind our own API — never
inherited as design. See
[`ledger/decisions/0002`](ledger/decisions/0002-independence.md).

## Layout

```
ui.manifest.json     source of truth for everything distributed
registry.json, r/    GENERATED — never hand-edited
registry/            the distributed source itself
  ui/                one directory per component, five files each
  lib/ hooks/        utilities and hooks distributed the same way
  fonts/ skills/     Aspekta (OFL); agent skills, per ADR 0013
  visual/            the visual-regression matrix and its baselines
packages/tokens/     @bydiorama/tokens — token contract, resolver, emitters
packages/cli/        the consumer-side sync CLI — lockfile and drift report
apps/storybook/      stories, contract tests, story a11y, visual runner
design/paper/        exported design artifacts; Paper source stays in its cloud
ledger/decisions/    architecture decision records
ledger/entries/      change ledger — what moved, and what consumers must do
schemas/             JSON Schemas for the manifest and ledger entries
scripts/             dependency-free checks and generators
```

`registry/blocks/` is Phase 3 and does not exist yet.

## Commands

```bash
pnpm verify           # all 16 gates: manifest, registry freshness, ledger,
                      #   licensing, icons, boundaries, contrast, coverage, …
pnpm registry:build   # regenerate registry.json and r/*.json
pnpm ledger:new       # scaffold a change-ledger entry
pnpm test             # Node's runner, no dependencies
pnpm test:browser     # interaction contracts + every story through axe
pnpm design:gaps      # what the library is waiting on from design
pnpm type-check
pnpm lint
```

`pnpm verify` needs no `node_modules` — the checks are dependency-free Node on
purpose, so a cold clone (or a fresh agent) can confirm the repo is internally
consistent before installing anything.

## License

MIT — see [LICENSE](LICENSE). Adapted third-party material and inspirations
are itemised in [CREDITS.md](CREDITS.md); the one asset class that is *not*
MIT-distributable (licensed typefaces) is enforced out of the tree by
`pnpm check:licensing` (see `ledger/decisions/0003`).

## Working here

- [`CONVENTIONS.md`](CONVENTIONS.md) — the component API rulebook. Binding.
- [`AGENTS.md`](AGENTS.md) — instructions for AI coding agents.
- [`PLAN.md`](PLAN.md) — where the library is and what closes each gate.
- [`TODO.md`](TODO.md) — defects, undrawn components, and the questions design
  still owes the code.
- [`ledger/decisions/`](ledger/decisions/) — why things are the way they are.
  Read these before re-proposing a settled question.
