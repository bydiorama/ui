/** Typed documentation for CardSorting (CONVENTIONS §11). */

export const cardSortingDoc = {
  name: "CardSorting",
  status: "stable",
  summary:
    "A reorderable list of cards, with a grip on each row. Reordering works three ways and all three are first-class: a pointer drag, a keyboard lift-and-move, and a no-drag pointer path of click-to-lift then click-to-place. Built here rather than on a drag library (ADR 0012) — the accessible half of this pattern is the half a drag library does not solve, and it is most of the work.",

  anatomy: [
    { part: "root", slot: "card-sorting", notes: "A <ul>, named by its label. gap-sm between rows." },
    { part: "item", slot: "card-sorting-item", notes: "An <li> card: radius-lg, bg-elevated, pl-xs pr-lg py-lg. Carries data-lifted and data-dragging." },
    { part: "handle", slot: "card-sorting-handle", notes: "A real <button> with a 16px grip in a 24px box. Names the row and its position, and reports aria-pressed while holding it." },
    { part: "content", slot: "card-sorting-content", notes: "The row's slot: flex-1, justify-between. Whatever the caller puts there — the sheet draws a title, a Badge and a Switch." },
    { part: "announcer", slot: "card-sorting-announcer", notes: "One sr-only live region for all three input methods. role=status, polite, atomic." },
  ],

  composition: `
CardSorting                label (required) / order? / defaultOrder? / onOrderChange?
└─ CardSorting.Item        id (required) / label (required)
   └─ <your content>       a title, a Badge, a Switch — anything
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — 'list, 4 items' says nothing about what is being sorted, and the name is read out with every announcement." },
    order: { type: "string[]", notes: "Controlled, as item ids. Omit and the list owns it. Ids that are no longer rendered are dropped and newly rendered ones join the end, so a list whose children change does not lose a row or render a hole." },
    defaultOrder: { type: "string[]", notes: "Uncontrolled starting order. Defaults to the children's source order." },
    onOrderChange: { type: "(order: string[]) => void", notes: "One callback for every path — drag, keyboard and click-to-place all go through the same move (§1)." },
    "Item.id": { type: "string", required: true, notes: "Stable identity: this is what `order` is made of, so an array index will break the moment anything moves." },
    "Item.label": {
      type: "string",
      required: true,
      notes: "What the announcements and the handle call this row. Required, because 'item 3 moved to position 1' is not a reorder anyone can follow.",
    },
  },

  do: [
    "Give every item a stable id — a database key, not an index.",
    "Write Item.label as the row's visible title; it is what a screen reader hears on the handle and in every announcement.",
    "Put the row's own controls in the content slot as real elements: the sheet draws a Badge and a Switch, and both keep their own accessible names.",
  ],

  dont: [
    "Do not rely on the drag alone. Dragging is one of three paths and the other two are not fallbacks — a pointer user who cannot drag uses click-to-place, and a keyboard user lifts with Space.",
    "Do not put the only copy of a row's meaning in colour or position; the announcement carries the name and the position because nothing else does.",
    "Do not nest interactive controls inside the handle — it is the drag target, and a button inside a button is neither.",
  ],

  a11y: {
    role: "A list of list items. The handle is a button with aria-pressed, not a custom role: aria-grabbed is deprecated, and a real button gets Enter, Space and focus for free.",
    name: "The list from `label`; each row from its handle via aria-labelledby; the handle itself names the row AND its position, so 'Reorder Brand guidelines, position 1 of 4'.",
    keyboard: [
      { key: "Tab", does: "Reaches each handle in list order." },
      { key: "Space / Enter", does: "Lifts the row, and drops it again. aria-pressed reflects which." },
      { key: "Arrow Up / Down", does: "Moves a LIFTED row. Does nothing otherwise — a stray arrow must not silently reorder a list someone is reading, and it would fight the browser's scrolling." },
      { key: "Escape", does: "Cancels, restoring the order from before the lift. Not 'drop where it happens to be'." },
    ],
    pointer:
      "SC 2.5.7 (Dragging Movements) requires a single-pointer path for every dragging movement, and a keyboard alternative does not satisfy it. Clicking the handle lifts the row; clicking any other row drops it there.",
    live: "One polite, atomic region announces lift, move, drop and cancel, each with the row's name, its new position and the list's name. A reorder only sighted mouse users can perceive is not a reorder.",
    target: "The handle is the sheet's 24px box around a 16px grip — exactly SC 2.5.8's floor rather than comfortably over it. See knownGaps.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "the row's own content" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "the grip" },
      { fg: "--ui-border-focus", bg: "--ui-bg-elevated", floor: "non-text", role: "the outline on a lifted or dragging row" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The 24px handle is SC 2.5.8's floor exactly, not a comfortable touch target.",
    "No lifted appearance is drawn for the dragged row beyond the active edge.",
  ],

  knownGaps: [
    "The handle is 24px, which is SC 2.5.8's floor exactly and not a comfortable touch target. The sheet draws 24; a 44px target would need design.",
    "The dragged row does not lift visually — no scale, no tilt, no gap where it came from. The list reorders live underneath the pointer instead, which is honest but plainer than the sheet's shadowed card suggests.",
    "No auto-scroll while dragging near the edge of a scrolling container.",
    "No multi-column or cross-list sorting. One vertical list, one axis.",
    "No drop animation — a moved row appears in its new place rather than sliding there. Under prefers-reduced-motion that is the correct behaviour anyway; for everyone else it is a refinement.",
    "The sheet draws the second card in an active state with a --ui-border-focus edge; that is rendered here as an outline rather than a border, so lifting a row cannot shift the layout by a pixel.",
  ],

  motion:
    "Only the ring moves: `outline-color` and `box-shadow` at --ui-duration-fast with --ui-ease-out. A reordered card does NOT animate to its new position — the row appears where it landed. Under prefers-reduced-motion that is the correct behaviour anyway; for everyone else it is a declared refinement rather than a decision (see needsDesign).",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/D5I-0",
} as const;

export type CardSortingDoc = typeof cardSortingDoc;
