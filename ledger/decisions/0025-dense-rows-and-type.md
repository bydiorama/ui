# 0025 — Dense screens: rows and type follow density; two additive roles

**Status:** accepted · 2026-11-23 · amends 0020 §4 (type, rows and NavRail
were out of density) and extends 0009's table additively

## The finding

The first dense consumer — a moderation queue drawn at 32px nav rows, 28px
buttons, 34px fields and 12px labels — set `data-ui-density="compact"` and
found that density stopped at control and field HEIGHTS:

- A menu row is `p-md text-body-md`, ~46px at every density. The consumer
  passed `className="p-sm text-body-sm"` to every `Menu.Item` (eleven call
  sites) and Select's option list had no override at all.
- A Sidebar row is 46px with a 16px label at every density. The consumer
  wrote its own sidebar.
- A compact field is 36px with a 13px bold `label-md` over a 14px value.
- The table has a 13px and a 12px step only at 500 and 600 (`body-sm`,
  `label-*`, `caption`). The consumer wrote `text-[13px]/4` and
  `text-[12px]/4 font-normal` to get regular-weight text at those sizes.

ADR 0020 §4 put type, icons, radii and layout outside density on purpose,
and named NavRail's squares as navigation rather than controls. That holds
for a dense INSPECTOR inside a default page, which is what §4 was written
for. It does not hold for a dense APP, where the rows are the content.

## Decision

### 1. Two additive roles, not a re-binding of the table

`--ui-text-dense-md` (13 / 1.35 / 400) and `--ui-text-dense-sm`
(12 / 1.35 / 400) join `TYPE_ROLES`, the contract and every emitter, with
their weight, leading and tracking tokens like every role. They are brandable,
scale with `baseSize`, follow `typography.weights`, and are held by the
runtime type-role check in every story. No existing role changes.

The alternative — compact re-binds `--ui-text-body-md` and friends — was
rejected on the system's own rules:

- **ADR 0020 §1.** Type attributes are BRAND decisions, density is a CONTEXT
  mode. A role token re-bound by a mode mixes the two axes in one property.
- **ADR 0020, finding I2.** A brand scope re-declares every brandable token
  on itself, so a brand nested inside a compact page would reset its type to
  default — the exact failure that finding fixed for control heights. The
  role tokens cannot be excluded from brand scopes the way the sizes were,
  because the brand is precisely what sets them.
- **Scope.** Re-binding `body-md` shrinks every prose paragraph, dialog body
  and empty state under compact, not just rows. The rows are what is dense.

### 2. Density-stepped roles choose between two table rows

A part that should be smaller under compact names a **stepped role** instead
of a table role. `STEPPED_ROLES` (resolve.ts) is the typed list:

| Utility | Default and comfortable | Compact | Used by |
|---|---|---|---|
| `text-row` | `body-md` 14/400 | `dense-md` 13/400 | menu, context-menu and option rows; a md field's value; Sidebar search |
| `text-nav-row` | `body-lg` 16/500 | `body-sm` 13/500 | Sidebar items, section headings, layer title, profile name |
| `text-field-label` | `label-md` 13/600 | `label-sm` 12/600 | the visible label of Input, Textarea, Select, Multiselect, Combobox, DatePicker, ColorPicker, ImageUpload |

The Tailwind emitter writes each attribute as
`calc(A + (B − A) × var(--ui-type-step))`, where `--ui-type-step` is a new
density-bound token: `0` at default and comfortable, `1` under compact.

- **Brand-correct at every nesting.** The switch is a bare number, which no
  brand scope declares (it is density-sensitive, so `toCss` keeps it off
  nested scopes). The mix is evaluated on the element that names the
  utility, against the role tokens in scope THERE — so a brand at 18px
  inside a compact page steps to 14.625px, its own `body-sm`. A pointer
  token (`--ui-row-text: var(--ui-text-dense-md)` under compact) was
  considered and rejected: a `var()` is resolved where it is DECLARED, so it
  would freeze the outer theme's value across a nested brand.
- **Default is exactly the table role.** At step 0 the mix is `A + (B − A) ×
  0`; the visual matrix is byte-identical at default.
- **Every step is a row of the table.** A stepped role never interpolates
  a size the table does not have; a unit test holds each pair to two
  existing rows, stepping down, at or above the 12px floor (ADR 0009).
- **No `text-nav`.** Tailwind resolves `text-<name>` against the colour
  namespace too, and `--color-nav` is the rail's background. Stepped role
  names are checked against the colour namespace by a unit test.

### 3. Rows are density-bound

Five tokens join the density blocks (`ROW_SIZES` in base.ts):

| Token | Default (as drawn) | Compact | Comfortable |
|---|---|---|---|
| `--ui-row-inset` (`px-row-inset`) | `space-md` 12 | `space-sm` 8 | as default |
| `--ui-row-block-inset` (`py-row-block-inset`) | `space-md` 12 | `space-xs` 4 | as default |
| `--ui-row-min-height` (`min-h-row`) | `0px` | 32px | as default |
| `--ui-nav-row-min-height` (`min-h-nav-row`) | 36px (`min-h-9`) | 32px | as default |
| `--ui-nav-rail-item-size` (`size-nav-rail-item`) | 32px (`size-8`) | 28px | as default |

- A compact list row is **32px**: the block inset drops so the floor, not
  the padding, sets the height. 32 is a designed number (the consumer's row,
  and default `control-md`), not a step — a list row has no height of its
  own at default to step from.
- The nav floor and the rail square step by `DENSITY_STEP_PX`, floored at
  `CONTROL_FLOOR_PX` like every control. The rail square matches the chrome
  control's compact step (28) and stays on the rail's axis (`self-center`).
- The compact inline inset (8) puts a Sidebar label on a 16px lane — the
  same lane the compact search field's text lands on (8 body + 4 + compact
  `field-md`'s 4). Lanes agree at both densities.
- **Comfortable leaves rows as drawn.** At ~46px they already clear the 44px
  touch target, and a 36px square does not fit the 48px rail.
- The **24px target floor** (SC 2.5.8) is untouched: every row height here
  is ≥ 28px, and `CONTROL_SIZES` is unchanged.

### 4. A Select's list carries its trigger's density

Menu, Popover, Modal and the rest expose their popup part, so a portalled
panel takes `data-ui-density` with no new API (ADR 0020 §4). Select has no
popup part. On open, it reads the trigger's nearest `[data-ui-density]` and
sets the same value on its popup; with no ancestor attribute it sets
nothing, so default rendering does not move.

## What stays out

- **The 4px field step.** Compact `field-md` stays 36px; the consumer drew
  34. Closing it means a field step of 8px against §4's uniform 4px, which is
  a ladder decision for the maintainer, not a density detail. A dense form
  that wants 28px fields uses `size="sm"`.
- **Button, Tabs and the choice rows' type.** A compact Button md is already
  28px at 12px; a tab is 24px in a 32px list; the choice rows already fall
  to 19–20px under compact. None needed a step.
- **Icons, radii, layout spacing** — still out, as §4 said.

## Consequences

- A dense app sets `data-ui-density="compact"` on `<body>` (portals inherit
  it) and gets 32px menu, option and Sidebar rows at 13px, 28px rail
  squares, 12px field labels and 13px md values without a className.
- **Visual change under compact only.** The `density` matrix case renders a
  compact Input, whose label and value step, so its baselines (both schemes,
  both platforms) are regenerated by the maintainer. Every other case is
  byte-identical.
- Consumers must pick up the regenerated theme CSS before syncing the
  components: a stale theme has no `text-row`, `px-row-inset` or
  `min-h-nav-row` utilities and no row tokens, so a synced row loses its
  padding and inherits its parent's type.
