/** Typed documentation for Card (CONVENTIONS §11). */

export const cardDoc = {
  name: "Card",
  status: "stable",
  summary:
    "A titled surface that groups related controls. Renders a <section> with a real heading, so a card is navigable structure rather than a styled div. Its surface is deliberately identical to Popover's panel.",

  anatomy: [
    { part: "root", slot: "card", notes: "A <section>. radius-xl, p-lg, gap-lg, bg-elevated, a border-subtle hairline and shadow-md. className lands here (§5)." },
    { part: "header", slot: "card-header", notes: "Title plus optional actions. Takes the unboxed inset." },
    { part: "title", slot: "card-title", notes: "A real heading element, level chosen by the caller. Truncates rather than wrapping." },
    { part: "actions", slot: "card-actions", notes: "Slot for controls acting on the whole card. Never wrapped, so each keeps its own accessible name." },
    { part: "footer", slot: "card-footer", notes: "The action row, justify-between, inset on all sides." },
  ],

  composition: `
Card
├─ Card.Header  actions? headingLevel?
├─ <boxed children>   flush at p-lg — an Input, a Banner, a nested Card
└─ Card.Footer
  `.trim(),

  props: {
    className: {
      type: "string",
      notes: "SANCTIONED for adjusting padding, radius, border and shadow, not just for layout. `cn()` is `clsx` + `tailwind-merge` (CONVENTIONS §5), so a conflicting utility in className wins over the root's own — `className=\"p-md rounded-lg border-0 shadow-none\"` produces a smaller, squarer, borderless, flat surface with no source change. This is how a consumer reaches a shape Card does not (yet) expose a dedicated prop for — e.g. a border-only surface (no shadow), a denser inset, or a narrower minimum width than the default min-w-80. Prefer a real prop once a shape is common enough to need one (see knownGaps); until then, this is not a workaround, it is the mechanism.",
    },
    "Header.children": { type: "ReactNode", required: true, notes: "The title." },
    "Header.actions": { type: "ReactNode", notes: "Slot: an Edit or delete control. Passed through, never wrapped (§3)." },
    "Header.headingLevel": {
      type: "2 | 3 | 4 | 5 | 6",
      default: "3",
      notes: "A prop rather than a guess: a card nested in a page section is rarely an <h2>, and only the page knows its own outline. A wrong level is worse than a plain one.",
    },
  },

  do: [
    "Set headingLevel to match the page outline rather than accepting the default everywhere.",
    "Let boxed children (Input, Banner) sit flush; Header and Footer already carry the inset.",
    "Pass aria-labelledby pointing at the title when the card should be a navigable region.",
    "Reach for className overrides (shadow-none, a different p-*/rounded-*, a lower min-w-*) when the default surface is the wrong shape — see the className prop entry. This is sanctioned, not a hack.",
  ],

  dont: [
    "Do not nest a Card in a Card to get a second surface — that is a Banner or a plain well.",
    "Do not add padding to the header or footer; they already carry the inset, and doubling it breaks the alignment with boxed children.",
    "Do not put the primary action anywhere but the footer's right side; the sheet separates dismiss from commit deliberately.",
  ],

  a11y: {
    role: "section. It becomes a named REGION only when the consumer supplies aria-labelledby — an unnamed <section> is generic, so a page full of cards adds no landmark noise.",
    name: "None by default, deliberately. The heading provides navigable structure on its own.",
    keyboard: [{ key: "—", does: "The card itself is not focusable; its contents carry their own contracts." }],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "title on the card surface" },
      { fg: "--ui-bg-elevated", bg: "--ui-bg-base", floor: "decorative", role: "the card surface against the page", why: "the boundary is the border-subtle hairline plus shadow-md, not the fill (ADR 0010)" },
    ],
  },

  knownGaps: [
    "ALIGNMENT GAP, open: Header and Footer take the unboxed inset, but an Input's own label does not — an Input placed directly in a Card has its label 8px to the left of the card title. The sheet wraps each field label in its own inset frame. Either Input grows an inset-aware mode or Card grows a field wrapper; a wrapper that only re-declares flex-col was tried and removed for earning nothing.",
    "No media/image region, no footer divider, no collapsible variant. None are drawn.",
    "No first-class prop for a border-only surface (shadow off) or a narrower min-width — className overrides both today (see the className prop entry) and that is sanctioned, not a stopgap, but a consuming app whose own house style is border-first has to know the mechanism exists rather than discover it. Worth a real prop if enough consumers reach for the same override — see this repo's issue #10 for the evidence (one entire consuming-app component family blocked on exactly this).",
    "The sheet's icon-only action button carries a raw 8px radius and a 16px padding on a 32px box; that is Button's territory and was not transcribed.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/DTF-0",
} as const;

export type CardDoc = typeof cardDoc;
