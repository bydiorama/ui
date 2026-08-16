/** Typed documentation for Slider (CONVENTIONS §11). */

export const sliderDoc = {
  name: "Slider",
  status: "stable",
  summary:
    "A single-value slider in four track heights (8/16/24/32px) with a gradient fill, an optional label and value, optional stepper buttons and a slot for a value control. Pointer capture, keyboard stepping, RTL and touch come from the Base UI behaviour layer (ADR 0012).",

  anatomy: [
    { part: "label", slot: "slider-label", notes: "Names the control. Wired to the INPUT, not just the group — see a11y." },
    { part: "value", slot: "slider-value", notes: "The current value, shown with hasValueText." },
    { part: "control", slot: "slider-control", notes: "The pointer target. Padded ONLY at sm and md, each to exactly 24px; lg and xl clear the floor on their own and keep the sheet's row height." },
    { part: "row", slot: "slider-row", notes: "Holds the steppers, the track and the value control. Present whether or not the steppers are, so the track does not change shape when they appear." },
    { part: "track", slot: "slider-track", notes: "bg-sunken. A pill at sm/md/lg; radius-md at xl, so it matches the 32px controls it shares a row with." },
    { part: "fill", slot: "slider-fill", notes: "--ui-gradient-accent, from the start to the value. Rounded on its LEADING edge only: the fill ends at the thumb's centre, so a trailing radius curves away and leaves a crescent of bare track between fill and thumb. Square, the two read as one form, which is how the sheet draws it. A background-IMAGE, so it needs the `image:` hint — bg-(--ui-gradient-accent) would set a background-COLOUR and paint nothing." },
    { part: "decrement", slot: "slider-decrement", notes: "Optional. The shared 32px chrome control; steps down by one `step`." },
    { part: "increment", slot: "slider-increment", notes: "Optional. Steps up by one `step`." },
    { part: "thumb", slot: "slider-thumb", notes: "16/16/24/20px by size, bg-base with a 2px accent ring. Contains the native input[type=range] that IS the control." },
  ],

  composition: `
Slider
├─ label            string (required) — the accessible name
├─ value? / defaultValue?   number — one thumb, so a number, never an array
├─ onValueChange?   (value: number) => void
├─ min? / max? / step?
├─ size?            sm (8) | md (16) | lg (24) | xl (32, squared)
├─ hasSteppers?     boolean — requires decrementLabel AND incrementLabel
└─ valueControl?    ReactElement — the sheet puts a Select here
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a slider with no name announces only a number." },
    value: { type: "number", notes: "Controlled. A NUMBER, not an array: Base UI models one and many thumbs with the same type, and a one-thumb control should never make a caller destructure." },
    onValueChange: { type: "(value: number) => void", notes: "Narrowed from Base UI's number | number[]." },
    step: { type: "number", default: "1", notes: "Keyboard stepping and pointer snapping both honour it." },
    hasValueText: { type: "boolean", default: "false" },
    size: { type: '"sm" | "md" | "lg" | "xl"', default: '"md"', notes: "8/16/24/32px tracks, all four drawn. xl is the control-row height: it squares off to radius-md because the sheet draws it beside a 32px Select and a pill next to a soft-cornered control reads as a different family." },
    hasSteppers: { type: "boolean", default: "false", notes: "Renders the -/+ pair from the shared chrome control. They step by one `step` and clamp to min/max — the same arithmetic the keyboard performs, so the two cannot disagree. Each is disabled at its end of the range." },
    decrementLabel: { type: "string", notes: "REQUIRED with hasSteppers, by the type. Two icon-only buttons with no name announce as 'button, button', and the component cannot write the words: it has no i18n runtime (§9) and does not know what is being stepped." },
    incrementLabel: { type: "string", notes: "REQUIRED with hasSteppers." },
    valueControl: { type: "ReactElement", notes: "Slot, never wrapped (§3). The sheet puts a Select showing the value here. It is a slot rather than a built-in because the options and their formatting are the caller's data, and a Slider that owned an items prop would be two components in one." },
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
    "Do not remove the thumb's ring; white on the sheet's pale blue-80 measures 1.51:1 without it.",
    "Do not pass a Select's data to the Slider — compose it into valueControl instead.",
  ],

  a11y: {
    role: "slider, IMPLICIT: Base UI renders a native input[type=range] inside the thumb rather than a div with role=slider. Querying [role=\"slider\"] finds nothing, which is the point — the implicit role and its keyboard behaviour come from the platform.",
    name: "The `label` prop, via aria-labelledby on BOTH the group and the thumb. Naming only the group leaves the input itself unnamed — found in review, because the group's name does not name the control inside it.",
    keyboard: [
      { key: "Arrow keys", does: "Step by `step`. Asserted in Chromium." },
      { key: "Home / End", does: "Jump to min and max — the part a hand-rolled slider usually omits." },
      { key: "Tab", does: "Focuses the thumb's input; the ring draws on the thumb." },
    ],
    target: "Padded only where the track needs it: sm (8px) gains py-sm and md (16px) gains py-xs, both reaching exactly 24px; lg (24) and xl (32) already clear the floor and get nothing. A flat pad on all four was the first version and made three rows 16px taller than the sheet draws them, which no render gave away because the steppers centre inside whatever height the row has. Row heights are asserted per size in the browser test alongside the floor.",
    contrastPairs: [
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-sunken", floor: "non-text", role: "the THUMB's ring against the track — the thumb is what identifies the control and marks the value, so this is the pair SC 1.4.11 turns on" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-base", floor: "non-text", role: "the thumb's ring against the thumb's own white fill — a ring that vanishes into the thumb identifies nothing either" },
      { fg: "--ui-bg-accent-subtle", bg: "--ui-bg-sunken", floor: "decorative", why: "Stands in for the --ui-gradient-accent fill, which check:contrast cannot measure because a gradient is not a pair of roles. The ramp is the sheet's own blue-80 into blue-70 and is deliberately pale: measured 1.24:1 and 1.80:1 against the track in light. It is a SECONDARY cue, not the one the control is identified by — darkening it until the fill alone cleared 3:1 destroyed the sweep the design exists for. The thumb ring above carries conformance, and packages/tokens/src/resolve.test.ts asserts it for every stress brand." },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the value text" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the label" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The fill's ramp measures 1.24:1 and 1.80:1 against the track in light. It is shipped AS DRAWN, on the designer's instruction to preserve the gradients, and it is defensible: the thumb identifies the control and marks the value, and its ring is floored at 3:1. Worth a decision on the record rather than a silent one, because the token contract's own note for --ui-bg-accent-legible cites a slider fill as a reason that role exists.",
    "The sheet's thumb ring is the raw --ui-blue-80, which puts the white thumb at 1.51:1 against its own ring — the ring would be invisible on the thumb. Shipped as --ui-bg-accent-legible (3.73:1) instead, which is where this component already landed once.",
    "The thumb's shadow is a raw hex in the sheet (#1D1B191F 1px 1px 4px) rather than a --ui-shadow-* role. Shipped as shadow-sm.",
    "The xl thumb is drawn as a 20px frame with no fill or radius of its own, so its shape is inferred from the render rather than specified. Shipped as a 20px round thumb like the others; confirm whether it is meant to be the vertical pill the render suggests.",
    "No hover, focus or disabled state is drawn for the stepper buttons; they take the shared chrome control's.",
  ],

  knownGaps: [
    "Single value only. A range slider is a different control and is not drawn.",
    "No tick marks, no aria-valuetext formatting (a slider reporting bytes still announces a bare number), and no vertical orientation. None are drawn.",
    "The steppers are plain buttons rather than a NumberField: they change the slider's own value, so the slider stays the single source of it. A caller wanting a typable number field should compose one into valueControl and drive both from the same state.",
    "The steppers only work on a CONTROLLED slider. They read `value ?? defaultValue` and call onValueChange, so an uncontrolled slider with steppers steps once from its default and then stops — it has no way to read what the thumb has since been dragged to. Controlled is the only sensible pairing and the story shows it that way.",
  ],

  motion:
    "The thumb transitions `box-shadow` at --ui-duration-fast with --ui-ease-out, which is the focus ring settling. The thumb's POSITION is not transitioned — it tracks the pointer and the arrow keys directly, because interpolating there would put the control behind the input driving it.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/D86-0",
} as const;

export type SliderDoc = typeof sliderDoc;
