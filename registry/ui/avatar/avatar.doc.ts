/**
 * Typed documentation for Avatar.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const avatarDoc = {
  name: "Avatar",
  status: "stable",
  summary:
    "A person or entity as a photo or their initials, in two shapes and three sizes, with an optional status dot. Avatar.Group stacks several with an overflow counter.",

  anatomy: [
    { part: "avatar", slot: "avatar", notes: "The outermost node. Owns the box, className and the ref, and is the positioning context for the status dot. It does NOT clip." },
    { part: "frame", slot: "avatar-frame", notes: "The clipped tile: well and radius. Everything that must take the radius lives inside it. It carries NO edge — a lone avatar has nothing behind it to separate from, and the seam between stacked avatars is the group's job." },
    { part: "image", slot: "avatar-image", notes: "A real <img>, so alt text exists and a broken URL degrades to it." },
    { part: "initials", slot: "avatar-initials", notes: "The abbreviation. aria-hidden — the full name is exposed separately." },
    { part: "status", slot: "avatar-status", notes: "The dot. aria-hidden; statusLabel carries the meaning. A sibling of the frame, not a child, because the frame clips." },
    { part: "group", slot: "avatar-group", notes: "The stack. Applies BOTH the 4px overlap and the seam from the container rather than by rewriting children — the seam is an offset box-shadow on every child but the first, so it lands on the avatar beneath and never on the ground." },
    { part: "overflow", slot: "avatar-overflow", notes: "The '+N' tile. Deliberately the same tile as an avatar with no photo, and a child of the group like any other, so it gets its seam from the same rule." },
  ],

  composition: `
Avatar
├─ name          string (required) — alt text, and the source of the initials
├─ src?          string — a photo; omit for initials
├─ initials?     string — override the derived pair
├─ status?       "success" | "neutral" | "danger"
└─ statusLabel   string — REQUIRED whenever status is set

Avatar.Group
├─ children      Avatar elements, as direct siblings
├─ max?          number — show this many, the rest become "+N"
└─ overflowLabel string — REQUIRED whenever max is set
  `.trim(),

  props: {
    name: {
      type: "string",
      required: true,
      notes:
        "Required in both forms: it is the image's alt text and, without an image, the source the initials are derived from. An avatar with no name is decoration wearing a person's face.",
    },
    src: { type: "string", notes: "A photo. Omit for the initials form — the two are a discriminated union, so `initials` and `src` cannot both be passed." },
    initials: { type: "string", notes: "Override the derived pair — non-Latin names, mononyms, brand marks. Only available in the initials form." },
    size: { type: '"lg" | "md" | "sm"', default: '"md"', notes: "48 / 32 / 24px. md is the sheet's size verbatim; lg and sm are derived from the same scale so avatars match the control heights they sit beside." },
    shape: {
      type: '"soft" | "full"',
      default: '"soft"',
      notes:
        "Button's two words for the same two shapes (§2), and the two the sheet's own layers are named after. The soft radius per size is Button's soft radius per size, so a row of both is concentric. RENAMED from circle|rounded — see the ledger.",
    },
    status: {
      type: '"success" | "neutral" | "danger"',
      notes:
        "A dot on the corner. Intent vocabulary, as everywhere else. The fills are the intent ROLES rather than the sheet's values — see needsDesign for the two the sheet got wrong.",
    },
    statusLabel: {
      type: "string",
      notes:
        "REQUIRED by the type whenever status is set, the same shape isIconOnly uses for aria-label. A dot is colour and position only, so on its own it tells a screen-reader user nothing — WCAG 1.4.1 exactly. Rendered sr-only next to the name so the two are announced together.",
    },
    max: { type: "number", notes: "Avatar.Group only. How many to show before the rest become a '+N' tile. Counts DIRECT children, so a component that returns three avatars counts as one — pass them as siblings." },
    overflowLabel: { type: "string", notes: "Avatar.Group only, REQUIRED whenever max is set. '+4' is a glyph and a number; a screen reader needs the sentence. A prop rather than a derived string — there is no i18n runtime here (§9) and pluralisation is not guessable." },
  },

  /**
   * The component-level override surface (CONVENTIONS §6). One property, read
   * by all three ringed parts, so a container rebinds it once.
   */
  cssVars: [
    {
      name: "--ui-avatar-ring-color",
      default: "var(--ui-bg-surface)",
      parts: ["avatar-group (the seam)", "avatar-status"],
      notes:
        "The colour of the two things that still paint an edge: the seam between stacked avatars, and the status dot's ring. It used to govern a full-perimeter hairline on EVERY avatar — which is what shadcn, MUI, Atlassian and Flowbite all ship, and which is wrong on any ground but one (MUI has it on file as #21700). It no longer does: the frame carries no edge, the seam is painted only on the leading edge of a stacked child where it lands on the avatar beneath, and neither reaches the ground. Rebinding is therefore rarely needed — do it on the CONTAINER (`style={{ \"--ui-avatar-ring-color\": \"var(--ui-bg-elevated)\" }}`) when you want the seam to read as a cut through the stack on a non-surface ground. Declared as a var() fallback rather than as a declaration on the avatar, so an ancestor's binding wins.",
    },
  ],

  do: [
    "Always pass the full name, even with a photo — it is the alt text.",
    "Drop an avatar on any ground you like — a card, a menu panel, a table row, a photograph. It carries no edge of its own, so there is nothing to reconcile.",
    "Pass statusLabel with every status; the type will insist, and the reason is that a colour is not a message.",
    "Pass Avatar children to Avatar.Group as direct siblings, and give the group the same size and shape the children carry.",
    "Use initials for brand marks and mononyms rather than faking a two-word name.",
  ],

  dont: [
    "Do not pass initials as name; the accessible name must be the full name.",
    "Do not use the disabled ink for initials — it measures 1.76:1 on the well. Initials identify a person and must clear AA.",
    "Do not put anything inside the frame that must escape the radius; the frame clips, which is why the status dot is a sibling.",
    "Do not wrap Avatar.Group's children to space them — the overlap comes from the container so slot contents are never rewritten (§3).",
    "Do not put a ring back on the avatar to 'separate it from the page'. Nothing is behind a lone avatar; a ring there can only ever be a claim about the ground, and that claim is what every library in this space gets wrong.",
  ],

  a11y: {
    role: "img (native, when src is present) / plain text otherwise",
    name: "The `name` prop. With a photo it is the alt text; without one, the visible initials are aria-hidden and the full name is rendered in an sr-only span, so a screen reader announces the person rather than spelling out 'M V'.",
    status:
      "The dot is aria-hidden and statusLabel is rendered sr-only inside the same element as the name, so the two are announced as one thing. The label is type-required, not documented — colour alone would fail WCAG 1.4.1.",
    group:
      "The counter's '+N' glyph is aria-hidden and overflowLabel is announced instead. The group is a plain container with no role: each avatar already carries its own name, and a role=group with no accessible name adds a landmark that says nothing.",
    contrastPairs: [
      { fg: "--ui-text-muted", bg: "--ui-bg-sunken", floor: "text", role: "initials on the well — the pair the component actually renders" },
      { fg: "--ui-intent-success-fg", bg: "--ui-bg-surface", floor: "non-text", role: "the success dot against its ring, at the ring's default colour" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "non-text", role: "the neutral dot against its ring, at the ring's default colour" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-surface", floor: "non-text", role: "the danger dot against its ring, at the ring's default colour" },
      {
        fg: "--ui-bg-surface",
        bg: "--ui-bg-sunken",
        floor: "decorative",
        why: "The 1.5px SEAM between two overlapping avatars, against the initials well it most often lands on — 1.19:1 light / 1.10:1 dark. Decorative rather than a boundary anything depends on identifying: a photo avatar's own fill separates it, and the stack reads as a stack from the offset alone. Declared rather than omitted so the number is visible; a seam this quiet is worth a designer knowing about, and it is in needsDesign. Rebinding --ui-avatar-ring-color moves this pair and the dots' 3:1 floor above with it, which is why the property takes a surface ROLE and not an arbitrary colour.",
      },
    ],
    imageFallback: "A broken src degrades to the alt text rather than an empty box, because the image is a real <img> and not a background.",
  },

  forwarding: {
    ref: "Goes to the outermost node — Avatar is not a form control, so the §5 default applies.",
    className: "Lands on the outermost node, so sizing or positioning an avatar works. The clipped tile is data-slot=\"avatar-frame\".",
    rest: "Native span props go to the outermost node.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The sheet's group rows disagree on the overlap: the plain stack uses -4px and the stack-with-counter uses -12px, which clips the initials illegibly ('MV' renders as 'M'). Shipped as -4px, the value that keeps the initials readable. Confirm one number for both.",
    "The status dot's ring. The sheet rings each dot with a lighter step of its OWN hue (green-60 under green-40, and a raw --ui-red-60 palette step under the red) rather than with the surface. A same-hue ring does not separate the dot from a photo behind it, and the raw palette step is off the role layer entirely. Shipped with a --ui-bg-surface ring, matching the avatar's own hairline. Confirm.",
    "The 1.5px seam measures 1.19:1 against the initials well it separates, so two overlapping initials-avatars are divided by a nearly invisible line. Against a photograph it reads; against another `bg-sunken` tile it barely does. Worth a role of its own rather than the ground colour.",
    "The seam is not RTL-tested. A box-shadow offset has no logical form, so the leading edge is handled with an `rtl:` variant rather than by the same mechanism `-space-x-*` uses. Nothing in this library renders RTL yet.",
    "No hover, focus or pressed state is drawn, and an avatar is frequently a button or a link (it opens a profile). Nothing here is interactive yet; a consumer wrapping one in a Button gets Button's states, which may or may not be what is wanted.",
    "The intent family has no NEUTRAL solid. The neutral dot reuses --ui-text-muted, which is what Banner's neutral variant uses, but it is an ink role serving as a fill. If neutral status is going to recur, --ui-intent-neutral-fg is the role that is missing.",
    "No image-loading or image-error state is drawn; a slow photo shows an empty frame rather than the initials it could fall back to.",
  ],

  knownGaps: [
    "The status dot has no size of its own at sm: 4px is a floor, not a scale point, because 3px is a mark nobody can see and the dot is the only visual carrier of the state.",
    "Avatar.Group counts DIRECT children. `{cond && <Avatar/>}` is handled (Children.toArray drops it), but a component that returns several avatars counts as one and `max` will not see through it.",
    "Stacking order is DOM order, so a later avatar paints over an earlier one. The sheet draws the reverse (earlier on top). At a 4px overlap with the hairline the difference is one seam's direction; reproducing it would mean cloning children to assign z-index, which §3 rules out.",
    "outline-width AND outline-offset both snap to whole device pixels, so the 1.5px hairline computes to 1px inset 1px at dPR 1 and is exact at dPR 2. Pinned in border-hairline.browser.test.tsx rather than re-investigated.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/19YU-0",
} as const;

export type AvatarDoc = typeof avatarDoc;
