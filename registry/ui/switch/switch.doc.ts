/** Typed documentation for Switch (CONVENTIONS §11). */

export const switchDoc = {
  name: "Switch",
  status: "stable",
  summary:
    "A control that takes effect immediately, unlike a Checkbox, which states an intention the surrounding form later submits. A native input with role=switch, so it is announced as on/off.",

  anatomy: [
    { part: "root", slot: "switch", notes: "The <label>. Carries data-state (on | off) and data-disabled, and IS the target — padded to 24px while the track stays 20px." },
    { part: "input", slot: "input", notes: "The real <input type=\"checkbox\" role=\"switch\">, clipped but focusable and in the form. The forwarded ref lands here (§5)." },
    { part: "track", slot: "track", notes: "36x20 pill. aria-hidden — the input carries the semantics." },
    { part: "thumb", slot: "thumb", notes: "16px circle. Travels by transform, so the track's geometry never changes." },
    { part: "label", slot: "label", notes: "children. The accessible name, natively." },
  ],

  composition: `
Switch
├─ children           ReactNode (required) — the label AND the accessible name
├─ isChecked?         controlled
├─ defaultIsChecked?  uncontrolled
└─ isDisabled?
  `.trim(),

  props: {
    children: { type: "ReactNode", required: true, notes: "Required. The row is one <label>, so the name comes from the DOM rather than an aria-label that can drift." },
    isChecked: { type: "boolean", notes: "Controlled. Omit and the component owns its state, through the shared useControllableState hook (§4)." },
    defaultIsChecked: { type: "boolean", default: "false" },
    isLabelHidden: { type: "boolean", default: "false", notes: "Visually hides the label without removing it from the accessibility tree." },
    isDisabled: { type: "boolean", default: "false", notes: "Sets the `disabled` attribute — never pointer-events-none, which would kill an explaining tooltip." },
    onCheckedChange: { type: "(isChecked: boolean) => void", notes: "Fires on every change in both modes. The raw onChange is forwarded and runs after ours (§5)." },
  },

  do: [
    "Use a Switch for something that takes effect the moment it is flipped; use a Checkbox inside a form that is submitted later.",
    "Pass the visible label as children — it becomes the accessible name for free.",
    "Keep the label a statement of what is ON ('Show job title'), not an instruction.",
  ],

  dont: [
    "Do not put a Switch in a form that needs saving; that is a Checkbox.",
    "Do not render one without children — there is no nameless form, and the type requires it.",
    "Do not add on/off text inside the track; the label already says what it does, and the role announces the state.",
  ],

  a11y: {
    role: "switch, on a native checkbox input. The role changes only how it is ANNOUNCED — 'on/off' rather than 'checked' — which is the entire difference from Checkbox at this layer.",
    name: "The children, via the wrapping <label>. No aria-label is used or needed.",
    keyboard: [
      { key: "Tab", does: "Moves focus to the input, which is clipped but never out of the tab order." },
      { key: "Space", does: "Toggles. Native implicit activation — no JS key handler exists." },
      { key: "Enter", does: "Nothing, per the platform, exactly as for Checkbox." },
    ],
    target: "The track is 36x20; the <label> is padded to min-h-6 so the row clears the 24px floor of WCAG 2.5.8.",
    contrastPairs: [
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-base", floor: "non-text", role: "the ON track against the page" },
      { fg: "--ui-border-strong", bg: "--ui-bg-base", floor: "non-text", role: "the OFF track against the page" },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the label" },
    ],
  },

  knownGaps: [
    "The off track uses `edge-strong` — a border role used as a fill. The sheet used `--ui-text-placeholder`, a TEXT role as a background, which is worse; both are category errors. A dedicated track role is probably the right answer, and Slider will want the same thing. Raised, not decided.",
    "One size. The sheet draws a single 36x20 track.",
    "No loading or pending state for a switch whose effect is asynchronous — the commonest real need, and not drawn.",
    "The sheet's thumb shadow is a raw #9EDBF30D; this uses --ui-shadow-sm.",
  ],

  motion:
    "The track transitions `background-color`, `border-color` and `box-shadow`; the thumb travels on `transition-transform`. Both at --ui-duration-fast with --ui-ease-out, so the thumb moves rather than teleports, and the transform keeps the travel on the compositor and the track's geometry untouched. Note this is invisible to the visual gate: a Switch track is under 1% of its frame, which is below `allowedMismatchedPixelRatio` — the track could change colour entirely without tripping a diff.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/GDR-0",
} as const;

export type SwitchDoc = typeof switchDoc;
