/** Typed documentation for Chart (CONVENTIONS §11). */

export const chartDoc = {
  name: "Chart",
  status: "experimental",
  summary:
    "Bars, lines and areas on a value axis, in a frame that always carries its title, its takeaway, a legend for two or more series and a view-as-table toggle. The plot is one tab stop with arrow-key navigation and polite announcements. BarChart, LineChart and AreaChart are the presets; Chart with Chart.Bars / .Lines / .Areas / .Rule children is the composition they are made of.",

  anatomy: [
    { part: "root", slot: "chart", notes: "A <figure> named by the title and described by the takeaway. bg-surface, border-subtle, radius-md, 24px inset, 16px between parts. className lands here." },
    { part: "title", slot: "chart-title", notes: "label-md, primary. The `label` prop." },
    { part: "description", slot: "chart-description", notes: "body-sm, muted. The `description` prop: the takeaway a person wrote, not a restatement of the axes. Visually hidden (still the accessible description) when a `headline` is passed." },
    { part: "headline", slot: "chart-headline", notes: "Optional, under the title, 4px down: an element the caller passes — ChartCard's figure and change. Takes the description's printed place." },
    { part: "table toggle", slot: "chart-table-toggle", notes: "Button secondary md, icon-only (ChartTable), aria-pressed. Swaps the plot for the table." },
    { part: "legend", slot: "chart-legend", notes: "Only for two or more series. An 8px key in the series' marker SHAPE and slot colour, then the name in label-sm 400, secondary ink. Hovering an entry dims every other series' marks to 0.32 (the Bar sheet's Interaction row), instantly." },
    { part: "y axis", slot: "chart-y-axis", notes: "32px column of ticks, label-sm 400, muted, tabular figures, right-aligned and centred on their gridlines. Horizontal bars: a 168px lane of category names instead, one per row, truncated (the table holds the full name)." },
    { part: "plot", slot: "chart-plot", notes: "The one tab stop. 240px (md) or 160px (sm) tall; holds the SVG, the empty message and the tooltip." },
    { part: "grid", slot: "chart-grid", notes: "One solid 1px line per tick above zero, border-subtle." },
    { part: "baseline", slot: "chart-baseline", notes: "The zero line, border-default — one role stronger than the grid." },
    { part: "bar", slot: "chart-bar", notes: "At most 24px, 2px apart in a group, radius-sm at the data end and square at the baseline. Stacked: one column, 2px surface gaps, only the outer segment rounds. Horizontal: 24px rows 16px apart on a nice 0-based domain, no grid, no baseline. Forced colours: slot 1 solid CanvasText, slots 2–8 a hatch pattern in system colours inside a 1px CanvasText outline." },
    { part: "line", slot: "chart-line", notes: "stroke-thick (2px), round caps and joins, solid. A missing value breaks the line." },
    { part: "area", slot: "chart-area", notes: "The slot's -bg wash under its line; stacked areas are bands between cumulative lines. `wash=\"fade\"` (overlaid areas only) is the Line sheet's fading area instead: the slot's solid colour at 28% at the top of the area, clear at the baseline." },
    { part: "direct label", slot: "chart-direct-label", notes: "label-sm 600 primary, 16px right of a ringed end marker, in a 96px lane. Up to four series." },
    { part: "rule", slot: "chart-rule", notes: "A solid 1px border-strong line at a value, with its required label above its end. The Line sheet sets the label in the direct-label lane; it moved above the rule so it cannot collide with a line ending near the same value." },
    { part: "highlight", slot: "chart-highlight", notes: "Bars: the hovered or focused band in bg-hover, under the marks." },
    { part: "crosshair", slot: "chart-crosshair", notes: "Lines and areas: a 1px border-default rule at the category, with each series' ringed marker on it." },
    { part: "focus ring", slot: "chart-focus-ring", notes: "Keyboard only: 2px border-focus, 2px off the bar (radius 6) or around the point." },
    { part: "tooltip", slot: "chart-tooltip", notes: "bg-elevated, border-subtle, shadow-md, radius-md, 8/12 inset. The category in label-sm 600, then key · name (400, muted) · value (600, primary, tabular). Follows the pointer and the keyboard. aria-hidden: the announcer speaks. Positioned by the behaviour layer against a virtual anchor (the band, or the crosshair), fixed on the --ui-z-tooltip layer so a clipping ancestor cannot cut it, portalled into the chart's own figure so a brand theme still reaches it, and capped to the space the positioner measured." },
    { part: "x axis", slot: "chart-x-axis", notes: "Category ticks, centred in their band; on lines the first and last align to the plot edges. Thinned so labels never collide." },
    { part: "row value", slot: "chart-value", notes: "Horizontal bars: the value 8px past each bar's tip, label-sm 600, primary, tabular. Outside the bar on either side of zero." },
    { part: "table", slot: "chart-table", notes: "The data through Table (size sm): the category column, then one numeric column per series." },
    { part: "announcer", slot: "chart-announcer", notes: "A polite live region: \"category, series, value\" on every keyboard move." },
  ],

  composition: `
Chart                         label · description · data · x · xLabel · series
├─ Chart.Bars | Chart.Lines | Chart.Areas     the marks (direct children)
│    Chart.Bars orientation="horizontal"      ranked rows: one series, alone
└─ Chart.Rule                 value · label — a solid, labelled threshold

BarChart / LineChart / AreaChart   = Chart with one mark, same props
BarChart orientation="horizontal"   series must be a one-element tuple, never stacked
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "The visible title and the accessible name." },
    description: { type: "string", required: true, notes: "The takeaway, written by a person. A chart without one leaves the reader to compute the point; a screen-reader user hears it first." },
    data: { type: "readonly Row[]", required: true, notes: "One row per category, in axis order. Values may be numbers or numeric strings; anything else is a missing value." },
    x: { type: "keyof Row", required: true, notes: "The field that names each category." },
    xLabel: { type: "string", required: true, notes: "The first column's header in the table view (\"Year\")." },
    series: { type: "{ key; label; slot? }[]", required: true, notes: "One to eight. A ninth throws: it is never a generated colour (ADR 0023 §5). `slot` pins a series' colour so a filter that removes others cannot repaint it." },
    isStacked: { type: "boolean", default: "false", notes: "Stack instead of grouping (bars) or overlaying (lines, areas). Positives stack up, negatives down." },
    size: { type: '"md" | "sm"', default: '"md"', notes: "240px with five ticks, or 160px with three — the two plots the sheets draw." },
    format: { type: "Intl.NumberFormatOptions", notes: "For values and ticks. Never a format string (ADR 0023 §1)." },
    locale: { type: "string", notes: "Pass it when the server and the reader may differ, or the server's digits hydrate into the client's." },
    isLoading: { type: "boolean", default: "false", notes: "Skeleton columns in bg-sunken, no axis text, aria-busy; the frame keeps its height." },
    emptyText: { type: "string", notes: "Shown over a baseline-only plot when `data` is empty." },
    orientation: { type: '"vertical" | "horizontal"', default: '"vertical"', notes: "BarChart and Chart.Bars. Horizontal is the Bar sheet's ranked rows: names left, value at each tip, no axis or tooltip. The type takes exactly one series and no isStacked; Chart.Bars throws if given more, a rule or a second mark, because grouped and stacked rows are not designed." },
    tableLabel: { type: "string", default: '"View as table"', notes: "The toggle's accessible name." },
    headline: { type: "ReactNode", notes: "A figure and its change under the title (ChartCard passes StatFigure). The description stops being printed and stays the accessible description — decided 2026-11-11 on the Stat tiles and Chart card sheet, because a printed sentence and a figure compete for the same glance." },
    wash: { type: '"flat" | "fade"', default: '"flat"', notes: "AreaChart and Chart.Areas. `fade` grades the wash to clear at the baseline so the line reads first. The AreaChart type refuses it with isStacked; Chart.Areas draws stacked bands flat whatever it is given." },
  },

  do: [
    "Write the description as the finding: 'Posters led books every year and peaked in 1972.'",
    "Pin `slot` on every series when the set of series can change.",
    "Use a Rule with a label for a target or threshold.",
  ],

  dont: [
    "Do not draw a dashed line for a target, forecast or secondary series — the solid-strokes rule holds (ADR 0023 §6).",
    "Do not put two measures with different units on one chart; there is no second axis by design.",
    "Do not pass more than five or six series in practice; slots 7 and 8 exist for the cases that truly need them.",
  ],

  a11y: {
    role: "<figure> named by the title and described by the takeaway. The plot is a role=group with one tab stop; the SVG is aria-hidden; the table view carries every value.",
    name: "`label` via aria-labelledby, `description` via aria-describedby, on the figure and on the plot.",
    keyboard: [
      { key: "Tab", does: "Enters the plot (one stop) and focuses the first value, announcing it." },
      { key: "← / →", does: "Previous / next category." },
      { key: "↑ / ↓", does: "Next / previous series at the same category." },
      { key: "↓ / ↑ (horizontal)", does: "Next / previous row. ← / → do nothing: there is one series." },
      { key: "Home / End", does: "First / last category." },
      { key: "Escape", does: "Clears the focused value and its tooltip; focus stays on the plot." },
    ],
    contrastPairs: [
      { fg: "--ui-data-cat-1-solid", bg: "--ui-bg-surface", floor: "non-text", role: "a mark on the chart surface (slots 2–8 are pinned in the contract)" },
      { fg: "--ui-border-default", bg: "--ui-bg-surface", floor: "decorative", role: "the baseline and crosshair: the ticks carry the scale", why: "Position is read from the tick labels and the table; the baseline orients and carries no value of its own." },
      { fg: "--ui-border-subtle", bg: "--ui-bg-surface", floor: "decorative", role: "gridlines", why: "Gridlines are reading aids; every value is in the tooltip, the announcement and the table." },
      { fg: "--ui-border-strong", bg: "--ui-bg-surface", floor: "non-text", role: "a rule (target, threshold)" },
      { fg: "--ui-border-focus", bg: "--ui-bg-surface", floor: "non-text", role: "the keyboard focus ring" },
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "title, direct labels, rule labels" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "description, ticks, empty message" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-surface", floor: "text", role: "legend names" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "tooltip category and values" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "tooltip series names" },
    ],
  },

  forwarding: {
    className: "root (the figure)",
    ref: "root (the figure)",
    rest: "root — every HTML attribute except title, which the `label` prop owns",
  },

  needsDesign: [
    "Marker shapes for slots 4–8 (diamond, triangle-down, plus, hexagon, pentagon): the sheets draw circle, square and triangle only.",
    "Grouped and stacked horizontal bars, and long category names on a narrow frame (the 168px lane is fixed).",
    "Forecast as muted ink over a confidence band: drawn on the Line sheet; the band needs its own role (sheet Gaps: Missing).",
    "Focus on a stacked bar: the ring wraps the segment, not the column (sheet Gaps: Absent).",
  ],

  knownGaps: [
    "Forced-colours fills for slots 3–8 (135°, cross, horizontal, vertical, grid, outline) extend the anatomy sheet's two; confirmed by the maintainer on 2026-11-10 and not yet drawn back onto the sheet.",
    "Forced colours: bars and legend keys are hatched; lines and areas still rely on marker shape alone, since a hatched stroke is not drawn on any sheet.",
    "Ticks, legend names and tooltip names are label-sm at weight 400, declared as type-role deviations until the sheet's proposed data-tick role exists.",
    "The anatomy specimen paints series 2 in --ui-data-div-neg-2, a token that does not exist; this follows the Bar sheet's slot 2.",
    "The proposed --ui-data-grid / -axis / -label / -highlight roles are not added: they alias border-subtle, border-default, text-muted and bg-hover, and ADR 0023 §5 keeps aliases out until a chart needs a value none has.",
    "The area wash is the slot's -bg role (14% alpha); the sheet draws 10%.",
    "The fading wash's 28% is a constant in the component, not a token: it is the slot's own solid colour at an opacity, as the Line sheet draws it. In forced colours it relies on the line and marker, like every area.",
    "Light-scheme marks on the hover band fall to about 2.6:1 (sheet Gaps: Measured); the tooltip and the focus ring carry the value then.",
    "No time scale: categories are labels in data order, equally spaced. Uneven dates need a time axis.",
    "Enter does not select yet: there is no onSelect.",
    "Legend emphasis is pointer-only, as drawn: the legend is not focusable, and keyboard series focus (↑/↓) does not dim the others. Dimmed marks fall below 3:1 by design; the emphasised series is the one being read.",
    "The plan's legend toggle (hiding a series, with checkbox semantics) is not drawn and not built.",
    "Direct labels are not nudged apart when lines converge (sheet Gaps: Absent).",
  ],

  motion: "None yet. A data change redraws instantly; the plan's CSS transitions on `d` wait for a reduced-motion test.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-13-0/3XEJ-0",
} as const;

export type ChartDoc = typeof chartDoc;
