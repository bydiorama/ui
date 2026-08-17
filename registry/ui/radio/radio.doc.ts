/** Typed documentation for RadioGroup and Radio (CONVENTIONS §11). */

export const radioDoc = {
  name: "RadioGroup",
  status: "stable",
  summary:
    "One choice from a set that stays visible. The GROUP is the component and the option is its item: the legend, the shared name, the selection and the error all belong to the set, and a Radio on its own is one alternative rather than a control. A real fieldset around real radio inputs, so arrow-key navigation, the single tab stop, form participation and the legend-as-part-of-every-name come from the platform.",

  anatomy: [
    {
      part: "group",
      slot: "radio-group",
      notes:
        "The <fieldset>. Owns className, the ref and the 12px column. `min-w-0` is not decoration: a fieldset defaults to min-width:min-content, so without it a group of long labels overflows a flex column instead of wrapping.",
    },
    {
      part: "legend",
      slot: "radio-group-label",
      notes:
        "The <legend>. label-md 13 / 600. It names the question the set answers, which is the one thing no individual option can carry — and the platform prepends it to every option's accessible name for free.",
    },
    {
      part: "options",
      slot: "radio-group-options",
      notes:
        "The run of items. 8px apart vertically, stepping to 12 the moment any option carries a description; 24px apart horizontally. The step is a `has-*` pair rather than a prop — see props.orientation.",
    },
    {
      part: "option",
      slot: "radio",
      notes:
        "The <label>. Carries data-state (checked | unchecked) and data-disabled, and IS the target — padded to 24px so the 18px circle is not the target on its own.",
    },
    {
      part: "input",
      slot: "input",
      notes:
        'The real <input type="radio">, visually clipped with sr-only but focusable, tabbable and in the form. The forwarded ref lands here (CONVENTIONS §5).',
    },
    {
      part: "control",
      slot: "control",
      notes:
        "The 18px painted circle. aria-hidden — the input carries every semantic. It is a DIRECT sibling of the input and must stay one: the focus ring is a `peer-*` utility, which compiles to a general-sibling combinator, so any wrapper around the circle stops it matching. Nothing fails when that happens — the classes resolve, `check:utilities` passes, and the ring simply never paints.",
    },
    { part: "dot", slot: "dot", notes: "8px, `bg-current`, so it follows the control's ink through selected and disabled without a second colour rule." },
    {
      part: "text",
      slot: "radio-text",
      notes:
        "The label-and-description stack, 4px apart. Namespaced rather than called `text`: data-slot is a public selector surface and these live in one document with every other component's, so a generic name is one a consumer's query catches by accident.",
    },
    { part: "label", slot: "label", notes: "children. The accessible name, natively." },
    { part: "description", slot: "radio-description", notes: "The optional second line. Its PRESENCE is also what the group's gap reads." },
    { part: "error", slot: "radio-group-error", notes: "caption / danger, under the last option. Wired to every input by aria-describedby." },
    { part: "helper", slot: "radio-group-helper", notes: "caption / muted. Same wiring." },
  ],

  composition: `
RadioGroup
├─ label            string (required) — the legend, and the group's name
├─ isLabelHidden?   keeps it for assistive tech, takes it off the screen
├─ name?            generated if omitted — see props.name
├─ value?           controlled, by option value
├─ defaultValue?    uncontrolled
├─ onValueChange?   (value: string) => void
├─ orientation?     "vertical" (default) | "horizontal"
├─ isDisabled?      disables every option
├─ isInvalid?       errorText implies it
├─ errorText?       string
├─ helperText?      string
└─ children         <Radio> items
   Radio
   ├─ value         string (required)
   ├─ children      ReactNode (required) — the label AND the accessible name
   ├─ description?  string
   └─ isDisabled?   this option only
  `.trim(),

  props: {
    label: {
      type: "string",
      required: true,
      notes:
        "The legend. Required for the same reason every field's label is: a set of options with no question announces each one with no idea what it is an option FOR. Use `isLabelHidden` when the question is already in the surrounding copy — never drop it.",
    },
    name: {
      type: "string",
      notes:
        "Generated from useId when omitted, and the generated one is load-bearing: same-`name` radios are ONE group to the platform, so two groups that both defaulted to a shared literal would share arrow keys and a selection. Pass one only when a form on the server expects a particular field name.",
    },
    value: {
      type: "string",
      notes:
        "Controlled selection, by option value. Omit for uncontrolled; `defaultValue` sets the starting choice. Both run through the shared useControllableState hook (§4).",
    },
    orientation: {
      type: '"vertical" | "horizontal"',
      notes:
        "Vertical by default. Horizontal is for two or three short options — a row of long labels makes the reader hunt for which circle belongs to which words. Vertical also steps its gap from 8 to 12 when any option carries a description, which is done with a `has-*` pair rather than a prop: the group cannot inspect its children, and a prop whose whole job is to describe the markup underneath it is the prop explosion §3 forbids.",
    },
    isDisabled: {
      type: "boolean",
      notes:
        "Set on the fieldset, so the platform disables every descendant control — the one place `disabled` cascades. Individual options take their own `isDisabled`.",
    },
    errorText: {
      type: "string",
      notes:
        "What is wrong, and it implies `isInvalid` so the two can never disagree. Rendered under the last option and wired to every INPUT by aria-describedby, not to the fieldset: fieldset descriptions are read inconsistently, and the input is the element that takes focus.",
    },
    "Radio.value": {
      type: "string",
      required: true,
      notes: "What this option contributes to the group. Compared by identity against the group's value.",
    },
    "Radio.description": {
      type: "string",
      notes:
        "A second line for an option whose consequence is not obvious from its name. Adding one switches the row to top alignment and steps the group's gap — both automatic.",
    },
  },

  do: [
    "Give every group a legend, even a hidden one. It is what turns four circles into a question.",
    "Prefer vertical. Horizontal is for two or three short values like Active / Pending / Archived.",
    "Use a Radio group when the options are few and worth reading at a glance; a Select when they are many.",
    "Say what the option COSTS in the description if it is not obvious from the label.",
  ],

  dont: [
    "Do not render a <Radio> outside a <RadioGroup> — it throws, because a radio with no group has no name, no selection and nothing to announce.",
    "Do not use a radio group for a yes/no. That is one Checkbox, and it is half the target area and none of the ambiguity.",
    "Do not give two groups on one page the same explicit `name`. The platform will treat them as one set and the arrow keys will jump between them.",
    "Do not build a 'none' option to let the reader undo a choice. A radio group cannot be unset by design; if the choice is optional, say so in the legend and add an explicit option that means it.",
  ],

  a11y: {
    role:
      "A native <fieldset> with a <legend> around native <input type=\"radio\">. No ARIA roles are added, because none are needed — this is the pattern ARIA's radiogroup role exists to imitate.",
    name: "Each option's name is its own label text, with the legend prepended by the platform. Nothing is set by hand.",
    keyboard: [
      { keys: "Tab", does: "Enters the group at the selected option, or at the first when nothing is selected. One tab stop for the whole set." },
      { keys: "Arrow keys", does: "Move between options AND select as they go, wrapping at the ends. The platform's behaviour for a same-name set — not re-implemented here." },
      { keys: "Space", does: "Selects the focused option. Redundant with the arrows, and expected." },
      { keys: "Tab (again)", does: "Leaves the group entirely rather than moving to the next option." },
    ],
    targetSize:
      "The row is the target and is at least 24px tall, clearing SC 2.5.8. The circle alone would be 18 beside a 17px line — a 19px target, which is the arithmetic the min-height exists to fix.",
    focus:
      "The clipped input takes focus and the painted circle shows it: --ui-focus-ring outside the edge, plus the edge itself switching to --ui-border-focus. A forced-colors outline runs alongside, because the ring is a box-shadow and forced colours flatten it away.",
    liveRegion:
      "None. Selection is announced by the platform as the focused radio changes, and an error added later is picked up through aria-describedby on the input the reader is standing on.",
    contrastPairs: [
      {
        fg: "--ui-border-control",
        bg: "--ui-bg-surface",
        floor: "non-text",
        role: "the unselected circle's edge — the only thing drawing the control, so it is held to the graphical floor",
      },
      {
        fg: "--ui-border-strong",
        bg: "--ui-bg-surface",
        floor: "non-text",
        role: "the hovered edge, one step further from the ground",
      },
      {
        fg: "--ui-text-on-accent",
        bg: "--ui-bg-accent",
        floor: "non-text",
        role: "the 8px dot on the selected fill",
      },
      {
        fg: "--ui-text-primary",
        bg: "--ui-bg-base",
        floor: "text",
        role: "the option label and the legend",
      },
      {
        fg: "--ui-text-muted",
        bg: "--ui-bg-base",
        floor: "text",
        role: "the per-option description and the helper text",
      },
      {
        fg: "--ui-intent-danger-fg",
        bg: "--ui-bg-base",
        floor: "text",
        role: "the group's error message, and the invalid edge",
      },
      {
        fg: "--ui-text-disabled",
        bg: "--ui-bg-sunken",
        floor: "decorative",
        why: "The dot inside a DISABLED selected control. It survives, because a disabled radio still has to say which option is chosen — and it measures 1.76:1 in light and 3.60:1 in dark, so it is under the graphical floor exactly where the surface scale puts the two values closest. Declared rather than left out, because an unlisted pair is an unchecked pair and this one is easy to change by accident: WCAG exempts disabled controls, and the moment either token moves for another reason this row is the thing that says what it cost.",
      },
    ],
  },

  forwarding: {
    ref: "RadioGroup's ref goes to the <fieldset> — it is not itself a form control. Radio's goes to its <input>, per §5, so it can be focused, read for a value and handed to a form library.",
    className:
      "Lands on the outermost node of each: the fieldset and the option's <label>. Reach anything inside through data-slot.",
    rest: "Native fieldset props go to the fieldset; native input props (name excepted — the group owns it) go to the input.",
  },

  motion:
    "The circle transitions `background-color`, `border-color` and `box-shadow` at --ui-duration-fast with --ui-ease-out — the micro recipe, identical to Checkbox's box. The dot is not separately animated: it is present or it is not, so the selection is readable the instant it changes rather than a frame later.",

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "Hover, focus and disabled are taken from Checkbox rather than drawn on the sheet. They are consistent by construction rather than by decision, and if Checkbox's are ever redrawn these move with them.",
    "No pressed state, on either this or Checkbox. A fill step on an 18px control that flips instantly is not something anybody sees — recorded rather than invented, so the next sheet does not re-derive it.",
    "One size, because Checkbox has one and the pair has to align in a shared column. If a size axis is ever wanted it is Checkbox's to add first, and this follows.",
    "The label-to-description gap is `space-xs` 4, where the sheet drew 2px. 2 is off the 4px scale and the scale has no step below xs; 4 is the nearest legal value and reads the same at 13/12. Confirm, or add a 2px step.",
  ],

  knownGaps: [
    "A wrapped label centres against the circle instead of aligning to its first line — unless the option has a description, which switches the row to top alignment and fixes it. Checkbox records the identical defect and has no equivalent escape. Two components asking for one fix.",
    "No indeterminate equivalent, and there should not be one: a set where nothing is chosen is the resting state of every radio group, not a third value.",
    "The group cannot be cleared once a choice is made, which is the platform's behaviour and not a decision made here. An optional question needs an explicit option that means 'none'.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/2AIX-0",
} as const;

export type RadioDoc = typeof radioDoc;
