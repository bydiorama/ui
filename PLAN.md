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

## Status — 2026-08-16

| | |
|---|---:|
| Distributed items (`ui.manifest.json`) | 43 |
| — components | 35 |
| — lib / hook / font / skill | 5 / 1 / 1 / 1 |
| Generated registry items (`r/*.json`) | 43 |
| Ledger entries / ADRs | 165 / 18 |
| `pnpm verify` gates | 17, green |
| Node tests | 100, green |
| Browser tests — contract + story a11y | 915 across 77 files, green |
| Declared design gaps | 127, across 35 of 35 docs |
| Visual baselines | 70 (35 cases x 2 schemes), **all `-chromium-darwin`**, all current |
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
and programmatic contrast — `check:contrast` measures **169 pairs across 35
components in both schemes**, so no contrast figure in this repo is typed by
hand.

Three of four emitters are built: `emit/css.ts`, `emit/tailwind.ts`,
`emit/ts.ts`.

- [ ] **Paper payload emitter.** Still unbuilt, and still with no consumer
      waiting on it — unchanged since 2026-08-08. Tokens reach Paper today via
      `design/paper/tokens.snapshot.json`. Build it when something needs a live
      push, not before.

## Phase 2 — core primitives · **in progress, exit gate not met**

35 components, each with the same five files (`.tsx`, `.doc.ts`,
`.stories.tsx`, `.browser.test.tsx`, `.types.test.tsx`); Select carries a sixth.
The discipline has held across every addition.

Two of the three exit-gate items the 2026-08-07 assessment added:

- [x] **Base UI migrated to `@base-ui/react@1.7.0`** (`3a672a5`). This was the
      top blocker — every overlay component sat on a dead release candidate
      under a retired package name, and the manifest handed that pin to every
      consumer. ADR 0012's wrapper rule is what made it cheap.
- [ ] **Linux visual baselines.** All 70 baselines are `-chromium-darwin`;
      the CI `visual` job requires `-chromium-linux` and exits 1 with an
      instruction. Note what this means: `check:visual-coverage` asserts each
      component has a *named case in the matrix source*, not that a baseline
      exists — so `pnpm verify` stays green while nothing is being compared in
      CI. **35 components have no visual regression protection there.** One
      workflow run fixes it: run **Generate visual baselines**, download the
      artifact, unzip over `registry/visual/__screenshots__/`, *look at the
      PNGs*, commit. *(task #42)*

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
2. Adopt **Skeleton** in the portal (46 call sites — the component shipped
   2026-08-16 for another project; the portal has not taken it up), then
   resolve **Banner vs InlineAlert** (13), then **Toast** (12).
3. Triage the 122 declared gaps — starting with the four blocked on a person,
   which no amount of implementation effort can clear.
4. Re-order `TODO.md`'s design queue by consumer call sites, so the next twelve
   components are not chosen by drawing order either.
