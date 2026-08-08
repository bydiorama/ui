/**
 * Typed documentation for ImageOverlay.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const imageOverlayDoc = {
  name: "ImageOverlay",
  status: "stable",
  summary:
    "A picture with content on top of it. `scrim` darkens the bottom and holds a caption; `full` covers the whole frame, blurs it and centres an action. The veil is strong enough that its inks clear AA over the brightest possible photograph — which is the only guarantee a component that puts text on unknown images can make.",

  anatomy: [
    {
      part: "root",
      slot: "image-overlay",
      notes:
        "The AspectRatio frame itself, not a wrapper around one — same ratio, radius, clip and well, so the two cannot drift. It carries className and the ref, and its data-slot is REPLACED with image-overlay, so `[data-slot=\"aspect-ratio\"]` does not match inside one.",
    },
    { part: "image", slot: "image-overlay-image", notes: "A real <img>, sized and cropped by the frame. Carries the alt text." },
    {
      part: "veil",
      slot: "image-overlay-veil",
      notes:
        "The darkened region. Pinned to the bottom edge in `scrim`, covering the frame with an 8px backdrop blur in `full`.",
    },
    {
      part: "fade",
      slot: "image-overlay-fade",
      notes:
        "scrim only. A 32px transparent-to-veil ramp ABOVE the caption. aria-hidden — it is the picture dissolving, not content.",
    },
    {
      part: "content",
      slot: "image-overlay-content",
      notes:
        "scrim only. The caption's ground, at the veil's full strength so every line sits on the same measured surface.",
    },
    {
      part: "title",
      slot: "image-overlay-title",
      notes:
        "The first line, at the sheet's 16px/600. Inset by --ui-space-xs per §6, clamped to one line. It uses `body-lg` at bold weight rather than `title-sm`: the title roles are FLUID, and a caption lives inside a frame whose width comes from a grid column rather than from the viewport, so title-sm computed to 12.17px against the sheet's 16.",
    },
    { part: "description", slot: "image-overlay-description", notes: "The second line. Same inset, quieter ink, still AA." },
  ],

  composition: `
ImageOverlay
├─ src        string (required)
├─ alt        string (required) — "" for a decorative picture
├─ ratio?     AspectRatio's six named ratios
├─ variant?   "scrim" | "full"
└─ children   what sits on the veil

<ImageOverlay src="/cover.jpg" alt="Abstract gradient" ratio="square">
  <Badge variant="success">Approved</Badge>
  <ImageOverlay.Title>Abstract background</ImageOverlay.Title>
  <ImageOverlay.Description>Photo Library</ImageOverlay.Description>
</ImageOverlay>

<ImageOverlay src="/cover.jpg" alt="" variant="full">
  <Button variant="secondary">Download</Button>
</ImageOverlay>
  `.trim(),

  props: {
    src: { type: "string", required: true, notes: "The picture. A real <img>, so a broken URL degrades to the alt text rather than to an empty box." },
    alt: {
      type: "string",
      required: true,
      notes:
        "Empty string for a decorative picture. Required rather than optional because an image carrying a caption is usually NOT decorative, and the caption is a different sentence from the alt text: the caption names the asset, the alt text says what it looks like.",
    },
    ratio: {
      type: '"square" | "story" | "portrait" | "landscape" | "card" | "screen"',
      default: '"square"',
      notes: "Passed straight through to AspectRatio. Same vocabulary, same meanings — there is no second ratio scale here.",
    },
    variant: {
      type: '"scrim" | "full"',
      default: '"scrim"',
      notes:
        "scrim holds a caption at the bottom edge. full covers the frame, blurs the picture behind it and centres its children — the sheet fills it with a single action, which is what it is for.",
    },
    children: {
      type: "ReactNode",
      notes:
        "Anything. A Badge sits flush at the veil's padding because it has its own fill; Title and Description inset themselves a further --ui-space-xs, which is §6's rule encoded in the component rather than remembered at the call site.",
    },
  },

  do: [
    "Use ImageOverlay.Title and ImageOverlay.Description for caption text — they carry the only two inks measured against the veil.",
    "Put actions in the `full` variant and captions in `scrim`; that is the difference between the two.",
    "Pass alt=\"\" when the picture is decoration and the caption already names the thing.",
    "Reach for AspectRatio instead when there is nothing to put on top — an overlay with no children is a frame with a bar across it.",
  ],

  dont: [
    "Do not put arbitrary text on the veil with your own colour. --ui-text-inverse in particular is near-BLACK in the dark scheme, which is the mistake the sheet made and the reason --ui-text-on-media exists.",
    "Do not weaken the veil to show more of the picture; its strength is the AA guarantee, not a taste setting.",
    "Do not stack a second scrim inside — the guarantee is stated for one layer and two would be measured by nothing.",
    "Do not rely on `[data-slot=\"aspect-ratio\"]` to find the frame; the root replaces it with image-overlay.",
  ],

  a11y: {
    role: "none — a plain div. The <img> inside carries the picture's semantics and its alt text.",
    name: "The alt text names the picture. The caption is ordinary text in the reading order after it, so a screen reader gets the description and then the caption, rather than one string doing both jobs badly.",
    text: "Title and Description are real paragraphs, not aria attributes, so they are selectable, translatable and reachable by a screen reader's normal reading order.",
    contrast:
      "Text over a picture can only be guaranteed against the WORST picture, which is a white one. --ui-bg-media-floor is that case as an opaque role — the veil composited over white — and both inks are declared against it below, so check:contrast measures the guarantee in both schemes instead of a reviewer estimating it.",
    contrastPairs: [
      { fg: "--ui-text-on-media", bg: "--ui-bg-media-floor", floor: "text", role: "the caption's first line, over the veil at its weakest possible reading" },
      { fg: "--ui-text-on-media-muted", bg: "--ui-bg-media-floor", floor: "text", role: "the caption's second line, same ground" },
    ],
  },

  forwarding: {
    ref: "Goes to the AspectRatio frame, which is the outermost node. ImageOverlay is not a form control, so the §5 default applies.",
    className: "Lands on the frame, so sizing, positioning or replacing the ratio all work exactly as they do on AspectRatio.",
    rest: "Native div props go to the frame. `data-slot` and `data-variant` are set by the component and a caller's would win — deliberately, since rest spreads last there.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The scrim's strength. The sheet ramps --ui-neutral-0 from 0% to 48%; over a white photograph that composites to a ground where the sheet's own inks measure 2.81:1 (title) and 2.11:1 (subtitle), both under AA. Shipped at 72%, where the SAME two inks measure 6.14:1 and 4.62:1. The drawing is otherwise unchanged. Confirm the darker veil, or confirm that captions are only ever placed over art-directed images and the guarantee should be dropped.",
    "The sheet inks the caption with --ui-text-inverse and its second line with a raw --ui-neutral-80. Inverse is near-BLACK in the dark scheme, so the caption would have disappeared in dark only; neutral-80 is off the role layer entirely. Both are now --ui-text-on-media / --ui-text-on-media-muted, pinned to the same two values the sheet drew. No visual change in light.",
    "The `full` variant is drawn as a 16%->48% ramp with its content CENTRED — i.e. the content sits where a ramp is weakest. Shipped as a flat veil at the same 72%, keeping the sheet's 8px blur. Confirm.",
    "The second Image Overlay row is captioned 'Scrim' in the sheet; from the drawing it is the Full variant. Likely a copy/paste.",
    "The `full` variant's action is drawn as a 1.5px --ui-border-subtle pill at 60% width with no fill — a bespoke control matching no Button variant, and one whose edge measures 4.62:1 against the veil in light and 1.38:1 in DARK. The veil deliberately does not follow the scheme and --ui-border-subtle does, so the same drawing loses its only boundary in one of them. Shipped as a slot instead, so the call site passes a real Button with its own fill. A button intended to sit on a photograph may be worth its own variant, and it would need an edge that does not follow the page either.",
    "No hover, focus or pressed state is drawn, and an overlaid picture is very often a link. Nothing here is interactive.",
  ],

  knownGaps: [
    "Title and Description are clamped to one line each, which is what the sheet draws. A long asset name is truncated with no tooltip and no title attribute.",
    "The veil is a single measured layer. Nesting a second one — a scrim inside a full — is not prevented and is not measured.",
    "The `full` variant's backdrop blur is Tailwind's 8px step rather than a token; there is no blur scale in the contract, and one step is not a scale.",
    "The AA guarantee covers this component's own two inks. Anything else placed on the veil — a consumer's own text, an icon — is measured by nothing.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/NV5-0",
} as const;

export type ImageOverlayDoc = typeof imageOverlayDoc;
