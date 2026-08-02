# @bydiorama/ui

The Diorama design system: design tokens, React components, and the tooling
around them.

> **Status: Phase 0.** The foundations — conventions, manifest, registry
> pipeline, change ledger, CI — are in place. Tokens land in Phase 1 and
> components in Phase 2. See the implementation plan in
> `bydiorama/service-portal` → `docs/ui-design-system-plan.md`.

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
registry/            the distributed source itself (ui, lib, hooks, blocks, tokens)
packages/tokens/     @bydiorama/tokens — token contract, resolver, emitters
ledger/decisions/    architecture decision records
ledger/entries/      change ledger — what moved, and what consumers must do
schemas/             JSON Schemas for the manifest and ledger entries
scripts/             dependency-free checks and generators
```

## Commands

```bash
pnpm verify           # manifest + registry freshness + ledger + licensing
pnpm registry:build   # regenerate registry.json and r/*.json
pnpm ledger:new       # scaffold a change-ledger entry
pnpm type-check
pnpm lint
```

`pnpm verify` needs no `node_modules` — the checks are dependency-free Node on
purpose, so a cold clone (or a fresh agent) can confirm the repo is internally
consistent before installing anything.

## Working here

- [`CONVENTIONS.md`](CONVENTIONS.md) — the component API rulebook. Binding.
- [`AGENTS.md`](AGENTS.md) — instructions for AI coding agents.
- [`ledger/decisions/`](ledger/decisions/) — why things are the way they are.
  Read these before re-proposing a settled question.
