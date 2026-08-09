/** Typed documentation for Header (CONVENTIONS §11). */

export const headerDoc = {
  name: "Header",
  status: "stable",
  summary:
    "The page's top bar: leading controls, an optional row of navigation items, trailing controls. A <header> so it is the banner landmark, but deliberately NOT a nav — the bar also holds a brand mark that links home and an avatar that opens the account menu, and calling all of that navigation would make the landmark useless to skip to. The item row names itself.",

  anatomy: [
    { part: "root", slot: "header", notes: "A <header>. 48px tall: py-sm around a 32px control, px-lg, bg-surface." },
    { part: "start", slot: "header-start", notes: "Leading controls — the brand mark, which LINKS to the app home, and a back button, which is a button because popping history is an action. Slots: the caller supplies real elements with their own names." },
    { part: "nav", slot: "header-nav", notes: "A named <nav> wrapping a <ul> of items. gap-xs, p-xs." },
    { part: "item", slot: "header-item", notes: "A compact 24px control at 12px bold: px-sm, py-xs, radius-sm, with 16px icon slots. An <a> when given href, a <button> otherwise." },
    { part: "spacer", slot: "header-spacer", notes: "flex-1, aria-hidden. The sheet draws one on each side of the nav, which is what centres it." },
    { part: "menuButton", slot: "header-menu-button", notes: "A 32px chrome control with the menu glyph and a required label. It opens a Menu on desktop and a Sheet below the breakpoint — same button, two surfaces, chosen by the layout. NOTE: composed through either Trigger's `render`, the trigger's data-slot replaces this one — target it as `menu-trigger` or `sheet-trigger` there." },
    { part: "end", slot: "header-end", notes: "Trailing controls — a menu toggle, an Avatar." },
  ],

  composition: `
Header
├─ Header.Start          <a href="/" aria-label="… home">  <button aria-label="Back">
├─ Header.Spacer
├─ Header.Nav            label (required)
│  └─ Header.Item        href? isCurrent? icon? trailing?
├─ Header.Spacer
└─ Header.End            <Menu.Trigger render={<Header.MenuButton label="…" />} />  <Avatar …/>

Header.MenuButton opens ONE of two surfaces, and which one is a layout
decision rather than a prop:

  desktop  <Menu.Trigger  render={<Header.MenuButton …/>} />   the sections
  mobile   <Sheet.Trigger render={<Header.MenuButton …/>} />   the whole rail

Below the breakpoint the Sidebar is REMOVED rather than narrowed and the Sheet
carries it. NavRail is the OTHER answer to that question — a sibling component
at 48px, not a mode of Sidebar — and a layout picks one (ADR 0015).
  `.trim(),

  props: {
    "Nav.label": { type: "string", required: true, notes: "Required — a page carries several navigations and <nav> landmarks are indistinguishable without names. Sidebar's rule, for the same reason." },
    "Item.href": { type: "string", notes: "OPTIONAL. With it the item is a real <a>; without it, a <button>. The sheet draws two items carrying a chevron that open menus rather than navigate, and a link that does not navigate is the commonest lie in a bar." },
    "Item.isCurrent": { type: "boolean", default: "false", notes: "Sets aria-current=\"page\" and takes the third step of a four-step fill ramp: rest is transparent, hover is bg-elevated, current is bg-hover, current+hover is bg-active. It shipped as THREE steps with hover and current both bg-hover, so the page you were on was indistinguishable from the one under the pointer and hovering the current item did nothing. Sidebar never hit this because its rows change weight too; a 12px bold bar item has none to spend." },
    "Item.icon": { type: "ReactElement", notes: "Slot: leading glyph, decorative." },
    "Item.trailing": { type: "ReactElement", notes: "Slot: the sheet puts a chevron here on its two menu items." },
    "MenuButton.label": {
      type: "string",
      required: true,
      notes: "Required — it is the accessible name, and \"Menu\" is not one. Say what it opens. Pass the button to Sheet.Trigger's `render` so aria-expanded and aria-controls come from the Sheet: a button declaring its own disclosure state can disagree with the panel it opens, and nothing would catch it.",
    },
    "Item.render": { type: "ReactElement", notes: "Slot: swap the item's own <a>/<button> for this element — pass render={<Link href={href} />} so the app's router owns the transition. Passed through, never wrapped (§3): the item's data-slot, aria-current and className merge onto it rather than replacing what it carries." },
  },

  do: [
    "Match the Sheet to the button: Header.MenuButton in Header.End opens a Sheet with side=\"right\", in Header.Start one with side=\"left\". Sheet defaults to left, so the trailing case has to be stated — and a drawer arriving from the far edge reads as a different control entirely.",
    "Name the nav; the landmark is otherwise anonymous.",
    "Give an item an href only when it navigates — otherwise it is a button, and the chevron says so.",
    "Make the brand mark a LINK to the app home, named for the destination — \"Diorama home\", never \"Logo\". The brand SWITCHER is a different control and lives in the account menu, and in the rail's profile layer on mobile.",
    "Give Header.MenuButton a panel. A trigger with nothing behind it is the commonest way this pattern ships broken, which is why the desktop bar story composes the Menu rather than rendering the button alone.",
    "Hide the nav row below your breakpoint; the sheet's mobile bar draws Start, a spacer and a menu toggle only.",
  ],

  dont: [
    "Do not wrap the whole bar in a nav. The banner holds more than navigation, and a landmark that contains everything helps nobody.",
    "Do not convey the current page by fill alone — aria-current is what is announced.",
    "Do not render two Headers as siblings on one page. <header> is the BANNER landmark, a document may have exactly one, and axe fails on the second (landmark-no-duplicate-banner). A Header used as chrome inside a section is fine — the role only applies outside article/aside/main/nav/section.",
    "Do not treat NavRail as Sidebar collapsed. They are sibling components (ADR 0015) and a layout renders one or the other; below the breakpoint this bar's menu button carries the navigation instead.",
    "Do not put the mobile menu's panel here; that is a Sheet, and this bar only holds its trigger.",
  ],

  a11y: {
    role: "banner (from <header>), containing a named navigation landmark. Items in Start and End are not list items, because a brand switcher announced as one misdescribes the page.",
    name: "The nav from its `label`. Every control in Start and End carries its own.",
    keyboard: [
      { key: "Tab", does: "Walks Start, then the items, then End — document order, the platform's own behaviour." },
      { key: "Enter", does: "Follows a link item, or activates a button item. Native in both cases." },
    ],
    target: "An item is a compact 24px control — SC 2.5.8's floor exactly rather than comfortably over it. See knownGaps.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "item labels on the bar" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "the menu button's glyph on its chrome fill" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "a nav item's label on the hover fill — the ramp's second step, which is also the chrome control's resting fill" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "the menu button's glyph while hovered, and a nav item's label while it is the current page" },
      { fg: "--ui-text-primary", bg: "--ui-bg-active", floor: "text", role: "the current nav item's label while it is also hovered — the ramp's fourth step" },
      { fg: "--ui-text-disabled", bg: "--ui-bg-sunken", floor: "decorative", why: "WCAG 1.4.3 exempts disabled controls, and a disabled chrome control has to read as unavailable — holding it to 4.5:1 would make it indistinguishable from an available one, which is the real failure. The chrome control has no doc of its own (it is a lib recipe), so its states are declared by the component that ships it.", role: "a disabled chrome control" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The bar's inline padding is a raw 20px, off the spacing scale, and the design's own mobile bar uses 12. Shipped as 16.",
  ],

  knownGaps: [
    "Header.Item forwards a ref so it can BE a Menu trigger — the sheet draws 'Create' and 'Work' as nav items that open a menu rather than navigate. Compose them as `<Menu.Trigger render={<Header.Item trailing={<ChevronDown/>}>Create</Header.Item>} />`; note the trigger's data-slot then wins over `header-item`, which is true of every render slot here.",
    "The sheet's bar uses a raw 20px inline padding, which is off the spacing scale entirely — and its own mobile drawing of the same bar uses 12. Shipped as px-lg (16); confirm with design.",
    "The four-step current/hover ramp is DERIVED. The sheet draws every item in one state, so rest/hover/current/current+hover are this library's reading of the roles that exist; what the sheet settled is only that the two must differ.",
    "No responsive behaviour of its own. The sheet draws a desktop bar and a mobile bar; which one shows is the caller's layout decision, not a prop.",
    "No sticky or scrolled state, no elevation change on scroll — none is drawn.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/ZBB-0",
} as const;

export type HeaderDoc = typeof headerDoc;
