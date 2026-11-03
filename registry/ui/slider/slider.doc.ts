/** Typed documentation for Slider (CONVENTIONS §11). */

export const sliderDoc = {
  name: "Slider",
  status: "stable",
  summary:
    "A single-value slider in three shapes: a TRACK in four heights (8/16/24/32px) with a gradient fill, optional steppers and a value-control slot; an INLINE bar (32/40/48px) with the label and value inside it, for dense panels; and a BALANCE slider whose fill grows from an origin toward the thumb, between two named poles. Pointer capture, keyboard stepping, RTL and touch come from the Base UI behaviour layer (ADR 0012). Two thumbs are RangeSlider.",

  anatomy: [
    { part: "label", slot: "slider-label", notes: "Names the control. Wired to the INPUT, not just the group — see a11y. Track: body-sm, --ui-text-muted, above the track. Inline: inside the bar at the start, --ui-text-secondary (muted measures 4.1:1 on the hover wash), truncating with an ellipsis." },
    { part: "value", slot: "slider-value", notes: "The current value — formatValue's text when given. Tabular figures, so it does not shimmer under a drag. Track: shown with hasValueText. Inline: always shown, at the bar's end; it never truncates." },
    { part: "control", slot: "slider-control", notes: "The pointer target and the hover group: anywhere on it lifts the thumb, because a press anywhere moves it. Track: padded ONLY at sm and md, each to exactly 24px; inset by half a thumb. Inline: IS the bar — --ui-bg-elevated, radius-md, overflow clip, and it carries the focus ring." },
    { part: "row", slot: "slider-row", notes: "Track only. Holds the steppers, the track and the value control. Present whether or not the steppers are, so the track does not change shape when they appear." },
    { part: "track", slot: "slider-track", notes: "Track: --ui-bg-sunken, a pill at sm/md/lg and radius-md at xl, so it matches the 32px controls it shares a row with. Inline: the bar's whole box, unpainted." },
    { part: "fill", slot: "slider-fill", notes: "Track: --ui-gradient-accent from the start to the value, rounded on its LEADING edge only — a trailing radius would curve away from the thumb and leave a crescent of bare track. With an origin: from the origin to the value, square at both ends, the ramp mirrored below the origin so it deepens toward the thumb. Inline: the flat --ui-bg-accent-subtle wash (a gradient behind text puts it on two grounds), stepping to --ui-bg-accent-subtle-hover on hover and drag." },
    { part: "origin", slot: "slider-origin", notes: "Only with `origin`. Track: a 2px --ui-border-default tick, the track's height plus space-xs above and below, above the fill and below the thumb — so at the origin its ends show above and below the thumb. Inline: two 2x6 notches on the bar's top and bottom edges, so it never reads as a second handle or crosses the label." },
    { part: "thumb", slot: "slider-thumb", notes: "Contains the native input[type=range] that IS the control. Track: 16/16/24px circles and a 16x32 pill at xl; --ui-bg-base with a 2px --ui-bg-accent-legible ring and --ui-shadow-sm, lifting to --ui-shadow-md on hover and drag. Inline: a 2px handle, the bar minus 8 above and below, --ui-border-strong stepping to --ui-text-primary." },
    { part: "poles", slot: "slider-poles", notes: "Track only, with startLabel / endLabel: caption under the track's ends, aligned to the control's edges. --ui-text-muted; the pole the value leans toward (relative to the origin) turns --ui-text-primary. Parts: slider-pole-start, slider-pole-end, each with data-leaning." },
    { part: "decrement", slot: "slider-decrement", notes: "Optional, track only. The shared 32px chrome control; steps down by one `step`." },
    { part: "increment", slot: "slider-increment", notes: "Optional, track only. Steps up by one `step`." },
    { part: "content", slot: "slider-content", notes: "Inline only. The row holding label and value, laid over the bar with pointer-events: none so every press reaches the bar. Inset 8 / 12 / 16 by size." },
  ],

  composition: `
Slider
├─ label            string (required) — the accessible name
├─ value? / defaultValue?   number — one thumb, so a number, never an array
├─ onValueChange?   (value: number) => void
├─ min? / max? / step?
├─ formatValue?     (value: number) => string — shown AND announced
├─ getAriaValueText? (value: number) => string — overrides the announcement only
├─ origin?          number — the fill grows from here; makes it bipolar
├─ variant?         "track" (default)
│  ├─ size?         sm (8) | md (16) | lg (24) | xl (32, squared)
│  ├─ startLabel? / endLabel?  string — the poles, under the track
│  ├─ hasSteppers?  boolean — requires decrementLabel AND incrementLabel
│  └─ valueControl? ReactElement
└─ variant="inline"
   └─ size?         sm (32) | md (40) | lg (48) — no steppers, poles or value control
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a slider with no name announces only a number." },
    value: { type: "number", notes: "Controlled. A NUMBER, not an array: Base UI models one and many thumbs with the same type, and a one-thumb control should never make a caller destructure. Uncontrolled works too — the value is held internally either way, which is what lets the steppers, the origin fill and the leaning pole follow the thumb." },
    onValueChange: { type: "(value: number) => void", notes: "Narrowed from Base UI's number | number[]. Also fires when the origin detent snaps a released value onto the origin." },
    step: { type: "number", default: "1", notes: "Keyboard stepping, pointer snapping and the origin's detent radius all honour it." },
    variant: { type: '"track" | "inline"', default: '"track"', notes: "inline puts the label and value inside a field-height bar with a 2px handle, for panels of many settings. It takes sm/md/lg on the field ladder (32/40/48); xl, steppers, poles and the value control are track-only, and the type refuses them on inline." },
    size: { type: '"sm" | "md" | "lg" | "xl"', default: '"md"', notes: "Track: 8/16/24/32px. xl is the control-row height and squares off to radius-md, because the sheet draws it beside a 32px Select. Inline: sm | md | lg only." },
    origin: { type: "number", notes: "Where the fill starts; defaults to min. Inside the range it makes the slider bipolar — a sentiment slider between two poles: the origin mark is drawn, the fill runs from it toward the thumb (mirrored below it), and a POINTER released within one step of it lands on it. Keyboard steps are never snapped, or the step beside the origin could not be reached. Clamped to min/max." },
    startLabel: { type: "string", notes: "Track only. The start pole — 'Casual'. Drawn under the track's start in caption, --ui-text-muted, turning --ui-text-primary when the value leans that way. Usable without an origin as plain endpoint labels." },
    endLabel: { type: "string", notes: "Track only. The end pole — 'Formal'." },
    formatValue: { type: "(value: number) => string", notes: "The value as words or with its unit — 'Mostly formal', '12 px', '45°'. Shown in the value slot AND written to aria-valuetext, so what is seen and what is heard cannot drift. A balance slider should always pass one: 70 means nothing between Casual and Formal." },
    getAriaValueText: { type: "(value: number) => string", notes: "Overrides formatValue for the ANNOUNCEMENT only, when what is heard should differ from what is shown ('12 px' shown, '12 pixels' heard). Without either, a screen reader announces the bare number. Restated as (value) => string rather than Base UI's (formattedValue, value, index): one thumb has no index." },
    hasValueText: { type: "boolean", default: "false", notes: "Track only — inline always shows its value, because with no thumb the number is the readout." },
    hasSteppers: { type: "boolean", default: "false", notes: "Track only. Renders the -/+ pair from the shared chrome control. They step by one `step` from where the thumb is and clamp to min/max — the same arithmetic the keyboard performs. Each is disabled at its end of the range." },
    decrementLabel: { type: "string", notes: "REQUIRED with hasSteppers, by the type. Two icon-only buttons with no name announce as 'button, button', and the component cannot write the words: it has no i18n runtime (§9) and does not know what is being stepped." },
    incrementLabel: { type: "string", notes: "REQUIRED with hasSteppers." },
    valueControl: { type: "ReactElement", notes: "Track only. Slot, never wrapped (§3). The sheet puts a Select showing the value here. It is a slot rather than a built-in because the options and their formatting are the caller's data." },
    isDisabled: { type: "boolean", default: "false", notes: "Every text --ui-text-disabled, the fill --ui-bg-field-chrome-disabled, the thumb ring --ui-border-subtle with no shadow; inline's bar --ui-bg-field-disabled. cursor: not-allowed." },
  },

  do: [
    "Give every slider a label; it becomes the accessible name.",
    "Set a step that matches the quantity — a slider that reports 62.4718 is worse than one that reports 62.",
    "Use hasValueText whenever the value is not visible elsewhere; a track alone does not say where it is.",
    "Use variant=\"inline\" for a panel of many numeric settings, stacked 4px apart (space-xs).",
    "Give a balance slider an origin, both poles and a formatValue — the poles name the axis, the words say where on it the value sits.",
  ],

  dont: [
    "Do not use this for a range — that is RangeSlider.",
    "Do not use a balance slider for a quantity. If the middle means 'half done' rather than 'neither', it is a plain track.",
    "Do not shrink the control to the painted track — the 8px size keeps a 24px target on purpose (SC 2.5.8).",
    "Do not remove the thumb's ring; white on the sheet's pale blue-80 measures 1.51:1 without it.",
    "Do not pass a Select's data to the Slider — compose it into valueControl instead.",
  ],

  a11y: {
    role: "slider, IMPLICIT: Base UI renders a native input[type=range] inside the thumb rather than a div with role=slider. Querying [role=\"slider\"] finds nothing, which is the point — the implicit role and its keyboard behaviour come from the platform.",
    name: "The `label` prop, via aria-labelledby on BOTH the group and the thumb. Naming only the group leaves the input itself unnamed — found in review, because the group's name does not name the control inside it.",
    value: "aria-valuenow is the number. formatValue (or getAriaValueText, which wins for the announcement) adds aria-valuetext on the same input, which screen readers announce in its place — so a balance slider says \"Mostly formal\" instead of \"70\". The poles are visible text only; the descriptor is what carries the position.",
    focus: "The ring is drawn on the THUMB for the track variant and on the BAR for inline. Base UI focuses the native input inside the thumb, never the thumb div, so the ring keys off `:has(:focus-visible)` — a `focus-visible:` utility on the div never matched, and the ring was declared and never painted until 2026-11-03. The focused thumb keeps --ui-shadow-sm under the ring; the hover lift is suppressed while focused.",
    keyboard: [
      { key: "Arrow keys", does: "Step by `step`. Asserted in Chromium." },
      { key: "Shift + Arrow / Page Up / Page Down", does: "Step by ten." },
      { key: "Home / End", does: "Jump to min and max — the part a hand-rolled slider usually omits. On a balance slider these are the two poles." },
      { key: "Tab", does: "Focuses the thumb's input; the ring draws on the thumb (track) or the bar (inline)." },
    ],
    target: "Track: padded only where the track needs it — sm (8px) gains py-sm and md (16px) gains py-xs, both reaching exactly 24px; lg (24) and xl (32) already clear the floor. Inline: the whole 32/40/48px bar is the target, label and value included.",
    contrastPairs: [
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-sunken", floor: "non-text", role: "the THUMB's ring against the track — the thumb is what identifies the control and marks the value, so this is the pair SC 1.4.11 turns on" },
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-base", floor: "non-text", role: "the thumb's ring against the thumb's own white fill — a ring that vanishes into the thumb identifies nothing either" },
      { fg: "--ui-bg-accent-subtle", bg: "--ui-bg-sunken", floor: "decorative", why: "Stands in for the --ui-gradient-accent fill, which check:contrast cannot measure because a gradient is not a pair of roles. The ramp is the sheet's own blue-80 into blue-70 and is deliberately pale: measured 1.24:1 and 1.80:1 against the track in light. It is a SECONDARY cue, not the one the control is identified by — the thumb ring above carries conformance, and packages/tokens/src/resolve.test.ts asserts it for every stress brand." },
      { fg: "--ui-border-strong", bg: "--ui-bg-accent-subtle", floor: "non-text", role: "the INLINE handle on the filled side of the bar — with no thumb, it is the mark that shows the value" },
      { fg: "--ui-border-strong", bg: "--ui-bg-elevated", floor: "non-text", role: "the inline handle on the empty side of the bar (and flush against it at 0)" },
      { fg: "--ui-text-primary", bg: "--ui-bg-accent-subtle-hover", floor: "non-text", role: "the inline handle on hover and drag, against the hover wash" },
      { fg: "--ui-bg-accent-subtle", bg: "--ui-bg-elevated", floor: "decorative", why: "The inline wash against the empty bar: 1.12:1 in light, the same quiet step the reference draws. The handle carries the value (the two pairs above), and the value is also printed as text." },
      { fg: "--ui-border-default", bg: "--ui-bg-sunken", floor: "decorative", why: "The origin mark. It says where 'neither' is; the descriptor (aria-valuetext and the visible value) and the leaning pole say which way the value leans, so the mark identifies no state on its own." },
      { fg: "--ui-text-secondary", bg: "--ui-bg-accent-subtle", floor: "text", role: "the inline label over the filled part of the bar" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-accent-subtle-hover", floor: "text", role: "the inline label over the hover wash — why it is secondary and not muted" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-elevated", floor: "text", role: "the inline label over the empty part of the bar" },
      { fg: "--ui-text-primary", bg: "--ui-bg-accent-subtle", floor: "text", role: "the inline value over the wash (at high values)" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "the inline value over the empty bar" },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the value text, and the leaning pole" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the label, and the pole the value does not lean toward" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The fill's ramp measures 1.24:1 and 1.80:1 against the track in light. Shipped AS DRAWN, on the designer's instruction to preserve the gradients: the thumb identifies the control and its ring is floored at 3:1. Still wants a recorded yes — the sheet's Gaps row is 'Derived', not 'Decided'.",
    "Dark: the empty track (--ui-bg-sunken #282522) on --ui-bg-surface (#2F2C29) measures 1.10:1 — an empty track all but vanishes on a dark surface (1.19:1 in light). The thumb still identifies the control. The fix belongs to the token layer: a track role of at least 1.3:1 on surface in both schemes.",
    "Dark, disabled: the thumb body (--ui-bg-base) and the disabled fill (--ui-bg-field-chrome-disabled) are both #423E3A, separated only by the 14% ring. Exempt from SC 1.4.11, but it reads as no thumb. Option on the sheet: drop the disabled fill to --ui-bg-sunken.",
    "Balance has no key back to the origin — Home and End go to the poles. The sheet leaves it open (none, or Delete resets).",
    "Inline departs from the Blueprint reference twice, on purpose: a handle at rest (the bar has no other drag affordance) and the accent wash instead of grey (no neutral role pair reaches a visible step on --ui-bg-elevated without a new role). The sheet asks whether a neutral version is wanted.",
  ],

  knownGaps: [
    "No tick marks, named steps or vertical orientation. None is drawn.",
    "No typed entry on the inline bar (double-click to edit). Compose a field into valueControl on a track slider instead.",
    "The steppers are plain buttons rather than a NumberField: they change the slider's own value, so the slider stays the single source of it. A caller wanting a typable number field should compose one into valueControl and drive both from the same state.",
    "RTL: positions use inline-start, but the gradient fill and its mirroring are drawn left-to-right; nothing has been checked in an RTL layout.",
  ],

  motion:
    "Transitions only, at --ui-duration-fast with --ui-ease-out: the thumb's box-shadow (the hover/drag lift and the focus ring settling), the inline handle's border-color and the inline wash's background-color. POSITIONS are never transitioned — the thumb, handle and fill track the pointer and the arrow keys directly, because interpolating there would put the control behind the input driving it. The leaning pole is a colour swap with no transition: a static cue, not motion.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-Z-0",
} as const;

export type SliderDoc = typeof sliderDoc;
