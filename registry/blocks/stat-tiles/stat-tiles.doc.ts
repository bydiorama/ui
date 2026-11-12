/** Typed documentation for StatTiles (CONVENTIONS §11). The first block. */

export const statTilesDoc = {
  name: "StatTiles",
  status: "experimental",
  summary:
    "A row of headline numbers in one surface frame, tiles separated by hairlines. Each tile is a label, a figure at the fixed `figure` role, a change line whose glyph says which way and whose colour says whether that is good, and an optional sparkline. A block: it composes Skeleton and takes a Sparkline element; it formats and computes nothing.",

  anatomy: [
    { part: "root", slot: "stat-tiles", notes: "A <dl>. bg-surface, border-subtle hairline, radius-md, one frame for the whole row. className lands here." },
    { part: "tile", slot: "stat-tile", notes: "A <div> grouping the term and its descriptions. 24px inset; hairlines between tiles that follow the wrap — a start-side line on every column after the first, a top line on the second row. Two columns: the text, and the trend aligned to the foot. aria-busy while loading." },
    { part: "narrow row", slot: "stat-tiles", notes: "One line only while each tile gets 280px: four tiles from 1120px of row, three from 840px. Below, two by two; a third tile spans the second row. Under 220px of tile content the trend drops under the change line, 16px clear, and the text takes the full width (sheet: Narrow row)." },
    { part: "label", slot: "stat-label", notes: "<dt>. label-sm at 400, muted. Stays printed while loading." },
    { part: "value", slot: "stat-value", notes: "<dd>. The `figure` role — 24/30 at 600, tracking-tight — with tabular figures, primary. A 30px row, so a skeleton holds its height." },
    { part: "change line", slot: "stat-delta", notes: "16px TrendUp / TrendDown / Minus glyph, 4px gap, the change in label-sm 600 in success or danger ink, the comparison in label-sm 400 muted. A zero change is the Minus glyph and \"No change vs …\", all muted." },
    { part: "trend", slot: "stat-trend", notes: "Optional. The caller's element — a Sparkline at size sm (120×32) — at the end of the tile, aligned to the foot of the text." },
    { part: "empty", slot: "stat-empty", notes: "value: null. The figure becomes a muted em dash and the change line becomes `emptyText` (\"No reading yet\"). Never a zero." },
  ],

  composition: `
StatTiles                     <dl> · two to four tiles
└─ StatTiles.Tile             label · value · delta? · trend? · isLoading?
     delta = { change, comparison, polarity?, format? }
     trend = <Sparkline size="sm" … />

StatDelta / StatFigure        the change line, and figure + change in a row (ChartCard's head)
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Tile. What is measured. Printed while loading so the frame still says what is coming." },
    value: { type: "string | null", required: true, notes: "Tile. Already formatted (\"€3,410\"). `null` is no reading yet: an em dash and `emptyText`, never a fake 0." },
    delta: { type: "{ change; comparison; polarity?; unit?; format?; pointsSuffix?; pointsLabel?; locale?; upLabel?; downLabel?; flatLabel? }", notes: "Tile. `change` is signed and, with the default percent format, a fraction (0.12). It prints unsigned — the glyph carries the sign. `comparison` is required: a change with no baseline cannot be read. Omit the whole object for a tile with no comparison; no line is drawn." },
    polarity: { type: '"up-is-good" | "down-is-good"', default: '"up-is-good"', notes: "Inside delta. The block reads direction from the sign and cannot know whether a rise is welcome; a cost sets down-is-good. Changes colour only, never the glyph." },
    trend: { type: "ReactElement", notes: "Tile. A Sparkline size=\"sm\". An element, so the block draws no chart of its own and the sparkline keeps its own accessible label." },
    isLoading: { type: "boolean", default: "false", notes: "Tile. The figure and change become bg-sunken skeletons (96×24, 72×12); the label stays." },
    emptyText: { type: "string", default: '"No reading yet"', notes: "Tile. Under the dash when value is null." },
    unit: { type: '"percent" | "points"', default: '"percent"', notes: "Inside delta. `points` is a change of a share, printed \"2.1 pp\" and spoken \"2.1 percentage points\" (pointsSuffix / pointsLabel): a share from 40% to 42% rose two points, not 5%, and Intl has no unit for it. `change` stays a fraction (0.021). The pp suffix is the library's own reading; no sheet draws it." },
    upLabel: { type: "string", default: '"Up"', notes: "Inside delta. Spoken before the change, since the glyph is aria-hidden. With downLabel and flatLabel, the block's only strings." },
  },

  do: [
    "Give every change a comparison a person can read: \"vs 1971\", \"vs last month\".",
    "Set polarity on every tile where a rise is bad — costs, errors, wait times.",
    "Use one row of two to four tiles; a fifth stops being a glance.",
  ],

  dont: [
    "Do not pass a pre-signed string as the figure's change: pass the number, so direction and colour come from one place.",
    "Do not show a zero for a value nobody measured; pass null.",
    "Do not colour the figure itself; the change line carries the judgement.",
  ],

  a11y: {
    role: "A <dl>: each tile's label is the term, its figure and change the descriptions, so a reader hears \"Posters printed, 1,284, up 12% vs 1971\".",
    name: "None of its own; pass aria-label on the root when the row needs one (\"Printing this year\"). A Sparkline brings its own label.",
    keyboard: [
      { key: "—", does: "Nothing is focusable. A tile that should open a detail view needs a link inside it, not a click handler on the tile." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "the figure" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "label, comparison, empty state, the flat change" },
      { fg: "--ui-intent-success-fg", bg: "--ui-bg-surface", floor: "text", role: "a good change and its glyph" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-surface", floor: "text", role: "a bad change and its glyph" },
      { fg: "--ui-border-subtle", bg: "--ui-bg-surface", floor: "decorative", role: "the frame and the hairlines between tiles", why: "The tiles are separated by their own whitespace and content; the hairline groups, it carries nothing a reader needs." },
    ],
  },

  forwarding: {
    className: "StatTiles: root (the <dl>). StatTiles.Tile: the tile <div>.",
    ref: "StatTiles: root. StatTiles.Tile: the tile.",
    rest: "Each to the element its className lands on.",
  },

  needsDesign: [
        "Forced colours: both intent inks become CanvasText, so good and bad read the same; the glyph and the words carry the rest. Described, not drawn (sheet Gaps: Derived).",
  ],

  knownGaps: [
    "No tabular figures: Aspekta ships no `tnum` feature and its digits are proportional (367–602 units), so `tabular-nums` is a no-op in this face — figures right-align on their last digit but do not line up digit by digit, and a figure that changes in place changes width. Filed against the face (ADR 0011 item 5); pinned by registry/fonts/aspekta/aspekta.test.ts.",
    "The row's thresholds are container queries on the row itself (four across from 1120px, three from 840px), so they hold in any panel; the tile's sparkline moves under the text below 220px of tile content, which is read from the tile. A label longer than the sheet's 84px text column still wraps in a tile that keeps its sparkline beside it.",
    "The good/bad judgement is colour only for a screen reader: the direction is spoken (\"Up 12%\") and the polarity is not. A reader who needs it reads the label.",
    "Label, comparison and empty text are label-sm at 400, declared as type-role deviations as Chart's ticks are.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-13-0/44A4-0",
} as const;

export type StatTilesDoc = typeof statTilesDoc;
