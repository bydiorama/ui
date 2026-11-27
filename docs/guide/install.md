# Installing components

[← Back to the README](../../README.md)

The primary channel is this registry's own CLI, published to npm as
[`@bydiorama/ui`](https://www.npmjs.com/package/@bydiorama/ui) (Node ≥ 22,
no dependencies). Run it inside your app. `add` resolves an item and its registry dependencies,
writes their source through your own `components.json` aliases and
`tsconfig.json` `@/*` mapping, locks what it installed into `ui.lock.json`
(so drift tracking starts at install, not as an afterthought), and prints the
npm dependencies left for you to install:

Your `components.json` names the registry once, next to its `aliases`:

```json
"registries": {
  "@bydiorama": "https://raw.githubusercontent.com/bydiorama/ui/main/r/{name}.json"
}
```

```bash
npx @bydiorama/ui add button
```

`add` locks at `main`'s current commit, which it asks GitHub's API for (and
`sync` lists the ledger through the same API). That API allows 60 anonymous
calls an hour per IP address, so on a shared machine — a CI runner, a cloud
session — it can answer 403. Two ways out: set `GITHUB_TOKEN` (or
`GH_TOKEN`) to any GitHub token, and the CLI authenticates and gets 5,000
calls an hour; or pass the commit yourself with `--revision <sha>`, and `add`
makes no API call at all:

```bash
GITHUB_TOKEN="$(gh auth token)" npx @bydiorama/ui add button
npx @bydiorama/ui add button --revision "$(git ls-remote https://github.com/bydiorama/ui main | cut -f1)"
```

To install from a checkout instead — an unmerged branch, say — run
`node --experimental-strip-types packages/cli/bin/ui.ts add button --cwd ../my-app --registry-path . --revision "$(git rev-parse HEAD)"`
from the checkout.

It never overwrites a local edit without `--force`, and never overwrites a
declared fork at all — the two things a generic registry client cannot
promise, because it reads no lockfile. `--help` on any command explains its
flags; `lock --all` records every item already installed some other way.

**Alternative — a shadcn-compatible client, with one caveat.** Every item is
also served as a plain JSON file with its source embedded (`r/<item>.json`,
the open shadcn registry schema), so the shadcn CLI installs it:

```bash
npx shadcn@latest add https://raw.githubusercontent.com/bydiorama/ui/main/r/button.json
```

It is **not byte-exact**: shadcn drops a file's leading comment block (seen on
`*.doc.ts` and `lib/motion.ts`), so `lock`/`sync` will report those files as
diverging from the registry. If you want drift tracking, install with the CLI
above, or reinstall with `add <item> --force` before locking.

Either way the item's source, its registry dependencies (`cn`, motion
utilities, …), and its token requirements land in your app. From here the
code is yours.

## Stay in sync

`add` already locked what it installed (items installed another way get
`lock`), so `sync` can report drift per item — `stale`, `modified`, `forked`,
and their combinations — instead of overwriting your edits:

```bash
npx @bydiorama/ui sync
```

See the [CLI README](../../packages/cli/README.md) for the full drift model.
