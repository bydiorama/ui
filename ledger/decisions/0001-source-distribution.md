# 0001 — Source distribution, not a versioned package

**Status:** accepted · **Date:** 2026-08-02

## Context

Consuming apps need Diorama's components. Two models: publish a versioned npm
package, or distribute source that apps copy in and own.

## Decision

Distribute **source** through a namespaced registry (`@bydiorama/*`). Apps own
the code they install and may modify it.

`ui.manifest.json` is our source of truth. `registry.json` and `r/*.json` are
**generated** from it in a format existing CLIs and agents already understand.
That compatibility is a transport we ship for consumers, not a foundation we
build on — if the format churns or its tooling stalls, we regenerate to another
target and consumers move to `@bydiorama/ui`'s own CLI. The components do not
move.

Tokens are the exception: `@bydiorama/tokens` is a real package, because tokens
must be identical everywhere and change centrally. A copied token file drifts
per app, which is the disease this system exists to cure.

## Consequences

- Apps can patch a component locally without waiting for us — and agents can
  read and modify the real source in the repo they are working in.
- Nothing tells a consumer when upstream changed. That gap is closed by the
  change ledger (`ledger/entries/`) plus a per-consumer lockfile — see 0006 when
  the sync tooling lands in Phase 4.
- Local modification is a **signal**, not misbehaviour: components many apps
  patch are components this system got wrong.
