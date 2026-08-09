# 0015 — The narrow rail is a sibling component, not a Sidebar mode

**Status:** accepted · 2026-08-09

## Context

Two answers to "what happens when there is not room for the navigation" had
been drawn and only one built. `Header.MenuButton` removes the Sidebar below
the breakpoint and reopens it inside a Sheet; a 48px icon-only rail was also on
the canvas, reserved by `--ui-nav-rail-width`, and implemented nowhere. Both
`headerDoc` and `sidebarDoc` carried a `needsDesign` entry asking which one a
layout should use — the signal `pnpm design:gaps` exists to surface, and the
one thing it cannot resolve by looking harder at the file.

The tempting answer was the industry default: one Sidebar with
`collapsible="icon"`, as shadcn/ui ships. That buys a free width animation and
one mental model, and it costs a provider, a persistence cookie,
`group-data-[collapsible=icon]:` conditionals threaded through every part, and
a menu button whose only job is to hold the tooltip replacing the label it
hid. AGENTS.md already names that trade: *do not widen a component's API to
avoid a composition problem.*

## Decision

The narrow rail is **NavRail**, a sibling of Sidebar. Neither is a mode of the
other, neither knows about the other, and which one renders is the caller's
decision — exactly as it already was between Sidebar and `Header.MenuButton`.

The test is CONVENTIONS §7a's, which already splits Sheet from Drawer: **when
the CONTRACT differs rather than the appearance, it is a different component.**
Six of Sidebar's ten parts change what they MEAN at 48px rather than what they
measure.

| Part | At 272px | At 48px |
|---|---|---|
| `Item` | row, optional icon, truncating label | icon **required**, label gone |
| `Section` | label + chevron + `<ul>` | no room for either — becomes a named group with a rule |
| `Search` | 40px field with a placeholder | a control, or a command palette |
| `Profile` | avatar + name + address + chevron | avatar only |
| `Heading` | "Select brand" | nowhere to go |
| `Slot` | holds a Progress bar | nowhere to go |

The one-line version: **at full width a row is a slot; at rail width a row is a
control.** `Sidebar.Item` takes an optional `href` and renders a `<div>`
without one, because the design fills two of its rows with a search field and a
progress bar. Nothing like that fits in a 32px square.

What the two share is the `--ui-nav-*` family and the row lane, so a layout can
swap one for the other without the navigation moving or changing colour. That
relationship is asserted in the browser suite rather than left to review.

`--ui-nav-rail-width` stays in the contract, and its value moves from 3.5rem to
**3rem**. The 3.5 was a guess written while nothing rendered it, and two
written records then disagreed with it and with each other (48px in TODO, 50px
in `sidebarDoc`). The artboard settles it: the drawn rail declares no width at
all — it is `fit-content` around `space-sm` padding on the shared 32px chrome
control, so 8 + 32 + 8 = 48.

## Consequences

- `needsDesign` loses the entry from both docs. A gap nobody intends to close
  is noise in the report that finds the ones that are live.
- A layout that wants the rail renders `NavRail`; one that wants the menu
  button renders neither and lets `Header.MenuButton` carry it. Rendering both
  is a layout bug, not a component one.
- **The trigger to revisit is an ANIMATED width transition.** Two sibling trees
  cross-fade; they do not tween. If a layout ever needs the rail to slide open
  rather than swap, that is the moment this decision is wrong — and it is
  written down here so the next person does not re-derive it from scratch.
- A token nothing consumes is a guess until the first component measures it.
  That is the general lesson, and it is why the width moved rather than the
  drawing.
