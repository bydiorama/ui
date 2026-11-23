/** Typed documentation for Switch (CONVENTIONS §11). */

export const switchDoc = {
  name: "Switch",
  status: "stable",
  summary:
    "A control that takes effect immediately, unlike a Checkbox, which states an intention the surrounding form later submits. A native input with role=switch, so it is announced as on/off.",

  anatomy: [
    { part: "root", slot: "switch", notes: "The <label>. Carries data-state (on | off) and data-disabled, and IS the target — padded to 24px while the track stays 20px. Declares --ui-switch-track-on-bg and --ui-switch-track-on-hover-bg." },
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
    labelPlacement: {
      type: '"end" | "start"',
      default: '"end"',
      notes: "Which side of the control the label sits on. end is the shipped inline row. start is the SETTINGS ROW: full width, label first, the control pinned to the end in a fixed lane, so a stack of rows forms one column of controls (#9 Proposals sheet, 03). Visual order only (flex-row-reverse): the input stays first in the DOM, so the peer styling and the reading order hold, and in RTL the sides mirror with the text.",
    },
    description: {
      type: "ReactNode",
      notes: "A line under the label: body-sm in --ui-text-muted (5.93:1 light, 4.94:1 dark), gap-xs below, --ui-text-disabled when disabled. Inside the <label>, so it is part of the hit target; announced as the input's DESCRIPTION (aria-describedby), with the name pinned to the label text (aria-labelledby) so a long description is never read as the name. A caller's own aria-describedby is kept beside it. With a description the row aligns to the top and the control sits on the label's first line.",
    },
    onCheckedChange: { type: "(isChecked: boolean) => void", notes: "Fires on every change in both modes. The raw onChange is forwarded and runs after ours (§5)." },
    "--ui-switch-track-on-bg": {
      type: "CSS custom property",
      default: "var(--ui-bg-accent-legible)",
      notes: "The ON track's fill and edge. The sanctioned way (§6) to give ONE switch its own colour — a violet agent toggle beside the accent ones — instead of an unlayered override that fights the component's selectors. Declared on the root, so set it on the Switch itself: className=\"[--ui-switch-track-on-bg:var(--ui-…)]\" (cn() lets the caller's class win) or style. Setting it on an ANCESTOR does nothing — the root's own declaration wins over an inherited value. Pass a role, not a hex, and keep it 3:1 against the page: the track is a control boundary (SC 1.4.11), and check:contrast only measures the default.",
    },
    "--ui-switch-track-on-hover-bg": {
      type: "CSS custom property",
      default: "var(--ui-bg-accent-hover)",
      notes: "The ON track under the pointer. Separate because the hover paints a different colour from rest: override --ui-switch-track-on-bg alone and the themed switch turns back to the accent on hover. Set both together.",
    },
  },

  do: [
    "Use a Switch for something that takes effect the moment it is flipped; use a Checkbox inside a form that is submitted later.",
    "Pass the visible label as children — it becomes the accessible name for free.",
    "Keep the label a statement of what is ON ('Show job title'), not an instruction.",
    "Theme one switch's ON colour with --ui-switch-track-on-bg and --ui-switch-track-on-hover-bg, set on the Switch itself.",
  ],

  dont: [
    "Do not put a Switch in a form that needs saving; that is a Checkbox.",
    "Do not render one without children — there is no nameless form, and the type requires it.",
    "Do not add on/off text inside the track; the label already says what it does, and the role announces the state.",
    "Do not override the track with an unlayered `[data-slot=track]` rule — it outranks every state, disabled included. Use the two custom properties.",
  ],

  a11y: {
    role: "switch, on a native checkbox input. The role changes only how it is ANNOUNCED — 'on/off' rather than 'checked' — which is the entire difference from Checkbox at this layer.",
    name: "The children, via the wrapping <label>. No aria-label is used or needed.",
    keyboard: [
      { key: "Tab", does: "Moves focus to the input, which is clipped but never out of the tab order." },
      { key: "Space", does: "Toggles. Native implicit activation — no JS key handler exists." },
      { key: "Enter", does: "Nothing, per the platform, exactly as for Checkbox." },
    ],
    target: "The track is 36x20; the <label> is held at --ui-choice-row-min-height (24px, = --ui-hit-area-min, at default and comfortable density) so the row clears the 24px floor of WCAG 2.5.8. Under [data-ui-density=\"compact\"] the ROW may be shorter — --ui-choice-row-min-height falls to 0, so a dense table's row is not forced to 24px by its 20px track — and the TARGET is carried apart from it: a transparent ::before on the <label>, centred, at least --ui-hit-area-min tall and the row's full width, sitting under the row's content (isolate + z below) so a click on the track or text still lands on it. Measured by hit-testing in density.browser.test.tsx: under compact the row is under 24px and the target is not.",
    contrastPairs: [
      { fg: "--ui-bg-accent-legible", bg: "--ui-bg-base", floor: "non-text", role: "the ON track against the page" },
      { fg: "--ui-border-strong", bg: "--ui-bg-base", floor: "non-text", role: "the OFF track against the page" },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the label" },
    ],
  },

  knownGaps: [
    "The off track uses `edge-strong` — a border role used as a fill. The sheet used `--ui-text-placeholder`, a TEXT role as a background, which is worse; both are category errors. A dedicated track role is probably the right answer, and Slider will want the same thing. Raised, not decided.",
    "One size. The sheet draws a single 36x20 track.",
    "labelPlacement and description are CLOSED (2026-11-02, #9): drawn on the #9 Proposals sheet, light and dark. start is the settings row a Switch is most often asked for.",
    "No loading or pending state for a switch whose effect is asynchronous — the commonest real need, and not drawn.",
    "The sheet's thumb shadow is a raw #9EDBF30D; this uses --ui-shadow-sm.",
    "Thumb travel is CLOSED (2026-11-03, Audit #9 \"Measured\"): 17px instead of translate-x-4, so the ON thumb sits 1px from its edge like the OFF thumb. Asserted in switch.browser.test.tsx.",
  ],

  needsDesign: [
    "THUMB IN DARK (Audit #9 \"Measured\", re-measured 2026-11-03 on the warm-ink ramp). The thumb is --ui-bg-surface, which is DARK in dark (#1E1B18): a dark knob on a light track, the inverse of light's white knob on a dark track. It reads (6.56:1 on the off track) but it is not the same object in both schemes. Disabled is the weak case in both: the thumb on the --ui-bg-sunken track is 1.19:1 light / 1.41:1 dark, so a disabled switch's POSITION is barely readable (the state is exempt from 1.4.11, the information is not). Options: a fixed light thumb role in both schemes, or a disabled thumb drawn in --ui-border-default. Belongs with the dedicated track-role question in knownGaps.",
  ],

  motion:
    "The track transitions `background-color`, `border-color` and `box-shadow`; the thumb travels on `transition-transform`. Both at --ui-duration-fast with --ui-ease-out, so the thumb moves rather than teleports, and the transform keeps the travel on the compositor and the track's geometry untouched. Note this is invisible to the visual gate: a Switch track is under 1% of its frame, which is below `allowedMismatchedPixelRatio` — the track could change colour entirely without tripping a diff.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/GDR-0",
} as const;

export type SwitchDoc = typeof switchDoc;
