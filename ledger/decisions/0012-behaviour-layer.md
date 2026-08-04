# 0012 — Base UI is the behaviour layer; drag-and-drop and Calendar are ours

**Status:** accepted · 2026-08-04 · closes plan §7.6

## Context

Button, Input, Avatar, Badge and Checkbox are presentational: their behaviour
is native (`<button>`, `<input type="checkbox">`) or absent (`<span>`). The
remaining roadmap is not. Counting the Paper file's component artboards:

| Class | Components |
|---|---|
| Native or presentational | Button, Input, Avatar, Badge, Checkbox, Card, Header, Progress, Toggle |
| Layout | Sidebar, Layouts |
| **Behaviour-heavy** | **Modal, Tabs, Slider, Calendar, Multiselect, Card Sorting** |

Six components need focus management, dismissal, collision-aware positioning,
roving `tabindex` or `aria-activedescendant`, typeahead, date arithmetic, or
keyboard-operable drag-and-drop. Writing those from zero is months of
specialist work whose defects are invisible to every gate this repo has —
green CI, blocked user. That is the exact failure the review method exists to
prevent, so building the whole layer in-house was rejected.

Building none of it was not available either. **Card Sorting is a
drag-and-drop reorderable list** (its rows carry drag handles), and
**Calendar** needs internationalized date arithmetic. Neither Base UI nor
Radix provides either.

ADR 0002 already permits this category: behaviour mechanics are infrastructure,
not design, provided they are unstyled and wrapped behind our own API.

## Decision

1. **Base UI is the behaviour layer** for the popover-class components —
   Modal/Dialog, Popover, Select, Menu, Tooltip, Tabs, Slider, and the
   Multiselect combobox. It is built by the engineers who built Radix, under
   full-time MUI maintenance where Radix's has slowed, and shadcn/ui made it
   its default in July 2026 — which matters in a system built largely by
   agents, because it shapes what they will generate correctly.

   **Verified state at adoption (npm, 2026-08-04), because the first draft of
   this ADR cited figures that were wrong:** `@base-ui-components/react` is at
   **`1.0.0-rc.0`** — fourteen versions, alpha → beta → rc, and **no stable
   release yet** — with **~417k weekly downloads**. For scale: `radix-ui`
   11.8M, `@radix-ui/react-dialog` 69M, `react-aria` 7.9M. Base UI is
   therefore a *bet on direction*, not a majority choice, and this ADR is
   adopted knowing that. Do not repeat the earlier claim that it shipped a
   stable 1.0 or leads on adoption; it has not and does not.

2. **Drag-and-drop and Calendar are ours.** Base UI covers neither. They are
   built here, on mechanism-level primitives only:
   - positioning that Base UI does not already own → its bundled anchoring;
   - date arithmetic → a dependency-free internal module, or an
     internationalized date library adopted under this ADR's wrapper rule;
   - drag-and-drop → built here, and **the keyboard path is not optional**.
     A pointer-only reorder fails SC 2.1.1 no matter how good it feels.

3. **The wrapper rule, enforced not asserted.** No Base UI type may appear in
   an exported prop signature, and no registry file outside the component that
   needs it may import from the behaviour layer. `pnpm check:boundaries`
   enforces both. That is what keeps the choice reversible: swapping the layer
   later rewrites the internals of six components while their public APIs
   hold.

4. **Scope it forward, not backward.** Nothing already shipped is retrofitted.
   Button, Input and Checkbox stay native — a native `<input type="checkbox">`
   gives Space activation, form participation and the `indeterminate` →
   `aria-checked="mixed"` mapping for free, and a behaviour library can only
   re-implement what the platform already does correctly.

5. **One version across the manifest.** Every item that depends on the
   behaviour layer declares the same range. Two majors resolving in one
   consumer app means duplicated state and broken portals — a failure that
   appears only after install, in someone else's repo.

## Consequences

- Consumers gain a real runtime dependency. The registry already ships
  dependencies (`cn` carries `clsx` and `tailwind-merge`), so this is a
  larger instance of an existing category, not a new one.
- Independence as ADR 0002 defines it is untouched: no borrowed design, no
  borrowed component code, no borrowed API. Tokens, visual design, prop
  contracts, docs and tests stay entirely ours.
- The two hardest patterns we own — accessible DnD and Calendar — are the ones
  where a bought answer did not exist. We carry that maintenance knowingly.
- CONVENTIONS §3's "the parent never wraps what it is handed" and §5's
  forwarding contract now have a second front: a behaviour library that
  renders its own DOM can violate both. Where Base UI's rendered element
  fights the contract, use its `render` escape hatch rather than accepting the
  wrapper.

## Rejected

- **React Aria hooks.** Covers all six classes including DnD and dates, and
  returns props rather than DOM, which fits CONVENTIONS §3/§5 best of all.
  Rejected on ecosystem gravity: agents generate correct Base UI far more
  reliably, and two of the six needed in-house work regardless.
- **Radix.** Same shape as Base UI, slower maintenance, same lineage.
- **Everything in-house.** Meta's Astryx is that strategy executed well —
  its published package carries no third-party behaviour dependency at all —
  and it took an eight-year internal system and a platform org to get there.
