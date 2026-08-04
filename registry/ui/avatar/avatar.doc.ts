/** Typed documentation for Avatar (CONVENTIONS §11). */

export const avatarDoc = {
  name: "Avatar",
  status: "stable",
  summary: "A person or entity, as a photo or their initials. Circle or rounded, three sizes.",

  anatomy: [
    { part: "root", slot: "avatar", notes: "The <span>. Carries data-size and data-shape." },
    { part: "image", slot: "avatar-image", notes: "A real <img> with alt — present only when src is given." },
    { part: "initials", slot: "avatar-initials", notes: "aria-hidden abbreviation; the full name is exposed separately to assistive tech." },
  ],

  composition: `
Avatar
├─ name      string (required) — alt text, and the source of the initials
└─ src?      string — image when present, initials when absent
  `.trim(),

  props: {
    name: {
      type: "string",
      required: true,
      notes: "Required in both forms. It is the image's alt text and the source of the initials — an avatar with no name is decoration wearing a person's face.",
    },
    src: { type: "string", notes: "Photo URL. Omit for the initials form." },
    initials: { type: "string", notes: "Overrides the derived initials — mononyms, non-Latin names, brand marks. Initials form only." },
    size: { type: '"lg" | "md" | "sm"', default: '"md"', notes: "48 / 32 / 24px. Only md is drawn; see knownGaps." },
    shape: { type: '"circle" | "rounded"', default: '"circle"', notes: "Both drawn in the sheet." },
  },

  do: [
    "Always pass the full name, even when showing a photo — it becomes the alt text.",
    "Let initials derive from name; override only when the derivation is wrong for that name.",
    "Use rounded for entities (companies, projects) and circle for people, if the design distinguishes them.",
  ],

  dont: [
    "Do not put an avatar inside a button just to make it clickable — wrap it in a real control with its own accessible name.",
    "Do not pass initials as name; the accessible name must be the full name.",
    "Do not use the disabled ink for initials — it measures 1.8:1 on the well. Initials identify a person and must clear AA.",
  ],

  a11y: {
    role: "img (native, when src is present) / plain text otherwise",
    name: "The `name` prop. With a photo it is the alt text; without one, the visible initials are aria-hidden and the full name is rendered in an sr-only span, so a screen reader announces the person rather than spelling out 'M V'.",
    contrast: "Initials ink measures 4.9:1 on the sunken well in light and 7.1:1 in dark. The sheet used the disabled ink, which measured 1.8:1.",
    imageFallback: "A broken src degrades to the alt text rather than an empty box, because the image is a real <img> and not a background.",
  },

  knownGaps: [
    "The sheet draws one size (32px). md is that size verbatim; lg and sm are DERIVED from the scale so avatars can match the control heights they sit beside — confirm with design.",
    "No status dot, no group/stack, no image-loading state. None are drawn yet.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0",
} as const;

export type AvatarDoc = typeof avatarDoc;
