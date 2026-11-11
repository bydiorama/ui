# 0024 — The public site: Astro, a registry address of our own, a published CLI

**Status:** accepted · 2026-11-11 · nothing is built; `PLAN.md` § Docs site
sequences the work

## Context

The library's only public surface is a GitHub repository and raw JSON files.
`docs/site-design-brief.md` briefed a public site at `ui.bydiorama.com` after
a benchmark of fourteen library sites and a check of current tooling, and put
six decisions to the maintainer (§9). All six were accepted on 2026-11-11.
Three of them are commitments that outlive the site's first release, so they
are recorded here: a framework, a public address, and a public npm name.

## Decision

### 1. The site is Astro, with chrome built from this library

`apps/site` is an Astro 7 project with static output. Its layout is `.astro`;
every interactive region is a React island that imports registry source
through the same `@/ui/...` specifiers a consumer uses.

No documentation framework that owns the page chrome is used (Starlight,
Nextra, Vocs, Docusaurus, `fumadocs-ui`). ADR 0002 applies to the site as it
does to the registry: the header, sidebar, tabs, search and code blocks are
this library's components, or site patterns built on them.

Astro is infrastructure in ADR 0002's sense — rendering and build — and is
confined to `apps/site`. Nothing under `registry/` may import from it, the
same way nothing there imports `next/*`.

**Fallback, named in advance:** if docs chrome built as islands cannot meet
the JavaScript budget set in `PLAN.md` S2, the site moves to React Router v7
with static prerender. That is a change to this record, not a quiet swap.

### 2. The canonical registry address is `https://ui.bydiorama.com/r/`

- Items are served at `/r/<name>.json`, with `registry.json` **beside them**
  and carrying no file `content`.
- The consumer namespace is
  `"@bydiorama": "https://ui.bydiorama.com/r/{name}.json"`.
- Tagged snapshots are frozen at `/r/<tag>/` so a consumer can pin.
- `raw.githubusercontent.com/bydiorama/ui/main/r/` keeps answering as a
  mirror. Existing lockfiles that name it stay valid; the CLI's default
  moves.

A public address is a promise that it keeps resolving. The registry smoke
gate in `PLAN.md` S2 and the frozen snapshots are what back it.

### 3. The CLI is published as `@bydiorama/ui`

`packages/cli` drops `"private": true` and is published to npm **when the
site's first release ships**, not before. `PLAN.md` held the name back
because a public npm name is a real external commitment; the site is the
thing that makes the commitment worth it, since it may not print an install
command that needs a checkout of this repository.

## Also accepted, and why they are not separate records

- **Code typography.** ADR 0011 stands. A CodeBlock specimen in Paper tests
  it on a forty-line file before the site is designed around it. If it fails,
  0011 is amended there, for code blocks only, with an OFL face.
- **shadcn directory.** Apply after 30 days of the registry answering at its
  new address without a failed health check of our own. Reversible by
  withdrawing the listing.
- **What is public.** Every `stable` item; `experimental` items shown with a
  badge; consumer detail such as the service-portal call-site tables stays
  off the site. This is an editorial rule for `apps/site`, enforced by what
  the doc-data step exports.

## Consequences

- The site imports registry source in place and installs nothing, so it does
  not count as consumer #2 for the ledger's consumption gates.
- `ui.manifest.json`'s `homepage` becomes the site once it is live.
- Seven files outside `PLAN.md` and the brief name the GitHub raw path today;
  they move in S2, except where a lockfile schema must keep accepting it.
- A gate, not review, keeps a copy of a registry component out of
  `apps/site` (`check:site-source`, S2).
