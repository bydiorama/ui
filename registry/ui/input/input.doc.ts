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
    "Single-line text field with its label, helper text and error message as one accessible unit. Three sizes, two shapes, leading and trailing slots.",

  anatomy: [
    { part: "field", slot: "field", notes: "The wrapper. Owns the vertical rhythm between label, control and messages." },
    { part: "label", slot: "label", notes: "Always rendered. isLabelHidden makes it visually hidden, never absent." },
    { part: "control", slot: "control", notes: "The bordered surface. Carries the border, background, focus ring and data-size/data-shape/data-invalid/data-disabled." },
    { part: "input", slot: "input", notes: "The native <input>. Transparent and borderless — the control draws the chrome." },
    { part: "error", slot: "error", notes: "Rendered before helper so the correction is read first." },
    { part: "helper", slot: "helper", notes: "Persistent guidance; stays visible alongside an error." },
  ],

  composition: `
Input   size? lg|md|sm · shape? soft|full
├─ label        string (required) — visually hidden via isLabelHidden
├─ control
│  ├─ icon?     ReactElement — griddy-icons only
│  ├─ input     native <input>
│  └─ iconEnd?  ReactElement — reveal toggle, unit, clear button,
│                or a round submit: <Button isIconOnly shape="full"> on a full field
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
    size: { type: '"lg" | "md" | "sm"', default: '"lg"', notes: "48 / 40 / 32px with a 14 / 14 / 12px value (body-md, body-md, caption). All clear the 24px target floor; lg is the touch size for primary forms. md moved from caption to body-md (#16): the owner's frames draw every 40px field value at 14px, and a row mixing Input and Select at md read as two type styles. sm stays caption — the field tokens carry no type step (ADR 0020 §4 keeps type out of density), and a 14px value's 21.7px line in a compact 28px field would leave 3px of block padding." },
    shape: {
      type: '"soft" | "full"',
      default: '"soft"',
      notes:
        "Button's and Avatar's two words for the same two shapes (§2). soft is the form field (radius-md). full is the capsule a search field draws: rounded-full, with the inline padding one spacing step wider (16 / 12 / 12px at default density, a calc on the density token so it still moves with data-ui-density) because a capsule's ends curve in on the text. A round submit goes in iconEnd: on a full field the end padding collapses to the block padding minus the edge whenever the last child is a <button>, so a circle sized lg field + md Button, md + sm, sm + sm sits CONCENTRIC — 8 / 8 / 4px from the edge on every side. Asserted in the browser test.",
    },
    isDisabled: { type: "boolean", default: "false", notes: "Native disabled: blocked and out of the tab order." },
    isRequired: { type: "boolean", default: "false", notes: "Sets the native required attribute and appends an aria-hidden asterisk to the visible label." },
    isInvalid: { type: "boolean", default: "false", notes: "Only needed when the error is reported elsewhere (a form-level summary); errorText implies it." },
    helperText: { type: "string", notes: "Announced via aria-describedby. Kept alongside an error rather than replaced." },
    errorText: { type: "string", notes: "Presence sets aria-invalid and the danger border. Announced first when both messages exist." },
    icon: { type: "ReactElement", notes: "Slot. Leading adornment. The component sizes the slot at 16px, the size the sheet draws at every control size. Without that the glyph arrives at whatever the icon library defaults to — griddy hard-codes width/height=\"24\" as attributes — which rendered every icon 50% oversize." },
    iconEnd: { type: "ReactElement", notes: "Slot. Trailing adornment — reveal toggle, unit, clear, or a round submit on a full field (see shape). A Button placed here keeps its own accessible name and its own focus outline; the field's focus-within ring also lights, because focus is inside the field." },
  },

  do: [
    "Always pass a real label, even when the design shows none — use isLabelHidden.",
    "Put the error in errorText rather than styling the field yourself; it wires aria-invalid and aria-describedby together.",
    "Use iconEnd for a password reveal or clear button, and give that button its own accessible name.",
    "For a pill search field, use shape=\"full\" with an icon-only Button shape=\"full\" in iconEnd, one Button size under the field (lg field + md Button, md + sm, sm + sm) — that is the pairing the end padding is concentric for.",
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
      { fg: "--ui-text-primary", bg: "--ui-bg-field-chrome", floor: "text", role: "the value, on a chrome ground (surface=\"chrome\")" },
      { fg: "--ui-text-placeholder", bg: "--ui-bg-field-chrome", floor: "text", role: "the placeholder, on a chrome ground" },
      { fg: "--ui-text-disabled", bg: "--ui-bg-field-chrome-disabled", floor: "decorative", role: "a disabled field's value on a chrome ground", why: "WCAG 1.4.3 exempts disabled controls, and a disabled field has to READ as unavailable — holding its ink to 4.5:1 would make it indistinguishable from an available one, which is the real failure. Declared rather than omitted because ADR 0017 added a second ground and an unlisted pair is an unchecked pair: this is the exact ink-on-fill combination the new pair exists to keep distinct." },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the label" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the focus ring" },
      {
        fg: "--ui-border-subtle",
        bg: "--ui-bg-field",
        floor: "decorative",
        role: "the resting hairline",
        why: "ADR 0010 § 'Which token an edge takes': the field is identified by its fill, its persistent visible label and its padding, so the hairline is a hint and not the boundary anything depends on. That is a KNOWING trade against SC 1.4.11 on a resting form control, and it is declared here — as a measured decorative pair — rather than left as an absence, because an unlisted pair is an unchecked pair and this is the one edge in the library that is deliberately under the non-text floor. `border-control` is the one-token switch for an engagement that needs the other answer; Checkbox already takes it, because a checkbox's box IS its boundary.",
      },
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
    "Multi-line is a separate component (Textarea), not a prop here. Enter submits in an Input and inserts a newline in a textarea, and the height comes from `rows` rather than a size step — one component would have to branch on both. Textarea reuses this control surface and asserts the match against a real Input; what did NOT carry over is the height, which in a textarea is rows line boxes rather than a size step.",
    "No read-only visual state; native readOnly renders as default today.",
    "A round submit at sm (Button sm in a 32px field) sits 4px from the edge, and the control clips its overflow — so the outermost pixel of that Button's 2px focus outline (offset 2px) is clipped. The field's own focus-within ring still shows. At lg and md the 8px gap holds the whole outline.",
  ],

  motion:
    "The field transitions `border-color`, `box-shadow` and `background-color` at --ui-duration-fast with --ui-ease-out, so focus and a validity change arrive as a settle rather than a flash. Nothing else moves; the label and helper text are static.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/CLH-0",
} as const;

export type InputDoc = typeof inputDoc;
