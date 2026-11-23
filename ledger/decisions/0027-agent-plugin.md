# 0027 — Shipped skills travel as one agent plugin, `ui`

**Status:** accepted · 2026-11-23 · amends ADR 0013 (decisions 3 and 4, the
naming rule, and the one-file rule for distributed skills)

## Context

ADR 0013 shipped skills the way it ships components: the CLI copies a
`SKILL.md` into the app's `.claude/skills/diorama-<name>/` and locks it in
`ui.lock.json`. That reached exactly one audience — a developer in an app repo
— and only five of fourteen skills. The rest were never shipped:

- `design-component` is for designers in Paper, who mostly work in claude.ai
  or Cowork. No app repo is involved, so a copy into one reaches nobody.
- The four motion-media skills (`motion-media`, `demo-page`, `video-render`,
  `stills-render`) make demo videos and stills of any Diorama UI, for any
  product. They carry scripts and reference pages, and a distributed skill
  could only be one file.
- `griddy-icons-in-paper` also lives in Diorama's internal plugin. The two
  copies had drifted apart: 136 lines here, 185 there.

Diorama already ships two agent plugins, and both work: `bydiorama` from
`bydiorama/internal-skills` (marketplace `diorama-internal`) and `motion`
from `bydiorama/motion` (marketplace `diorama-motion`). A plugin is installed
once per person, works in every repo they open, and — without a version —
follows `main`.

## Decision

1. **One plugin, `ui`, listed by a marketplace `diorama-ui` in this repo.**
   `.claude-plugin/marketplace.json` points at `./plugins/ui`. One plugin, not
   one per audience: each plugin is a manifest, an install and release notes
   to keep, and skills already route on their descriptions — a developer does
   not trigger a Paper skill by writing app code. The name follows `motion`:
   the plugin shows its skills as `ui:craft`, `ui:video-render`.

2. **It ships the product tier: ten skills.** For apps: `craft`, `effects`,
   `app-motion`, `visual-review`, `static-rendering`. For Paper:
   `design-component`. For demo media: `motion-media`, `demo-page`,
   `video-render`, `stills-render`. The test is whether a skill works outside
   this repo. `add-component`, `create-skill` and `review-ui` run this repo's
   gates and edit `registry/`, so they stay authoring-only: in an app,
   `review-ui` would fire on "review a component PR" and send the agent to
   scripts that do not exist.

3. **The manifest still decides what ships.** A skill item keeps
   `type: "skill"`; its one file's target is now
   `plugins/ui/skills/<name>/SKILL.md`. Reference files beside the `SKILL.md`
   travel with it — a plugin carries folders, which is why the one-file rule
   goes.

4. **`plugins/ui/skills/` and the plugin README are generated** by
   `pnpm skills:build`, next to `.claude/skills/`, and `pnpm check:skills`
   fails on drift — the 0013 contract, extended. The plugin is a subfolder,
   as in internal-skills, not the whole repo, as in motion: this repo is
   39 MB, mostly design exports and the registry, and its `.claude/skills/`
   holds the authoring skills too.

5. **No `version`, no `bin/`.** Without a version, installs follow `main`,
   like both existing plugins. Without a `bin/` folder, the plugin installs in
   claude.ai and Cowork as well as Claude Code — `motion` has one and is
   Claude Code only, which would shut out the designers decision 2 is for.
   `check:skills` fails on either.

6. **Names lose their prefix.** The plugin namespaces them, so `diorama-` and
   `ui-` would only be read twice (`ui:ui-craft`). A skill's name is its
   directory in both tiers, and `check:skills` refuses a shipped directory
   that starts with `ui-`, `diorama-` or `bydiorama-` — the rule
   internal-skills already keeps. `ui-craft` → `craft`, `ui-motion-media` →
   `motion-media`, `ui-demo-page` → `demo-page`, `ui-video-render` →
   `video-render`, `ui-stills-render` → `stills-render`. The manifest gains
   `renamed` (`ui-craft` → `craft`) so the ledger, which is immutable, keeps
   accepting the entries written under the old name.

7. **Skills leave the registry.** `registry.json` and `r/` no longer carry
   them, and the CLI no longer installs them: a copy in the app and the
   plugin's copy would compete, and a name-prefixed copy would win silently.
   `build-registry` now also deletes an `r/*.json` it no longer generates
   (and `--check` fails on one) — before this, a removed item kept being
   served. `visual-review` drops its `registryDependencies` on `visual-diff`;
   its setup step installs the script explicitly.

8. **`griddy-icons-in-paper` leaves this repo.** Its source is
   `bydiorama/internal-skills` (shipped as `bydiorama:griddy-icons-in-paper`,
   public in `bydiorama/skills`); the skills that cite it point there.

## Why skills may follow `main` when components do not

A copied component is pinned to the revision in the app's lock; a plugin
skill now follows `main`. An app on an older revision can therefore read a
rule about an API its copy does not have yet. Accepted, because:

- most of what ships is revision-independent — craft rules, effects usage,
  motion ownership, the visual-review method, the media pipeline;
- the alternative, one pinned copy per app, is what kept nine skills from
  shipping at all;
- the gap is visible: `sync` reports the app's stale items, and every change
  to a skill still gets a ledger entry.

## Not built yet

- **`add` / `sync` commands and the SessionStart drift hook** (`PLAN.md`,
  Change ledger part 4). They would run `npx @bydiorama/ui`, which returns
  E404 until the CLI is published (issue #30). They join the plugin then —
  as skills or hooks, never a `bin/` (decision 5).
- **Codex.** OpenAI's plugin format uses the same `skills/<name>/SKILL.md`
  layout; adding its manifest beside ours is the whole job, worth doing when
  someone here uses Codex.
- **An icon.** `claude plugin validate` asks for one; it matters only for a
  public directory listing.

## Consequences

- An app that installed skills with the CLI migrates once: delete
  `.claude/skills/diorama-*`, remove those items from `ui.lock.json`, install
  the plugin (`/plugin marketplace add bydiorama/ui`, then
  `/plugin install ui@diorama-ui`). Until then `sync` reports them as
  `missing-upstream`, and the breaking ledger entry says what to do.
- Comments in components still cite "ui-craft rule N". The numbers did not
  change; the `craft` skill says so instead of churning every component a
  consumer has copied.
- Do not install the `ui` plugin while working in this repo: `.claude/skills/`
  already loads the same skills, and they would load twice.
- `create-skill` documents the new model; `claude plugin validate .` passes
  (warnings: no version, no icon — both deliberate).
