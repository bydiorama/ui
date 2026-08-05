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
| `pnpm skills:build` | Regenerate `.claude/skills/` from `registry/skills/` |
| `pnpm check:skills` | Fail on a broken skill contract or a stale generated copy |
| `pnpm check:boundaries` | Fail if the behaviour layer leaks into a public signature |
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
is the `add-component` skill (`registry/skills/add-component/SKILL.md`).
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

## Skills

**`registry/skills/` is the source of truth for every skill. `.claude/skills/`
is generated — never edit it.** The manifest decides which skills ship to
consumers, the same way it decides which components do (ADR 0013).

| Tier | Teaches | In the manifest | Front-matter name |
|---|---|---|---|
| Authoring | building this library | no | the directory name |
| Product | using `@bydiorama/ui` | `type: "skill"` | `diorama-<directory>` |

Creating or editing one is the **`create-skill`** skill
(`registry/skills/create-skill/SKILL.md`) — invoke it rather than copying an
existing skill's shape. Run `pnpm skills:build` after any edit; `check:skills`
fails on drift.

## Git

**Never `git add`, `git commit`, `git push` or `git tag` without being asked
for that specific change.** Finish the work, run the gates, report what is
done, and leave the working tree alone — staging and committing are the
maintainer's decision, not a tidy-up step. A staged tree the maintainer did
not ask for hides the diff they were about to review.

Asked to commit? Commit exactly what was agreed and nothing else. Never
`git checkout`/`restore` a file to undo your own probe — it destroys
uncommitted work alongside it.

## What not to do

- Do not commit or push anything without explicit consent — see § Git.
- Do not add a third-party component library, design language, block set or
  theme preset. This library is built from scratch; we interoperate with tools,
  we do not inherit designs. See `README.md` § Independence.
- Do not hand-edit generated files (`registry.json`, `r/*.json`).
- Do not widen a component's API to avoid a composition problem — slots and
  hooks exist for that.
- Do not skip the ledger entry because a change "is small". Small silent changes
  are exactly what strands downstream copies.

## Visual regression

`pnpm test:visual` diffs each component's matrix against a committed baseline,
in **both schemes**. It is the only layer that catches what computed-style
assertions cannot — a badge whose two sizes are identical, a label hugging the
top of its row, a panel with no visible boundary. All three of those shipped.

- Baselines live in `registry/visual/__screenshots__/` and **are committed**
  (explicitly un-ignored). Review a changed baseline like any other diff.
- Intentional visual change? Delete the affected baseline, re-run, and commit
  the new PNG **after looking at it**.
- **Audit what is tracked, not just what is ignored.** A failing compare writes
  `-actual-`/`-diff-` PNGs relative to the *vitest root*, which put four of them
  in `apps/registry/` — a directory that should not exist and that no
  `__screenshots__` rule matched. They were committed. The artifact NAMES are
  ignored globally now; still run `git ls-files '*.png'` before committing and
  confirm every tracked image is a baseline you reviewed.
- **Not in CI.** Baselines are platform-specific (`-chromium-darwin`): font
  rasterisation differs between macOS and Linux, so a committed macOS PNG
  cannot pass on a Linux runner. Running it needs a containerised runner that
  matches whoever generated the baselines. Until then this gate is local and
  manual-to-invoke, which is weaker than every other gate here — say so rather
  than assuming it ran.
