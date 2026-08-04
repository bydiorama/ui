# 0013 — One skill tree, two audiences; `.claude/skills/` is generated

**Status:** accepted · 2026-08-04

## Context

Skills had accumulated in two places with no shared standard and no gate on
either: `.claude/skills/` held `add-component` and `review-ui`, while
`registry/skills/` held `ui-craft`. Nothing validated their front matter,
nothing connected them, and nothing said which belonged where.

They are not duplicates. They serve different audiences — building *this
library* versus using it in *a consumer's app* — and the split is real. But a
split audience does not require a split source tree, and having one made the
standard impossible to state, let alone enforce.

Merging them into a single *folder* is not available either: `.claude/skills/`
is where the agent tooling discovers skills, and `registry/` is what the
distribution gates walk. Each location is load-bearing for a different reason.

## Decision

1. **`registry/skills/` is the single source of truth for every skill**, both
   tiers. This follows the rule the repo already holds: *the manifest, not the
   folder, is the distribution boundary* — stories and tests already live
   under `registry/` and never ship.

2. **`.claude/skills/` is generated** by `pnpm skills:build`, committed, and
   staleness-gated — the same contract as `registry.json` and `r/*.json`
   (ADR 0001). Files are written byte-identical to source, so the copy this
   repo loads is the copy a consumer installs. The "do not edit" warning lives
   in a generated `README.md` rather than inside the files, precisely so they
   stay identical.

3. **Two tiers, distinguished by the manifest, not by location:**

   | | Authoring | Product |
   |---|---|---|
   | Teaches | building `bydiorama/ui` | using `@bydiorama/ui` |
   | Manifest | absent | `type: "skill"` |
   | Front-matter name | the directory name | `diorama-<directory>` |

   The namespace on product skills is not decoration: they install into a
   consumer's `.claude/skills/`, shared ground with every other vendor.

4. **`skill` is a first-class manifest type**, emitting `registry:file` in the
   generated output. Our vocabulary describes what an item *is*; the transport
   only needs to know it is a file copied to a target. Typing it properly is
   what lets `check:skills` find every skill by type rather than by guessing
   at paths.

5. **The contract is enforced, not documented.** `pnpm check:skills` validates
   front matter, the naming rule per tier, install targets, and generated
   freshness. The description rules are the substantive ones: a floor of 80
   characters, a ceiling of 900, and a required trigger clause.

6. **This repo dogfoods its product skills.** `diorama-ui-craft` is generated
   into `.claude/skills/` alongside the authoring skills, at the exact path a
   consumer installs it to.

## Why the description rules are gated

A skill is loaded on its **description alone** — the body is read only after
that decision. A description that says what a skill *is* rather than when to
*use* it will simply never fire, and the failure mode is silence: nothing
errors, no test goes red, the skill is just never consulted. Silence is the
one failure this repo's gates exist to convert into noise.

## Consequences

- Editing a file in `.claude/skills/` is discarded on the next build; the gate
  catches it and names the source path.
- A renamed or deleted skill stops loading, because `skills:build` clears the
  generated directory first rather than merging into it.
- Skills join the ratchet: a rule that could be a type, a gate or a lint rule
  belongs there instead, and the skill carries one line pointing at it.
- `create-skill` documents the standard as a skill, so the process is
  discoverable from inside the tool that runs it.
