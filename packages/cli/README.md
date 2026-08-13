# `@bydiorama/ui` CLI

The consumer-side half of the change ledger ([`PLAN.md`](../../PLAN.md),
"Change ledger", part 3): once an
app has copied a registry item's source, nothing tells it the upstream
changed. This CLI closes that gap with a lockfile (`ui.lock.json`) and a
`sync` command that computes the drift, rather than a broadcast a consumer
has to remember to read.

**Not yet published to npm** — `package.json` is `"private": true` on
purpose. Run it locally from a `bydiorama/ui` checkout against a consumer
app's directory:

```sh
node --experimental-strip-types bin/ui.ts <command> --cwd <path-to-consumer-app> [...flags]
```

Publishing is a separate, deliberate decision (a public npm package name is
a real external commitment) — this package is ready for that step whenever
someone makes it; nothing here requires npm to be useful today.

## Commands

### `lock <item...> --revision <sha>`

Records the currently-installed files' content hashes into the consumer's
`ui.lock.json`, one entry per item. Use this once per item, right after
installing it (or to re-baseline after resolving drift `sync` reported).

Reads what's **actually on disk**, not what the registry says — so locking
an item whose installed content already differs from the registry's current
version is flagged (`⚠ diverges from registry: ...`) rather than silently
baselined as if it matched.

That divergence is also **written down**, as `forked` on the item: the
target, mapped to the hash the registry shipped for it at that moment. Both
halves matter. Without the record, `files` holds the fork's own hash, so from
the next command on a fork is indistinguishable from a clean install and
`sync` calls it `stale` — the same word a clean install gets when upstream
moves. Without the *upstream* hash there is no baseline for "has the thing I
forked changed underneath me?", which is the question that decides whether a
fork still needs carrying.

A warning printed to a terminal is not a record. A consumer carrying a local
Badge fork had it overwritten across two checkpoint syncs with every check
green, because the lockfile agreed with the fork either way.

```sh
node --experimental-strip-types bin/ui.ts lock header sidebar \
  --cwd ../service-portal \
  --revision $(git rev-parse HEAD)
```

### `sync [--json]`

Diffs every item already in `ui.lock.json` against the registry's current
content and reports, per item:

- **current** — installed matches the current registry; nothing to do.
- **stale** — installed is untouched since lock, but the registry moved. A
  clean pull-in.
- **modified** — installed no longer matches what was locked, and the
  registry hasn't changed underneath it. A local edit, plain and simple.
- **modified-and-stale** — installed differs from *both* the lock and the
  current registry. Two independent changes to reconcile, not one.
- **forked** — the lockfile declares this a deliberate fork and it still
  differs from what the registry ships. Reported as its own word, with the
  affected files named, because re-installing the item destroys work: `⚠`
  says "pull this in", `✎ forked` says "you will lose something". A fork the
  registry has since *adopted* reads as **current** — the flag is a claim
  about divergence, not a permanent label.
- **forked-and-stale** — the fork stands *and* the file it was forked from
  has changed underneath it. The one that needs re-deriving, and the reason
  `forked` stores the upstream hash rather than just the target name.
- **missing-upstream** — the item no longer exists in the registry at all.

The three-way comparison (installed / locked / registry) is the whole
point: a two-way "does installed match locked" check alone can't tell a
deliberate customization from simple staleness, which the plan calls out
explicitly — "without it every drift report is noise, and noisy reports get
muted." A file that was hand-edited but happens to land exactly on the new
upstream value reads as **current**, not modified: there is nothing left to
reconcile, however it got there.

Also reports every ledger entry (`ledger/entries/*.json`) matching the item
(`entry.item === name`, or `entry.affects` containing `component:<name>`)
dated after the item was locked — so `sync` on a `current` item can still
surface "here's what changed, you just haven't touched the file" via a
ledger entry with no code-level drift yet.

```sh
node --experimental-strip-types bin/ui.ts sync --cwd ../service-portal --json
```

## Registry and ledger sources

Both commands read from either:

- `--registry-path <dir>` — a local `bydiorama/ui` checkout (has `r/` and
  `ledger/entries/` at its root). Use this for developing against a branch
  that hasn't merged to `main` yet — the only way to test real in-flight
  changes before this package is published.
- The published registry — `components.json`'s own `registries` entry
  (`https://raw.githubusercontent.com/bydiorama/ui/main/r/{name}.json`) by
  default, or `--registry-url <template>` to override it. Ledger entries in
  this mode come from GitHub's contents API (`api.github.com/repos/.../ledger/entries`),
  since `raw.githubusercontent.com` can't list a directory.

## What this is not (yet)

Per the plan's own sequencing note: the CI gate that fails a consumer's
build on an unapplied `breaking`/`a11y` ledger entry, and the SessionStart
hook that injects `sync --json`'s delta into an agent's context
automatically, both land "with consumer #2" — this repo only has one real
consumer (`service-portal`) today, and building coordination machinery for
a single consumer is the over-engineering the plan explicitly warns against.
This package is the mechanism those two pieces will call into once there's
a second consumer to justify them.
