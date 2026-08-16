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

## Status — 2026-08-14

| | |
|---|---:|
| Distributed items (`ui.manifest.json`) | 41 |
| — components | 34 |
| — lib / hook / font / skill | 4 / 1 / 1 / 1 |
| Generated registry items (`r/*.json`) | 41 |
| Ledger entries / ADRs | 158 / 18 |
| `pnpm verify` gates | 17, green |
| Node tests | 100, green |
| Browser tests — contract + story a11y | 886 across 74 files, green |
| Declared design gaps | 122, across 25 of 34 docs |
| Committed visual baselines | 124, **all `-chromium-darwin`** |
| Consumer drift (service-portal, 26 items) | 22 current, 4 stale, 0 modified |

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
and programmatic contrast — `check:contrast` measures **168 pairs across 34
components in both schemes**, so no contrast figure in this repo is typed by
hand.

Three of four emitters are built: `emit/css.ts`, `emit/tailwind.ts`,
`emit/ts.ts`.

- [ ] **Paper payload emitter.** Still unbuilt, and still with no consumer
      waiting on it — unchanged since 2026-08-08. Tokens reach Paper today via
      `design/paper/tokens.snapshot.json`. Build it when something needs a live
      push, not before.

## Phase 2 — core primitives · **in progress, exit gate not met**

34 components, each with the same five files (`.tsx`, `.doc.ts`,
`.stories.tsx`, `.browser.test.tsx`, `.types.test.tsx`); Select carries a sixth.
The discipline has held across every addition.

Two of the three exit-gate items the 2026-08-07 assessment added:

- [x] **Base UI migrated to `@base-ui/react@1.7.0`** (`3a672a5`). This was the
      top blocker — every overlay component sat on a dead release candidate
      under a retired package name, and the manifest handed that pin to every
      consumer. ADR 0012's wrapper rule is what made it cheap.
- [ ] **Linux visual baselines.** All 124 committed baselines are
      `-chromium-darwin`; the CI `visual` job requires `-chromium-linux` and
      exits 1 with an instruction. Note what this means: `check:visual-coverage`
      asserts each component has a *named case in the matrix source*, not that a
      baseline exists — so `pnpm verify` stays green while nothing is being
      compared. **34 components currently have no visual regression protection
      at all.** One workflow run fixes it: run **Generate visual baselines**,
      download the artifact, unzip over `registry/visual/__screenshots__/`,
      *look at the PNGs*, commit. *(task #42)*
- [ ] **Ship the primitives the consumer actually renders** — see below.

### The build queue is not ordered by need

The plan asked, on 2026-08-07, that the remaining queue be re-ordered by real
consumer call sites. It was not, and the gap has widened rather than closed.

Re-measured against `service-portal/src` on 2026-08-13:

| Unbuilt | Call sites (2026-08-07) | Call sites (2026-08-13) |
|---|---:|---:|
| **Skeleton** | 46 | **46** |
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

Skeleton alone has more call sites than Modal, and nothing in the portal renders
without it. `Divider` remains a "quick win" with zero consumers; build it, and
Tooltip, last or not at all.

- [ ] Decide whether **Banner covers InlineAlert.** Banner is already "an inline
      message attached to the surface it belongs to — not a toast, not a dialog"
      with five intents and a dismiss control. If it does, close InlineAlert
      explicitly and reduce the queue by 13 call sites; if it does not, say what
      differs. Leaving it implied means nobody can tell whether the 13 sites are
      served.

### The declared-gap backlog is growing faster than it is cleared

122 gaps across 25 of 34 docs, up from 22 across 21 on 2026-08-07 — roughly nine
per component shipped. The gate is working exactly as designed: every value the
code derived because a sheet did not answer it is attributed rather than
silently invented, and `pnpm design:gaps` prints the current set.

But it is a queue only a person can clear, four of them are already blocked on a
decision nobody has made (`TODO.md`), and Phase 3 inherits all of it. Worth a
triage pass before the block work starts, not during it.

### Motion · **tokens and CSS done; runtime deferred deliberately**

Measured 2026-08-14 with `pnpm check:motion`. The token tier from ADR 0005 has
held without enforcement: **zero hard-coded durations and zero literal easings**
across the 26 component files carrying transitions, and 28 of 34 components
animate something.

ADR 0018 settles the rest and amends two clauses of 0005 that described things
which did not exist — its "optional peer dependency" mechanism (never built;
optionality is item granularity) and its claim that the token-layer collapse
covers all CSS motion (it does not reach keyframes, which carry their own
timing).

- [x] `check:motion` — literals, `transition-all`, unguarded keyframes, and an
      animating component with no `motion:` note. 17 gates now.
- [x] 27 doc files gained a `motion:` note; Sheet's and ImageUpload's were
      promoted out of `a11y` to the top level.
- [x] `peerDependencies` removed from 35 items; `check:manifest` rejects any
      key the builders do not emit.
- [ ] **Nothing tests that motion RUNS.** `check:motion` reads source, so it
      proves a class is present, not that a property moves — and a visual
      baseline is one static frame. The assertion that would close this
      compares a resolved animation's duration against the token it names, in
      a shared browser probe beside `icon-slot` and `overlay-viewport`. This is
      the highest-leverage motion item left.
- [ ] **Run the `getAnimations()` probe** before any runtime is adopted. Base
      UI `flushSync`-unmounts once `element.getAnimations()` resolves, so a JS
      animation it cannot see is one it will unmount underneath. ADR 0018
      clause 2 is an assumption until this assertion exists.
- [ ] **`lib/motion`.** The triple
      `transition-[…] duration-(--ui-duration-fast) ease-(--ui-ease-out)`
      appears in 20+ places, hand-assembled, naming an intent
      (`--ui-motion-micro`) that already exists. A recipe in the shape of
      `chrome-control`, which several components already take their motion
      from.
- [ ] **Sidebar's collapsible section snaps** — `hidden={!expanded}` — where
      Accordion animates the identical interaction against Base UI's published
      height. Recorded in Sidebar's `motion:` note. Cheapest visible fix on the
      list.

Where motion should go next, by consumer need rather than by drawing order:
**Skeleton** (46 call sites, and it *is* a motion component), then Sidebar's
section, then **Toast** (12 sites — the first component that will genuinely
test whether the CSS tier is enough, and the honest forcing function for
adopting a runtime).

## Phase 3 — molecules, blocks and patterns · **not started in code**

`registry/blocks/` does not exist and the manifest carries no `block` items.
None of the named molecules are built: FormField / FieldGrid / FormActions,
DataTable, DetailHeader / DetailRail, StatusBadge, StatTiles, WizardLayout,
ChipSelect, ConfirmDeleteModal, EmptyState patterns.

Design is ahead of code here — `design/paper/README.md` already carries the
index-page contract, the app-header contract, a shipping-width specimen, and
(uncommitted at the time of writing) a gallery body and a sidebar-shell
application of the same pattern. That is the right order.

Its exit gate is untouched:

- [ ] **Docs site.** No `apps/docs`. `apps/` holds `registry/visual` and
      `storybook` only.
- [ ] **`llms.txt` and per-page markdown.** Absent. The plan rates this tertiary
      — sequence it behind the site, not in front of it.
- [x] **MCP.** Reachable now via the public registry, which is what §4.5 item 2
      actually asked for. Per-component doc data (`*.doc.ts`, item 3) exists and
      feeds `design:gaps` and the contrast gate; it has no site consuming it yet.

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
   currently measures nothing into protection for all 34 components.
2. Ship **Skeleton** (46 call sites), then resolve **Banner vs InlineAlert**
   (13), then **Toast** (12).
3. Triage the 122 declared gaps — starting with the four blocked on a person,
   which no amount of implementation effort can clear.
4. Re-order `TODO.md`'s design queue by consumer call sites, so the next twelve
   components are not chosen by drawing order either.
