/** Typed documentation for ChartCard (CONVENTIONS §11). */

export const chartCardDoc = {
  name: "ChartCard",
  status: "experimental",
  summary:
    "The Chart frame with a stat tile's figure and change under its title, so the card says how much, and whether that is good, before the plot is read. Below the head it is the Chart, untouched. By default one fading area; any Chart mark goes in as children.",

  anatomy: [
    { part: "root", slot: "chart", notes: "Chart's <figure>, with data-block=\"chart-card\". className, ref and the rest land here, as on Chart." },
    { part: "title", slot: "chart-title", notes: "Chart's own: label-md, primary." },
    { part: "headline", slot: "chart-headline", notes: "4px under the title: the figure (stat-value, `figure` role, tabular) and the change line (stat-delta) on one baseline, 12px apart." },
    { part: "description", slot: "chart-description", notes: "Still rendered and still the figure's aria-describedby; visually hidden. The figure has its printed place." },
    { part: "plot", slot: "chart-plot", notes: "Chart's. By default `<Chart.Areas wash=\"fade\" />`: the line over a wash at 28% that clears at the baseline." },
  ],

  composition: `
ChartCard                     value · delta? · label · description · data · x · xLabel · series
└─ children?                  Chart marks; default <Chart.Areas wash="fade" />
  `.trim(),

  props: {
    value: { type: "string", required: true, notes: "The headline figure, formatted by the caller — usually the plot's total or latest value. The card does not compute it." },
    delta: { type: "StatDeltaProps", notes: "The change and its comparison, exactly as on a StatTiles tile (change, comparison, polarity, format)." },
    description: { type: "string", required: true, notes: "Still required: it is the chart's accessible description. Not printed — decided 2026-11-11 (sheet Gaps: Conflict, resolved as drawn)." },
    children: { type: "ReactNode", default: "<Chart.Areas wash=\"fade\" />", notes: "The marks. Bars, lines, a rule — anything Chart takes." },
    "…Chart props": { type: "ChartProps", notes: "label, data, x, xLabel, series, size, format, isLoading, emptyText, tableLabel: as on Chart. `headline` is the card's own." },
  },

  do: [
    "Make the figure summarise the plot it sits on: its total, or its latest value.",
    "Write the description as the takeaway; a screen reader still hears it first.",
    "Use one series for the fading area; overlapping fades go muddy.",
  ],

  dont: [
    "Do not put a figure that the plot does not show — the card then makes two claims a reader has to reconcile.",
    "Do not repeat the takeaway as visible text under the figure; the head has one sentence's room and the figure uses it.",
  ],

  a11y: {
    role: "Chart's: a <figure> named by the title, described by the description. The figure and change are text in the head, read in order after the title.",
    name: "`label` via aria-labelledby; `description` via aria-describedby, though not printed.",
    keyboard: [
      { key: "Tab", does: "The table toggle, then the plot — Chart's keyboard, unchanged." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "title and figure" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "comparison" },
      { fg: "--ui-intent-success-fg", bg: "--ui-bg-surface", floor: "text", role: "a good change" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-surface", floor: "text", role: "a bad change" },
      { fg: "--ui-data-cat-1-solid", bg: "--ui-bg-surface", floor: "non-text", role: "the line over the fading wash" },
    ],
  },

  forwarding: {
    className: "root (Chart's figure)",
    ref: "root (Chart's figure)",
    rest: "root, through Chart",
  },

  needsDesign: [
    "The card in dark: the Stat tiles sheet draws only the tiles in dark; the fading wash in dark is the Line sheet's specimen, not this card's.",
  ],

  knownGaps: [
    "A sighted reader does not see the description. That was chosen; the figure is the card's summary instead.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-13-0/44A4-0",
} as const;

export type ChartCardDoc = typeof chartCardDoc;
