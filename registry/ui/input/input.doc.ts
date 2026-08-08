/**
 * Typed documentation for Input.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const inputDoc = {
  name: "Input",
  status: "stable",
  summary:
    "Single-line text field with its label, helper text and error message as one accessible unit. Three sizes, leading and trailing slots.",

  anatomy: [
    { part: "field", slot: "field", notes: "The wrapper. Owns the vertical rhythm between label, control and messages." },
    { part: "label", slot: "label", notes: "Always rendered. isLabelHidden makes it visually hidden, never absent." },
    { part: "control", slot: "control", notes: "The bordered surface. Carries the border, background, focus ring and data-size/data-invalid/data-disabled." },
    { part: "input", slot: "input", notes: "The native <input>. Transparent and borderless — the control draws the chrome." },
    { part: "error", slot: "error", notes: "Rendered before helper so the correction is read first." },
    { part: "helper", slot: "helper", notes: "Persistent guidance; stays visible alongside an error." },
  ],

  composition: `
Input
├─ label        string (required) — visually hidden via isLabelHidden
├─ control
│  ├─ icon?     ReactElement — griddy-icons only
│  ├─ input     native <input>
│  └─ iconEnd?  ReactElement — reveal toggle, unit, clear button
├─ errorText?   string — presence marks the field invalid
└─ helperText?  string
  `.trim(),

  props: {
    label: {
      type: "string",
      required: true,
      notes:
        "Required by the type system, not by review. A placeholder is not a label — it vanishes the moment the user types, taking the field's name with it.",
    },
    isLabelHidden: { type: "boolean", default: "false", notes: "Visually hidden, still in the accessibility tree and still a click target." },
    size: { type: '"lg" | "md" | "sm"', default: '"lg"', notes: "48 / 40 / 32px. All clear the 24px target floor; lg is the touch size for primary forms." },
    isDisabled: { type: "boolean", default: "false", notes: "Native disabled: blocked and out of the tab order." },
    isRequired: { type: "boolean", default: "false", notes: "Sets the native required attribute and appends an aria-hidden asterisk to the visible label." },
    isInvalid: { type: "boolean", default: "false", notes: "Only needed when the error is reported elsewhere (a form-level summary); errorText implies it." },
    helperText: { type: "string", notes: "Announced via aria-describedby. Kept alongside an error rather than replaced." },
    errorText: { type: "string", notes: "Presence sets aria-invalid and the danger border. Announced first when both messages exist." },
    icon: { type: "ReactElement", notes: "Slot. Leading adornment. The component sizes the slot at 16px, the size the sheet draws at every control size. Without that the glyph arrives at whatever the icon library defaults to — griddy hard-codes width/height=\"24\" as attributes — which rendered every icon 50% oversize." },
    iconEnd: { type: "ReactElement", notes: "Slot. Trailing adornment — reveal toggle, unit, clear." },
  },

  do: [
    "Always pass a real label, even when the design shows none — use isLabelHidden.",
    "Put the error in errorText rather than styling the field yourself; it wires aria-invalid and aria-describedby together.",
    "Use iconEnd for a password reveal or clear button, and give that button its own accessible name.",
    "Control the value with value + onChange, or leave it uncontrolled with defaultValue.",
  ],

  dont: [
    "Do not use a placeholder as the label — it disappears on input and is announced inconsistently.",
    "Do not set aria-invalid by hand alongside errorText; the component derives it and the two drift apart.",
    "Do not rely on the red border alone to convey an error — errorText is the non-colour channel WCAG 1.4.1 requires.",
    "Do not add outline-none to the control; the focus ring lives there and suppressing it removes the indicator entirely.",
  ],

  a11y: {
    role: "textbox (native input)",
    keyboard: [
      { key: "Tab", does: "Moves in and out. isDisabled removes it from the sequence." },
      { key: "Typing", does: "Native. The component adds no key handling." },
    ],
    labelling:
      "label is a real <label htmlFor>, so clicking it focuses the field. The id is generated with useId when not supplied, which keeps multiple instances on a page distinct.",
    describedBy:
      "helperText and errorText each get an id and both are joined into aria-describedby, error first, so a screen reader reads the correction before the guidance.",
    focus:
      "Drawn on the control via focus-within: border moves to --ui-border-focus AND the --ui-focus-ring halo renders. Focus-within rather than focus-visible is deliberate for a text field — a pointer click must show where typing will land.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-field", floor: "text", role: "the value" },
      { fg: "--ui-text-placeholder", bg: "--ui-bg-field", floor: "text", role: "the placeholder" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the label" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the focus ring" },
    ],
  },

  forwarding: {
    ref: "Goes to the <input>, not the outermost node — the documented form-control exception in CONVENTIONS §5. A ref to the wrapper cannot focus the field or be handed to a form library.",
    className: "Lands on the outermost field wrapper, so `className=\"w-64\"` sizes the whole field and the control follows. Target an inner part with data-slot.",
    rest: "Native props (type, placeholder, value, maxLength…) go to the <input> that owns them.",
  },

  knownGaps: [
    "Errors are announced via aria-describedby, which a screen reader reads on focus. An error appearing while focus is elsewhere (after a submit) is NOT announced — that belongs to a form-level error summary with focus management, not to this component. Do not add role=\"alert\" per field: a form failing with five errors would interrupt five times.",
    "No hover state was drawn in the design sheet. The implemented hover (subtle → default border) is DERIVED from Button's secondary variant so controls behave alike — confirm with design.",
    "Multi-line is a separate component (Textarea), not a prop here. Enter submits in an Input and inserts a newline in a textarea, and the height comes from `rows` rather than a size step — one component would have to branch on both. Textarea reuses this control surface and asserts the match against a real Input; what did NOT carry over is the size table, which Textarea ships in one size only because the sheet draws one.",
    "No read-only visual state; native readOnly renders as default today.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/CLH-0",
} as const;

export type InputDoc = typeof inputDoc;
