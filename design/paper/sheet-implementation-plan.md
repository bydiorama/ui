# Sheet — drawn and built, 2026-08-25

> **Superseded by the implementation.** Kept as the record of what was planned
> and what the browser corrected; `sheetDoc` and
> `design/paper/specs/sheet.geometry.json` are the live contract. Two rows in
> `needsDesign` are still open and neither blocked the build.

**Status:** shipped. Design in Paper
([`Component --- Sheet`](https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/2UF0-0)
· `exports/component-sheet.pdf`); implementation in `registry/ui/sheet/`.
**Blocks nothing.** Four rows in `sheetDoc.needsDesign` want a person — two
about this component, two the ramp turned up that belong elsewhere — and none
of them stops step 1.

## Why this document exists

Sheet shipped on 2026-08-05 with **no artboard of its own**. Its geometry came
from the Sidebar sheet's § 06 *Mobile and the collapsed rail*, which draws the
panel holding a rail at a 320px viewport — and nothing else. What that left out
is exactly what the component turned out to lack: a header, a footer, a body
that scrolls on its own, and any width above the navigation rail's 272px.

> **Corrected after review.** This document first argued that the panel drawn
> as *"Drawer Desktop"* on the **Drawer** artboard is a Sheet, because it has
> no handle. It is not, and reading identity from an *absent* feature is the
> error. All three panels on that artboard carry one treatment — `radius-lg` on
> all four corners, a 1px border, `shadow-md`, inset 4px — which is
> `drawer.tsx` exactly and which a Sheet never is. Its window frame is even
> filled `--ui-bg-emphasis-active`, a device bezel, where both mobile frames
> are filled `--ui-scrim`; that frame shows the panel in isolation and says
> nothing about edge anchoring. What survives is the useful half: that drawing
> is what made Sheet's missing header band and footer visible.

The taxonomy in §7a says a Sheet is for *"navigation and filters on a narrow
screen"*. At a 272px cap with no structural parts it can only do the
navigation half.

`sheetDoc.design` also pointed at `4-0/HE2-0`, a node that no longer exists;
it now points at the new artboard. The 2026-08-05 ledger entry's provenance
still points at the Drawer artboard and should be left alone — it records what
was true then.

## Where Sheet sits in the family today

| | Parts | Size axis | Max width |
|---|---|---|---|
| Modal | Trigger · Surface · Title · Description · Footer · Close | `md` / `lg` | 416 / 640 |
| Drawer | Trigger · Panel · Title · Body · Footer · Close | detents | — |
| **Sheet** | **Trigger · Panel · Close** | **none** | **272** |

Sheet is the only overlay in the taxonomy with no structural parts.

## The API delta

Additive throughout. Nothing that renders today moves — `size` defaults to
`sm`, which *is* the shipped geometry.

```tsx
export type SheetSide = "left" | "right";
export type SheetSize = "sm" | "md" | "lg";   // NEW

Sheet                     isOpen? / defaultIsOpen? / onOpenChange? / isDismissable?
├─ Sheet.Trigger          render={…}
└─ Sheet.Panel            label (required) / side? / size? / container?
   ├─ Sheet.Header        NEW — the 48px chrome band. Pinned.
   ├─ Sheet.Body          NEW — the only region that scrolls.
   │  └─ Sheet.Title      NEW — first child of the Body, not of the band.
   └─ Sheet.Footer        NEW — stacked full-width actions. Pinned.
      └─ Sheet.Close      unchanged; usually lives in the Header
```

`Sheet.Body`, `Sheet.Title` and `Sheet.Footer` are **Drawer's values, verbatim**
— both components were drawn from the same panel, so a Sheet and a Drawer
holding the same form must not inset it differently.

## Measured geometry

From `get_node_info` / `get_children` world coordinates on the `md` anatomy
specimen. Sibling world Y values differ (−2330 / −2282 / −1974), so the layout
was resolved rather than the artboard origin being returned.

| | Value | Derivation |
|---|---|---|
| Panel | 416 × 460, padding 0, border 0 | every inset belongs to a region inside |
| Panel radius | `--ui-radius-lg` (16) on the two INNER corners; 0 on the outer two | the outer two meet the viewport edge |
| Header | 48 tall, inline inset 8, uniform | 8 + 32 + 8 = 48; controls measured at world +8 on both sides |
| Body | 308 tall, inset 16, gap 8 | Title at world +16/+16; field pitch 80 (16 label + 8 + 48 control + 8 gap) |
| Footer | 104 tall, inset 16, gap 8 | 16 + 32 + 8 + 32 + 16 = 104 |
| Track | 48 + 308 + 104 = **460** | `track-is-the-sum-of-its-parts` holds |
| Glyph lane | band inset 8 + the 32px control's own 8 = **16** | lands on the Body's 16 inset |

That last row is the reason `Sheet.Title` sits at the top of the Body rather
than in the band: a text node at the band's 8 would miss the 16 lane by
exactly 8. shadcn nests `SheetTitle` inside `SheetHeader`; ours does not, and
both drawings agree with ours.

## Steps

### 1 · The size axis

`registry/ui/sheet/sheet.tsx`. All three utilities already exist — `max-w-nav`
is what the panel wears today, and `max-w-dialog-md` / `max-w-dialog-lg` are
Modal's.

```ts
const SIZE = {
  sm: "max-w-nav",         // --ui-nav-width        272
  md: "max-w-dialog-md",   // --ui-dialog-width-md  416
  lg: "max-w-dialog-lg",   // --ui-dialog-width-lg  640
} as const satisfies Record<SheetSize, string>;
```

Replace the inline `max-w-nav` with `SIZE[size]` and carry `data-size={size}`.
**Order matters:** tailwind-merge keeps the *last* max-width, so `SIZE[size]`
must be the only one in the list — the trap Modal's own comment records, where
a `max-w-[calc(100vw-2rem)]` sat in the class list and never once applied.

`w-4/5 min-w-64` stays: 80% of a 320px phone is 256, and the floor exists
because a `fixed` element resolves against the nearest *transformed* ancestor
and a percentage silently scopes to a Storybook docs cell.

### 2 · The four parts

Same file. Header and Footer are `shrink-0`; Body is `min-h-0 flex-1` and
carries the scroll.

```tsx
Sheet.Header  "flex h-12 shrink-0 items-center justify-between gap-sm px-sm"
Sheet.Title   "line-clamp-1 text-body-lg font-body font-bold leading-normal tracking-tight text-ink-primary"
Sheet.Body    "flex min-h-0 flex-1 flex-col gap-sm overflow-y-auto p-lg"
Sheet.Footer  "flex shrink-0 flex-col gap-sm p-lg"
```

- `Sheet.Title` renders `BaseDialog.Title`, as Drawer's does. `label` stays
  **required** on the Panel — a Sheet often has no visible title, and this is
  Drawer's rule. Document that `aria-labelledby` wins when both are present, so
  the two must say the same thing.
- `body-lg`, **not** `title-sm`: both peak at 16px but the title roles are
  fluid, and a panel at its narrowest would draw the ceiling of a scale it
  never reaches. Same trap Sidebar hit.
- The Footer **stacks** full-width `md` buttons rather than taking Modal's
  `justify-between` row: a 272–416px panel has no room for two side by side.
- The Panel keeps `overflow-y-auto` as the fallback for a caller who fills it
  directly — which is what the navigation composition does. With a Body
  present, header + body + footer exactly fill the fixed height, so the
  panel's own overflow is inert.

### 3 · The scrolled hairlines

Header's rule, applied: **the border is always declared and only its colour
changes**, so the 48px lane cannot jog by a pixel when the state flips.

Cheaper here than in Header — the Body *is* the scroll container, so it is an
`onScroll` handler on one element rather than an `IntersectionObserver` on the
page. Panel holds the state and the named group; Header and Footer read it:

```tsx
// Panel
"group/sheet"                      + data-scrolled-top / data-scrolled-bottom
// Header
"border-b border-transparent transition-[border-color]", motionStandard,
"group-data-[scrolled-top]/sheet:border-edge-subtle"
// Footer — the mirror, on border-t / scrolled-bottom
```

`group-data-[…]/name` is already the idiom here (Header, Accordion,
ChatProgress). Feed the state through the Panel rather than a context: the
three regions are siblings, and a context adds a file-local provider for one
boolean.

### 4 · Stories, docs, gates

- `sheet.stories.tsx` — add `Sizes` (sm/md/lg), `WithHeaderAndFooter`, and a
  `Scrolled` case with enough rows to overflow. Keep every story opening on
  **interaction**, never on mount. The brand-theme case already exists and
  must keep passing `container`.
- `sheet.doc.ts` — the `motion:` note must gain the hairline transition.
  `check:motion` only asserts that a top-level `motion:` key EXISTS for an
  animating component, so a new transition cannot fail it — the note going
  stale is invisible to the gate. Then move the three `DRAWN, NOT BUILT`
  entries out of
  `knownGaps`, add the four parts to `anatomy`, add `size` to `props`, update
  `composition`, and drop the `dont` line *"Do not add a Sheet-level header"* —
  that rule was written from the half of the design that was transcribed. The
  replacement is narrower: **do not put the Title in the band.**
- `ui.manifest.json` — the description names "80% width capped at the rail's
  own" and "carries no chrome of its own". Both become false; rewrite, then
  `pnpm registry:build`.
- `CONVENTIONS.md` §7a — the Sheet row still reads "navigation and filters on a
  narrow screen". With `lg` it is also a working panel on a wide one.
- `pnpm ledger:new` — one entry, kind `change`, provenance the new artboard.
- `pnpm verify && pnpm type-check && pnpm lint`.

### 5 · Tests

`sheet.browser.test.tsx`. The existing suite already covers flush/full-height,
the radius mirror, the scrim role, the translate transition, focus return,
inertness and the brand scope. Add:

| Test | Why it is not covered by the ones above |
|---|---|
| each `size` resolves to its own max-width, and `sm` is the default | a default silently changing is how every existing drawer would rewiden |
| Header and Footer keep their positions while the Body scrolls | the defect the parts exist to fix; assert `getBoundingClientRect().top` before and after `scrollTop` |
| the hairline appears on scroll and the Header's height does not change | Header's lane-jog defect, in a second component |
| the Title names the dialog, and `label` still applies without one | `aria-labelledby` beats `aria-label`; both paths must announce something real |
| the Footer's buttons are full width and stacked | Drawer's footer, and a `justify-between` copy-paste would pass a looser check |

### 6 · Geometry spec (ADR 0019)

`design/paper/specs/sheet.geometry.json`, with the measured table above:
`uniform-inset` and `inset-is-declared` on the Header (a genuine uniform 8),
`track-is-the-sum-of-its-parts` on the Panel (48 + 308 + 104 = 460).

**Add it in the same commit as the implementation, not before.**
`check:design-spec` fails a spec that nothing renders, so a spec landing ahead
of the parts breaks `pnpm verify` for everyone.

## What is not being built

- **`side="top"` / `side="bottom"`.** shadcn's Sheet has four; §7a splits ours
  on the *gesture*, so a bottom Sheet would be a Drawer that cannot be dragged.
  This is the single thing a consumer arriving from shadcn will reach for and
  not find, so the doc names it.
- **An automatic close button** (`showCloseButton`). In the navigation
  composition the close belongs to Sidebar's own group; a control the component
  renders and the caller has to suppress is a control in the wrong place twice.
- **`Sheet.Description`.** Modal and shadcn both have one; no drawing shows a
  paragraph under a sheet's title and Drawer has none either.
- **A visual-regression baseline.** The matrix renders inline and a Sheet
  portals to `document.body`, so it stays excluded like Modal and Popover —
  which means the browser suite is about to be the only thing watching three
  new regions and a three-value width axis.

## What drawing the ramp turned up

Neither of these is Sheet's to fix. Both belong to `--ui-bg-active` /
`--ui-bg-hover` and `registry/lib/chrome-control` — which has no `.doc.ts`, so
`sheetDoc.needsDesign` is the only surface that reports them at all. They are
in the sheet's § *Band controls — the ramp*, drawn as five tiles per scheme.

- **In dark the ramp crosses its own ground.** Rest `#373430` and hover
  `#3c3936` are darker than the panel; pressed `--ui-bg-active` `#494643` is
  lighter than it. So a resting control reads recessed and a pressed one reads
  raised — monotonic in value, inverted in apparent direction. Light never does
  this, because `bg-base` is the extreme of the scale there rather than a value
  inside it. Header's own comment measured **rest** against the bar in both
  schemes (1.105 / 1.168) and stopped there, which is why it survived.
- **Hover and disabled are the same fill in light.** `--ui-bg-hover` and
  `--ui-bg-sunken` both resolve to `#EDE8E3`; only the ink separates them, at
  15.53:1 and 1.76:1. Tolerable here — a disabled control cannot enter hover, so
  the two are never adjacent. The number worth acting on is the wider one:
  **six** `--ui-bg-*` roles resolve to `#EDE8E3` in light — `sunken`, `muted`,
  `hover`, `selected`, `field-disabled`, `field-chrome` — so any two of them
  meeting on one surface are indistinguishable, and the hover-against-selected
  collision the `design-component` skill already records is one case of six.
  Dark separates all six.

## Answered

- **Panel depth — `--ui-shadow-md`, approved 2026-08-25 and shipped.** The
  value the sheet draws and the one Drawer takes from the same drawing. The
  browser suite asserts both layers, after a detour: Tailwind emits four fully
  transparent placeholder layers ahead of the real shadow, so a layer count
  reads 6 and an equality assertion compares against four things the component
  never set.
- **"Drawer Desktop" stays on the Drawer artboard** — it is a Drawer. The
  geometric test that settles it is now in `sheetDoc.knownGaps` and on the
  sheet.

Two rows remain in `sheetDoc.needsDesign`, and neither is Sheet's: both belong
to `--ui-bg-active` / `--ui-bg-hover` and `registry/lib/chrome-control`.

1. **Panel depth.** The drawn panel carries `--ui-shadow-md`, the value Drawer
   ships from the same drawing; Sheet ships `shadow-sm`. In light the scrim
   leaves a measured **1.16:1** step between the panel and the page beneath it
   (both are `--ui-bg-base`; the scrim is a warm 16% veil), so a single 0.5px
   blur is doing less than it looks. Dark reaches 1.61:1 because its scrim is
   black at 55%. The sheet draws `shadow-md`. If `shadow-sm` was deliberate,
   say so and the row closes as Decided.
2. **"Drawer Desktop".** Retire it, or move it onto the Sheet artboard. A
   component specified on another component's artboard is a component nobody
   will spec against — this whole document is the evidence.


## What building it corrected

Two things the drawing gave up on contact with the browser, and one the
drawing never had.

- **The hairlines are an inset box-shadow, not a border.** `h-12` is a
  border-box height, so `border-b` takes its pixel out of the 32px content lane
  and `items-center` pays it back as **7.5 above and 8.5 below** — the Tabs
  defect with a different number. A box-shadow costs no layout, so the band
  keeps the uniform 8px inset the sheet draws, and the geometry spec proves it.
  Header's principle is kept: always declared, only the colour changes.
  *Header's own bar carries the border version today, and has no geometry spec
  to catch it.*
- **`Sheet.Body` needed a keyboard path nothing had drawn.** A body holding
  only static text has no focusable child, so a keyboard user cannot scroll it
  (SC 2.1.1). It is a named tab stop with a visible inset outline **only while
  it scrolls** — Table's rule in the other axis. The ring is an `outline`
  rather than a box-shadow because the region is flush with the panel's edges
  and an outward ring would be clipped on three sides.
- **The focus test was wrong before the ring was.** `:focus-visible` does not
  match a programmatic `.focus()` on a div in Chromium, so `b.focus()` read a
  working ring as absent. Driven with real Tab presses, and *walked* until
  `document.activeElement` is the body rather than counting a fixed number of
  Tabs in a focus-trapped dialog.

The gate was probed by removing `flex-1` from `Sheet.Body`: all three declared
laws fail, with the arithmetic printed (`height is 896px but its parts add to
269.594px`). Restored by editing, never by `git checkout`.
