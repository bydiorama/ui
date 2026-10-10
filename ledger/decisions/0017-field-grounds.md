# 0017 — A field is a well cut from its ground, so its fills come in pairs

**Status:** accepted · 2026-08-10 · amended 2026-10-05 (dark page field, #24)

## The finding

The editor's inspector drew its fields on `--ui-bg-sunken` over a
`--ui-bg-elevated` panel. Reviewed against the library that reads as a defect —
`bg-sunken` is what `input.tsx` and `textarea.tsx` filled a **disabled** field
with — and the first review said so.

That reading was half right. The drawing was correct and the library was
incomplete:

> They are disabled on a surface, but this is a sunken design placed on an
> elevated floor. Different surfaces and contrast combinations produce
> different vibe.

`resolve.ts` already said as much and had not followed it through — the comment
above `--ui-bg-field` reads *"a field is RECESSED from whatever contains it"*,
while the derivation reads the **page**. So the role only held when the page was
what contained the field, and there was no name for the other case.

## Decision

1. **Fields are a GROUND × STATE matrix, not one fill.**

   | | enabled | disabled |
   |---|---|---|
   | on the page | `--ui-bg-field` | `--ui-bg-field-disabled` |
   | on chrome | `--ui-bg-field-chrome` | `--ui-bg-field-chrome-disabled` |

   "Chrome" is an inspector, an island, a bottom sheet — anything floored with
   `bg-elevated`. On the page a field is flush and its hairline identifies it;
   on chrome it is a real well, cut one step into the panel.

2. **`--ui-bg-field-disabled` and `--ui-bg-field-chrome` are the SAME VALUE,
   and that is the finding rather than a slip.** Neutral-90 under a white page
   reads as unavailable. The identical neutral-90 inside a neutral-95 inspector
   reads as a well you can type into. A fill means nothing on its own — it
   means something against the floor it is cut from.

   So what is asserted is not that the four values differ. It is that **each
   pair separates on its own ground**, in both schemes, across every stress
   seed. Two of the four values being equal is legal; a pair collapsing is not.

3. **A state never points at a surface role.** `isDisabled && "bg-sunken"` was
   the mechanism of the collision: `bg-sunken` is a surface, disabled is a
   state, and borrowing one for the other is what made a recessed field and an
   unavailable one the same declaration. Both components now take their fill
   from `SURFACE[surface]`, which yields the enabled and disabled fills
   **together**.

4. **The ground is a prop, not inference.** `surface?: "page" | "chrome"`,
   defaulting to `page`. A panel knows it is a panel; an input does not. The
   tempting alternative — have chrome surfaces re-point `--ui-bg-field` for
   their subtree — breaks on exactly the components that need it most: a
   Popover, Menu or Select panel is **portalled to `document.body`**, so it
   leaves the subtree and inherits nothing. That failure is already in the
   review catalogue.

5. **Every value is floored by measurement, not authored as a step.** A brand
   whose surfaces sit close together cannot collapse a pair into one fill:
   `separateFrom()` moves toward the theme's ink until the two measure at least
   1.12 apart (1.08 for the well against its panel).

## What is enforced

- `resolve.test.ts` — each pair separates on its own ground, and the chrome
  field reads as a well against `bg-elevated`, in both schemes across every
  stress seed.
- `CONTRAST_PAIRS` gains ink-on-`bg-field-chrome`, so `check:contrast` audits
  the second ground. A second ground is a second audit — the ink is the same
  role, the fill is not, and measuring differently is the entire reason the
  chrome pair exists.
- Both docs declare the disabled-on-chrome pair as decorative with its reason,
  so the exemption is a measured decision rather than an absence.
- `OnEachGround` in both story files draws the 2×2 side by side. Seeing the two
  identical fills in different columns is the only way the decision is legible.

## Consequences

- **Light is unchanged.** `--ui-bg-field-disabled` resolves to the value
  `bg-sunken` had, so no page-level field moves.
- **Two dark baselines moved** — `input — dark` and `textarea — dark`. The dark
  disabled fill went from `#282522` to `#2F2C29`, which separates from the
  field at **1.237** where it used to manage **1.127**. Regenerated.
- The editor drawings can now say what they mean: their fields are
  `surface="chrome"`, not disabled ones.

## Known gaps

- **Only Input and Textarea take the prop.** Select, Multiselect and Combobox
  render field-shaped surfaces too and still fill from `bg-field` directly.
  They want the same prop; nothing in the editor drawings needed it yet, and
  adding it blind would be four more untested variants.
- **`page` is the default, so a field dropped into an inspector is wrong until
  someone passes the prop.** That is deliberate — the common case stays free of
  ceremony — but it means the failure mode is silent. A lint rule that flags a
  field inside a known chrome recipe is the obvious ratchet step and is not
  built.

## Amendment — 2026-10-05: the dark page field is an input, not a hole (#24)

**What changed.** In dark, `--ui-bg-field` was neutral-0 (`#1D1B19`), the
darkest ground in the scheme, and the derivation (`surface - 0.06`) agreed.
The owner's review of a dark Sheet with twelve fields called the inlays "too
hard": every field read as a hole cut through the panel. The field is now
DERIVED in every theme as the point halfway between `surface` and `elevated`
(`towardL(surface, elevated, 0.5)`), which is `#33302D` in theme zero, and
theme zero no longer pins it. Light is unchanged: the resolved light scheme
was diffed before and after for theme zero and every stress brand, and no
value moved.

It equals no ground a field can land on, measured in theme zero dark:

| Ground | Field `#33302D` | Field `#1D1B19` (before) |
| --- | --- | --- |
| `bg-base` `#423E3A` | 1.24 | 1.62 |
| `bg-elevated` `#373430` | 1.06 | 1.39 |
| `bg-surface` `#2F2C29` | 1.06 | 1.24 |
| `bg-sunken` `#282522` | 1.16 | 1.13 |

Ink on it: text-primary 11.86, placeholder 5.76, text-muted 6.12,
`border-control` 3.82 (was 15.53 / 7.54 / 8.01 / 5.01). As in light, where the white
field is the white page, the hairline draws the field's edge
(`border-subtle` 1.51 against it).

**`--ui-bg-field-disabled` had to move too, against the request.** The issue's
revised proposal kept it at neutral-10, but neutral-10 is `bg-surface`, and it
measures **1.06** against the new field — under the 1.1 point 2 of this ADR
requires of each pair on its own ground. The pin is dropped and the value
derives by `separateFrom(field, 1.12)`: `#3D3A37`, **1.16** from the field,
1.07 against `bg-base`, 1.10 against `bg-elevated`. It still equals no
ground. `--ui-bg-field-chrome` (neutral-10) and `-chrome-disabled`
(neutral-20) keep their values; the chrome pair is untouched at 1.31.

**Enforced.** `resolve.test.ts` gains "the dark page field sits between
surface and elevated, never under every ground": across every stress seed the
dark field lies strictly between `surface` and `elevated` in OKLCH lightness,
clears 1.03 against all four grounds, and the light field is still the page.
Probed against the old derivation: it fails on theme zero first. The pair
assertion above still passes in both schemes for every seed.

**Moves.** Every stress brand's dark field rises the same way (each derives
the same rule), and their dark placeholders shift by one 8-bit step where the
floor re-measures against the new ground. The dark visual baseline of every
matrix case that draws a page field moves (darwin and linux): `input`,
`textarea`, `select`, `multiselect`, `date-picker`, `chat-composer`, `card`,
`modal`, `drawer` and `density`. Not regenerated with this change.
