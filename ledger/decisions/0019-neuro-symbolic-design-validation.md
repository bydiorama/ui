# 0019 — Design validation is neuro-symbolic: perception proposes, arithmetic disposes

**Status:** accepted · 2026-08-17

## Context

Tabs shipped a track whose inset was 3px on the sides and 4px on the top and
bottom. The sheet lays out 4px on all four. It was found by a person zooming
into the docs page, which is the same way the badge-sizes bug, the label-hugging
bug and the invisible-panel-boundary bug were found — all recorded in
`matrix.visual.test.tsx`'s own header as things that shipped.

Every gate in this repo passed it, and each for a good reason:

- **`check:utilities`** reads classes. The class list was `p-[2px]` — one
  padding, four sides. It *reads* symmetric. The asymmetry did not exist until
  a browser laid the box out, because `h-8` demanded a height the parts did not
  add up to and `items-center` paid the difference out of the vertical gaps.
- **`check:contrast`**, **`check:motion`**, **`check:boundaries`** are not
  about geometry.
- **Visual regression** was green. Its own header states the reason: at
  `allowedMismatchedPixelRatio: 0.01` a small element can change *entirely*
  without tripping the diff. A one-pixel inset on a 32px strip is far under
  that floor.
- **The browser suite** asserted `expect(style.padding).toBe("2px")` with the
  comment *"2px, the sheet's own inset"*. It was not. The test had been written
  from the component instead of from the design, so it did not merely miss the
  drift — it pinned it.

Underneath all five is one fact: **the design's numbers were never in the
repository.** `design/paper/` holds PNG and PDF exports, and its README is
explicit that they are "evidence of what was approved", not values. So
"does this match the design?" could only ever be answered by a person putting
two pictures side by side, and a person cannot see one pixel.

## Decision

Validate the implementation against the design with a **neuro-symbolic** loop:
a perceptual half that can notice anything but proves nothing, and a symbolic
half that proves things but only ever the things it has been taught.

### 1. The design's numbers become symbols

`design/paper/specs/<item>.geometry.json` carries, per case, what Paper
*actually lays out*: the container's padding, border, radius and extent, each
child's rect, and the four gaps — the last computed from Paper's **world
coordinates**, not from its declared padding. Every number carries the node id
it came from and the artboard deep-links, so it is re-derivable rather than
trusted.

Extraction is model-mediated and that is fine: deciding that Paper's `Form`
frame is the thing the code calls `data-slot="tabs-list"` is a semantic
judgement, not a lookup. What the model produces is *data*, which is then
checked.

### 2. The laws are shared arithmetic, not prose

`scripts/lib/geometry-laws.mjs` holds four laws, each a pure predicate over a
measured figure:

| Law | Says |
|---|---|
| `uniform-inset` | the four gaps are equal |
| `inset-is-declared` | each gap is exactly the container's own border + padding — nothing else may space a child |
| `concentric-radius` | §6, evaluated on the **padding box**: `outerRadius − border = innerRadius + padding` |
| `track-is-the-sum-of-its-parts` | the extent along the stacking axis is derived from rows, gaps and inset, never typed |

The same functions run over both fact sets. That is what makes "matches the
design" a computation rather than an opinion about two screenshots.

### 3. Both halves run, and neither is sufficient

- **`pnpm check:design-spec`** (in `pnpm verify`) evaluates the laws against
  the *sheet*. A design can be internally wrong, and a gate that assumes
  otherwise will demand the code reproduce a contradiction.
- **`registry/visual/geometry.browser.test.tsx`** evaluates the same laws over
  `getBoundingClientRect` in Chromium, then asserts the rendered gaps equal the
  sheet's own — because a track uniformly inset by 6px satisfies every law and
  is still not the design.

Each half also checks that the other exists: a spec case with nothing rendering
it, or a render with no spec case, fails from both directions.

### 4. Used width, not declared width

A `1.5px` border is not 1.5px: browsers snap border widths to whole device
pixels, and at DPR 1 both Chromium and Paper's own canvas draw it as 1px. Every
law consumes the **used** width. This is not a detail. Read with the declared
1.5px, the Tabs sheet appears self-contradictory — 24 + 3 + 3 + 1.5 + 1.5 = 33
against a frame typed as 32 — and the previous reading of it concluded the
design was unbuildable and shipped 2px instead. Read with the used width it is
exact, and it always had been.

### 5. What the neural half is for, and what it is not allowed to do

The model looks at the rendered component beside the sheet and says things the
symbols have no predicate for: *the fill sits closer to the left edge than the
top*. That is a **hypothesis**, and it is worth having precisely because the
law that catches it did not exist yet.

A hypothesis is never a verdict. It is discharged in one of two ways:

1. **It becomes a law** in `geometry-laws.mjs`, evaluated by exact arithmetic
   over measured numbers from then on, forever, for every component that
   declares it.
2. **It becomes a `deviation`** in the spec, with the reason written out —
   `check:design-spec` rejects a deviation whose `why` is under 40 characters,
   because "looked better" is not a reason.

Perception is how findings *enter* the system. Arithmetic is the only thing
that keeps them. That asymmetry is the whole design: a VLM asked the same
question twice may answer differently, and a gate that can flake is a gate
people learn to re-run instead of read.

### 6. Every law is declared or refused, per case

A case must name every law it obeys, and give a reason for every law it does
not — `lawsNotDeclared`. Ghost Tabs refuses `concentric-radius` because it has
no fill and no border, so there is no outer shape to be concentric with. An
undeclared law with no reason is indistinguishable from one nobody thought of,
and that is exactly how `concentric-radius` went unenforced on a component
whose own source comment admitted it did not close.

## Consequences

- **Coverage starts at one item.** Tabs has a spec; the other 34 components do
  not. This is stated rather than hidden: `check:design-spec` reports the count
  it covers. Extending it is one JSON file plus one entry in `CASES`, and
  `design-component` carries the Paper calls that produce the numbers.
- **The laws are geometry only.** Colour has `check:contrast`, motion has
  `check:motion`. Type has neither and is the obvious next axis.
- **A sheet can now fail.** `check:design-spec` reports the *design* as wrong
  when its own numbers disagree. That is intended: before this, a
  self-contradictory sheet was resolved silently by whoever implemented it.
- **The tolerance is 0.5px**, the floor a snapped 1.5px border forces. Anything
  larger needs a sentence in the spec's `note`, because a loose tolerance is
  how a gate quietly stops holding.
