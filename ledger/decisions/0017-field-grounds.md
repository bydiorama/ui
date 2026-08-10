# 0017 — A field is a well cut from its ground, so its fills come in pairs

**Status:** accepted · 2026-08-10

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
