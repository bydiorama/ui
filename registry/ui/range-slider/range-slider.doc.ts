/** Typed documentation for RangeSlider (CONVENTIONS §11). */

export const rangeSliderDoc = {
  lead: "Sets the lower and upper ends of a range.",
  name: "RangeSlider",
  status: "stable",
  summary:
    "Two thumbs on one track; the fill is the span between them. A filter for 'from what, to what' — years, prices, sizes. Everything visible is Slider's — the same track ladder and the same thumb, read from Slider's own geometry table — while three things differ: the value is a pair, each thumb is its own named input, and the thumbs may meet but never cross. Base UI Slider underneath (ADR 0012).",

  anatomy: [
    { part: "root", slot: "range-slider", notes: "The group, and where className lands — named so an effect or a test can reach a part from it (ADR 0022). Before 2026-11-06 this slot named the header row, and the root had none." },
    { part: "header", slot: "range-slider-header", notes: "The row above the track holding the label and the readout; carries data-size." },
    { part: "label", slot: "slider-label", notes: "Names the GROUP. body-sm, --ui-text-muted." },
    { part: "readout", slot: "slider-value", notes: "Both ends with a spaced en dash — \"1925 – 1972\" — tabular figures, --ui-text-primary. Equal ends collapse to one number. On by default." },
    { part: "control", slot: "slider-control", notes: "Slider's control, character for character: padded to the 24px target at sm/md and inset by half a thumb, so both thumbs' outer edges land on the control's edges at the extremes." },
    { part: "track", slot: "slider-track", notes: "--ui-bg-sunken; Slider's heights and radii by size." },
    { part: "fill", slot: "slider-fill", notes: "FLAT --ui-bg-accent between the thumbs' centres, square at both ends (they run under the thumbs). Flat because a span has no direction — the gradient says 'more toward the end', which is true of one value and not of an interval. It is the gradient's own first stop." },
    { part: "thumbs", slot: "slider-thumb", notes: "Two of Slider's thumb, data-end=\"start\" | \"end\". Each holds its own input[type=range]. The thumb being moved, or hovered, lifts to --ui-shadow-md — only that one — and Base UI paints it above the other." },
    { part: "range-slider", slot: "range-slider", notes: "The label row: label and readout." },
  ],

  composition: `
RangeSlider
├─ label                 string (required) — names the group
├─ startThumbLabel       string (required) — names thumb 1
├─ endThumbLabel         string (required) — names thumb 2
├─ value? / defaultValue?   readonly [number, number]
├─ onValueChange?        (value: readonly [number, number]) => void
├─ min? / max? / step?
├─ minStepsBetweenValues? number, default 0
├─ formatValue?          (value: number) => string — per end
├─ hasValueText?         boolean, default true
├─ size?                 sm | md | lg | xl — Slider's ladder
└─ valueControl?         ReactElement — e.g. two Input sm
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Names the group (aria-labelledby on the root)." },
    startThumbLabel: { type: "string", required: true, notes: "REQUIRED by the type. Each thumb is its own input and needs its own name — 'Earliest year'. Written as aria-label: an aria-labelledby would outrank it and name both thumbs after the group." },
    endThumbLabel: { type: "string", required: true, notes: "REQUIRED by the type — 'Latest year'." },
    value: { type: "readonly [number, number]", notes: "Controlled. A tuple, not number[]: there are exactly two thumbs, and the type says so." },
    defaultValue: { type: "readonly [number, number]", default: "[min, max]", notes: "Uncontrolled starting pair — the full range unless given." },
    onValueChange: { type: "(value: readonly [number, number]) => void", notes: "Always the pair, in order." },
    minStepsBetweenValues: { type: "number", default: "0", notes: "How close the thumbs may get, in steps. They may meet but never cross: a dragged thumb stops at the other rather than pushing it (Base UI's default) or swapping. Pushing moves a value the user was not touching." },
    formatValue: { type: "(value: number) => string", notes: "One END as text, applied to each. The readout joins them with ' – '; each thumb's aria-valuetext is its own end. Without it the ends use the locale's number format — pass String for years, or 1925 reads '1,925'." },
    hasValueText: { type: "boolean", default: "true", notes: "On by default, unlike Slider: a range with no readout cannot be read without dragging both ends. Turn it off only when a valueControl shows the ends." },
    size: { type: '"sm" | "md" | "lg" | "xl"', default: '"md"', notes: "Slider's track ladder (8/16/24/32), read from the same table." },
    valueControl: { type: "ReactElement", notes: "Slot under the track, never wrapped (§3). The sheet composes two Input sm fields with an en dash between, sharing the slider's state both ways (story: WithFields)." },
    isDisabled: { type: "boolean", default: "false", notes: "As Slider: --ui-text-disabled, the fill --ui-bg-field-chrome-disabled, both rings --ui-border-subtle with no shadow." },
  },

  do: [
    "Name both thumbs for what they bound — 'Earliest year' / 'Latest year', 'Minimum price' / 'Maximum price'.",
    "Pass formatValue whenever the locale's number format is wrong for the quantity — years, currencies, units.",
    "Format the full range as the filter it is ('Any year') when that is what it means.",
  ],

  dont: [
    "Do not use a RangeSlider for one value with a tolerance — that is a Slider and a field.",
    "Do not hide the readout unless a valueControl shows both ends.",
  ],

  a11y: {
    role: "A group (the root, aria-labelledby the label) holding TWO sliders — each thumb renders a native input[type=range], so the role is implicit and the keyboard behaviour is the platform's.",
    name: "Each input is named by its own aria-label (startThumbLabel / endThumbLabel), never by the group's label: Base UI falls back to the group's label only when a thumb has none, and two thumbs named alike announce as 'slider, slider'.",
    value: "aria-valuenow is each thumb's own end; formatValue becomes that thumb's aria-valuetext. Announced as 'Earliest year, slider, 1925'.",
    focus: "The ring draws on the focused thumb only, keyed off :has(:focus-visible) because the input inside the thumb is what takes focus.",
    keyboard: [
      { key: "Tab", does: "Start thumb, then end thumb." },
      { key: "Arrow keys", does: "Move the focused thumb by `step`; it stops at the other thumb (plus minStepsBetweenValues). Asserted in Chromium." },
      { key: "Shift + Arrow / Page Up / Page Down", does: "Move by ten steps, with the same stop." },
      { key: "Home / End", does: "The focused thumb's own reachable ends." },
    ],
    pointer: "A press on the bare track moves the NEAREST thumb there; a dragged thumb stops at the other one. Both asserted in Chromium — the drag is the only path that reaches the collision rule, because Base UI clamps key presses whatever the rule is.",
    target: "As Slider: the control is padded to 24px where the track is thinner.",
    contrastPairs: [
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-sunken", floor: "non-text", role: "each thumb's ring against the track — the thumbs identify the control and mark both ends" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-base", floor: "non-text", role: "each thumb's ring against its own white fill" },
      { fg: "--ui-bg-accent", bg: "--ui-bg-sunken", floor: "decorative", why: "The span fill: 1.24:1 on the track in light — the same pale accent as Slider's ramp start, a secondary cue. The thumbs carry SC 1.4.11 (the pairs above) and the readout states both ends as text." },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the readout" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the label" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "Dark: the ring (--ui-bg-accent-legible = #9EDBF3) is the same colour as the span fill, so over the fill the ring disappears and each thumb is read by its body — #171411 on #9EDBF3, 12.1:1 (re-measured on the 2026-11-03 warm-ink dark ramp). Passes; recorded so nobody 'fixes' the ring.",
    "Hover on the control as a whole is not drawn for a range — only the moving thumb lifts. Shipped as the hovered or moving thumb lifting alone.",
  ],

  knownGaps: [
    "No tabular figures: Aspekta ships no `tnum` feature and its digits are proportional (367–602 units), so `tabular-nums` is a no-op in this face — figures right-align on their last digit but do not line up digit by digit, and a figure that changes in place changes width. Filed against the face (ADR 0011 item 5); pinned by registry/fonts/aspekta/aspekta.test.ts.",
    "No histogram over the track (the price-filter pattern) and no tick marks. Neither is drawn.",
    "No steppers: two pairs of −/+ beside one track has no drawn layout.",
    "No inline variant — the bar has room for one value.",
    "The sheet draws 'From' / 'To' prefixes INSIDE the two fields. Input has no text-prefix slot (only an icon), so the composed fields are named by visually-hidden labels instead. A prefix slot is Input's gap, not this component's.",
  ],

  motion:
    "Each thumb transitions box-shadow at --ui-duration-fast with --ui-ease-out — the hover/drag lift and the focus ring settling. Positions are never transitioned; the thumbs and the span track the pointer and the keys directly.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-Z-0",
} as const;

export type RangeSliderDoc = typeof rangeSliderDoc;
