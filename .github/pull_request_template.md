<!--
PR TITLE — GitHub has no title template, so the convention lives here:

  <Area>: <what changed, imperative>

  Area = the item or layer: a component (Modal, Tabs, ColorPicker) · a lib
         (fx, motion, cn) · Tokens · Theme · Skills · Registry · CLI ·
         Visual · Tooling · Docs · ADR <number>

  e.g.  Modal: centre by auto margins, not a translate, so hairlines paint evenly
        fx: glass takes its thickness from the component's role
        Visual: Linux baselines for the chat status cases
        ADR 0022: propose glass by role and an opaque scope

Consumers own copies of what ships here, so write the first two sections for
someone deciding whether to re-sync, the rest for the reviewer. Delete a
section that does not apply rather than leaving it empty.
-->

## What changed and why

<!-- Two or three sentences. The defect or need, and the decision taken. Link the issue, ADR or design-gap row it closes. -->

## Consumers affected and migration

<!--
Which manifest items change (`ui.manifest.json`), and what an app that installed
them must do on `sync`: nothing, re-sync, or a manual step. A changed prop,
token, slot or data-slot is breaking even when the diff is small — say so.
-->

| Item | Change | What a consumer does |
| --- | --- | --- |
|  |  |  |

## Ledger entries

<!-- One per distributed change (`pnpm ledger:new`), with real `affects`. "None — nothing distributed changed" is a valid answer; say why. -->

- `ledger/entries/…`

## Visual baselines

<!--
A visual change touches TWO baselines per case: `-chromium-darwin` (local) and
`-chromium-linux` (CI). Regenerate the Linux half with the "Generate visual
baselines" workflow (Actions → Generate visual baselines), download the
artifact, LOOK at each PNG, then commit it — never copy darwin output. List
every changed baseline; `git ls-files '*.png'` must show no -actual-/-diff- debris.
-->

- [ ] No visual change
- [ ] Baselines updated on **macOS** (`pnpm test:visual`, after deleting the stale PNGs)
- [ ] Baselines updated on **Linux** via the workflow — run: <!-- link -->

## Design spec and geometry

<!--
The Paper node this implements (URL), and whether `design/paper/specs/<item>.geometry.json`
and its case in `registry/visual/geometry.browser.test.tsx` were added or
changed. No spec? Say the item is ungated, don't imply it passed.
Anything the sheet could not answer goes into the doc's `needsDesign`.
-->

- Paper:
- Geometry spec:

## Gates

- [ ] `pnpm verify` (manifest, registry freshness, ledger, licensing, skills, contrast, design spec, …)
- [ ] `pnpm type-check` — the root project **and** Storybook's (stories only fail there)
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm test:browser` — interaction contracts and every story through axe
- [ ] `pnpm test:visual` — both schemes
- [ ] `pnpm registry:build` / `pnpm skills:build` re-run after manifest or skill edits; no hand edits to `registry.json`, `r/` or `.claude/skills/`
- [ ] A new or changed gate was shown to fail first (probe noted below)

## Notes for the reviewer

<!-- Probes run, measurements (computed style, getBoundingClientRect, contrast ratios), anything deferred and why. -->
