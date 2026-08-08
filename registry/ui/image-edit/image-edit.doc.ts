/**
 * Typed documentation for ImageEdit.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const imageEditDoc = {
  name: "ImageEdit",
  status: "stable",
  summary:
    "A crop stage with zoom and optional rotation. The crop WINDOW is fixed and the image moves behind it — by drag, and by the arrow keys, which the sheet draws no path for. Rectangular or circular; the circle is the avatar case, where the mask matches the destination. It is the body of a dialog, not the dialog: the caller wraps it in Modal and supplies the title, the close and the footer.",

  anatomy: [
    { part: "root", slot: "image-edit", notes: "The column: stage, then one control per adjustment. Carries className, the ref, and data-shape." },
    {
      part: "stage",
      slot: "image-edit-stage",
      notes:
        "The media ground and the pointer/keyboard target. Focusable, role=group, named by cropLabel and described by the keyboard hint. Painted --ui-bg-media, not --ui-bg-emphasis.",
    },
    { part: "image", slot: "image-edit-image", notes: "The picture. Drawn ONCE, across the whole stage, and it carries the alt text. Its fitted size is measured on load and on resize; every guarantee below is computed from it." },
    { part: "crop", slot: "image-edit-crop", notes: "The window. Fixed size, edged in ink-on-media, and the source of the dimming: a box-shadow with a spread larger than the stage puts a hole in the scrim, so it follows the border-radius and the circular mask gets a circular hole. 240x168 rect, 168px circle." },
    { part: "thirds", slot: "image-edit-thirds", notes: "The rule-of-thirds grid, shown while the stage is pressed. aria-hidden." },
    { part: "handles", slot: "image-edit-handles", notes: "Corner marks, rect only. DECORATION — the window does not resize, so they carry no handlers." },
    { part: "control", slot: "image-edit-control", notes: "A label row plus a Slider. One for zoom, one for rotation." },
  ],

  composition: `
Modal
└─ Modal.Surface
   ├─ Modal.Title            "Adjust image"
   ├─ ImageEdit
   │  ├─ src / alt           required
   │  ├─ shape?              "rect" | "circle"
   │  ├─ zoom? / defaultZoom? / onZoomChange? / minZoom? / maxZoom?
   │  ├─ hasRotation?        draws the second control
   │  └─ rotation? / defaultRotation? / onRotationChange? / maxRotation?
   └─ Modal.Footer
      ├─ Button variant="outline"   Cancel
      └─ Button                     Apply
  `.trim(),

  props: {
    src: { type: "string", required: true },
    alt: { type: "string", required: true, notes: "The picture is the whole subject of the dialog. A cropper whose image announces as nothing leaves a screen-reader user adjusting an unnamed thing." },
    shape: {
      type: '"rect" | "circle"',
      default: '"rect"',
      notes:
        "rect is 240x168 with corner marks; circle is a 168px mask for the avatar case. The circle deliberately has no corner marks — a round crop cannot deliver the rectangle a corner handle promises, and the sheet draws none on that row.",
    },
    zoom: {
      type: "number",
      default: "100",
      notes:
        "A percentage of the COVER FIT, not of the picture's own size: 100% is the smallest scale at which the picture fills the crop at its current rotation, so the crop can never contain a hole. It was previously a percentage of 'contained in the stage', which promised nothing about the crop — a 600x3000 picture fitted to 52x260 against a 240px-wide crop left 188px of nothing in the middle of the result. Controlled or uncontrolled through defaultZoom, via the shared useControllableState (§4).",
    },
    hasRotation: { type: "boolean", default: "false", notes: "Draws the rotation control. The sheet shows three rows without it and one with, so it is opt-in rather than always present." },
    rotation: {
      type: "number",
      default: "0",
      notes:
        "Degrees, clamped to ±maxRotation (45 by default). This is straightening, not orientation — a 90° turn is a different action and is not drawn. Rotating at 100% visibly GROWS the picture, and it has to: the crop's rotated bounding box grows faster than the picture does (240x168 needs 283x240 at -20°), so holding the scale would open the corners.",
    },
    cropLabel: { type: "string", default: '"Crop area"', notes: "Names the stage, which is the focusable region a keyboard user lands on." },
    keyboardHint: {
      type: "string",
      default: '"Use the arrow keys to move the image inside the crop."',
      notes:
        "Rendered sr-only and referenced by the stage's aria-describedby, so the keyboard path is announced rather than discovered. The sheet draws no keyboard affordance at all.",
    },
  },

  do: [
    "Wrap it in a Modal and supply the title, close and footer — it is the dialog's body, not the dialog.",
    "Read zoom and rotation from your own state on Apply; the pan offset is internal and deliberately not exposed.",
    "Use shape=\"circle\" whenever the destination is round, so the mask matches what the user will actually get.",
    "Translate cropLabel and keyboardHint along with everything else — they are props for that reason.",
  ],

  dont: [
    "Do not expect the crop window to resize; the window is fixed and the image moves. That is what the sheet draws, and it is why the corner marks carry no handlers.",
    "Do not read `zoom` as a fraction of the picture's natural size — it is a fraction of the cover fit, so 100% means 'exactly fills the crop' and never means 'actual size'.",
    "Do not paint the stage with --ui-bg-emphasis. That role IS the accent, so a brand seed turns the stage into its brand colour and every colour in the picture is judged against it.",
    "Do not remove the keyboard hint to save space — it is the only announcement of the one interaction the sheet never drew.",
    "Do not use it for a 90° rotate or a flip; this control straightens, and neither is drawn.",
  ],

  a11y: {
    role: "The stage is role=group with a name and a description — a focusable region, not a widget with a value. The two adjustments are real Sliders, which carry their own roles and values.",
    name: "cropLabel names the stage; the picture's alt names the image; each Slider is named by its own label, rendered sr-only because the visible row uses different type roles.",
    keyboard: [
      { keys: "Tab", does: "Moves to the stage, then to each slider and its steppers." },
      { keys: "Arrow keys", does: "Move the image inside the crop, 8px at a time. The path the sheet does not draw." },
      { keys: "Shift + arrows", does: "Move it 32px at a time." },
      { keys: "Arrows on a slider", does: "Step the zoom or the rotation. Base UI's, not re-implemented." },
    ],
    pointer:
      "Dragging the stage pans the image, with pointer capture so a drag that leaves the stage keeps tracking. preventDefault is called only for keys this control handles, so Tab and Escape still leave the dialog.",
    contrastPairs: [
      { fg: "--ui-text-on-media", bg: "--ui-bg-media-floor", floor: "non-text", role: "the crop window's edge and its corner marks, against the palest ground the media family guarantees — the boundary that identifies the crop" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-surface", floor: "text", role: "a control's label" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "a control's value readout" },
      {
        fg: "--ui-text-on-media",
        bg: "--ui-bg-media",
        floor: "decorative",
        why: "The same marks against the stage at FULL strength rather than against the family's guaranteed floor — measured 15.53:1 in both schemes. It is declared because it is what is actually painted when no picture has loaded, and it is decorative rather than a second non-text claim because the floor pair above is the stricter one and already carries the conformance argument.",
      },
    ],
  },

  forwarding: {
    ref: "Goes to the outermost node. ImageEdit is not a form control — its two values are the Sliders', which own their own elements.",
    className: "Lands on the outermost node.",
    rest: "Native div props go to the outermost node.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "No keyboard path is drawn for the crop. Shipped with arrow keys panning the image (Shift for a coarse step) and an sr-only hint on the stage, following CardSorting's precedent. This is MINE, not the sheet's — confirm the keys and whether the hint should also be visible.",
    "The stage is drawn --ui-bg-emphasis, which is the accent: under a pale-yellow brand seed it resolves to #ffe066 and a photograph is judged against bright yellow. Shipped on --ui-bg-media, the neutral media ground. Confirm.",
    "Both sliders are drawn with a --ui-bg-accent fill (1.24:1 against their own track) and a --ui-border-default knob edge (1.76:1 against the track, 2.14:1 against the knob's own fill). Shipped as the Slider component, whose fill and thumb ring are floored at 3:1. This is the fourth sheet in a row to draw a value with the raw accent.",
    "The panel's shadow is a raw #1D1B1929 rather than --ui-shadow-sm, which is the same value on the token layer. The panel is Modal's in code, so this is a note for the sheet.",
    "Cancel is drawn outlined in --ui-border-default (2.14:1). Shipped as Button variant=\"outline\", which uses --ui-border-control at 3.11:1 — the same finding already recorded against Button.",
    "The corner marks read as resize handles but the window does not resize in any drawn state. Either they should go, or the crop should be resizable — which is a much larger interaction and would need its own keyboard contract.",
    "No hover, focus, disabled or loading state is drawn for the stage. It takes the system focus ring.",
    "The 'Dragging' row shows the thirds grid and says the surround lifts, but gives the dimming outside the crop no value. Shipped as the media ground at 64% over the picture. Confirm.",
    "Zoom's baseline. The sheet labels the resting state 100% but does not say what it is 100% OF. Shipped as the COVER FIT against the crop at the current rotation, so 100% is a true floor and the crop is always full; the visible consequence is that rotating at 100% grows the picture. The alternative reading — 100% of the stage fit — leaves a hole in the crop for any portrait or panoramic picture, and opens the corners past about ±20° of rotation. Confirm.",
    "The rotation track is drawn BIPOLAR — fill from the centre out, plus a 2x12 centre tick in --ui-border-strong marking 0°. Slider has one fill origin, so it is shipped filling from the minimum and without the tick; see knownGaps. If bipolar sliders are going to recur (a straighten, a balance, an offset), that is an `origin` prop on Slider rather than a local workaround here.",
  ],

  knownGaps: [
    "The cover fit is computed from the picture's fitted box, which is only known once it has loaded. Between mount and load the scale is 1 and the crop may briefly show the stage — one frame for a cached image, longer for a slow one. There is no loading state drawn to cover it.",
    "The rotation slider fills from its MINIMUM, not from zero. The sheet draws a bipolar track — the fill runs from the centre out to the thumb — and Slider has one origin. The thumb sits in the right place and the value announces correctly, so this is cosmetic, but it makes −12° look like 'a third of the way along' rather than 'a little to the left of straight'. Fixing it properly means an `origin` prop on Slider, which is a second API change and is not worth making blind.",
    "The sheet's centre tick on the rotation track — a 2x12 mark in --ui-border-strong at 0° — is not drawn, for the same reason. It is the thing that shows where 'straight' is, so it is the more useful half of the bipolar treatment.",
    "The pan offset is not exposed. A caller gets zoom and rotation on Apply and must render the result itself; producing the cropped bitmap is the app's job, since it involves a canvas and this library has no data layer (§9).",
    "Rotation is straightening only (±45° by default). A 90° turn or a flip is a different action and neither is drawn.",
    "The thirds grid appears on pointer press only. A keyboard user panning with the arrows does not see it, because there is no drawn state that says they should.",
    "The two copies of the picture mean the image is fetched once but decoded twice; at these sizes that is cheaper than a canvas and it is what the sheet's own layer tree does.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/P1P-0",
} as const;

export type ImageEditDoc = typeof imageEditDoc;
