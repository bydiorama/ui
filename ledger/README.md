# Change ledger

Two things live here.

## `decisions/`

Architecture decision records. Why the system is shaped the way it is. Read
before re-proposing a settled question — that is what they are for.

## `entries/`

One structured record per change to a distributed item. Because components are
distributed as **source**, nothing tells a consuming app that upstream moved:
there is no version bump, no install step, no dependency graph. The ledger is
what downstream apps (and their agents) compute their drift from.

Create entries with `pnpm ledger:new`; `pnpm check:ledger` validates them.

```jsonc
{
  "id": "2026-08-14-button-variant-rename",   // permanent, never reused
  "date": "2026-08-14",
  "item": "button",                            // manifest item, or "system"
  "kind": "breaking",                          // drives consumer CI severity
  "summary": "…",
  "affects": ["prop:variant", "token:--ui-bg-emphasis"],
  "migration": { "codemod": "codemods/…", "manual": "…" },
  "provenance": { "pr": 42, "design": "paper://…" },
  "supersedes": []
}
```

### Rules

- **The ledger records interpretation, not diffs.** Git already knows which
  bytes moved; the ledger says what a consumer must *do* about it.
- **`breaking` entries must carry a migration** — a codemod or written steps.
  Enforced by `check:ledger`.
- **History is immutable.** Corrections `supersede` an earlier entry; they never
  edit it.
- **`affects` should be precise** (`prop:`, `token:`, `slot:`). It is what lets
  an agent answer "does this change touch me?" without reading the diff.

### What this becomes

Phase 4 adds `ui.lock.json` in each consuming app (installed revision plus a
content hash per item, so *stale* is distinguishable from *deliberately
customised*) and a `sync` command that reports drift with the applicable ledger
entries. With a second consumer, that report becomes a CI gate and a
session-start context injection — and the aggregated "locally modified" flags
become this system's roadmap: a component many apps patch is a component we got
wrong.
