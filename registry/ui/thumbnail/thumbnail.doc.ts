/**
 * Typed documentation for Thumbnail.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const thumbnailDoc = {
  name: "Thumbnail",
  status: "stable",
  summary:
    "A 48px attachment tile with an optional remove control on its corner. Thumbnail.Group lays several out as a spaced row or as an overlapping stack that spreads back out on hover, with an overflow counter. Called 'Image Thumbnail' on the sheet.",

  anatomy: [
    {
      part: "thumbnail",
      slot: "thumbnail",
      notes:
        "The outermost node. Owns the 48px box, className and the ref, and is the positioning context for the remove control. It does NOT clip, and it is the hover group the control listens to.",
    },
    { part: "frame", slot: "thumbnail-frame", notes: "The clipped tile: well, radius and the 1.5px inset hairline. Everything that takes the radius lives inside it." },
    { part: "image", slot: "thumbnail-image", notes: "A real <img>, so alt text exists and a broken URL degrades to it. Absent while isLoading." },
    { part: "loading", slot: "thumbnail-loading", notes: "role=status, named after the file. Replaces the picture rather than sitting over it." },
    { part: "spinner", slot: "thumbnail-spinner", notes: "CSS, not an icon — griddy has no spinner glyph and check:icons forbids a private SVG. Stops under prefers-reduced-motion at the token layer." },
    {
      part: "remove",
      slot: "thumbnail-remove",
      notes:
        "A real button on the corner. 16px of paint, 24px of target (a pseudo-element), revealed on hover AND on focus. A sibling of the frame, not a child, because the frame clips.",
    },
    { part: "group", slot: "thumbnail-group", notes: "The row or the stack. Spacing comes from the container rather than from rewriting children." },
    { part: "overflow", slot: "thumbnail-overflow", notes: "The '+N' tile. Deliberately the same tile as a thumbnail with no picture." },
  ],

  composition: `
Thumbnail
├─ src           string (required)
├─ isLoading?    boolean — spinner on the well, picture withheld
├─ alt           string (required) — what the attachment is
├─ onRemove?     () => void
└─ removeLabel   string — REQUIRED whenever onRemove is set

Thumbnail.Group
├─ children      Thumbnail elements, as direct siblings
├─ isStacked?    boolean — overlap instead of space; spreads on hover/focus
├─ max?          number — show this many, the rest become "+N"
└─ overflowLabel string — REQUIRED whenever max is set
  `.trim(),

  props: {
    src: { type: "string", required: true, notes: "The picture. A real <img>, so a broken URL degrades to the alt text rather than to an empty square." },
    isLoading: {
      type: "boolean",
      default: "false",
      notes:
        "The picture is still arriving: the tile shows a centred spinner on the well and the <img> is not rendered at all, because one arriving under a spinner reads as a broken one. A prop rather than something inferred from src — an image that has not loaded yet and one whose URL is wrong are indistinguishable from inside the component, and only the caller knows which it has. It is announced as role=status named after the file, so a row of five loading tiles is five different things rather than five 'Loading's.",
    },
    alt: {
      type: "string",
      required: true,
      notes:
        "What the attachment is. Pass an empty string only when a sibling label already names it — a row of thumbnails with no names is a row of identical grey squares to anyone not looking at it.",
    },
    onRemove: { type: "() => void", notes: "Renders the remove control. Omit it and no control exists at all — a cross that does nothing is worse than no cross." },
    removeLabel: {
      type: "string",
      notes:
        "REQUIRED by the type whenever onRemove is set, the same shape isIconOnly uses for aria-label. A cross with no accessible name announces as 'button', and five of them announce as five buttons called 'button'. Name the thing: 'Remove Brand guidelines.pdf'.",
    },
    isStacked: {
      type: "boolean",
      default: "false",
      notes:
        "Thumbnail.Group only. Overlaps the tiles by 4px instead of spacing them. The two answer different questions — a spaced row is a gallery, a stack is 'there are attachments here'. A stack SPREADS to the spaced layout on hover and on focus-within, which is what keeps it usable: an overlapped tile's remove control is underneath its neighbour.",
    },
    max: { type: "number", notes: "Thumbnail.Group only. How many to show before the rest become a '+N' tile. Counts DIRECT children, so a component that returns three thumbnails counts as one — pass them as siblings." },
    overflowLabel: { type: "string", notes: "Thumbnail.Group only, REQUIRED whenever max is set. A prop rather than a derived string — there is no i18n runtime here (§9) and pluralisation is not guessable." },
  },

  do: [
    "Name the attachment in alt, and name it again in removeLabel — they are read in different places.",
    "Use isStacked when the point is 'there are attachments', and the spaced row when the point is the pictures themselves.",
    "Pass Thumbnail children to Thumbnail.Group as direct siblings.",
    "Reach for AspectRatio instead when the media is content rather than an attachment; a Thumbnail is a 48px chip with a remove control.",
  ],

  dont: [
    "Do not render the remove control conditionally on hover — it is opacity, not mounting, precisely so it stays in the tab order and focus is never lost.",
    "Do not shrink the tile below 48px; the remove control's 24px target is already the whole top-right quadrant.",
    "Do not wrap Thumbnail.Group's children to space them — the spacing comes from the container so slot contents are never rewritten (§3).",
    "Do not put anything inside the frame that must escape the radius; the frame clips, which is why the remove control is a sibling.",
  ],

  a11y: {
    role: "The tile is a plain span; the remove control is a real <button>.",
    name: "The picture carries the alt text. The remove control carries removeLabel, which the type requires — a cross alone announces as 'button'.",
    keyboard: [
      { keys: "Tab", does: "Moves to the remove control. It is in the tab order whether or not it is visible, and becomes visible when it takes focus." },
      { keys: "Enter / Space", does: "Activates the remove control. Native button behaviour — nothing here re-implements it." },
    ],
    targetSize:
      "The remove control paints 16x16 and targets 24x24 via a pseudo-element (16 + 4 on each side), which is SC 2.5.8's floor exactly. The sheet draws the 16px box only.",
    focus:
      "The sheet draws the control on hover alone, which leaves a keyboard user tabbing to something invisible (SC 2.4.7). It is revealed on focus-visible as well. Had it been conditionally rendered instead, it could not have been reached at all (SC 2.1.1).",
    contrastPairs: [
      { fg: "--ui-text-muted", bg: "--ui-bg-sunken", floor: "non-text", role: "the remove glyph on its own tile — a graphical object that is the control's only visual channel" },
      {
        fg: "--ui-bg-sunken",
        bg: "--ui-bg-base",
        floor: "decorative",
        why: "The 1.5px inset hairline, and the well behind the picture — the sheet draws both in the same role. Measured 1.22:1 light / 1.44:1 dark against the page. It is not a boundary anything depends on identifying: the picture itself is what makes a thumbnail visible, and the ring's job is stopping a photograph's own white edge from bleeding into the page. It is in needsDesign, because in a STACKED group the same value means there is no seam between neighbours.",
      },
    ],
  },

  forwarding: {
    ref: "Goes to the outermost node — Thumbnail is not a form control, so the §5 default applies. The remove button is reachable through data-slot.",
    className: "Lands on the outermost node, so sizing or positioning a thumbnail works. The clipped tile is data-slot=\"thumbnail-frame\".",
    rest: "Native span props go to the outermost node.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The remove control is drawn 16x16, under SC 2.5.8's 24px floor. Shipped with a 24px pseudo-element target and the 16px paint unchanged. Confirm — or draw it at 24 and the arithmetic disappears.",
    "The remove control is drawn on hover only. A keyboard user tabs to something invisible (SC 2.4.7). Shipped revealed on focus-visible as well as hover. No focus treatment is drawn for it at all.",
    "The hairline and the well are the SAME role (--ui-bg-sunken), so in a stacked group two overlapping tiles have no seam between them — the ring is invisible against its neighbour's fill. Avatar solves the identical problem with an --ui-bg-surface ring. Confirm which, for both components.",
    "The overflow counter is not drawn for thumbnails at all; it is Avatar.Group's, borrowed, because a stack of attachments truncates for the same reason a stack of people does. Confirm the '+N' tile, its ink and its type role.",
    "The stacked row's hover spreads to TOUCHING rather than to the sheet's +4px gap — half the travel, and eased out over --ui-duration-slow rather than the standard curve, because at 200ms a stack of four read as a snap rather than an unfolding. A zero gap is all the interaction needs: what the overlap hides is the next tile's top-right corner, which is exactly where the remove control sits. Confirm the shorter travel.",
    "No loading state is drawn. Shipped as a centred CSS spinner on the well, with the picture withheld until it is ready.",
    "The stacked row's z-order. The sheet's drawing suggests the FIRST tile sits on top; DOM order paints the last one on top, and reproducing the sheet would mean cloning children to assign z-index, which §3 rules out. Same gap Avatar.Group records.",
    "No hover state is drawn for the tile itself, only for the group and the control. A thumbnail is very often a link to the full asset.",
    "No loading or broken-image state is drawn; a slow attachment shows the bare well.",
  ],

  knownGaps: [
    "Thumbnail.Group counts DIRECT children. `{cond && <Thumbnail/>}` is handled (Children.toArray drops it), but a component that returns several thumbnails counts as one and `max` will not see through it.",
    "The stack spreads on hover of the GROUP, so on a touch device — where there is no hover — an overlapped tile's remove control stays under its neighbour. focus-within covers the keyboard path; touch has none.",
    "The '+N' tile is not itself removable and has no press behaviour. It is a counter, not a control.",
    "outline-width AND outline-offset both snap to whole device pixels, so the 1.5px hairline computes to 1px inset 1px at dPR 1 and is exact at dPR 2. Pinned in border-hairline.browser.test.tsx rather than re-investigated.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/NT7-0",
} as const;

export type ThumbnailDoc = typeof thumbnailDoc;
