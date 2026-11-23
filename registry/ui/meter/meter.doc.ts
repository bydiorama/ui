/** Typed documentation for Meter (CONVENTIONS §11). */

export const meterDoc = {
  lead: "Places a measurement within a known range.",
  name: "Meter",
  status: "experimental",
  summary:
    "One value against a range — a gauge, not a task. A labelled 8px bar (or an 80px ring) with role=meter, an optional target rule, and warning/danger states that must carry their own words. Use Progress for something that finishes; use Meter for something that is measured.",

  anatomy: [
    { part: "root", slot: "meter", notes: "className lands here (§5). Carries data-shape and data-status; aria-busy while loading." },
    { part: "label", slot: "meter-label", notes: "label-sm, muted. Names the meter via aria-labelledby. sr-only with isLabelHidden, and always on the radial shape." },
    { part: "value", slot: "meter-value", notes: "label-sm 600, primary, tabular-nums. The printed reading, status words included. aria-hidden: aria-valuetext announces the same string." },
    { part: "bar", slot: "meter-bar", notes: "role=meter with aria-valuenow/-min/-max/-valuetext. 8px tall, or 16px when a target rule crosses it." },
    { part: "track", slot: "meter-track", notes: "bg-sunken pill (space-sm high). On the radial shape, an r=34 ring stroked at the same thickness." },
    { part: "fill", slot: "meter-fill", notes: "accent-legible, or the warning / danger ink. Pill ends; absent at zero. On radial, an arc from 12 o'clock, clockwise." },
    { part: "target", slot: "meter-target", notes: "A solid 2px rule (stroke-thick) in border-strong, the full 16px height." },
    { part: "target label", slot: "meter-target-label", notes: "label-sm muted, under the rule: starts at it in the first half of the range, ends at it in the second." },
    { part: "status", slot: "meter-status", notes: "Radial only: the status words under the ring, where the linear meter prints them after the value." },
    { part: "empty", slot: "meter-empty", notes: "value=null: the emptyText in place of the reading, above an empty track." },
  ],

  composition: `
Meter
├─ label            string (required)
├─ value            number | null (required) — null requires emptyText
├─ min? / max?      default 0 / 100
├─ valueText?       default: rounded percentage of the range
├─ status?          warning | danger — requires statusText
├─ shape?           linear | radial
├─ target?          number — linear only, requires targetText
└─ isLoading? / isLabelHidden?
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a meter with no name announces only a number." },
    value: { type: "number | null", required: true, notes: "Clamped into min…max, and the clamped value is what aria-valuenow reports. null means no reading yet and requires emptyText, because an empty bar with no words reads as zero." },
    valueText: { type: "string", notes: "What the reading reads as, printed AND announced. Pass it for units ('412 of 600 sheets'); the default percentage uses no locale, so a server and a client cannot disagree about it." },
    status: { type: '"warning" | "danger"', notes: "Recolours the fill with the intent ink and REQUIRES statusText ('near limit'), appended to the value. The type enforces it: a state carried by colour alone fails SC 1.4.1." },
    shape: { type: '"linear" | "radial"', default: '"linear"', notes: "radial is the sheet's 80px ring beside a stat. It takes no target — none is drawn on it — and the type refuses one rather than ignoring it." },
    target: { type: "number", notes: "A goal on the same scale, drawn as a solid rule (never a dashed one, ADR 0023 §6). Requires targetText." },
    isLoading: { type: "boolean", default: "false", notes: "Empty track, no reading, aria-busy. The height is reserved, so a row of meters never jumps." },
  },

  do: [
    "Use Meter for a level that can rise and fall: stock, quota, capacity, a score.",
    "Write statusText as the consequence, not the colour: 'near limit', 'over budget'.",
    "Pass valueText when the unit is not a percentage.",
  ],

  dont: [
    "Do not use Meter for something that completes — that is Progress.",
    "Do not encode warning or danger by colour alone; the type will not let you omit statusText.",
    "Do not put two meters' values on one scale with different maxima side by side without saying so in valueText.",
  ],

  a11y: {
    role: "meter (ARIA 1.2) on the bar or ring, with aria-valuenow, -valuemin, -valuemax and aria-valuetext. With no reading the track is aria-hidden and the emptyText carries the state — aria-valuenow is never invented.",
    name: "`label` via aria-labelledby; sr-only when hidden, never removed.",
    keyboard: [{ key: "—", does: "Not focusable. A meter is output, not a control." }],
    contrastPairs: [
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-sunken", floor: "non-text", role: "the fill against its track" },
      { fg: "--ui-intent-warning-fg", bg: "--ui-bg-sunken", floor: "non-text", role: "the warning fill against its track" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-sunken", floor: "non-text", role: "the danger fill against its track" },
      { fg: "--ui-border-strong", bg: "--ui-bg-surface", floor: "non-text", role: "the target rule on a card" },
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "the value" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "the label, target label and empty text" },
    ],
  },

  forwarding: {
    className: "root",
    ref: "root (an HTMLDivElement) — a meter is not a form control, so there is no inner element to prefer",
    rest: "root — every HTML attribute except role, children and value, which the component owns",
  },

  needsDesign: [
    "The radial shape's status words: the sheet draws the ring only in its resting state, so 'near limit' is placed under the ring here without a drawing.",
    "The radial shape's visible label: the sheet pairs the ring with a stat and draws no label, so the label is screen-reader only.",
  ],

  knownGaps: [
    "No tabular figures: Aspekta ships no `tnum` feature and its digits are proportional (367–602 units), so `tabular-nums` is a no-op in this face — figures right-align on their last digit but do not line up digit by digit, and a figure that changes in place changes width. Filed against the face (ADR 0011 item 5); pinned by registry/fonts/aspekta/aspekta.test.ts.",
    "The target rule is border-strong, where the sheet draws text-primary: an ink role used as a fill is the wrong-category signal (add-component §2), and border-strong is the line role already audited at 3:1 on the page and the card.",
    "Meter vs Progress Indicator Circular (TODO.md) is not settled; the sheet's Gaps row records it as a Conflict.",
    "On the stress brand the track is 1.12:1 on white, so the end of the range is near invisible; the printed reading has to stay (sheet, Measured).",
    "No intent thresholds (low/high/optimum as on native <meter>): the consumer decides the status, so the words are always theirs.",
  ],

  motion: "None. A new value redraws; a gauge that animates on every update draws the eye to a change that may not matter.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-13-0/3XK9-0",
} as const;

export type MeterDoc = typeof meterDoc;
