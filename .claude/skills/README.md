# Generated — do not edit

Every file here is copied from `registry/skills/<dir>/` (SKILL.md and any
reference files beside it) by
`pnpm skills:build`. Edit the source, not this copy; `pnpm check:skills`
fails if the two drift.

Skills live in one tree so there is one source of truth. The manifest — not
the folder — decides which of them ship: those are also generated into the
`ui` agent plugin, `plugins/ui/`. See
`ledger/decisions/0013-skills.md` and `ledger/decisions/0027-agent-plugin.md`.
