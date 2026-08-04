/** Typed documentation for Checkbox (CONVENTIONS §11). */

export const checkboxDoc = {
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
    contrast:
      "Measured in both schemes. Light: tick on the checked box 11.35:1, dash on the mixed box 14.11:1, unchecked edge 3.11:1, mixed edge 5.93:1, label 17.17:1. Dark: 11.35 / 13.79 / 3.09 / 4.85 / 9.59:1. Every state's identifying mark clears SC 1.4.11's 3:1.",
    forcedColors:
      "The tick and dash are real glyphs in currentColor, not a background image, so they survive forced-colors mode where the box's fill does not. Checked reads as a tick, mixed as a dash, unchecked as an empty box.",
  },

  knownGaps: [
    "One size. The sheet draws a single 18px box; no sm/lg is designed.",
    "No isInvalid / errorText. A required checkbox (terms acceptance) has no designed error treatment yet — the field-level error pattern lives on Input.",
    "No CheckboxGroup. The sheet's nested list uses a 26px indent (18px box + 8px gap), which is a composition concern; grouping, the parent's mixed derivation and group labelling are not componentised yet.",
    "Forced-colors behaviour is reasoned from the markup, not asserted in CI — Playwright can force it, and no test does yet.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/D21-0",
} as const;

export type CheckboxDoc = typeof checkboxDoc;
