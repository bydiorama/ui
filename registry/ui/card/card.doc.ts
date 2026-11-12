/** Typed documentation for Card (CONVENTIONS §11). */

export const cardDoc = {
  name: "Card",
  status: "stable",
  summary:
    "A titled surface that groups related controls. Renders a <section> with a real heading, so a card is navigable structure rather than a styled div. Its surface is deliberately identical to Popover's panel.",

  anatomy: [
    { part: "root", slot: "card", notes: "A <section>. radius-lg, p-lg, gap-lg, bg-elevated, a border-subtle hairline, and shadow-md unless surface=\"outlined\". No minimum width — the container decides. data-surface names the surface. className lands here (§5)." },
    { part: "header", slot: "card-header", notes: "Title plus optional actions. Takes the unboxed inset." },
    { part: "title", slot: "card-title", notes: "A real heading element, level chosen by the caller. Truncates rather than wrapping." },
    { part: "heading", slot: "card-heading", notes: "Wraps title and subtitle. Takes pt-xs when a subtitle is present, so the title line sits near the centre of a 32px action." },
    { part: "subtitle", slot: "card-subtitle", notes: "Optional line under the title: body-sm in --ui-text-muted, gap-xs below the title, wraps while the title truncates. A <p> OUTSIDE the heading, so the heading's name stays the title; the card points aria-describedby at it." },
    { part: "trigger", slot: "card-trigger", notes: "collapsible only. Button ghost, icon-only md, ChevronDown rotating 180° when open; LAST in the actions slot. Named by the title (aria-labelledby), with aria-expanded and aria-controls → the body." },
    { part: "body", slot: "card-body", notes: "Optional region between header and footer, and what collapsible collapses (hidden, kept in the DOM). Cap its height with className and it scrolls under a bottom Fade (md, ground elevated) bound to the scroller: full while there is more below, easing out over the last 48px of scroll, and inset off a classic scrollbar instead of veiling it." },
    { part: "actions", slot: "card-actions", notes: "Slot for controls acting on the whole card. Never wrapped, so each keeps its own accessible name." },
    { part: "footer", slot: "card-footer", notes: "The action row, justify-between, inset on all sides. No rule above it — long content is separated by Card.Body's Fade (#10, decided in review). Stays visible when collapsed." },
  ],

  composition: `
Card
Card  surface? collapsible? isOpen? onOpenChange?
├─ Card.Header  subtitle? actions? headingLevel?   (+ trigger, when collapsible)
├─ Card.Body    optional; capped → scrolls under a Fade; collapses
│  └─ <boxed children>   flush at p-lg — an Input, a Banner
└─ Card.Footer
  `.trim(),

  props: {
    surface: {
      type: '"raised" | "outlined"',
      default: '"raised"',
      notes: "raised = hairline + shadow-md. outlined = hairline only, for a house rule of \"a border OR a shadow, never both\" (issue #10). The hairline stays in both: it is what carries the boundary against the page (bg-elevated alone is 1.11:1).",
    },
    className: {
      type: "string",
      notes: "SANCTIONED for adjusting padding, radius, border and shadow, not just for layout. `cn()` is `clsx` + `tailwind-merge` (CONVENTIONS §5), so a conflicting utility in className wins over the root's own — `className=\"p-md rounded-lg border-0 shadow-none\"` produces a smaller, squarer, borderless, flat surface with no source change. This is how a consumer reaches a shape Card does not (yet) expose a dedicated prop for — e.g. a denser inset, or a minimum width (`min-w-80`) where the container does not already set one. Prefer a real prop once a shape is common enough to need one (see knownGaps); until then, this is not a workaround, it is the mechanism.",
    },
    "Header.children": { type: "ReactNode", required: true, notes: "The title." },
    "Header.actions": { type: "ReactNode", notes: "Slot: an Edit or delete control. Passed through, never wrapped (§3)." },
    collapsible: {
      type: "boolean | { defaultIsOpen?: boolean }",
      notes: "Makes Card.Body a disclosure (CONVENTIONS §3's boolean-or-config shape). Requires a Card.Header — the trigger's name is the title. Open by default. The footer stays visible when collapsed.",
    },
    isOpen: { type: "boolean", notes: "Controlled open state, with onOpenChange(isOpen). Only meaningful with collapsible." },
    "Header.subtitle": {
      type: "ReactNode",
      notes: "A line under the title. Kept out of the heading so the accessible name stays the title alone; the card is aria-describedby it. With a subtitle the header aligns items-start.",
    },
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
    "Use surface=\"outlined\" for a border-only card rather than className=\"shadow-none\".",
    "Reach for className overrides (a different p-*/rounded-*, a min-w-*) when the default surface is the wrong shape — see the className prop entry. This is sanctioned, not a hack.",
  ],

  dont: [
    "Do not nest a Card in a Card to get a second surface — that is a Banner or a plain well.",
    "Do not add padding to the header or footer; they already carry the inset, and doubling it breaks the alignment with boxed children.",
    "Do not put the primary action anywhere but the footer's right side; the sheet separates dismiss from commit deliberately.",
  ],

  a11y: {
    role: "section. It becomes a named REGION only when the consumer supplies aria-labelledby — an unnamed <section> is generic, so a page full of cards adds no landmark noise.",
    name: "None by default, deliberately. The heading provides navigable structure on its own.",
    keyboard: [
      { key: "—", does: "The card itself is not focusable; its contents carry their own contracts." },
      { key: "Tab", does: "Only while a capped Card.Body actually scrolls: focuses the body, a region named by the card's title, so arrow keys and Page Up/Down can scroll content that has no focusable child of its own (SC 2.1.1). A body that fits is never a tab stop." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "title on the card surface" },
      { fg: "--ui-bg-elevated", bg: "--ui-bg-base", floor: "decorative", role: "the card surface against the page", why: "the boundary is the border-subtle hairline plus shadow-md, not the fill (ADR 0010)" },
    ],
  },

  knownGaps: [
    "ALIGNMENT GAP, open: Header and Footer take the unboxed inset, but an Input's own label does not — an Input placed directly in a Card has its label 8px to the left of the card title. The sheet wraps each field label in its own inset frame. Either Input grows an inset-aware mode or Card grows a field wrapper; a wrapper that only re-declares flex-col was tried and removed for earning nothing.",
    "No media/image region — not drawn.",
    "Collapsible open/close has no motion yet: the body toggles with `hidden`. The sheet defers to Accordion's motion and does not draw it.",
    "CONCENTRICITY, accepted: radius-lg (16) over a radius-md (8) boxed child at p-lg (16) is not concentric — §6 would ask for 24. The 2026-10-29 owner review chose 16 for cards, popovers and dialogs platform-wide (issue #40).",
    "The sheet's icon-only action button carries a raw 8px radius and a 16px padding on a 32px box; that is Button's territory and was not transcribed.",
  ],

  motion:
    "The collapsible chevron rotates 180° over --ui-duration-fast (motionMicro, the standalone `rotate` property, as Accordion's). The body itself toggles with `hidden` and does not animate. Card.Body's Fade appears and disappears by opacity (Fade's own motion). Reduced motion collapses both durations at the token layer.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/DTF-0",
  designAdditions: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/3P20-0",
} as const;

export type CardDoc = typeof cardDoc;
