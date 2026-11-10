/** Typed documentation for Sparkline (CONVENTIONS §11). */

export const sparklineDoc = {
  name: "Sparkline",
  status: "experimental",
  summary:
    "An inline, axis-free trend in one of the eight categorical data slots: a line, an area or columns, at 160×40 or 120×32. One image to assistive technology, named by `label` and described by a required, person-written `description` — the one chart allowed to ship without a data table (ADR 0023 §4).",

  anatomy: [
    { part: "root", slot: "sparkline", notes: "role=img, aria-label from `label`, aria-describedby the description. className lands here (§5). Carries data-variant, data-size and data-series." },
    { part: "description", slot: "—", notes: "An sr-only span holding `description`. Inside the root so it travels with it; referenced, not rendered." },
    { part: "plot", slot: "sparkline-plot", notes: "The SVG. aria-hidden: its paths say nothing the description does not." },
    { part: "area", slot: "sparkline-area", notes: "variant=area only. The slot's own -bg wash, closed to the bottom edge." },
    { part: "line", slot: "sparkline-line", notes: "2px (--ui-stroke-thick), round caps and joins, the slot's -solid ink." },
    { part: "marker ring", slot: "sparkline-marker-ring", notes: "A 6px disc in bg-surface under the end dot, so the dot separates from the line it ends." },
    { part: "marker", slot: "sparkline-marker", notes: "The latest value: a 4px dot in the slot's -solid ink. Alone and centred for a one-point series." },
    { part: "column", slot: "sparkline-column", notes: "variant=column. 8px wide at most, 2px surface gap, 4px radius at the data end, standing on zero." },
    { part: "skeleton", slot: "sparkline-skeleton", notes: "isLoading. bg-sunken, radius-sm, the full box — height is reserved so a row of tiles never jumps." },
  ],

  composition: `
Sparkline
├─ data           number[] (required) — oldest first; NaN and ±Infinity dropped
├─ label          string (required) — the accessible name: what is measured
├─ description    string (required) — the takeaway, in words
├─ variant?       line | area | column
├─ series?        1…8 — the categorical slot
├─ size?          md (160×40) | sm (120×32)
├─ hasEndMarker?  default true (line, area)
└─ isLoading?
  `.trim(),

  props: {
    data: { type: "readonly number[]", required: true, notes: "Oldest first, evenly spaced. Non-finite values are DROPPED rather than drawn at zero — plotting NaN at the baseline states a value nobody measured." },
    label: { type: "string", required: true, notes: "Names what is measured. Not shown: a sparkline sits beside a label the layout already draws, and drawing it twice is noise." },
    description: { type: "string", required: true, notes: "Required by the type, because it is what replaces the data table every other chart must ship. Write the takeaway a reader should leave with ('Rose 12% since January, peaking in October'), not 'a sparkline'." },
    variant: { type: '"line" | "area" | "column"', default: '"line"', notes: "All three are on the sheet. Columns stand on ZERO, never on the minimum: a column's length is its value." },
    series: { type: "1 | 2 | 3 | 4 | 5 | 6 | 7 | 8", default: "1", notes: "The ordinal data slot (--ui-data-cat-N). Use the slot this series has in the full chart it summarises, so colour keeps meaning one thing across a screen. Not `slot`: that is a global HTML attribute." },
    size: { type: '"md" | "sm"', default: '"md"', notes: "160×40 and 120×32, the two sizes the sheet draws. Fixed, not fluid: a stretched sparkline exaggerates its own slope." },
    hasEndMarker: { type: "boolean", default: "true", notes: "The ringed dot on the latest value. On by default because a trend that does not mark where it ends does not say where it is now. Ignored for columns." },
    isLoading: { type: "boolean", default: "false", notes: "Reserves the box with a sunken skeleton and sets aria-busy. The name and description stay, so a screen reader is not handed a nameless busy image." },
  },

  do: [
    "Put the number the sparkline supports next to it in text; the line shows shape, not value.",
    "Give the sparkline the same series slot its series has in the full chart.",
    "Write the description as the sentence you would say aloud about the trend.",
  ],

  dont: [
    "Do not use a sparkline where the reader needs to read values — use a chart with axes and a table.",
    "Do not stretch it to fill a column; pick the size that fits.",
    "Do not reuse a slot for a different series elsewhere on the same screen.",
    "Do not put two series in one sparkline. It has no legend, so the second series would be told apart by colour alone.",
  ],

  a11y: {
    role: "img on the root, named by aria-label and described by aria-describedby; the SVG is aria-hidden.",
    name: "`label`. The description is `description`, required by the type.",
    keyboard: [{ key: "—", does: "Not focusable. A sparkline is output, not a control, and it ships no handlers." }],
    contrastPairs: [
      { fg: "--ui-data-cat-1-solid", bg: "--ui-bg-surface", floor: "non-text", role: "the line, dot and columns on a card (every slot 1–8 is audited on base and surface in NONTEXT_CONTRAST_PAIRS)" },
      { fg: "--ui-data-cat-1-solid", bg: "--ui-bg-base", floor: "non-text", role: "the same marks on the page" },
    ],
  },

  forwarding: {
    className: "root",
    ref: "root (an HTMLDivElement)",
    rest: "root — every HTML attribute except role and children, which the component owns",
  },

  knownGaps: [
    "The marker ring is painted bg-surface, as drawn. On bg-base (the page) it shows as a faint disc in light; a ground-following ring needs a token or a mask, and the sheet never drew the page case.",
    "The area wash uses the slot's -bg role (14%) where the sheet types opacity 0.1 on the shape. The sheet's own Gaps row asks for --ui-data-area-opacity; until that exists the -bg role is the nearest contract value.",
    "No hover or focus value readout. Inline sparklines in the sheet are static; an interactive one belongs to the Chart primitives.",
    "No forced-colours treatment beyond the browser's: lines and dots stay visible as system colours, which is enough for one series and is why a sparkline is limited to one.",
    "The gradient, sheen, glow and halo variants drawn on the Effects and Gradients sheet are not built. They arrive as fx classes, not props (ADR 0023 §8).",
  ],

  motion: "None. A sparkline renders its final shape on the server and does not animate in; a new `data` array simply redraws.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-13-0/3XK9-0",
} as const;

export type SparklineDoc = typeof sparklineDoc;
