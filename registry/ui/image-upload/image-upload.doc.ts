/**
 * Typed documentation for ImageUpload.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const imageUploadDoc = {
  name: "ImageUpload",
  status: "stable",
  summary:
    "A form field whose control is a drop target. Four states — empty, busy, attached, rejected — plus a drag-over state the component owns itself. Built on a real <input type=\"file\">, so the keyboard path is the native picker rather than a re-implementation. ImageUpload.File is one row mid-upload; ImageUpload.Grid and .Add are the multiple-image layout.",

  anatomy: [
    { part: "root", slot: "image-upload", notes: "The field. Owns className and the ref, and carries data-status and data-dragging so a consumer or a test can see the state without reading classes." },
    { part: "label", slot: "image-upload-label", notes: "A real <label> for the input. Input's label styling verbatim, so the two fields stack in a form without a seam." },
    { part: "input", slot: "image-upload-input", notes: "The real <input type=\"file\">, visually hidden. It is the field: accessible name, disabled state, accept, aria-invalid and aria-describedby all live here." },
    { part: "dropzone", slot: "image-upload-dropzone", notes: "The 152px target. Owns the drag events and the outer edge, which is what changes on drag-over and on rejection." },
    { part: "well", slot: "image-upload-well", notes: "The inner surface the prompt sits on. Washes to accent-subtle while a file is over the target." },
    { part: "prompt", slot: "image-upload-prompt", notes: "The sentence, with the browse control inside it." },
    { part: "browse", slot: "image-upload-browse", notes: "A real button that clicks the input. The keyboard path for everything the drop target offers a pointer." },
    { part: "busy", slot: "image-upload-busy", notes: "role=status, so the upload announces itself to a screen reader that is not looking at it." },
    { part: "spinner", slot: "image-upload-spinner", notes: "CSS, not an icon — griddy has no spinner glyph and check:icons forbids a private SVG. Suppressed under prefers-reduced-motion." },
    { part: "error", slot: "image-upload-error", notes: "The rejection headline, on the danger well. Referenced by the input's aria-describedby." },
    { part: "preview", slot: "image-upload-preview", notes: "The attached image slot. Takes an <img>, an AspectRatio or an ImageOverlay." },
    { part: "actions", slot: "image-upload-actions", notes: "Replace / Remove / Choose another file. A slot, so they are real Buttons at the call site." },
    { part: "helper", slot: "image-upload-helper", notes: "The constraints. Turns danger-inked once one of them is broken, because they stop being guidance and become the reason." },
    { part: "file", slot: "image-upload-file", notes: "ImageUpload.File — one row: thumb, name, a real Progress bar, detail and a cancel control." },
    { part: "grid", slot: "image-upload-grid", notes: "ImageUpload.Grid — the framed well the tiles sit in. Same surface as the dropzone." },
    { part: "add", slot: "image-upload-add", notes: "ImageUpload.Add — the 92px add tile, a real button." },
  ],

  composition: `
ImageUpload
├─ label        string (required)
├─ status?      "empty" | "busy" | "attached" | "rejected"
├─ errorText?   string — its PRESENCE is what makes the state "rejected"
├─ errorDetail? string
├─ helperText?  string
├─ prompt?      string   browseLabel?  string   busyText? string
├─ accept?      string   isMultiple?   boolean  isDisabled? boolean
├─ preview?     ReactNode — the attached image
├─ actions?     ReactNode — real Buttons
└─ onSelect?    (files: File[]) => void — fires for a drop AND for a browse

ImageUpload.File
├─ name         string (required)
├─ value?       number — omit once finished
├─ detail?      string   icon? ReactNode
└─ onCancel + cancelLabel — required together

ImageUpload.Grid   children: Thumbnail elements and an ImageUpload.Add
ImageUpload.Add    label (required)
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required like every field here. A drop target with no name announces as a region and a file input with no name announces as 'browse' — neither says what is being uploaded." },
    status: { type: '"empty" | "busy" | "attached" | "rejected"', default: '"empty"', notes: "One closed union rather than three booleans, which would describe eight states of which five are nonsense. Drag-over is NOT in it: whether a file is currently over the target is something the component knows and a caller does not." },
    errorText: { type: "string", notes: "Its presence puts the field in `rejected`, exactly as on Input — so a caller cannot show a message and forget the state, or set the state and forget the message. Wired to the input through aria-describedby and aria-invalid." },
    onSelect: { type: "(files: File[]) => void", notes: "Fires for a drop AND for a browse, so a caller writes one path. Always an array, even when isMultiple is false." },
    preview: { type: "ReactNode", notes: "The attached image. A slot rather than a src prop, so the caller decides between a bare <img>, an AspectRatio and an ImageOverlay with a caption." },
    actions: { type: "ReactNode", notes: "Replace / Remove / Choose another file. A slot, so they are real Buttons — the sheet draws them as bespoke pills whose edge measures 2.14:1." },
    isMultiple: { type: "boolean", default: "false", notes: "Native `multiple` on the input. The tile layout for several images is ImageUpload.Grid." },
    value: { type: "number", notes: "ImageUpload.File only. Renders a real Progress at size xs. Omit it once the upload has finished and the bar disappears." },
    cancelLabel: { type: "string", notes: "ImageUpload.File only, REQUIRED whenever onCancel is set. Name the file: five rows of 'Cancel' announce as five identical buttons." },
  },

  do: [
    "Handle onSelect once — it fires for both the drop and the browse.",
    "Pass the rejection reason as errorText and the remedy as errorDetail; the state follows the message.",
    "Put real Buttons in `actions` — variant=\"outline\" for Replace, \"ghost\" for Remove.",
    "Name the file in cancelLabel, not just 'Cancel'.",
  ],

  dont: [
    "Do not set status=\"rejected\" without errorText — errorText is what drives the state, so the two cannot disagree.",
    "Do not re-implement the picker; the hidden input is the field, and clicking it from the browse button is the whole keyboard path.",
    "Do not draw your own progress track in a file row — a hand-drawn one has no progressbar role and reaches for --ui-bg-accent, which measures 1.24:1 on the well.",
    "Do not rely on the drag-over wash alone to signal a valid drop; the edge changes too, because a wash is colour only.",
  ],

  a11y: {
    role: "A native <input type=\"file\"> with a real <label>. The drop target is a plain div — it is an addition, not the control.",
    name: "The `label` prop, through htmlFor/id. The browse button carries its own name; the cancel control's is required by the type.",
    keyboard: [
      { keys: "Tab", does: "Reaches the file input and the browse button — the picker is operable without a pointer at all." },
      { keys: "Enter / Space", does: "Opens the native file picker from either. Native behaviour, not re-implemented." },
    ],
    status: "The busy state is role=status, so an upload announces itself to a screen reader that is not watching the bar. The bar itself is a real Progress with aria-valuenow, named after the file.",
    error: "errorText sets aria-invalid on the input and is referenced by aria-describedby. The rejection is carried by the BORDER, the icon, the message and the reddened helper — never by colour alone (1.4.1).",
    contrastPairs: [
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the field label" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-elevated", floor: "text", role: "the prompt, and the busy status — NOT the sheet's --ui-text-disabled, which measures 1.94:1 here" },
      { fg: "--ui-text-link", bg: "--ui-bg-elevated", floor: "text", role: "the browse control at rest" },
      { fg: "--ui-text-link", bg: "--ui-bg-accent-subtle", floor: "text", role: "the browse control while a file is dragged over the target" },
      { fg: "--ui-text-on-danger-subtle", bg: "--ui-intent-danger-bg", floor: "text", role: "the rejection headline and its detail, on the danger well" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-base", floor: "text", role: "the helper once a constraint is broken" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the helper at rest" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "a file row's name" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "a file row's detail, and its cancel glyph" },
      { fg: "--ui-text-muted", bg: "--ui-bg-sunken", floor: "non-text", role: "the add tile's plus — a graphical control whose only visual channel is its glyph" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-surface", floor: "non-text", role: "the rejected dropzone's edge, which is the boundary that carries the state" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the drag-over edge" },
      {
        fg: "--ui-border-subtle",
        bg: "--ui-bg-base",
        floor: "decorative",
        why: "The resting dropzone edge, measured 1.47:1 light / 1.48:1 dark. Quiet by design (ADR 0010): the target is identified by its 152px well, its prompt and its icon, not by its hairline — and the two states where the edge DOES carry meaning (drag-over, rejected) are declared above at the 3:1 floor.",
      },
    ],
  },

  forwarding: {
    ref: "Goes to the outermost node rather than to the input, deliberately breaking §5's form-control rule: this field's control is visually hidden and a caller taking a ref wants the field, not the picker. The input is reachable through data-slot.",
    className: "Lands on the outermost node.",
    rest: "Native div props go to the outermost node; `accept`, `multiple` and `disabled` go to the input, which is the element that owns them.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The file row's progress fill is --ui-bg-accent, which measures 1.24:1 against its own track in light — the exact SC 1.4.11 failure --ui-bg-accent-legible was added to fix, and which Progress already ships. Shipped by reusing Progress, so the fill is 3.07:1. This is the fourth control to draw a value with the raw accent; the role exists.",
    "The Replace / Choose another file pill is outlined in --ui-border-default, 2.14:1 light / 2.03:1 dark. That is the same finding already recorded against Button's outline variant, which now uses --ui-border-control at 3.11:1. Shipped as Button variant=\"outline\" via the actions slot. Remove is Button variant=\"ghost\".",
    "The busy label is drawn in --ui-text-disabled, 1.94:1 light / 2.63:1 dark. It is live status, not a disabled control, and WCAG exempts the latter only. Shipped in --ui-text-secondary.",
    "The rejection headline and detail are drawn in --ui-text-secondary and --ui-text-muted on the danger well; the detail measures 4.00:1 in dark. Shipped in --ui-text-on-danger-subtle, the role that exists for prose on a danger tint (8.52 / 5.93).",
    "'browse' is drawn as styled text rather than a control, so the whole component was reachable by pointer only. Shipped as a real button, and underlined — a link identified by colour alone fails 1.4.1 independently of its contrast.",
    "The field label is drawn at weight 550 while Input's is 500. Shipped at Input's, because two fields in one form should not have two label styles. Confirm which is the field-label weight.",
    "No focus treatment is drawn for the dropzone, the browse control, the cancel control or the add tile. All four take the system focus ring.",
    "No disabled state is drawn for any part.",
    "The add tile has no drawn hover or pressed state, and the multiple row's helper says 'drag a tile to reorder' — a reorder the sheet does not otherwise draw, and which would need a keyboard path of its own (CardSorting's problem, and its solution).",
    "The drag-over state is drawn only as valid. Nothing is drawn for a file being dragged over that will be REJECTED on drop, which is the moment the user can still act on it.",
  ],

  knownGaps: [
    "Reorder is not implemented. The sheet's helper mentions dragging a tile to reorder; that is CardSorting's job and would need the same keyboard path it has.",
    "No client-side validation. The component does not read `accept` to reject a file — it reports what it is told through errorText. Deciding what is valid is the app's, since the limits are the app's.",
    "The drag counter is a single boolean, so dragging over a child element and back out can flicker the wash on some browsers. It resolves on drop or on leaving the target.",
    "ImageUpload.File does not truncate the middle of a long name; it truncates the end, so two files differing only in their extension look alike.",
    "The busy state has no indeterminate form — ImageUpload.File without a `value` simply shows no bar.",
  ],

  motion:
    "The dropzone transitions `border-color` and `background-color` on drag-over; the browse and cancel controls transition `background-color` and `color`; all at --ui-duration-fast with --ui-ease-out. The busy spinner is a CSS keyframe under `motion-safe:`, and that variant — not the token layer — is what stops it under prefers-reduced-motion: `animate-spin` carries its own timing, so collapsing --ui-duration-* cannot reach it.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/OZD-0",
} as const;

export type ImageUploadDoc = typeof imageUploadDoc;
