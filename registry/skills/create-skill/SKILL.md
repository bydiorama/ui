---
name: create-skill
description: How to author, place, validate and ship an agent skill in bydiorama/ui. Use when creating a new skill, editing an existing one, deciding whether a skill should ship in the `ui` plugin or stay internal, or when `pnpm check:skills` fails. Covers the two-tier model, the front-matter contract, and why .claude/skills and plugins/ui are generated rather than edited.
---

# Create a skill

Skills in this repo have **one source of truth and two audiences.** Getting
the audience right is the only decision that matters; everything else is a
contract a gate already enforces.

## Where skills live

```
registry/skills/<dir>/SKILL.md   ← THE SOURCE. Every skill, both tiers.
.claude/skills/                  ← GENERATED. Every skill. Never edit.
plugins/ui/skills/               ← GENERATED. The shipped skills. Never edit.
plugins/ui/.claude-plugin/       ← the plugin manifest, hand-written
.claude-plugin/marketplace.json  ← the marketplace (`diorama-ui`), hand-written
```

`registry/skills/` is the source tree for **all** skills. The **manifest, not
the folder, decides which ones ship** — the same rule that lets stories and
tests live beside components without ever reaching a consumer.

Both generated trees come from `pnpm skills:build` and are committed, exactly
like `registry.json`. Editing a file in either is silently discarded on the
next build, so `pnpm check:skills` fails on any drift. Shipped skills reach
people through the `ui` agent plugin (ADR 0027), never through the registry
or the CLI.

## The two tiers

Ask one question: **does this skill teach an agent to build *this library*, or
to use it in *their app*?**

| | Authoring tier | Product tier |
|---|---|---|
| Teaches | building `bydiorama/ui` itself | using the system anywhere else: in an app, in Paper, in demo media |
| In the manifest | **no** | **yes**, `type: "skill"` |
| Ships | no — loads only in this repo | in the `ui` plugin, as `ui:<directory>` |
| Front-matter name | the directory name | the directory name |
| Examples | `add-component`, `review-ui`, this one | `craft`, `design-component`, `video-render` |

The test for the product tier is "does it work outside this repo?" A skill
whose steps run `pnpm check:*` or edit `registry/` is authoring, however
useful it sounds; in an app it would send an agent to scripts that do not
exist.

Names carry no prefix: the plugin shows a shipped skill as `ui:craft`, so
`ui-craft` would read as `ui:ui-craft`. `check:skills` refuses a shipped
directory that starts with `ui-`, `diorama-` or `bydiorama-`.

Both tiers are loaded locally from `.claude/skills/`, so this repo dogfoods
the text it ships. Do not also install the `ui` plugin here: the same skills
would load twice, once as `craft` and once as `ui:craft`.

## The front-matter contract

```yaml
---
name: <kebab-case, matches the rule above>
description: <what it does AND when to use it — 150-500 chars>
---
```

**The description is the only thing an agent reads when deciding whether to
load the skill.** The body is read after that decision, never before. A
description that only says what the skill *is* will not fire when it is
needed, and the failure mode is silence — nothing errors, the skill simply
never loads. That is why the checker demands a trigger clause ("Use when …")
and a floor of 80 characters, and why the ceiling is 900: past that it has
stopped being a trigger and become the skill.

Write the trigger from the *user's* words, not the skill's internals: the
phrasings someone would actually type when they need it.

## Writing the body

- **Lead with the decision, not the background.** An agent reads to act.
- **Every rule earns its place by having cost something.** These skills exist
  to keep a defect from recurring; a rule nobody has ever broken is noise.
  Prefer a table of traps with the rule beside each one.
- **Prose is the floor, not the goal** (the ratchet rule in `add-component`).
  Before writing a rule here, ask whether it could be a type, a CI gate or a
  lint rule instead. If it could, do that and write one line here pointing at
  it.
- **Do not restate `CONVENTIONS.md`.** It is the binding rulebook; a skill
  that copies it will drift from it. Reference the rule and name the token.
- Keep it under ~200 lines. A skill that needs more is two skills, or is
  documentation wearing a skill's front matter.

## Steps

1. Decide the tier (the table above).
2. `registry/skills/<dir>/SKILL.md` with the front matter.
3. Product tier only: add a manifest item —
   ```json
   {
     "name": "<dir>",
     "type": "skill",
     "description": "Agent skill (the `ui` plugin): ...",
     "files": [{ "path": "registry/skills/<dir>/SKILL.md",
                 "target": "plugins/ui/skills/<dir>/SKILL.md" }],
     "status": "stable"
   }
   ```
   List only the SKILL.md; scripts and reference pages beside it travel with
   it. `pnpm registry:build` leaves skills out of the registry on purpose.
4. `pnpm skills:build` — regenerates `.claude/skills/`, `plugins/ui/skills/`
   and the plugin's README (its skill table comes from the front matter).
5. `pnpm check:skills` and `pnpm verify`.
6. A ledger entry, like any other change to what ships.

## Traps

| Trap | Rule |
| --- | --- |
| Editing `.claude/skills/<name>/SKILL.md` | Generated. Edit `registry/skills/<dir>/SKILL.md` and rebuild |
| Renaming a skill directory | Rebuild — the old generated copy is removed only by `skills:build`, and would otherwise keep loading into every agent. Update every reference to it across `registry/skills/` in the same change, and add the old manifest name to `renamed` so its ledger history stays valid |
| `type: "file"` for a skill | Use `type: "skill"`; it still emits `registry:file` for CLI compatibility, but the manifest is where meaning lives |
| A description that describes | It must *trigger*. "Use when …" is the load-bearing half |
| Copying a rule out of `CONVENTIONS.md` | Two copies drift; the skill loses and the reader believes it |
| Pointing a skill at files elsewhere in the repo | Folders get moved or ignored (`design/` left the repo and took the references with it). Keep reference scripts and pages BESIDE the `SKILL.md` (`scripts/`, `reference/`); `skills:build` copies them byte for byte, into the plugin too |
| A path that only works in this repo | A shipped skill runs from the plugin's cache. Write paths relative to the skill's own folder (`scripts/render.mjs`, `../demo-page/reference/…`), not `.claude/skills/…` or `registry/…` |
| A `bin/` folder or a `version` in the plugin | `bin/` makes claude.ai and Cowork refuse the plugin; a version stops installs following `main`. `check:skills` fails on both |
