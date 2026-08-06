/** Typed documentation for Header (CONVENTIONS §11). */

export const headerDoc = {
  name: "Header",
  status: "stable",
  summary:
    "The page's top bar: leading controls, an optional row of navigation items, trailing controls. A <header> so it is the banner landmark, but deliberately NOT a nav — the bar also holds a brand switcher and an avatar menu, and calling all of that navigation would make the landmark useless to skip to. The item row names itself.",

  anatomy: [
    { part: "root", slot: "header", notes: "A <header>. 48px tall: py-sm around a 32px control, px-lg, bg-surface." },
    { part: "start", slot: "header-start", notes: "Leading controls — a brand switcher, a back button. Slots, not links." },
    { part: "nav", slot: "header-nav", notes: "A named <nav> wrapping a <ul> of items. gap-md, p-xs." },
    { part: "item", slot: "header-item", notes: "The sheet's 24px pill at 12px bold. An <a> when given href, a <button> otherwise." },
    { part: "spacer", slot: "header-spacer", notes: "flex-1, aria-hidden. The sheet draws one on each side of the nav, which is what centres it." },
    { part: "menuButton", slot: "header-menu-button", notes: "The control the navigation collapses INTO. A 32px chrome control with the menu glyph and a required label. NOTE: composed through Sheet.Trigger's `render`, the trigger's data-slot replaces this one — target it as `sheet-trigger` there." },
    { part: "end", slot: "header-end", notes: "Trailing controls — a menu toggle, an Avatar." },
  ],

  composition: `
Header
├─ Header.Start          <Button isIconOnly …/>  <Button isIconOnly …/>
├─ Header.Spacer
├─ Header.Nav            label (required)
│  └─ Header.Item        href? isCurrent? icon? trailing?
├─ Header.Spacer
└─ Header.End            <Sheet.Trigger render={<Header.MenuButton label="…" />} />  <Avatar …/>

There is NO rail. Below the breakpoint the Sidebar is REMOVED rather than
narrowed, and Header.MenuButton is what remains of it — opening the same
Sidebar inside a Sheet. A rail is a different answer to the same question and
can arrive later without changing any of this.
  `.trim(),

  props: {
    "Nav.label": { type: "string", required: true, notes: "Required — a page carries several navigations and <nav> landmarks are indistinguishable without names. Sidebar's rule, for the same reason." },
    "Item.href": { type: "string", notes: "OPTIONAL. With it the item is a real <a>; without it, a <button>. The sheet draws two items carrying a chevron that open menus rather than navigate, and a link that does not navigate is the commonest lie in a bar." },
    "Item.isCurrent": { type: "boolean", default: "false", notes: "Sets aria-current=\"page\". DERIVED — the sheet draws every item in one state, so the current styling is this library's; confirm with design." },
    "Item.icon": { type: "ReactElement", notes: "Slot: leading glyph, decorative." },
    "Item.trailing": { type: "ReactElement", notes: "Slot: the sheet puts a chevron here on its two menu items." },
    "MenuButton.label": {
      type: "string",
      required: true,
      notes: "Required — it is the accessible name, and \"Menu\" is not one. Say what it opens. Pass the button to Sheet.Trigger's `render` so aria-expanded and aria-controls come from the Sheet: a button declaring its own disclosure state can disagree with the panel it opens, and nothing would catch it.",
    },
  },

  do: [
    "Name the nav; the landmark is otherwise anonymous.",
    "Give an item an href only when it navigates — otherwise it is a button, and the chevron says so.",
    "Put the brand switcher and the avatar in Start and End as real controls with their own accessible names.",
    "Hide the nav row below your breakpoint; the sheet's mobile bar draws Start, a spacer and a menu toggle only.",
  ],

  dont: [
    "Do not wrap the whole bar in a nav. The banner holds more than navigation, and a landmark that contains everything helps nobody.",
    "Do not convey the current page by fill alone — aria-current is what is announced.",
    "Do not render two Headers as siblings on one page. <header> is the BANNER landmark, a document may have exactly one, and axe fails on the second (landmark-no-duplicate-banner). A Header used as chrome inside a section is fine — the role only applies outside article/aside/main/nav/section.",
    "Do not draw a narrowed rail as the collapsed state — there is no rail. The Sidebar is removed, and Header.MenuButton is what remains of it.",
    "Do not put the mobile menu's panel here; that is a Sheet, and this bar only holds its trigger.",
  ],

  a11y: {
    role: "banner (from <header>), containing a named navigation landmark. Items in Start and End are not list items, because a brand switcher announced as one misdescribes the page.",
    name: "The nav from its `label`. Every control in Start and End carries its own.",
    keyboard: [
      { key: "Tab", does: "Walks Start, then the items, then End — document order, the platform's own behaviour." },
      { key: "Enter", does: "Follows a link item, or activates a button item. Native in both cases." },
    ],
    target: "An item is the sheet's 24px pill — SC 2.5.8's floor exactly rather than comfortably over it. See knownGaps.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "item labels on the bar" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "No collapsed rail is drawn, so the Sidebar compresses to Header.MenuButton instead. A rail would be a second, different answer — confirm whether it is wanted.",
    "The bar's inline padding is a raw 20px, off the spacing scale, and the design's own mobile bar uses 12. Shipped as 16.",
    "No current state is drawn for a nav item; its fill is derived from --ui-bg-hover.",
  ],

  knownGaps: [
    "The sheet's bar uses a raw 20px inline padding, which is off the spacing scale entirely — and its own mobile drawing of the same bar uses 12. Shipped as px-lg (16); confirm with design.",
    "No current state is drawn. isCurrent exists because a nav needs one, and its fill is DERIVED from --ui-bg-hover.",
    "No responsive behaviour of its own. The sheet draws a desktop bar and a mobile bar; which one shows is the caller's layout decision, not a prop.",
    "No sticky or scrolled state, no elevation change on scroll — none is drawn.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/DOY-0",
} as const;

export type HeaderDoc = typeof headerDoc;
