---
title: "Announcing the Diorama Design System"
description: >-
  Diorama's design system is now public and MIT-licensed: 20 React components,
  a token contract that makes every brand theme complete by construction, and a
  set of CI gates that measure the claims instead of trusting them.
date: 2026-08-06
category: Press release
tags: [design-system, open-source, accessibility, react]
canonical: https://github.com/bydiorama/ui
---

# Diorama opens its design system, built on the principle that a design system should prove its own claims

**BRATISLAVA — 6 August 2026** — Diorama today published **`@bydiorama/ui`**,
the design system behind its products, as an open, MIT-licensed repository at
[github.com/bydiorama/ui](https://github.com/bydiorama/ui). It ships 20 React
components, a design-token package with a brand-theme resolver, and — unusually
for a component library — a set of automated gates that verify the system's own
accessibility and consistency claims on every change.

The system was built from scratch. No third-party component library, design
language, block set or theme preset was copied into it.

## Components you own, not a dependency you track

Components are distributed as **source**, not as a versioned package. A
consuming app installs an item and owns the code from that point on — free to
modify it without forking, waiting on an upstream release, or fighting a
wrapper API.

That trade has a known cost: once a copy is out in the world, upstream changes
no longer reach it automatically. Diorama's answer is a **change ledger** — 64
entries and counting — that records what moved and what a downstream copy has
to do about it. Consumers and their coding agents learn from the ledger, not
from git archaeology.

Design tokens are the deliberate exception. `@bydiorama/tokens` is a real
package, because tokens must be identical everywhere and change centrally.

## Brand themes that are complete by construction

Diorama products let a client author a **Brand Theme** — a small set of colours
that re-skins shared documents, brand guidelines and generated deliverables.

The previous generation of that mechanism re-bound seven semantic tokens. Any
component reading one of the other ninety-odd kept Diorama's own colours inside
a client's branded surface, and the workaround — components re-implementing
their styling from a parallel namespace — turned one design system into two.

The replacement is a type-level fix rather than a discipline-level one.
`resolveTheme(seed)` is a total function over the brandable token contract: its
return type covers every brandable token, so adding a token without a
derivation rule fails to compile. "Complete" stopped being something anyone has
to remember. Diorama's own look is theme zero — the same seed shape, no special
case — which is also why dark mode falls out for free rather than being
maintained by hand.

## Gates that measure, instead of prose that hopes

The system's distinguishing bet is that a design system's guarantees should be
checkable, and that documentation is the fallback rather than the default.

The clearest example is colour contrast. Contrast figures used to be written
into component docs by hand, and three fabricated numbers shipped: a progress
bar documented at 3.2:1 was measured at 1.24:1, and two other components reused
a remembered figure for the wrong pair. A written instruction to "measure, then
write" was added — and broken within the hour, because a plausible number is
indistinguishable from a measured one once it is on the page.

So the numbers stopped being written. Every component now *declares* its
contrast pairs as token names, and a gate resolves each pair in both light and
dark schemes, enforces the declared floor, and writes a committed report. A
wrong pair became a wrong token name, which a machine can catch. The gate found
14 unchecked pairs that shipped components actually render the moment it was
turned on. **65 pairs across all 20 components are now measured; every text
pair clears 4.5:1.**

The same principle runs through the rest of the pipeline. `pnpm verify` checks
the manifest, registry freshness, the ledger, asset licensing, utility usage,
layer boundaries, control semantics, skills and contrast — and needs no
`node_modules`, so a cold clone can confirm the repo is internally consistent
before installing anything. A separate visual-regression layer diffs every
component against committed baselines in both schemes, catching what
computed-style assertions cannot: a badge whose two sizes render identically, a
label hugging the top of its row, a panel with no visible boundary. All three
of those shipped before it existed.

## What is in the box

**Twenty components:** Avatar, Badge, Banner, Button, Calendar, Card, Card
Sorting, Checkbox, Drawer, Header, Input, Modal, Multiselect, Popover,
Progress, Sheet, Sidebar, Slider, Switch and Tabs — each with a typed doc,
stories, and a brand-theme stress case, because a component that only looks
right in Diorama's own colours is not finished.

**A licensing floor that is enforced, not promised.** Aspekta (SIL Open Font
License) is the single bundled typeface and `griddy-icons` the only
iconography, so everything in the repository is genuinely MIT-distributable. A
gate fails the build on any non-distributable font or paid-tier asset.

**Behaviour borrowed, design never.** Focus management, dismissal,
collision-aware positioning and roving `tabindex` come from Base UI as an
unstyled behaviour layer wrapped behind Diorama's own API — infrastructure, not
design. Drag-and-drop card sorting and the Calendar's date arithmetic are
Diorama's own, because no unstyled library provided them.

**Skills for coding agents.** The system ships agent skills alongside the
components, generated from a single source tree and gated like any other
distributed item, so an agent working in a consuming app has the craft rules
rather than guessing at them.

**Thirteen architecture decision records** covering source distribution,
independence, typography licensing, iconography, motion, the theme resolver,
the palette, the type scale, the border stack and the behaviour layer — so a
settled question can be read rather than re-argued.

## Availability

`@bydiorama/ui` is available now at
[github.com/bydiorama/ui](https://github.com/bydiorama/ui) under the MIT
licence. Adapted third-party material and inspirations are itemised in
`CREDITS.md`.

<!--
  Optional pull quote. Left unwritten deliberately — attribute a real
  statement to a real person before publishing, or drop this block.
-->

### About Diorama

<!-- Standard boilerplate paragraph goes here. -->
