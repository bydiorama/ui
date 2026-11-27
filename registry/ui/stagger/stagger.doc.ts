/**
 * Typed documentation for Stagger.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const staggerDoc = {
  lead: "Brings a group in one item after another on its first appearance, for the infrequent moments that earn it.",
  name: "Stagger",
  status: "experimental",
  summary:
    "The fifth of ADR 0028's owned motion components, built on Presence. The items present on the first render arrive in document order, each one --ui-stagger-step after the one before, with Presence's rise (or fade). The delay is capped at the sixth item — everything after it arrives with it — so a group of any length is in within 5 × step + --ui-duration-base. The delay exists only while an item enters; once it settles, later hovers, fades and exits on it are never held back. Items added later arrive through Presence at once. Reserved by CONVENTIONS §8 for first loads, empty states filling and success summaries — never routine updates. At Reduced and Off the step token is 0, so the group arrives together.",

  anatomy: [
    {
      part: "stagger",
      slot: "none",
      notes:
        "The root renders no element — it is a Presence with appear — so it sits inside a <ul>, a stack or a grid without changing the layout. It captures the first render's items, in order, once.",
    },
    {
      part: "item",
      slot: "the caller's",
      notes:
        "Each child element, a Presence item. Stagger adds a --ui-stagger-index custom property (0–5) to its style and a transition-delay that applies only while data-presence is entering, so the child must forward className, style and data-* (CONVENTIONS §5).",
    },
  ],

  composition: `
Stagger (kind?: "rise" | "fade")
└── Presence kind={kind} appear
    └── item × n — the caller's element, --ui-stagger-index = min(n, 5)

<ul>
  <Stagger>
    {cards.map((card) => <li key={card.id}>{card.title}</li>)}
  </Stagger>
</ul>
`,

  props: {
    kind: {
      type: '"rise" | "fade"',
      notes: "rise (default) is Presence's rise — opacity and a 4px lift. fade is opacity only, for items that sit close together.",
    },
    children: {
      type: "ReactNode",
      notes:
        "Keyed elements. Each must forward className, style and data-* to its root (CONVENTIONS §5). Stagger owns the transition-delay while an item enters; Presence owns opacity and translate.",
    },
  },

  do: [
    "Use it once per moment: a dashboard's cards on first load, an empty state filling, a success summary.",
    "Keep the group short enough to read as one gesture; the cap keeps a long one under a second.",
    "Wrap the items directly — Stagger renders no element, so it works inside a <ul> or a grid.",
  ],
  dont: [
    "Stagger a list that re-sorts, filters or pages. That is routine, and waiting on it is friction.",
    "Nest Staggers to cascade sections; one group, one rhythm.",
    "Set an inline transition-delay on an item — Stagger owns it while the item enters.",
  ],

  a11y: {
    role: "None: Stagger renders no element. Items keep their own roles.",
    name: "Unchanged — items are in the DOM and readable from the first frame; only their paint is delayed.",
    keyboard: [],
    focus: "Items are focusable from the first frame, as without Stagger.",
    contrastPairs: [],
    rendersNoColour:
      "Stagger sets no colour: it delays and fades the caller's items, so the pairs are the items' own to declare.",
  },

  forwarding: {
    className: "Not accepted — Stagger has no element. Items keep theirs, merged with Presence's classes.",
    ref: "Not accepted. Items keep their own refs.",
    props: "kind and children only.",
  },

  motion:
    "CSS transitions on the tokens, through Presence's rise (opacity from 0 and translate from --ui-space-xs × --ui-motion-travel on --ui-duration-base with --ui-ease-out) or fade. Each first-render item adds transition-delay: min(index, 5) × --ui-stagger-step while data-presence is entering, so item 6 onward share item 6's start. Motion levels (ADR 0028): --ui-stagger-step is 0 at Reduced and Off, so the group fades in together (Reduced, no rise) or appears (Off, 1ms).",

  needsDesign: [],

  knownGaps: [
    "Built from a sheet the maintainer has not reviewed yet; the cap of six was decided with them.",
    "Order is DOM order. A grid that reads in columns staggers in rows.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-14-0/49S3-1",
} as const;
