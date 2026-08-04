# AGENTS.md

Instructions for AI coding agents working in `bydiorama/ui`.
Humans: start with `README.md`, then `CONVENTIONS.md`.

## What this is

The Diorama design system: design tokens, React components, and the docs and
tooling around them. Consumed by Diorama products as **source** — apps copy
components in rather than installing a package — so everything here is written
to be read, owned and modified downstream.

## Ground rules

1. **`CONVENTIONS.md` is binding.** It defines prop naming, variants,
   composition, forwarding, styling, motion, boundaries and a11y. Read it before
   writing a component; do not invent a second dialect.
2. **Typed sources beat prose.** If you find yourself documenting a constraint in
   markdown, ask whether it can be a type, a lint rule or a CI check instead.
   Prose is the fallback, not the default.
3. **The manifest is the source of truth.** `ui.manifest.json` describes every
   distributable item. `registry.json` and `r/*.json` are **generated** — never
   hand-edit them; run `pnpm registry:build`.
4. **Record what you changed.** Any change to a distributed item needs a ledger
   entry (`pnpm ledger:new`). Consumers and their agents learn what moved from
   the ledger, not from git archaeology.

## Commands

| Command | What it does |
|---|---|
| `pnpm verify` | The full local gate: manifest, registry freshness, ledger, licensing |
| `pnpm registry:build` | Regenerate `registry.json` and `r/*.json` from the manifest |
| `pnpm check:registry` | Fail if the generated registry is stale (CI runs this) |
| `pnpm check:licensing` | Fail on non-distributable fonts or paid-tier assets |
| `pnpm ledger:new` | Scaffold a change-ledger entry |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm lint` | ESLint |

Run `pnpm verify` before considering any change done. It needs no `node_modules`
— the checks are dependency-free Node scripts on purpose, so they also run in a
cold clone.

## Hard boundaries

These are not style preferences; violating them breaks consumers:

- **No `next/*`, no i18n runtime, no data layer, no stores** in `registry/`.
  Components take strings and data as props and render links through a slot.
- **No licensed or paid assets.** Aspekta (OFL) is the single bundled typeface
  (ledger/decisions/0007). Retired faces (Saans, PT Serif) must never appear
  here — not the files, not even a `font-family` reference. Same rule for
  paid-tier assets from third-party libraries. `pnpm check:licensing` enforces
  both.
- **`griddy-icons` only** for iconography.
- **Semantic tokens only** for styling — no raw hex, no palette utilities.

## Adding a component

The full pipeline — order of operations, tests, traps, definition of done —
is the `add-component` skill (`.claude/skills/add-component/SKILL.md`).
Invoke it before starting; the steps below are the summary, not the manual.

1. Design spec exists in `design/` (exported from Paper) — implement against it,
   not against a screenshot.
2. Create `registry/ui/<name>/` with the component, its `*.doc.ts`, and stories.
3. Register it in `ui.manifest.json`, then `pnpm registry:build`.
4. Story must include the **brand-theme case**: rendered under theme zero *and*
   under a stress brand theme. A component that only looks right in Diorama's
   own colours is not finished.
5. `pnpm ledger:new` to record the addition.
6. `pnpm verify`, `pnpm type-check`, `pnpm lint`.

## What not to do

- Do not add a third-party component library, design language, block set or
  theme preset. This library is built from scratch; we interoperate with tools,
  we do not inherit designs. See `README.md` § Independence.
- Do not hand-edit generated files (`registry.json`, `r/*.json`).
- Do not widen a component's API to avoid a composition problem — slots and
  hooks exist for that.
- Do not skip the ledger entry because a change "is small". Small silent changes
  are exactly what strands downstream copies.
