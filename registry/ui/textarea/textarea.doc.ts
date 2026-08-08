/**
 * Typed documentation for Textarea.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const textareaDoc = {
  name: "Textarea",
  status: "stable",
  summary:
    "Multi-line text field with its label, helper text and error message as one accessible unit. Three sizes matching Input's, so the two stack in a form without a seam. Height is set by rows and grown by a vertical drag.",

  anatomy: [
    { part: "field", slot: "field", notes: "The wrapper. Owns the vertical rhythm between label, control and messages." },
    { part: "label", slot: "label", notes: "Always rendered. isLabelHidden makes it visually hidden, never absent." },
    { part: "control", slot: "control", notes: "The bordered surface. Carries the border, background, focus ring and data-invalid/data-disabled. It has no height of its own — the textarea's height is the box's height, so a resize drag grows it." },
    { part: "textarea", slot: "textarea", notes: "The native <textarea>. Transparent and borderless, and it carries the INSET padding — Input puts that on the control instead. See forwarding." },
    { part: "error", slot: "error", notes: "Rendered before helper so the correction is read first." },
    { part: "helper", slot: "helper", notes: "Persistent guidance; stays visible alongside an error." },
  ],

  composition: `
Textarea
├─ label        string (required) — visually hidden via isLabelHidden
├─ control
│  └─ textarea  native <textarea> — rows, maxLength, placeholder go here
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
    size: {
      type: '"lg" | "md" | "sm"',
      default: '"lg"',
      notes:
        "Input's scale, minus the part that cannot carry over. Inset and type step exactly as Input's do (px-md py-sm / p-sm / px-sm py-xs, 14 / 12 / 12px), and the browser test asserts each step against a real Input at that size. The HEIGHT does not carry over: Input's is a constant, this one is rows line boxes, so the same rows gives 127 / 112 / 104px. A size changes the line, never the count.",
    },
    isDisabled: { type: "boolean", default: "false", notes: "Native disabled: blocked, out of the tab order, and the resize grip is withdrawn with it." },
    isRequired: { type: "boolean", default: "false", notes: "Sets the native required attribute and appends an aria-hidden asterisk to the visible label." },
    isInvalid: { type: "boolean", default: "false", notes: "Only needed when the error is reported elsewhere (a form-level summary); errorText implies it." },
    isResizable: {
      type: "boolean",
      default: "true",
      notes:
        "Vertical only, never horizontal — a field that can be dragged wider breaks the layout containing it. Turn it off inside a surface that cannot reflow: a fixed panel, a Drawer, a table cell.",
    },
    rows: {
      type: "number",
      default: "6",
      notes:
        "The native attribute, not a re-spelling of it. 6 is the sheet's 128px box at lg: 6 line boxes of 18.2px over py-sm and the 1.5px border. Changing it changes the content area and nothing else.",
    },
    cols: {
      type: "never",
      notes:
        "OMITTED from the type on purpose. It is a real textarea attribute that this component makes inert — the control is w-full, so a character count never reaches layout (measured: cols={5} rendered at the same 412px as no cols). Refusing it at compile time is the difference between a prop that is unsupported and one that looks supported. Width comes from the field's own className.",
    },
    helperText: { type: "string", notes: "Announced via aria-describedby. Kept alongside an error rather than replaced." },
    errorText: { type: "string", notes: "Presence sets aria-invalid and the danger border. Announced first when both messages exist." },
  },

  do: [
    "Always pass a real label, even when the design shows none — use isLabelHidden.",
    "Set rows to the number of lines the content usually needs; it is the only height knob and it is native.",
    "Put the error in errorText rather than styling the field yourself; it wires aria-invalid and aria-describedby together.",
    "Pass isResizable={false} when the field sits in a surface whose height cannot change.",
    "Control the value with value + onChange, or leave it uncontrolled with defaultValue.",
  ],

  dont: [
    "Do not use a placeholder as the label — it disappears on input and is announced inconsistently.",
    "Do not set a height with className; it fights rows and the resize drag, both of which set the box.",
    "Do not set aria-invalid by hand alongside errorText; the component derives it and the two drift apart.",
    "Do not rely on the red border alone to convey an error — errorText is the non-colour channel WCAG 1.4.1 requires.",
    "Do not add outline-none to the control; the focus ring lives there and suppressing it removes the indicator entirely.",
  ],

  a11y: {
    role: "textbox with aria-multiline (native textarea)",
    keyboard: [
      { key: "Tab", does: "Moves in and out. Enter does NOT submit here, so Tab is the only way out — the one keyboard difference from Input." },
      { key: "Enter", does: "Inserts a newline. Native; the component adds no key handling." },
      { key: "Typing", does: "Native." },
    ],
    labelling:
      "label is a real <label htmlFor>, so clicking it focuses the field. The id is generated with useId when not supplied, which keeps multiple instances on a page distinct.",
    describedBy:
      "helperText and errorText each get an id and both are joined into aria-describedby, error first, so a screen reader reads the correction before the guidance.",
    focus:
      "Drawn on the control via focus-within: border moves to --ui-border-focus AND the --ui-focus-ring halo renders. Focus-within rather than focus-visible is deliberate for a text field — a pointer click must show where typing will land.",
    target:
      "The default box is 128px and the smallest the field can be is rows={1}, which is one 18.2px line box over py-sm and the border — about 36px, past SC 2.5.8's 24px floor. The inset padding sits on the textarea rather than the wrapper, so the whole box is the target with no dead border zone around it.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-field", floor: "text", role: "the value" },
      { fg: "--ui-text-placeholder", bg: "--ui-bg-field", floor: "text", role: "the placeholder" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the label" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the helper text" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the focus ring" },
      {
        fg: "--ui-intent-danger-fg",
        bg: "--ui-bg-field",
        floor: "non-text",
        role: "the invalid border — the boundary that says the control is in error (SC 1.4.11)",
      },
      {
        fg: "--ui-border-subtle",
        bg: "--ui-bg-field",
        floor: "decorative",
        why: "The resting hairline is quiet BY DECISION (ADR 0010, CONVENTIONS §7b) and measures 1.47:1. Declared rather than omitted because in light --ui-bg-field and --ui-bg-base are the same value, so on the page this hairline is the only thing drawing the field's boundary — which is a live question for SC 1.4.11 across every field in the library, not a Textarea choice. It is recorded here so the next reader sees the number rather than assuming it was checked.",
      },
    ],
  },

  forwarding: {
    ref: "Goes to the <textarea>, not the outermost node — the documented form-control exception in CONVENTIONS §5. A ref to the wrapper cannot focus the field, read its value, or be handed to a form library.",
    className: "Lands on the outermost field wrapper, so `className=\"w-64\"` sizes the whole field and the control follows. Target an inner part with data-slot.",
    rest: "Native props (rows, placeholder, value, maxLength…) go to the <textarea> that owns them.",
    padding:
      "The one place this diverges from Input: the inset lives on the <textarea>, not on the control. The native resize grip is painted at the textarea's own corner, and the drag sets an inline height on the textarea — so padding on the wrapper would float the grip 12px inside the box and clip the drag. The inset a user sees is identical; the browser test asserts it against a real Input.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "No character-count or max-length affordance. 'Up to 120 words' is helper prose, not a live counter — a counter is a second live region (it must announce sparingly rather than on every keystroke) and wants designing before it is built.",
  ],

  /**
   * Derived rather than drawn, then RECONCILED BACK INTO PAPER — so the sheet
   * and the code now agree, and none of these is an open question. Kept as a
   * record of what was derived from what: a value whose provenance is lost
   * gets re-litigated by the next person who reads it.
   */
  derivations: [
    "The three sizes. The sheet drew one box, matching Input's lg. Inset and type step exactly as Input's do; the height does NOT, because Input's is a constant and this one is `rows` line boxes — so the same rows gives 127 / 112 / 104px. Now drawn on the sheet as its own size row.",
    "The line. The sheet stored a raw 18px on 14px type — 1.286, off the --ui-leading-* scale entirely (tight 1.25, snug 1.3). Shipped as leading-snug, the nearest role, 0.2px per line larger, which lands the 6-row lg box on the sheet's own 128px. The sheet is now bound to var(--ui-leading-snug) rather than to the literal.",
    "The value ink. The sheet drew --ui-text-secondary; Input ships --ui-text-primary, and a form holding both must not show two inks for the same thing. The sheet now carries --ui-text-primary.",
    "Hover, error and disabled. None was drawn. Each is Input's, which takes them from Button's secondary variant: hover moves the edge subtle -> default, error moves it to --ui-border-danger, disabled fills --ui-bg-sunken with --ui-text-disabled ink and withdraws the resize grip. All are now drawn on the sheet.",
  ],

  knownGaps: [
    "No leading or trailing slots. Input has icon/iconEnd; nothing in the sheet puts an adornment in a textarea, and a slot with no drawn placement would be a guess about where it sits on a multi-line box.",
    "No auto-grow. `field-sizing: content` would do it in one declaration but is not drawn, is not in every engine yet, and interacts with the resize drag — it is a design decision before it is an implementation one.",
    "Errors are announced via aria-describedby, which a screen reader reads on focus. An error appearing while focus is elsewhere (after a submit) is NOT announced — that belongs to a form-level error summary with focus management, not to this component.",
    "No read-only visual state; native readOnly renders as default today. Same as Input.",
    "The resize grip is the browser's, so it is drawn in the UA's colours rather than the theme's. Styling it means ::-webkit-resizer, which is one engine only.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/D7G-0",
} as const;

export type TextareaDoc = typeof textareaDoc;
