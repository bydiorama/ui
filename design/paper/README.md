# Design artifacts — Paper handover

Exported snapshots of the approved design, so this repo stays self-sufficient
if Paper is unavailable (plan §2.3). **The design source of truth for values is
`packages/tokens` — these artifacts are evidence of what was approved, not an
editable source.** Token flow is repo → Paper, never the reverse.

| What | Where |
|---|---|
| Design file | [Diorama UI — Handover](https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0) (artboards: `Style Guide`, `Modal Example`, 6 layout examples) |
| Approved | 2026-08-03 (colour, type, spacing, radius, borders, intents, light/dark portal stress tests, first components, modal + micro-elevation + warm scrim, brand-panel layouts) |
| Adopted into code | ledger `2026-08-03-adopt-approved-handover-tokens`, ADRs 0008–0010 |
| Token snapshot at adoption | `tokens.snapshot.json` (Paper's token list the day the values were ported) |
| Section exports | `exports/` (PNG, 1x) |

## Known deltas between the sheet and the code (accepted)

- `caption` renders 11px in the specimen; the contract says 12px (floor).
- Modal panel ("Section options") uses a 12px radius — off the approved
  4/8/16/24/32 scale; queued for designer fine-tune.
- The Drafts-page Share-Link modal still wears pre-redesign fonts/colours; its
  *shadow geometry* is what was adopted (`--ui-shadow-xl`).
- Dark-scheme borders in the portal are raw rgba literals — expected; a flat
  Paper file cannot hold `light-dark()` pairs. The resolver owns dark values.

## Still undesigned (blocks Phase 2 states work, not tokens)

Focus/hover/active/disabled/busy/error states; open floating elements
(Select-open, Menu, Tooltip, Popover, Toast); Textarea, Radio, Tabs, Tag,
Divider, Skeleton, Avatar, Progress, Table, Calendar, Drawer, EmptyState,
Banner; motion sign-off; dark-scheme modal/scrim; elevation steps above the
micro shadow (lg/xl are engineering defaults).

Closed since: behaviour layer and state designs are in progress; the mono-face
question is settled — there is no mono face (ADR 0011).

## Fields use `--ui-bg-field`, not `--ui-bg-base`

The surface scale **inverts between schemes**: in light `bg-base` is the
lightest value, in dark it is the *lightest surface* while `surface` and
`sunken` sit below it. A field must be recessed from whatever contains it —
lighter in light, darker in dark — which no single existing role expresses.
`--ui-bg-field` does, and every field fill in this file now points at it.

The dark column of the Color Scheme sheet carries the **literal** dark value
(`#1D1B19`) rather than the token, for the same reason the dark borders do: a
flat Paper file cannot hold a `light-dark()` pair, so the resolver owns dark
and this sheet only mocks it.
