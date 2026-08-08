/** Typed documentation for Progress (CONVENTIONS §11). */

export const progressDoc = {
  name: "Progress",
  status: "stable",
  summary:
    "A determinate progress bar with an optional label and percentage. Two track heights (20/8px). A div with role=progressbar, because unlike a checkbox or button a progress bar has no native behaviour to inherit.",

  anatomy: [
    { part: "root", slot: "progress", notes: "The wrapper. className lands here (§5). Carries data-size." },
    { part: "label", slot: "progress-label", notes: "Names the bar via aria-labelledby. sr-only when isLabelHidden, never removed." },
    { part: "value", slot: "progress-value", notes: "The rounded percentage, shown only with hasValueText." },
    { part: "track", slot: "track", notes: "role=progressbar and the three ARIA value attributes. bg-sunken, pill." },
    { part: "fill", slot: "fill", notes: "Width-driven, not transform — scaling would squash the rounded ends into ellipses." },
  ],

  composition: `
Progress
├─ value          number (required) — clamped into 0…max
├─ max?           default 100
├─ label          string (required) — the accessible name
├─ isLabelHidden? / hasValueText?
└─ size?          lg (20px) | sm (8px)
  `.trim(),

  props: {
    value: { type: "number", required: true, notes: "Clamped into 0…max, and the CLAMPED value is what aria-valuenow reports — a bar wider than its track is a layout bug that only appears with real data." },
    max: { type: "number", default: "100", notes: "Reported as aria-valuemax rather than rescaled away, so '3 of 4' is announced as 3 of 4." },
    label: { type: "string", required: true, notes: "Required — a bar with no name announces only a number. Use isLabelHidden when the design shows none." },
    hasValueText: { type: "boolean", default: "false", notes: "Shows the rounded percentage beside the label, as the sheet draws it." },
    size: { type: '"md" | "sm"', default: '"md"', notes: "16px and 8px tracks, both drawn. RENAMED from lg|sm and the large track resized from 20px: the sheet draws --ui-space-lg (16), and Slider's own scale calls 16px `md`. A `lg` that meant 20px here and 24px there is exactly the shared-vocabulary problem CONVENTIONS §2 exists to prevent." },
    variant: {
      type: '"solid" | "gradient"',
      default: '"solid"',
      notes: "gradient paints --ui-gradient-brand, the sheet's three-stop spectrum. solid is the default because the fill is a meaningful graphic that must clear 3:1, which the accent role guarantees and a sweep cannot along its whole length. The gradient is BRANDABLE — a client's portal derives its own spectrum from its accent rather than inheriting Diorama's.",
    },
  },

  do: [
    "Give every bar a label, even when hidden; it is the accessible name.",
    "Use max for counts ('3 of 4 files') rather than converting to a percentage yourself.",
    "Use sm inline in dense lists and lg where progress is the point of the screen.",
  ],

  dont: [
    "Do not use Progress for an unknown duration — an indeterminate state is not drawn and is not implemented; see knownGaps.",
    "Do not animate the fill with a transform; the rounded ends distort.",
    "Do not put the percentage inside the track — the sheet puts it in the label row, where it stays legible at 8px.",
  ],

  a11y: {
    role: "progressbar, with aria-valuenow / -valuemin / -valuemax, all asserted in Chromium.",
    name: "The `label` prop via aria-labelledby. Hidden labels are sr-only, so they stay in the accessibility tree.",
    keyboard: [{ key: "—", does: "Not focusable. A progress bar is output, not a control." }],
    contrastPairs: [
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-sunken", floor: "non-text", role: "the fill against its track" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the value text" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the label" },
    ],
  },

  knownGaps: [
    "The gradient's contrast is not audited along its length — only its endpoints are knowable at token time. On a pale brand accent the lightest stop can fall under 3:1 against the track, which is why solid is the default and gradient is opt-in.",
    "No indeterminate state. Not drawn, and the commonest real need after this one.",
    "No intent colouring (a bar that turns danger near its limit) — not drawn.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/D8Q-0",
} as const;

export type ProgressDoc = typeof progressDoc;
