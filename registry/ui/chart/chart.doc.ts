/** Typed documentation for Chart (CONVENTIONS §11). */

export const chartDoc = {
  lead: "Makes a comparison visible, with a written takeaway and a table of the data.",
  name: "Chart",
  status: "experimental",
  summary:
    "Bars, lines and areas on a value axis, in a frame that always carries its title, its takeaway, a legend for two or more series and a view-as-table toggle. The plot is one tab stop with arrow-key navigation and polite announcements. BarChart, LineChart, AreaChart, ScatterPlot and Histogram are the presets; Chart with Chart.Bars / .Lines / .Areas / .Dots / .Rule children is the composition they are made of.",

  anatomy: [
    { part: "root", slot: "chart", notes: "A <figure> named by the title and described by the takeaway. bg-surface, border-subtle, radius-md, 24px inset, 16px between parts. className lands here." },
    { part: "title", slot: "chart-title", notes: "label-md, primary. The `label` prop." },
    { part: "description", slot: "chart-description", notes: "body-sm, muted. The `description` prop: the takeaway a person wrote, not a restatement of the axes. Visually hidden (still the accessible description) when a `headline` is passed." },
    { part: "headline", slot: "chart-headline", notes: "Optional, under the title, 4px down: an element the caller passes — ChartCard's figure and change. Takes the description's printed place." },
    { part: "table toggle", slot: "chart-table-toggle", notes: "Button secondary md, icon-only (ChartTable), aria-pressed. Swaps the plot for the table." },
    { part: "legend", slot: "chart-legend", notes: "Only for two or more series. Each entry is a native checkbox in a 24px label (8px inline padding, radius-sm, entries flush in a 24px band): checked is shown. An 8px key in the series' marker SHAPE and slot colour, the shape scaled to fill the box on its longer side so no point is clipped, then the name in label-sm 400, secondary ink; a hidden series keeps its key as a 1.5px round-joined outline, inset half the stroke so it stays inside the box and its name drops to muted. Hover fills the entry bg-hover; keyboard focus draws the focus ring on it. Hovering a shown entry dims every other series' marks to 0.32 (the Bar sheet's Interaction row), instantly." },
    { part: "hidden series", slot: "chart-legend-item[data-hidden]", notes: "Unchecking an entry removes its series from the marks, the tooltip and the keyboard; the group closes up. The value axis keeps the domain of EVERY series, so the marks that stay do not move. The table still lists it. The last shown series is aria-disabled — focusable, not hideable." },
    { part: "y axis", slot: "chart-y-axis", notes: "32px column of ticks, label-sm 400, muted, tabular figures, right-aligned and centred on their gridlines. Horizontal bars: a 168px lane of category names instead, one per row, capped at 40% of the row on a narrow frame, truncated (the full name is the span's title and is in the table view)." },
    { part: "plot", slot: "chart-plot", notes: "The one tab stop. 240px (md) or 160px (sm) tall; holds the SVG, the empty message and the tooltip." },
    { part: "grid", slot: "chart-grid", notes: "One solid 1px line per tick above zero, border-subtle." },
    { part: "baseline", slot: "chart-baseline", notes: "The zero line, border-default — one role stronger than the grid." },
    { part: "bar", slot: "chart-bar", notes: "At most 24px, 2px apart in a group, radius-sm at the data end and square at the baseline. Stacked: one column, 2px surface gaps, only the outer segment rounds. Horizontal: 24px rows 16px apart on a nice 0-based domain, no grid, no baseline. Forced colours: slot 1 solid CanvasText, slots 2–8 a hatch pattern in system colours inside a 1px CanvasText outline." },
    { part: "line", slot: "chart-line", notes: "stroke-thick (2px), round caps and joins, solid. A missing value breaks the line." },
    { part: "area", slot: "chart-area", notes: "The slot's -bg wash under its line; stacked areas are bands between cumulative lines. `wash=\"fade\"` (overlaid areas only) is the Line sheet's fading area instead: the slot's solid colour at 28% at the top of the area, clear at the baseline." },
    { part: "direct label", slot: "chart-direct-label", notes: "label-sm 600 primary, 16px right of a ringed end marker, in a 96px lane. Up to four series. A name longer than the lane's 80px drops every direct label and end marker (the legend or the title already names the lines), rather than painting past the frame." },
    { part: "rule", slot: "chart-rule", notes: "A solid 1px border-strong line at a value, with its required label above its end. The Line sheet sets the label in the direct-label lane; it moved above the rule so it cannot collide with a line ending near the same value. When a shown line runs through that place — a series ending a little over its own target — the label sits under the rule instead (data-placement=\"below\"), if that place is clear and inside the plot. Decided from the data, so the server draws the same side." },
    { part: "dot", slot: "chart-dot", notes: "Chart.Dots: the slot's marker shape at 4px inside a 2px bg-surface ring. Every shape has the area of the 4px circle and sits on its area centroid, so a square (7.09px) does not outweigh a circle and a triangle's centre is the data point, not its box's, so overlapping dots stay apart. The ring is the mark's own outline stroked 4px in the surface, mitred: 2px off every edge, slants and arms included. With areaKey a circle whose AREA follows the measure, 4px to 16px radius, at 85% fill so a dot under it still shows. Forced colours: the same fills as bars." },
    { part: "event rule", slot: "chart-rule[data-axis=x]", notes: "Chart.Rule at: a solid 1px border-strong line down the plot at a category, a date or a linear x, its label-sm label at the top, beside the line on the side with room (data-placement start | end)." },
    { part: "highlight", slot: "chart-highlight", notes: "Bars: the hovered or focused band in bg-hover, under the marks." },
    { part: "crosshair", slot: "chart-crosshair", notes: "Lines and areas: a 1px border-default rule at the category, with each series' ringed marker on it." },
    { part: "focus ring", slot: "chart-focus-ring", notes: "Keyboard only: 2px border-focus, 2px off the bar (radius 6) or around the point." },
    { part: "tooltip", slot: "chart-tooltip", notes: "bg-elevated, border-subtle, shadow-md, radius-md, 8/12 inset. The category in label-sm 600, then key · name (400, muted) · value (600, primary, tabular). Follows the pointer and the keyboard. aria-hidden: the announcer speaks. Positioned by the behaviour layer against a virtual anchor (the band, or the crosshair), fixed on the --ui-z-tooltip layer so a clipping ancestor cannot cut it, portalled into the chart's own figure so a brand theme still reaches it, and capped to the space the positioner measured." },
    { part: "x axis", slot: "chart-x-axis", notes: "Category ticks, centred in their band; on lines the first and last align to the plot edges. Thinned so labels never collide: the spacing is the widest name, measured after paint (a character-count guess before it, so the server agrees), plus 8px. A name thinned away is still in the tooltip, the announcement and the table view." },
    { part: "row value", slot: "chart-value", notes: "Horizontal bars: the value 8px past each bar's tip, label-sm 600, primary, tabular. Outside the bar on either side of zero." },
    { part: "table", slot: "chart-table", notes: "The data through Table (size sm): the category column, then one numeric column per series." },
    { part: "announcer", slot: "chart-announcer", notes: "A polite live region: \"category, series, value\" on every keyboard move." },
  ],

  composition: `
Chart                         label · description · data · x · xLabel · series
├─ Chart.Bars | Chart.Lines | Chart.Areas     the marks (direct children)
│    Chart.Dots areaKey? · areaLabel?         a scatter (xScale="linear"); bubbles with areaKey
│    Chart.Bars orientation="horizontal"      ranked rows: one series, alone
└─ Chart.Rule                 value · label — a solid, labelled threshold across the plot
                              at · label — or an event down it, at a category or a Date

BarChart / LineChart / AreaChart   = Chart with one mark, same props
ScatterPlot                         = Chart xScale="linear" + Chart.Dots (areaKey for bubbles)
Histogram                           = values binned on nice edges + Chart.Bars isAdjacent
BarChart orientation="horizontal"   series must be a one-element tuple, never stacked
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "The visible title and the accessible name." },
    description: { type: "string", required: true, notes: "The takeaway, written by a person. A chart without one leaves the reader to compute the point; a screen-reader user hears it first." },
    data: { type: "readonly Row[]", required: true, notes: "One row per category, in axis order. Values may be numbers or numeric strings; anything else is a missing value." },
    x: { type: "keyof Row", required: true, notes: "The field that names each category." },
    xFormat: { type: "Intl.NumberFormatOptions", notes: "A linear x's ticks and values. The tooltip and announcement prefix the value with xLabel (\"Share 42%\"), since a number on its own does not say what it measures." },
    xLabel: { type: "string", required: true, notes: "The first column's header in the table view (\"Year\")." },
    series: { type: "{ key; label; slot? }[]", required: true, notes: "One to eight. A ninth throws: it is never a generated colour (ADR 0023 §5). `slot` pins a series' colour so a filter that removes others cannot repaint it." },
    isStacked: { type: "boolean | { isPercent: boolean }", default: "false", notes: "Stack instead of grouping (bars) or overlaying (lines, areas). Positives stack up, negatives down. `{ isPercent: true }` stacks every category to 100%: marks and the value axis show shares (0–100%), the tooltip and announcement say the share then the value (\"42% (1,234)\"), and the table keeps the values. A percent stack refuses negative values — a negative has no share of a whole — and re-shares among the series still shown when one is hidden, as the whole is always 100%." },
    size: { type: '"md" | "sm"', default: '"md"', notes: "240px with five ticks, or 160px with three — the two plots the sheets draw." },
    format: { type: "Intl.NumberFormatOptions", notes: "For values and ticks. Never a format string (ADR 0023 §1)." },
    locale: { type: "string", notes: "Pass it when the server and the reader may differ, or the server's digits hydrate into the client's." },
    isLoading: { type: "boolean", default: "false", notes: "Skeleton columns in bg-sunken, no axis text, aria-busy; the frame keeps its height." },
    emptyText: { type: "string", notes: "Shown over a baseline-only plot when `data` is empty." },
    orientation: { type: '"vertical" | "horizontal"', default: '"vertical"', notes: "BarChart and Chart.Bars. Horizontal is the Bar sheet's ranked rows: names left, value at each tip, no axis or tooltip. The type takes exactly one series and no isStacked; Chart.Bars throws if given more, a rule or a second mark, because grouped and stacked rows are not designed." },
    tableLabel: { type: "string", default: '"View as table"', notes: "The toggle's accessible name." },
    xScale: { type: '"category" | "time" | "linear"', default: '"category"', notes: "Lines, areas and dots. `linear` reads numbers on a nice axis that need not reach zero and sorts the rows by x (onSelect still reports the index as given): the scatter's axis. `time` places each point at its date, so 1951, 1953 and 1961 are not equally far apart; the x field must hold Dates in ascending order (the chart parses nothing and throws otherwise). Ticks fall on whole UTC years, months or days — UTC so the server and the reader print the same markup — and need not be data points. The table, tooltip and announcement print each point's own date at the coarsest precision that tells them apart (\"1957\", \"Mar 1957\", \"Mar 4, 1957\"). BarChart refuses it in its type." },
    onSelect: { type: "(selection: { index; row; series }) => void", notes: "Enter or Space on the focused point, or a click on a category. `row` is the caller's own row; `series` is the focused series' key from the keyboard, and from a click the only series' key or null when the band holds several. The chart keeps and draws no selected state — no sheet draws one; the caller acts (opens a detail, filters a table). Without it the plot keeps the default cursor and Enter does nothing." },
    headline: { type: "ReactNode", notes: "A figure and its change under the title (ChartCard passes StatFigure). The description stops being printed and stays the accessible description — decided 2026-11-11 on the Stat tiles and Chart card sheet, because a printed sentence and a figure compete for the same glance." },
    wash: { type: '"flat" | "fade"', default: '"flat"', notes: "AreaChart and Chart.Areas. `fade` grades the wash to clear at the baseline so the line reads first. The AreaChart type refuses it with isStacked; Chart.Areas draws stacked bands flat whatever it is given." },
  },

  do: [
    "Write the description as the finding: 'Posters led books every year and peaked in 1972.'",
    "Pin `slot` on every series when the set of series can change.",
    "Use a Rule with a label for a target or threshold.",
    "Use `Chart.Rule at` for an event in time (a launch, a repositioning) — a solid line down the plot with its name at the top, never a dashed one.",
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
      { key: "Tab", does: "Each legend entry (two or more series), then the plot (one stop), which focuses the first value and announces it." },
      { key: "Space (legend)", does: "Hides or shows that series. On the last shown series, nothing: it is aria-disabled." },
      { key: "← / →", does: "Previous / next category." },
      { key: "↑ / ↓", does: "Next / previous series at the same category." },
      { key: "↓ / ↑ (horizontal)", does: "Next / previous row. ← / → do nothing: there is one series." },
      { key: "Home / End", does: "First / last category." },
      { key: "Escape", does: "Clears the focused value and its tooltip; focus stays on the plot." },
      { key: "Enter / Space", does: "With onSelect: selects the focused value. Focus and the announcement stay where they are." },
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
    "Histogram (`Chart.Bars isAdjacent`): bars fill their band 2px apart, bins named by en-dash ranges. The library's reading of the Plan's P1 row; drawn from code on the Rules, shares, dots and bins sheet (Gaps: Derived) and waiting for a designer's yes.",
    "Scatter and bubble (`Chart.Dots`, `ScatterPlot`): the library's reading of the Plan's P1 row and the stand-in screen's market map — the Line sheet's ringed markers as dots, a nice x axis that need not reach zero, pointer hit within 24px of a dot, a tooltip naming one reading. Drawn from code on the Rules, shares, dots and bins sheet (Gaps: Derived); not yet designed.",
    "Event rules (`Chart.Rule at`): a solid edge-strong line down the plot, its label-sm name at the top on the side with room. The library's own reading for the stand-in screen's \"Repositioned\" marker; drawn from code on the Rules, shares, dots and bins sheet (Gaps: Derived).",
    "100% stacks (`isStacked={{ isPercent: true }}`): drawn exactly as an absolute stack on a 0–100% axis, with the share before the value in the tooltip. Drawn from code on the Rules, shares, dots and bins sheet, without its tooltip row (Gaps: Derived).",
    "Two label behaviours added for the market-intelligence stand-in screen are described, not drawn: a rule label UNDER its rule when a line runs through its place above, and a line chart that drops its direct labels and end markers when a name is longer than the lane. No sheet shows either case (Line sheet and the Rules, shares, dots and bins sheet, Gaps: Absent).",
    "Marker shapes for slots 4–8 (diamond, triangle-down, plus, hexagon, pentagon): the Line sheet draws circle, square and triangle; all eight are drawn from code on the Rules, shares, dots and bins sheet (Gaps: Derived).",
    "Grouped and stacked horizontal bars. Long category names on a narrow frame: the name lane is capped at 40% of the row so the bars keep room at 320px, which is the library's reading — no sheet draws a phone-width bar chart.",
    "Forecast as muted ink over a confidence band: drawn on the Line sheet; the band needs its own role (sheet Gaps: Missing).",
    "Focus beside a neighbour: grouped, stacked and histogram marks sit 2px apart, so a ring 2px off the mark lands on the next one, where focus ink measures 1.0–1.9:1 light and 1.9–2.9:1 dark. The Bar sheet proposes a 6px surface halo under the ring, open at the baseline (Bar sheet: Focus in a group; Gaps: Measured). Not built.",
  ],

  knownGaps: [
    "A dense scatter (hundreds of dots) is still SVG: the Canvas tier of ADR 0023 §3.2 is not built, and the V0 spike that sets its threshold has not run. No Voronoi: the pointer finds the nearest dot within 24px by brute force, which is fine to a few thousand.",
    "The keyboard walks a scatter in x order, one series at a time (↑/↓ switch series). Dots that share an x are reached by index, not by position.",
    "No tabular figures: Aspekta ships no `tnum` feature and its digits are proportional (367–602 units), so `tabular-nums` is a no-op in this face — figures right-align on their last digit but do not line up digit by digit, and a figure that changes in place changes width. Filed against the face (ADR 0011 item 5); pinned by registry/fonts/aspekta/aspekta.test.ts.",
    "Forced-colours fills for slots 3–8 (135°, cross, horizontal, vertical, grid, outline) extend the anatomy sheet's two; confirmed by the maintainer on 2026-11-10 and not yet drawn back onto the sheet.",
    "Forced colours: bars and legend keys are hatched; lines and areas still rely on marker shape alone, since a hatched stroke is not drawn on any sheet.",
    "Ticks, legend names and tooltip names are label-sm at weight 400, declared as type-role deviations until the sheet's proposed data-tick role exists.",
    "The proposed --ui-data-grid / -axis / -label / -highlight roles are not added: they alias border-subtle, border-default, text-muted and bg-hover, and ADR 0023 §5 keeps aliases out until a chart needs a value none has.",
    "The area wash is the slot's -bg role (14% alpha); the sheet draws 10%.",
    "The fading wash's 28% is a constant in the component, not a token: it is the slot's own solid colour at an opacity, as the Line sheet draws it. In forced colours it relies on the line and marker, like every area.",
    "Light-scheme marks on the hover band fall to about 2.6:1 (sheet Gaps: Measured); the tooltip and the focus ring carry the value then.",
    "The time axis steps no finer than a day (no hours or minutes), and its type does not yet require the x field to be a Date: a string is refused when the chart renders, not when it compiles.",
    "The time axis is not drawn on a sheet: its ticks reuse the category axis's labels and pinning, at calendar boundaries instead of data points.",
    "onSelect draws no selected state: the chart sheets draw none, so a selection the caller keeps is invisible on the plot until one is designed.",
    "Legend emphasis is pointer-only, as drawn: focusing a legend entry or a series (↑/↓) does not dim the others. Dimmed marks fall below 3:1 by design; the emphasised series is the one being read.",
    "Hidden series are the chart's own state: there is no hiddenSeries / onHiddenSeriesChange pair yet, so a caller cannot start with a series hidden or persist the choice.",
    "Each legend entry is its own tab stop, so a chart with eight series puts eight stops before the plot. The plan's single-stop legend is not designed.",
    "Direct labels are not nudged apart when lines converge (sheet Gaps: Absent).",
  ],

  motion: "None yet. A data change redraws instantly; the plan's CSS transitions on `d` wait for a reduced-motion test.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-13-0/3XEJ-0",
} as const;

export type ChartDoc = typeof chartDoc;
