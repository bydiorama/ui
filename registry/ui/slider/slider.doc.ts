/** Typed documentation for Slider (CONVENTIONS §11). */

export const sliderDoc = {
  name: "Slider",
  status: "stable",
  summary:
    "A single-value slider in two track heights (20/8px), with an optional label and value. Pointer capture, keyboard stepping, RTL and touch come from the Base UI behaviour layer (ADR 0012).",

  anatomy: [
    { part: "label", slot: "slider-label", notes: "Names the control. Wired to the INPUT, not just the group — see a11y." },
    { part: "value", slot: "slider-value", notes: "The current value, shown with hasValueText." },
    { part: "control", slot: "slider-control", notes: "The pointer target. Padded so it clears 24px even when the painted track is 8px." },
    { part: "track", slot: "slider-track", notes: "bg-sunken, pill." },
    { part: "fill", slot: "slider-fill", notes: "The accent role, from the start to the value." },
    { part: "thumb", slot: "slider-thumb", notes: "20px, bg-base with a 2px accent ring. Contains the native input[type=range] that IS the control." },
  ],

  composition: `
Slider
├─ label            string (required) — the accessible name
├─ value? / defaultValue?   number — one thumb, so a number, never an array
├─ onValueChange?   (value: number) => void
├─ min? / max? / step?
└─ size?            lg (20px) | sm (8px)
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a slider with no name announces only a number." },
    value: { type: "number", notes: "Controlled. A NUMBER, not an array: Base UI models one and many thumbs with the same type, and a one-thumb control should never make a caller destructure." },
    onValueChange: { type: "(value: number) => void", notes: "Narrowed from Base UI's number | number[]." },
    step: { type: "number", default: "1", notes: "Keyboard stepping and pointer snapping both honour it." },
    hasValueText: { type: "boolean", default: "false" },
    size: { type: '"lg" | "sm"', default: '"lg"', notes: "20px and 8px tracks, both drawn." },
    isDisabled: { type: "boolean", default: "false" },
  },

  do: [
    "Give every slider a label; it becomes the accessible name.",
    "Set a step that matches the quantity — a slider that reports 62.4718 is worse than one that reports 62.",
    "Use hasValueText whenever the value is not visible elsewhere; a slider alone does not say where it is.",
  ],

  dont: [
    "Do not use this for a range. A two-thumb slider has its own ARIA and a minimum-gap rule, and neither is drawn or implemented.",
    "Do not shrink the control to the painted track — the 8px size keeps a 24px target on purpose (SC 2.5.8).",
    "Do not remove the thumb's ring; white on the pale accent is 1.5:1 without it.",
  ],

  a11y: {
    role: "slider, IMPLICIT: Base UI renders a native input[type=range] inside the thumb rather than a div with role=slider. Querying [role=\"slider\"] finds nothing, which is the point — the implicit role and its keyboard behaviour come from the platform.",
    name: "The `label` prop, via aria-labelledby on BOTH the group and the thumb. Naming only the group leaves the input itself unnamed — found in review, because the group's name does not name the control inside it.",
    keyboard: [
      { key: "Arrow keys", does: "Step by `step`. Asserted in Chromium." },
      { key: "Home / End", does: "Jump to min and max — the part a hand-rolled slider usually omits." },
      { key: "Tab", does: "Focuses the thumb's input; the ring draws on the thumb." },
    ],
    target: "The control is padded to 24px even at the 8px size, so the affordance stays thin while the target stays legal.",
    contrastPairs: [
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-sunken", floor: "non-text", role: "the fill against its track" },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the value text" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the label" },
    ],
  },

  knownGaps: [
    "Single value only. A range slider is a different control and is not drawn.",
    "No tick marks, no aria-valuetext formatting (a slider reporting bytes still announces a bare number), and no vertical orientation. None are drawn.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/D86-0",
} as const;

export type SliderDoc = typeof sliderDoc;
