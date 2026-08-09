/** Typed documentation for Sidebar (CONVENTIONS §11). */

export const sidebarDoc = {
  name: "Sidebar",
  status: "stable",
  summary:
    "The primary navigation rail: a named <nav> built from ROWS, not links. A row becomes a link when given an href and is otherwise a plain slot, because the sheet puts a search field in one and a progress bar in another. First consumer of the --ui-nav-* role family, which had existed in the contract since Phase 1 without ever being rendered.",

  anatomy: [
    { part: "main", slot: "sidebar-main", notes: "The navigation itself. Renders nothing while a layer is showing — so the two-layer swap has exactly two participants and every other part stays ignorant of it." },
    { part: "layer", slot: "sidebar-layer", notes: "A secondary screen that REPLACES the navigation: the sheet's 'Profile Settings', with a brand switcher under it. Same shape as Calendar's month and year selects, for the same reason — on a narrow screen a panel over a panel is two surfaces where the drawing has one." },
    { part: "layer back", slot: "sidebar-layer-back", notes: "The 32px chrome control in the sheet's 56px band. Named for where it RETURNS to, never just 'Back'." },
    { part: "layer title", slot: "sidebar-layer-title", notes: "The layer's heading, at the second-level row's own type and inset." },
    { part: "profile", slot: "sidebar-profile", notes: "Avatar, name, address and a trailing chevron; the way into a layer. A real button — it opens a screen — but NOT aria-expanded, because nothing expands." },
    { part: "profile name / email", slot: "sidebar-profile-name, sidebar-profile-email", notes: "16px/600 in nav ink, and 12px/500 in MUTED ink. The sheet drew the address in --ui-text-disabled at 2.14:1; an address is content, so WCAG's disabled exemption does not apply." },
    { part: "search", slot: "sidebar-search", notes: "The rail's own field: 40px at radius-sm with a 1px edge, where Input's is 48px at radius-md with 1.5px. A rail is denser than a form. The WRAPPER draws the focus ring, which is the one place the inner control may carry outline-none." },
    { part: "slot", slot: "sidebar-slot", notes: "A row that holds a CONTROL — a Button, an Input, a Progress bar. The row's inset and nothing else: no role, no tab stop, no click target of its own." },
    { part: "heading", slot: "sidebar-heading", notes: "A standalone group label — the sheet's 'Select brand'. Drawn in --ui-text-disabled (2.14:1); ships as the rail's own muted step." },
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
    layer: { type: "string | null", notes: "Which secondary layer is showing; null is the navigation. Controlled/uncontrolled through the shared hook (§4) rather than left to each part, because the layer closes from a back button inside it and opens from a row that is not." },
    defaultLayer: { type: "string | null", default: "null", notes: "Uncontrolled starting layer — never `initialLayer` (§1)." },
    onLayerChange: { type: "(layer: string | null) => void", notes: "Fires for the profile row and for the back control." },
    "Layer.id": { type: "string", required: true, notes: "Matched against the Sidebar's `layer` and against Profile's `layer`." },
    "Layer.title": { type: "string", required: true, notes: "The layer's heading." },
    "Layer.backLabel": { type: "string", required: true, notes: "The back control's accessible name. Required and NOT defaulted to 'Back' — a rail may hold more than one layer, and 'Back' alone leaves a screen-reader user to guess what they are returning to." },
    "Profile.name": { type: "string", required: true },
    "Profile.email": { type: "string", notes: "Rendered in muted ink, not the disabled role. See anatomy." },
    "Profile.avatar": { type: "ReactElement", notes: "Slot: an Avatar at 32px. Never wrapped (§3)." },
    "Profile.layer": { type: "string", notes: "The layer this row opens. Without it the row is a plain button and the caller wires onClick." },
    "Search.label": { type: "string", required: true, notes: "Visually hidden — the sheet draws a placeholder and no label, and a placeholder is not a label (§10)." },
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
    "Item.render": { type: "ReactElement", notes: "Slot: swap the row's own <a>/<div> for this element — pass render={<Link href={href} />} so the app's router owns the transition. Passed through, never wrapped (§3): the row's data-slot, aria-current, the isDisabled invariant and its className merge onto it rather than replacing what it carries." },
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
    "Do not narrow this component to make a rail. NavRail is the rail (ADR 0015) — a Section header cannot disclose at 48px, and Search, Profile, Heading and Slot have nowhere to put what they hold.",
  ],

  a11y: {
    layers: "Opening a layer moves focus to its back control; closing returns focus to the row that opened it. The row is UNMOUNTED while the layer shows, so the return is done by finding the row again after the re-render — focusing a remembered node there lands on <body>, which is what the browser test caught.",
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
    "Row focus is derived; the sheet draws rest and current only. Hover is now its own fill (--ui-nav-hover-bg), added when NavRail needed to tell hover from current without a label to change weight.",
  ],

  knownGaps: [
    "No collapsed mode, and there will not be one. The narrow rail is NavRail, a sibling component (ADR 0015): six of the ten parts below change what they MEAN at 48px rather than what they measure, which is the same test CONVENTIONS §7a uses to split Sheet from Drawer. A layout renders one or the other, and neither knows about the other. The trigger to revisit is an ANIMATED width transition, which two trees cannot do as cleanly as one component with a mode.",
    "No mobile drawer. The sheet's mobile composition is this Sidebar inside an overlay; the overlay itself is a Sheet, not a Sidebar variant, and is not built yet.",
    "Hover and focus are DERIVED — the sheet draws rest and current only. Hover moved off --ui-nav-active-bg onto its own --ui-nav-hover-bg step, so rest, hover and current are three fills rather than two; the weight change on current stays.",
    "No section dividers. An Avatar and account menu are drawn in the mobile examples but belong to the composition around the rail, not to it.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/ZCP-0",
} as const;

export type SidebarDoc = typeof sidebarDoc;
