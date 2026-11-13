/** Typed documentation for Checkbox (CONVENTIONS §11). */

export const checkboxDoc = {
  lead: "Selects independent options, on their own or as part of a group.",
  name: "Checkbox",
  status: "stable",
  summary:
    "A binary choice with its label as one control. Supports the mixed state for a parent whose children are partly selected. Controlled or uncontrolled through the shared useControllableState hook.",

  anatomy: [
    {
      part: "root",
      slot: "checkbox",
      notes:
        "The <label>. Carries data-state (checked | unchecked | mixed) and data-disabled, and IS the click target — padded to 24px tall so the 18px box is not the target on its own.",
    },
    {
      part: "input",
      slot: "input",
      notes:
        "The real <input type=\"checkbox\">, visually clipped with sr-only but focusable, tabbable and in the form. The forwarded ref lands here (CONVENTIONS §5).",
    },
    {
      part: "control",
      slot: "control",
      notes: "The 18px painted box. aria-hidden — the input carries all semantics.",
    },
    { part: "label", slot: "label", notes: "children. The accessible name, natively." },
  ],

  composition: `
Checkbox
├─ children           ReactNode (required) — the label AND the accessible name
├─ isChecked?         controlled
├─ defaultIsChecked?  uncontrolled
└─ isIndeterminate?   always controlled — only the caller knows the children
  `.trim(),

  props: {
    children: {
      type: "ReactNode",
      required: true,
      notes:
        "Required. The whole row is one <label>, so the name comes from the DOM rather than an aria-label that can drift from what is on screen.",
    },
    isChecked: { type: "boolean", notes: "Controlled. Omit and the component owns its state." },
    defaultIsChecked: { type: "boolean", default: "false", notes: "Uncontrolled starting state." },
    isIndeterminate: {
      type: "boolean",
      default: "false",
      notes:
        "The mixed state. Deliberately has no `default*` counterpart: mixed is a statement about OTHER checkboxes, so a component that owned it would be guessing. Clicking a mixed box reports true and leaves resolving the children to the caller — which is what browsers do natively.",
    },
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
    onCheckedChange: { type: "(isChecked: boolean) => void", notes: "Fires on every change in both modes. The raw onChange is still forwarded and runs after ours (CONVENTIONS §5)." },
  },

  do: [
    "Pass the visible label as children — it becomes the accessible name for free.",
    "Use isIndeterminate on a 'select all' whose children are partly selected, and drive it from the children's state.",
    "Prefer uncontrolled (defaultIsChecked) inside a plain form; the input participates natively.",
  ],

  dont: [
    "Do not render a checkbox without children. There is no nameless form — the type requires it.",
    "Do not pass both isChecked and defaultIsChecked and expect the second to matter; the hook warns in development if a component switches modes.",
    "Do not set indeterminate through a ref yourself — it is a DOM property with no attribute, and the component already writes it in an effect.",
    "Do not rely on the box alone as the target. The label is the target; keeping it short does not shrink the 24px floor.",
  ],

  a11y: {
    role: "checkbox (native). Mixed state comes from the `indeterminate` DOM property, which maps to aria-checked=\"mixed\" without an ARIA attribute.",
    name: "The children, via the wrapping <label>. No aria-label is used or needed.",
    keyboard: [
      { key: "Tab", does: "Moves focus to the input, which is clipped but never hidden from the tab order." },
      { key: "Space", does: "Toggles. Native implicit activation — no JS key handler exists, and none should." },
      { key: "Enter", does: "Nothing, per the platform. Enter submits the form; a checkbox that toggled on Enter would be the odd one out." },
    ],
    target:
      "The sheet's row is 19px tall — under the 24px floor of WCAG 2.5.8. The <label> is padded to min-h-6 so the whole row, box and text together, is one 24px target. The painted box stays 18px, as designed.",
    contrastPairs: [
      { fg: "--ui-text-on-accent", bg: "--ui-bg-accent", floor: "non-text", role: "the tick on a checked box" },
      { fg: "--ui-text-primary", bg: "--ui-bg-sunken", floor: "non-text", role: "the dash on a mixed box" },
      { fg: "--ui-border-control", bg: "--ui-bg-base", floor: "non-text", role: "the unchecked box edge" },
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the label" },
    ],
    forcedColors:
      "The tick and dash are real glyphs in currentColor, not a background image, so they survive forced-colors mode where the box's fill does not. Checked reads as a tick, mixed as a dash, unchecked as an empty box.",
  },

  knownGaps: [
    "One size. The sheet draws a single 18px box; no sm/lg is designed.",
    "No isInvalid / errorText. A required checkbox (terms acceptance) has no designed error treatment yet — the field-level error pattern lives on Input.",
    "No CheckboxGroup. The sheet's nested list uses a 26px indent (18px box + 8px gap), which is a composition concern; grouping, the parent's mixed derivation and group labelling are not componentised yet.",
    "Forced-colors behaviour is reasoned from the markup, not asserted in CI — Playwright can force it, and no test does yet.",
    "Mixed hover is CLOSED (2026-11-03, Audit #9 \"Missing\"), DERIVED like every Checkbox hover: the edge firms from --ui-border-strong to --ui-text-primary, the dash's own ink — the same one-step firming unchecked gets. The sheet's obvious candidate, a --ui-bg-hover fill, measured 1.00:1 against the mixed --ui-bg-sunken fill in light (the two are the same value) and stepped DOWN in dark, where sunken is a fill above every hover and active fill.",
    "labelPlacement and description are CLOSED (2026-11-02, #9): drawn on the #9 Proposals sheet, light and dark, and approved on the Audit #9 sheet.",
    "The row centres its content (`items-center`), matching the sheet. (A row WITH a description aligns to the label's first line instead — that is the description variant's own drawing.) A label wrapping to several lines therefore centres against the box rather than aligning to its first line; the sheet draws only single-line labels.",
  ],

  motion:
    "The box transitions `background-color`, `border-color` and `box-shadow` at --ui-duration-fast with --ui-ease-out. The tick is not separately animated — it is present or it is not, so the checked state is readable the instant it changes rather than a frame later.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/D21-0",
} as const;

export type CheckboxDoc = typeof checkboxDoc;
