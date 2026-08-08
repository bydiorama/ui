/**
 * Typed documentation for AspectRatio.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const aspectRatioDoc = {
  name: "AspectRatio",
  status: "stable",
  summary:
    "A media frame whose height comes from its width. Six named ratios from the sheet — square, story, portrait, landscape, card, screen — over a recessed well, clipped to the soft radius. Sizes and crops a child <img> from the outside, so the call site is just src and alt.",

  anatomy: [
    {
      part: "frame",
      slot: "aspect-ratio",
      notes:
        "The only node. Owns the ratio, the radius, the clip, the well, className and the ref. Width-driven: it takes its column and the ratio supplies the height.",
    },
  ],

  composition: `
AspectRatio
├─ ratio?     "square" | "story" | "portrait" | "landscape" | "card" | "screen"
└─ children   the media — typically a bare <img src alt />

<AspectRatio ratio="screen">
  <img src="/cover.jpg" alt="Brand guidelines cover" />
</AspectRatio>
  `.trim(),

  props: {
    ratio: {
      type: '"square" | "story" | "portrait" | "landscape" | "card" | "screen"',
      default: '"square"',
      notes:
        "1:1, 9:16, 3:4, 4:3, 1.586:1 and 16:9 — the sheet's six rows, in its order. A vocabulary rather than a number (§2): 'story' means the same shape wherever it is written, and nobody has to remember which way round 9/16 goes. Anything outside the six goes through className — `aspect-[21/9]` displaces the default cleanly, because tailwind-merge classifies both in the aspect-ratio group.",
    },
    children: {
      type: "ReactNode",
      required: true,
      notes:
        "The media. A child <img> is sized and cropped from the outside (size-full, object-cover) rather than wrapped, so the call site writes src and alt and nothing else. Anything that is not an img is left alone.",
    },
  },

  do: [
    "Put a bare <img src alt /> inside; the frame sizes and crops it.",
    "Let the frame take its width from the column it sits in — that is what a ratio box is for.",
    "Reach for className with an arbitrary aspect utility when the shape is genuinely outside the six.",
    "Pass alt=\"\" for a decorative image rather than omitting it.",
  ],

  dont: [
    "Do not wrap the image in a sizing div — the frame already does it, and two sizing layers is how object-fit stops applying.",
    "Do not give the frame a fixed height; the ratio owns the height and a height would silently win.",
    "Do not use it for a 48px attachment tile — that is Thumbnail, which adds the remove control and the stack.",
  ],

  a11y: {
    role: "none — a plain div. The frame is presentation; the media inside it carries its own semantics.",
    name: "None of its own. An <img> child carries the alt text, which is where an accessible name for a picture belongs.",
    contrastPairs: [
      {
        fg: "--ui-bg-sunken",
        bg: "--ui-bg-base",
        floor: "decorative",
        why: "The well behind the media, measured 1.22:1 light / 1.44:1 dark. It is not a boundary anything depends on identifying: once an image has loaded it is invisible, and when one has not the frame communicates nothing that the missing picture does not already communicate. Declared rather than omitted so the number is visible — a well this quiet against the page is worth a designer knowing about, and it is in needsDesign.",
      },
    ],
  },

  forwarding: {
    ref: "Goes to the frame — the only node, and not a form control, so the §5 default applies.",
    className:
      "Lands on the frame. Because it merges last it is also the escape hatch for a ratio outside the six, and for turning the well or the radius off.",
    rest: "Native div props go to the frame.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The AspectRatio sheet draws its frames with no fill, while the Image Thumbnail sheet draws the same frame over --ui-bg-sunken. Shipped WITH the well, because a frame that clips shows the page through it until the image loads and the two sheets should not disagree about one frame. Confirm.",
    "The 'card' row is labelled 1.586:1 and drawn 304x192, which is 1.583:1. Shipped at the label, since 1.586 is the ID-1 card ratio and 1.583 is what a whole-pixel artboard could reach. Confirm.",
    "No loading, empty or broken-media state is drawn. The well is the whole of the fallback today; a frame that has failed to load looks identical to one that is still trying.",
    "No hover or focus state is drawn, and a media frame is very often a link or a button (it opens the asset). Nothing here is interactive; a consumer wrapping one gets the wrapper's states.",
  ],

  knownGaps: [
    "The frame is `w-full`, so it needs a parent with a resolved width. Inside a shrink-to-fit parent — a bare flex or inline-block, and Storybook's docs cells — `w-full` is circular and collapses to the content, which for an <img> with no intrinsic size is nothing. Every story here wraps the frame in a fixed width for exactly this reason. If a frame renders at zero, look at its parent before looking at the component.",
    "The ratio vocabulary is closed. An arbitrary shape is reachable only through className, which works but is not type-checked — `aspect-[16/10]` and `aspect-[16-10]` are equally valid to the compiler.",
    "Only a direct <img> child is sized from the outside. A <video>, a <canvas> or an image nested one level deeper sizes itself, which is deliberate — the rule reaches exactly as far as it can be sure about.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/MLS-0",
} as const;

export type AspectRatioDoc = typeof aspectRatioDoc;
