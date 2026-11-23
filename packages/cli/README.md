# `@bydiorama/ui` CLI

The owned install-and-sync channel for this registry. `add` installs items
(and their registry dependencies) directly — no third-party CLI in the path —
and locks them as it goes. Then, because an app that has copied a registry
item's source is never told the upstream changed, the lockfile
(`ui.lock.json`) and `sync` close that gap by computing the drift
([`PLAN.md`](../../PLAN.md), "Change ledger", part 3), rather than a
broadcast a consumer has to remember to read.

`theme` turns a brand seed into the installable theme stylesheet, so a
branded app needs no emitter script of its own.

**Not on npm yet** (issue #30): the package is prepared to publish as
`@bydiorama/ui` (zero runtime dependencies, Node ≥ 22), but `npx @bydiorama/ui`
returns E404 until it is. Run it from a checkout (below). Once published, from
inside a consumer app it will be:

```sh
npx @bydiorama/ui <command> [...flags]
```

`--cwd` defaults to the directory you run it in. The published `bin` is
compiled JS (`dist/`, built by `prepublishOnly` from `tsconfig.build.json`)
because Node's type stripping deliberately refuses to run `.ts` files inside
`node_modules` — a checkout still runs the TypeScript directly:

```sh
node --experimental-strip-types bin/ui.ts <command> --cwd <path-to-consumer-app> [...flags]
```

That checkout form (with `--registry-path <checkout>`) is also how you test
against a branch that hasn't merged to `main` yet.

## Commands

### `add <item...> [--force]`

Installs items from the registry into the consumer app: resolves each name
plus its transitive `registryDependencies` (dependencies first, each item
once), writes the files to their [target paths](#target-paths), locks what
the run newly installed, and
prints the npm dependencies the consumer still has to install — reported,
never run, because this CLI shells out to nothing.

What it will not do is the reason it exists alongside the shadcn CLI (which
the registry still serves as an alternative — same items, same URLs):

- **A local edit is kept, not overwritten.** An existing file whose content
  differs from the registry's is reported as `kept`; overwriting it takes an
  explicit `--force`.
- **A locked fork is never overwritten — `--force` included.** The `forked`
  record in `ui.lock.json` exists precisely so anything that overwrites
  files has one boolean to refuse on. Resolve the fork (re-`lock` without
  the divergence) first; a flag must not be able to destroy work you
  explicitly declared. A generic registry client reads no lockfile and
  re-installs over forks with every check green — that incident is why
  `lock` records them.
- **An already-locked item's entry is left untouched.** Re-locking would
  advance `lockedAt`, and that timestamp is `sync`'s cutoff for "which
  ledger entries haven't you seen" — `add` tells you to run `sync` instead
  of silently resetting history.

The lock is taken at the registry revision being installed: pass
`--revision <sha>`, or omit it for a remote install and `add` resolves
main's current sha from the GitHub API (with `--registry-path` the flag is
required — the checkout has git right there).

```sh
node --experimental-strip-types bin/ui.ts add button select \
  --cwd ../service-portal
```

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

### `theme --seed <file> --out <css>`

Resolves a brand `ThemeSeed` and writes the stylesheet an app imports once,
after `@import "tailwindcss";`: the Tailwind v4 `@theme inline` map plus the
`:root` token layer. It is **byte-for-byte the composition
`registry/themes/theme-zero/theme-zero.css` is** — both call
`toThemeStylesheet` from `@bydiorama/tokens`, so a brand file cannot become a
second dialect of theme zero's — with a GENERATED header that names the seed
and the exact command that regenerates it. This replaces the per-app script
that imported `../ui/packages/tokens/src/index.ts` and assembled
`resolveThemePair` + `toTailwindTheme` + `toCss` by hand.

```sh
node --experimental-strip-types bin/ui.ts theme \
  --cwd ../my-app --seed theme/brand.seed.ts --out src/styles/brand-theme.css

# CI: exit 1 if the committed file no longer matches the seed
node --experimental-strip-types bin/ui.ts theme \
  --cwd ../my-app --seed theme/brand.seed.ts --out src/styles/brand-theme.css --check
```

| Flag | |
| --- | --- |
| `--seed <file>` | A `.ts`/`.mts`/`.js`/`.mjs` module exporting a `ThemeSeed` — as `default`, as `seed`, or as its only seed-shaped export — or a `.json` seed. Relative to `--cwd`. A `.ts` seed may `import type { ThemeSeed } from "@bydiorama/tokens"`: type imports are erased, so the specifier never has to resolve. |
| `--out <css>` | The stylesheet. Relative to `--cwd`; directories are created. |
| `--scheme auto\|light\|dark` | `auto` (default) follows `prefers-color-scheme`; `light`/`dark` force `color-scheme` for a brand that ships one scheme. |
| `--check` | Write nothing; exit 1 if the file differs from what the seed resolves to now — the brand-theme twin of `pnpm check:theme-css`. A changed seed and a changed resolver both make it stale. |
| `--export <name>` | Which export to read when the module has several seeds (ambiguity is an error, never a guess). |
| `--registry-path <checkout>` | The bydiorama/ui checkout to read `@bydiorama/tokens` from. |

The header carries no date or revision on purpose: `--check` compares bytes,
and a header that changes every run is a file that is always stale.

**Seed issues** from `validateSeed` are printed. An `error` (an unsafe value,
a missing colour, a knob that is not a number — anything the resolver had to
fall back on) writes nothing and exits 1: a fallback shipped with a green
build is the silent failure seed intake exists to prevent. An `info` (a
valid value that resolves to something easy to misread — a `baseSize` under
15, which is the scale's 16px reference and not the body size) is printed
and the file is still written. Tokens the contrast audit moved off the
seed's colours are listed too.

**Where `@bydiorama/tokens` comes from.** This package has zero runtime
dependencies, and the tokens are deliberately *not* one of them. They are
unpublished (issue #30), so declaring them would make installing this CLI
fail with E404 for every command; and they ship TypeScript source, which
Node refuses to strip inside `node_modules` (the reason this package ships
`dist/`), so even published as they are they could not be imported from
here. So `theme` reads them from a checkout: `--registry-path <checkout>`,
or, when the CLI is itself running from a checkout, the `packages/tokens`
beside it. Run from `node_modules` with neither, it fails with an error that
names both ways out. Once the tokens publish as JS, this becomes an ordinary
dependency and the flag becomes optional.

## Target paths

Every command maps a registry file's `target` to a path in the consumer app
the same way (`src/target-path.ts`). A target has one of two shapes, read off
the string itself — never off the item's `type`, so the next non-component
item type needs no special case:

| Shape | Looks like | Resolves to |
| --- | --- | --- |
| **Alias** | `ui/header.tsx`, `lib/cn.ts` | The first segment is a key in `components.json` `aliases`, mapped through `tsconfig.json`'s `@/*` — `ui/header.tsx` → `src/components/ui/header.tsx`. |
| **Literal** | `.claude/skills/diorama-ui-craft/SKILL.md`, `~/public/fonts/aspekta/aspekta.css` | A path from the consumer root, as-is. Literal means the first segment starts with `.`, or the target starts with `~/` (shadcn's own project-root marker, for a root path with no leading dot). |

The split is by shape, not by "was it found in `aliases`". An alias-shaped
target whose alias is missing still fails with `No alias "…" in
components.json` — falling back to a literal path on a miss would turn a
typo'd `iu/button.tsx` into a file silently written at the app root. A root
path without a dot, like `public/...`, is therefore alias-shaped and must be
written `~/public/...`.

A target containing a `..` segment, or an absolute path, is refused in either
shape: a target is registry data and must not reach outside the app. `add`
resolves every target in the install set before writing anything, so a bad
target aborts the install instead of leaving half of it on disk.

## Registry and ledger sources

`add`, `lock` and `sync` read from either:

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
