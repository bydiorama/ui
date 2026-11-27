/**
 * Typed documentation for Count.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const countDoc = {
  lead: "Shows a number that changes in place, moving only the digits that changed while its text stays the plain value.",
  name: "Count",
  status: "experimental",
  summary:
    "The fourth of ADR 0028's owned motion components. A number formatted with Intl.NumberFormat, one span per character, matched to the previous value from the right so units stay over units. Only the changed characters move: each remounts and arrives on --ui-duration-base, rising --ui-space-xs × --ui-motion-travel when the value grew and dropping when it shrank, while an aria-hidden ghost under it draws the old character with CSS content and fades on --ui-duration-fast. Generated content is never text, so copy, find in page, screen readers and tests read the plain value at every frame. Tabular figures keep every digit the same width. TextSwap's clock and Presence's rise, reused unchanged; the first render is still.",

  anatomy: [
    {
      part: "root",
      slot: "count",
      notes: "One inline-flex span with tabular-nums. Its text is the formatted value and nothing else. Type and colour come from the host or className.",
    },
    {
      part: "place",
      slot: "count-place",
      notes: "One inline-grid span per character position, keyed by its place from the right, so it keeps its element across changes. Holds the character and, during a change, its ghost, in one cell.",
    },
    {
      part: "character",
      slot: "count-char",
      notes: "The current character as text. Keyed by the character, so a change remounts it and @starting-style gives it a 'before'; an unchanged character never moves.",
    },
    {
      part: "ghost",
      slot: "count-ghost",
      notes: "aria-hidden and empty: the old character is drawn by ::before from data-char and fades on fast. Present only under a character that changed in the latest update.",
    },
  ],

  composition: `
Count (value: number, format?, locale?)
└── root — data-slot="count", tabular-nums
    └── place × n — data-slot="count-place"
        ├── character — data-slot="count-char", the text
        └── ghost — data-slot="count-ghost", aria-hidden, ::before content (changed places only)

<p className="text-title-lg"><Count value={orders} /></p>
<Count value={total} format={{ style: "currency", currency: "EUR" }} locale="sk-SK" />
`,

  props: {
    value: {
      type: "number",
      notes: "The number. Changing it is the change; the same formatted text twice is no change.",
    },
    format: {
      type: "Intl.NumberFormatOptions",
      notes: "Passed to Intl.NumberFormat: currency, percent, compact notation, fraction digits. Memoise it or define it outside render, or it is rebuilt each time (harmless, but wasted).",
    },
    locale: {
      type: "string",
      notes: "A BCP 47 locale for the formatting. Omitted follows the runtime's, which can differ between server and client — pass it when the page is server-rendered.",
    },
    className: {
      type: "string",
      notes: "Lands on the root, merged last. Count has no type role of its own: set one here or on the host.",
    },
  },

  do: [
    "Use it for a figure that changes while someone watches: a total, a cart, an unread count, a live readout.",
    "Give a changing count that nobody is focused on its own live region when the change must be announced.",
    "Pass locale on a server-rendered page, so the server and client format the same text.",
  ],
  dont: [
    "Count through the values in between. Count shows the new value; a ticker that runs 1 → 2 → … → 1,250 is a different, rarely useful thing.",
    "Animate a number on first paint to draw attention. The first render is still on purpose.",
    "Put non-numeric text in it. Prose that changes is TextSwap's.",
  ],

  a11y: {
    role: "None of its own: an inline span inside whatever labels it.",
    name: "Its text, which is the formatted value at every frame. Ghosts are aria-hidden and empty.",
    keyboard: [],
    focus: "Never focusable.",
    contrastPairs: [],
    rendersNoColour:
      "Count sets no colour: its digits take the host's ink, and it changes only opacity and translate, so the pairs are the host component's to declare.",
  },

  forwarding: {
    className: "Lands on the root.",
    ref: "The root span.",
    props: "Native span attributes go to the root; children are not accepted — the value is the content.",
  },

  motion:
    "All CSS transitions on the tokens. A changed character: opacity from 0 and translate from ±(--ui-space-xs × --ui-motion-travel) — positive (from below) when the value grew, negative when it shrank — on --ui-duration-base with --ui-ease-out, through @starting-style. Its ghost: opacity 1 → 0 on --ui-duration-fast, no movement. Unchanged characters do not animate. Motion levels (ADR 0028): at Reduced the rise is gone (travel 0) and the per-digit cross-fade stays; at Off both durations are 1ms. The text is the plain value at every level.",

  needsDesign: [],

  knownGaps: [
    "Built from a sheet the maintainer has not reviewed yet: the direction rule (the whole value's direction decides rise or drop) and right-aligned place matching are badged Derived on it.",
    "A place that disappears (1,000 → 999) leaves at once, and a width change from a new or lost place is not eased.",
    "Badge counts in NavRail and Sidebar, Tabs counts and chart readouts still change by hand, with no motion.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/p-14-0/49D3-1",
} as const;
