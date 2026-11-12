/** Typed documentation for ColorPicker (CONVENTIONS §11). */

export const colorPickerDoc = {
  lead: "Chooses a colour through a visual field or an exact value.",
  name: "ColorPicker",
  status: "beta",
  summary:
    "A colour field that opens an editor: a saturation × brightness area, a hue track, an optional opacity track, a hex field and optional preset swatches. The value is live — every move emits, and there is no Save / Cancel. Composed from what the system already owns: the trigger is Select's field (or Button's icon-only box), the panel is Popover's surface, the tracks are Base UI's slider behaviour and the fields are Input. The 2D area is the one new control.",

  anatomy: [
    { part: "root", slot: "color-picker", notes: "Label, trigger, panel and messages as one unit. Carries data-variant and data-size." },
    { part: "label", slot: "color-picker-label", notes: "Required. Visible on the field variant; on the swatch variant it is sr-only and becomes the trigger's aria-label together with the value." },
    { part: "trigger", slot: "color-picker-trigger", notes: "field: Select's control on the field ladder — h-field-lg / md / sm (48 / 40 / 32), 1.5px border-subtle on bg-field. swatch: a real Button (secondary, icon-only, 44 / 32 / 24)." },
    { part: "chip", slot: "color-picker-chip", notes: "The current colour, 20 / 20 / 16 in the field and 24 / 20 / 16 in the swatch trigger. bg-sunken when empty. Its 1px border-default edge is decorative — the hex beside it names the colour." },
    { part: "value", slot: "color-picker-value", notes: "Upper-case hex, body-md / caption at 500 with tabular figures; the placeholder at 400 in ink-placeholder." },
    { part: "icon", slot: "color-picker-icon", notes: "ChevronDown closed, ChevronUp open — Combobox's convention." },
    { part: "panel", slot: "color-picker-panel", notes: "Popover's surface at w-80, p-lg, radius-lg, bg-elevated, border-subtle, shadow-md — at gap-md, because its parts are one control." },
    { part: "area", slot: "color-picker-area", notes: "Fills the panel — 286 × 160 inside its 1px border — radius-md. x is saturation, y is brightness, over the pure hue. role=slider with a two-axis keyboard contract." },
    { part: "thumb", slot: "color-picker-area-thumb", notes: "16px, filled with the colour it picks; 2px ink-on-media inner ring and 1px bg-media outer ring, so one of the two clears any ground." },
    { part: "hue", slot: "color-picker-hue", notes: "16px track, sRGB spectrum whose stops sit on the thumb's centre travel (8px to width − 8)." },
    { part: "alpha", slot: "color-picker-alpha", notes: "hasAlpha only. The opaque colour fading to transparent over an 8px checker." },
    { part: "fields", slot: "color-picker-fields", notes: "Input sm on the chrome ground (ADR 0017 — the panel is bg-elevated): hex, and with hasAlpha a 64px opacity field." },
    { part: "swatches", slot: "color-picker-swatches", notes: "Optional group label (label-sm, 600, ink-muted) over a wrapping row of 24px swatches at gap-sm." },
    { part: "swatch", slot: "color-picker-swatch", notes: "A label painted with the colour, holding a visually hidden native radio. Every state is a ring outside it." },
    { part: "error", slot: "color-picker-error", notes: "Before the helper, so a correction is read first." },
    { part: "helper", slot: "color-picker-helper", notes: "Persistent guidance." },
  ],

  composition: `
ColorPicker   label (required)
              value? / defaultValue? / onValueChange?
              isOpen? / defaultIsOpen? / onOpenChange?
              variant? ("field" | "swatch") / size? ("lg" | "md" | "sm")
              hasAlpha? / swatches? / swatchesLabel? / isPaletteOnly?
              placeholder? / helperText? / errorText? / isDisabled? / isLabelHidden?
              container?
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a placeholder is not a label. On the swatch variant it is the trigger's accessible name, read with the value: 'Accent colour, #1B6C84'." },
    isLabelHidden: { type: "boolean", default: "false", notes: "Visually hidden, never omitted." },
    value: { type: "string | null", notes: "Controlled: #RRGGBB, or #RRGGBBAA with hasAlpha. Accepts #RGB / #RRGGBB / #RRGGBBAA in any case; emits upper-case. null is empty." },
    defaultValue: { type: "string | null", default: "null", notes: "Uncontrolled starting value." },
    onValueChange: { type: "(value: string | null) => void", notes: "Fires on EVERY move, so a preview can follow the thumb. There is no once-per-gesture callback — see knownGaps." },
    isOpen: { type: "boolean", notes: "Controlled open state." },
    defaultIsOpen: { type: "boolean", default: "false", notes: "Uncontrolled starting state." },
    onOpenChange: { type: "(isOpen: boolean) => void", notes: "Fires for the trigger, Escape and an outside press." },
    variant: { type: '"field" | "swatch"', default: '"field"', notes: "field is a form field; swatch is the chip alone in Button's icon-only box, for toolbars where the hex is noise." },
    size: { type: '"lg" | "md" | "sm"', default: '"lg"', notes: "The trigger only. The panel has one size — a 2D control that shrinks with density stops being usable." },
    hasAlpha: { type: "boolean", default: "false", notes: "Adds the opacity track and field. The value always carries eight digits when it is on." },
    swatches: { type: "readonly ColorSwatch[]", notes: "{ value, label }. The label is the swatch's accessible name — 'Brand blue', not a hex." },
    swatchesLabel: { type: "string", default: '"Swatches"', notes: "The group's visible name, and the radio group's accessible one." },
    isPaletteOnly: { type: "boolean", default: "false", notes: "Swatches only — for brand settings and tags, where a free colour is the wrong answer. Focus opens on the checked swatch." },
    placeholder: { type: "string", default: '"Pick a colour"', notes: "What the empty field shows. Not the accessible name." },
    isDisabled: { type: "boolean", default: "false", notes: "The native attribute; never pointer-events: none." },
    helperText: { type: "string", notes: "Announced through aria-describedby alongside any error." },
    errorText: { type: "string", notes: "Its presence sets aria-invalid and the danger edge." },
    container: { type: "HTMLElement | null", notes: "Where to portal the panel. A panel on document.body leaves a brand scope behind; pass the themed element." },
  },

  do: [
    "Name the field for what the colour is FOR — 'Accent colour', not 'Colour'.",
    "Give every swatch a human label. The radio announces it; a hex read aloud is noise.",
    "Debounce in the consumer if a change is expensive — onValueChange is a live stream by design.",
    "Use isPaletteOnly when only approved colours are allowed, rather than validating a free colour afterwards.",
  ],

  dont: [
    "Do not wrap the picker in a Save / Cancel flow of its own. A consumer that needs confirmation holds the value in its dialog.",
    "Do not use the swatch variant in a form — with no visible text it has no visible label.",
    "Do not pass palette steps as swatch labels. 'blue-40' is a token name, not a colour name.",
  ],

  a11y: {
    role: "A button owning a popover named by the label. Inside: a 2D slider (role=slider, aria-valuetext for both axes), two native range inputs from Base UI, two text fields and a native radio group.",
    name: "field: aria-labelledby the label and the value. swatch: aria-label '<label>, <value>'. The area is 'Saturation and brightness'; the tracks 'Hue' and 'Opacity'; the fields 'Hex' and 'Opacity'.",
    keyboard: [
      { key: "Enter / Space / ArrowDown", does: "Opens the panel. Focus lands on the area — on the checked swatch when isPaletteOnly." },
      { key: "Arrows (area)", does: "Left / Right move saturation, Up / Down brightness, by 1; Shift makes it 10." },
      { key: "Home / End (area)", does: "Saturation to 0 / 100." },
      { key: "PageUp / PageDown (area)", does: "Brightness by 10." },
      { key: "Arrows (tracks)", does: "One step (1° / 1%); PageUp / PageDown and Shift ten; Home / End to the ends — Base UI's slider contract." },
      { key: "Enter (hex)", does: "Commits the typed hex. Unparseable text reverts on commit." },
      { key: "Escape (hex, edited)", does: "Restores the field's text and keeps the panel open. A second Escape closes it." },
      { key: "ArrowUp / ArrowDown (opacity field)", does: "±1%, Shift ±10." },
      { key: "Arrows (swatches)", does: "A native radio group: move AND select in reading order, so the value follows the keyboard." },
      { key: "Escape", does: "Closes the panel; focus returns to the trigger. Nothing is reverted — nothing was pending." },
    ],
    focus: "Every focus indicator is the two-stop --ui-focus-ring: on the area it is drawn on the THUMB, because that is where the arrows act; on a swatch it replaces the selected ring, which loses nothing because a focused radio is the checked one.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-field", floor: "text", role: "the hex in the field" },
      { fg: "--ui-text-placeholder", bg: "--ui-bg-field", floor: "text", role: "the placeholder" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the label" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the helper text" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-base", floor: "text", role: "the error message" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "the swatch group label" },
      { fg: "--ui-text-primary", bg: "--ui-bg-field-chrome", floor: "text", role: "the hex and opacity fields' text" },
      { fg: "--ui-border-strong", bg: "--ui-bg-elevated", floor: "non-text", role: "a swatch's resting edge and hover ring — the only boundary a swatch the colour of the panel has" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "non-text", role: "the selected swatch's ring" },
      { fg: "--ui-border-focus", bg: "--ui-bg-elevated", floor: "non-text", role: "the focus ring on the area thumb, a track thumb or a swatch" },
      {
        fg: "--ui-border-subtle",
        bg: "--ui-bg-base",
        floor: "decorative",
        role: "the alpha checker and the field's resting edge",
        why: "The checker is a texture that makes see-through legible, not a boundary; the field is identified by its fill, label and padding (ADR 0010).",
      },
      {
        fg: "--ui-border-default",
        bg: "--ui-bg-field",
        floor: "decorative",
        role: "the trigger chip's edge",
        why: "The hex beside the chip names the colour, so the chip's edge carries no information the value does not.",
      },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The thumb rings reuse --ui-text-on-media and --ui-bg-media — the contract's only scheme-invariant pair, chosen for media rather than a control. Confirm the reuse, or mint a --ui-thumb-ring pair that aliases them.",
    "Narrow screens: §7a makes Drawer the mobile surface, and a 16px thumb is under the 44px touch size. The touch layout is not drawn.",
  ],

  knownGaps: [
    "No commit callback. onValueChange fires on every move; Slider, which this composes, has no public commit event either, so a second name is a Slider change first.",
    "No eyedropper: the EyeDropper API is Chromium-only and griddy has no pipette glyph.",
    "Hex only. No RGB / HSL fields, no format switch, no saved or recent swatches.",
    "An empty picker opens on white at hue 0 and emits nothing until a control moves.",
  ],

  motion:
    "The field transitions border-color and box-shadow at --ui-duration-fast / --ui-ease-out; the panel fades and scales from 98% via data-[starting-style] / data-[ending-style], with `scale` named in the list. Thumb and swatch rings transition box-shadow on the same timing. The thumbs themselves do not animate position — they follow the pointer.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/476R-0",
} as const;

export type ColorPickerDoc = typeof colorPickerDoc;
