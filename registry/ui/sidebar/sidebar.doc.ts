/** Typed documentation for Sidebar (CONVENTIONS §11). */

export const sidebarDoc = {
  name: "Sidebar",
  status: "stable",
  summary:
    "The primary navigation rail: a named <nav> built from ROWS, not links. A row becomes a link when given an href and is otherwise a plain slot, because the sheet puts a search field in one and a progress bar in another. First consumer of the --ui-nav-* role family, which had existed in the contract since Phase 1 without ever being rendered.",

  anatomy: [
    { part: "root", slot: "sidebar", notes: "A <nav>, named by its label. w-nav (--ui-nav-width, 17rem), bg-nav, radius-lg, and NO padding of its own." },
    { part: "label", slot: "sidebar-label", notes: "Names the landmark. sr-only by default — the sheet draws no rail heading — never removed." },
    { part: "body", slot: "sidebar-body", notes: "The scroll column. p-sm and NO gap; the 8 here plus each row's 12 is the sheet's 20px text inset, and the rows stack flush." },
    { part: "group", slot: "sidebar-group", notes: "The header band (the sheet's `Nav Group`). p-sm. Holds controls — a back button, a close button — not navigation." },
    { part: "section", slot: "sidebar-section", notes: "A primary-level label with its second-level rows beneath." },
    { part: "sectionLabel", slot: "sidebar-section-label", notes: "A <button> disclosure when isCollapsible, a <span> heading otherwise. 16px at bold weight in --ui-nav-ink." },
    { part: "sublist", slot: "sidebar-sublist", notes: "The section's <ul>. No padding, no gap, no indent: both levels sit at 20px and the hierarchy is carried by type and colour." },
    { part: "item", slot: "sidebar-item", notes: "A row: p-md, radius-sm, 46px tall as drawn. An <a> when given href, a <div> otherwise. Carries data-current and aria-current=\"page\"." },
    { part: "spacer", slot: "sidebar-spacer", notes: "flex-1, aria-hidden. Pushes what follows to the bottom of the rail." },
  ],

  composition: `
Sidebar                    label (required) / isLabelHidden?
├─ Sidebar.Group           the header band — children are slots
├─ Sidebar.Item            href? isCurrent? icon? trailing?
├─ Sidebar.Section         label (required) isCollapsible? isOpen? defaultIsOpen? onOpenChange? icon?
│  └─ Sidebar.Item         …second level, rendered as <li>
├─ Sidebar.Spacer
└─ Sidebar.Item            e.g. a Progress, pinned to the bottom
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a page may carry several <nav> landmarks and they are indistinguishable without names." },
    isLabelHidden: { type: "boolean", default: "true", notes: "Hidden by DEFAULT, unlike every other label in the system: the sheet draws no rail heading, so the label exists to name the landmark rather than to be read." },
    "Item.href": { type: "string", notes: "OPTIONAL. With it the row is a real <a> — middle-click, open-in-new-tab and the UA's focus handling all come free. Without it the row is a plain slot and its children fill it, which is how a search field or a progress bar sits in the rail." },
    "Item.isCurrent": { type: "boolean", default: "false", notes: "Sets aria-current=\"page\". The fill alone conveys nothing to a screen reader (WCAG 1.4.1), and the rail's active fill measures barely over 1:1 against it — so the weight changes too." },
    "Item.isDisabled": {
      type: "boolean",
      default: "false",
      notes: "Unavailable. The row STAYS in the tab order and keeps its link role — a row a screen-reader user cannot reach is one they cannot be told the reason for. Navigation is prevented on the click rather than by quietly dropping the href, and never with pointer-events-none, which would kill the tooltip explaining why it is off.",
    },
    "Item.icon": { type: "ReactElement", notes: "Slot: leading glyph, decorative. Never wrapped (§3)." },
    "Item.trailing": { type: "ReactElement", notes: "Slot: a count or chevron." },
    "Section.label": { type: "string", required: true, notes: "The primary-level heading." },
    "Section.isCollapsible": { type: "boolean", default: "false", notes: "OFF by default. The sheet draws a chevron on 'Brand' and none on 'Most recent', so collapsibility is a property of a section rather than the definition of one — and a header that cannot collapse renders as a span, not a button that does nothing." },
    "Section.isOpen / defaultIsOpen / onOpenChange": { type: "boolean / boolean / (isOpen: boolean) => void", notes: "Controlled and uncontrolled, via useControllableState. Ignored unless isCollapsible." },
  },

  do: [
    "Name the sidebar; the landmark is otherwise anonymous.",
    "Set isCurrent on exactly one item, so the announcement matches the fill.",
    "Put non-navigation furniture — a search field, a progress bar, a button — in a Sidebar.Item with no href.",
    "Use Sidebar.Group for the header band's controls, and Sidebar.Spacer to pin a footer row to the bottom.",
  ],

  dont: [
    "Do not make items buttons with onClick to fake a link. Navigation is links, and the browser's contract is worth more than arrow keys (ARIA APG: a nav is not a menu).",
    "Do not convey the current page by fill alone — aria-current is what is announced.",
    "Do not indent the second level; the sheet keeps both at 20px, and an indent would be a redundant second signal costing room on a narrow rail.",
    "Do not add a gap between rows. The sheet stacks them flush and the rhythm is each row's own 12px padding — a gap is a second, competing spacing system.",
    "Do not nest a third level; the sheet draws two and deeper trees want a different pattern.",
  ],

  a11y: {
    role: "navigation landmark. A Section is a <ul> of links; rows outside a Section are not list items, because a search field announced as a list item is a lie about the page structure.",
    name: "The `label` prop via aria-labelledby. Each section's <ul> is reached from its header through aria-controls, so the disclosure and the list it reveals cannot drift apart.",
    keyboard: [
      { key: "Tab", does: "Walks the links in document order — the platform's own behaviour, asserted in Chromium." },
      { key: "Enter", does: "Follows a link, or toggles a collapsible section header. Native in both cases." },
      { key: "Space", does: "Toggles a collapsible section header. It is a real <button>." },
      { key: "—", does: "No arrow-key navigation: adding it would mean taking the links out of the tab order, which is the wrong trade." },
    ],
    target: "A row measures the sheet's 46px — p-md (12+12) around a 16px line at leading-normal (21.6px). min-h-9 (36px) floors a caller who puts something shorter in the slot; both clear SC 2.5.8's 24px.",
    contrastPairs: [
      { fg: "--ui-nav-ink", bg: "--ui-nav-bg", floor: "text", role: "section headings and top-level rows on the rail" },
      { fg: "--ui-nav-ink-muted", bg: "--ui-nav-bg", floor: "text", role: "second-level item ink" },
      { fg: "--ui-nav-active-ink", bg: "--ui-nav-active-bg", floor: "text", role: "the current item" },
      { fg: "--ui-nav-ink-disabled", bg: "--ui-nav-bg", floor: "decorative", why: "WCAG 1.4.3 exempts disabled controls from the contrast minimum, and a disabled row has to read as unavailable — holding it to 4.5:1 would make it indistinguishable from an available one, which is the actual accessibility failure. It is still derived to sit clearly below --ui-nav-ink-muted rather than vanishing.", role: "a disabled row" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "No collapsed rail is drawn, though --ui-nav-rail-width exists for one.",
    "Row hover and focus are derived from --ui-nav-active-bg; the sheet draws rest and current only.",
  ],

  knownGaps: [
    "No collapsed rail. `--ui-nav-rail-width` (3.5rem) exists and now has a `w-nav-rail` utility, but the sheet draws no collapsed state, so none is implemented — the token is ready for it.",
    "No mobile drawer. The sheet's mobile composition is this Sidebar inside an overlay; the overlay itself is a Sheet, not a Sidebar variant, and is not built yet.",
    "The rail's own hover and focus states for a row are DERIVED from --ui-nav-active-bg rather than drawn — the sheet draws rest and current only.",
    "No section dividers. An Avatar and account menu are drawn in the mobile examples but belong to the composition around the rail, not to it.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/DNF-0",
} as const;

export type SidebarDoc = typeof sidebarDoc;
