# Multiselect — specced, waiting on Popover

**Status:** design extracted and corrected in Paper; implementation not started.
**Blocker (resolved 2026-08-04):** §7.6 is closed. `ledger/decisions/0012`
adopts **Base UI** as the behaviour layer, wrapped behind our own API, with the
wrapper rule enforced by `pnpm check:boundaries`. Drag-and-drop (Card Sorting)
and Calendar are built here, because Base UI covers neither.

**Remaining dependency:** Popover, which Multiselect composes. The dependency
in the list below is now ordering, not a decision.

## Why this one is different

Button, Input, Avatar and Badge are presentational: their behaviour is either
native (`<button>`, `<input>`) or absent (`<span>`). Multiselect is the first
component whose *behaviour* is the hard part:

| Requirement | Why it is not a weekend's work |
|---|---|
| Collision-aware popover positioning | Flipping, shifting, and staying anchored through scroll containers — the job `floating-ui` exists to do |
| Focus management | Move into the panel, restore to the trigger on close, escape-to-close, and never strand focus on a removed node |
| Listbox/combobox ARIA | `aria-expanded`, `aria-controls`, `aria-multiselectable`, plus either `aria-activedescendant` or roving `tabindex` — the two are not interchangeable |
| Keyboard navigation | Arrows, Home/End, typeahead, Enter/Space semantics that differ between the trigger, the search field and the list |
| Dismissal | Outside click, focus-out, and Escape, without swallowing events the page needs |

Per the plan: *"Writing these from zero is weeks of work whose bugs are
invisible until a screen-reader user hits them."* Hand-rolling it now would
produce a component that looks right in Storybook, passes every gate this repo
has, and fails a real user — the exact outcome the review method exists to
prevent. **Blocked is the honest state.**

## What was done anyway

The design was fully extracted and its defects fixed in Paper (ledger
`2026-08-04-avatar-badge-multiselect-design-fixes`), so implementation can
start the moment §7.6 closes:

- **Trigger** — 48px, `--ui-radius-md`, `--ui-space-lg` inline padding,
  `--ui-border-subtle` at 1.5px on `--ui-bg-base`. Geometrically identical to
  `Input` size `lg`; it should reuse that control surface rather than
  re-derive it.
- **Label** — `--ui-text-label-md` / `--ui-text-secondary`, same as `Input`.
- **Chips** — `Badge` with `variant="unselected"` and a real remove button in
  `iconEnd`. **This primitive now exists**; the sheet's chip is
  `--ui-bg-elevated` rather than `--ui-bg-base`, which is the only delta.
- **Panel** — `--ui-radius-lg`, `--ui-bg-surface`, `--ui-shadow-sm` (the
  approved micro-elevation).
- **Search field** — 32px, `--ui-radius-sm`. Note the sheet draws it with an
  `outline`; `Input` uses a border. Reuse `Input size="sm"` and drop the
  outline, or the two search fields in the product will differ by a pixel.
- **Rows** — `--ui-space-md` padding, `--ui-space-sm` gap, 43px tall, with a
  checkbox and a selected row background.

## What it needs first, in order

1. ~~**Close §7.6.**~~ **Done** — ADR 0012 adopts Base UI, and
   `check:boundaries` enforces the wrapper rule (probed on both of its rules
   before it was trusted).
2. ~~**Checkbox**~~ — **Done.** The row primitive, built native: no behaviour
   layer needed, and its mixed state comes from the `indeterminate` DOM
   property rather than an ARIA attribute.
3. **Popover** — next, since Modal, Select, Menu, Tooltip and Combobox all
   consume it. First component to import Base UI, so budget for the tooling to
   break: it is also the first to add a runtime dependency to the manifest's
   behaviour tier, and the first whose rendered DOM is not entirely ours.
4. **Multiselect** — composes trigger (Input), chips (Badge), rows (Checkbox)
   and the popover. All three primitives now exist.

Only Popover stands between the current state and this component.
