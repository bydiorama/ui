/** Typed documentation for Header (CONVENTIONS §11). */

export const headerDoc = {
  name: "Header",
  status: "stable",
  summary:
    "The page's top bar: leading controls, an optional row of navigation items, trailing controls. A <header> so it is the banner landmark, but deliberately NOT a nav — the bar also holds a brand mark that links home and an avatar that opens the account menu, and calling all of that navigation would make the landmark useless to skip to. The item row names itself.",

  anatomy: [
    { part: "root", slot: "header", notes: "A <header>. 48px tall — PINNED (h-12), not emergent from py-sm around the tallest child: a bar whose tallest child is a 24px Header.Item used to render at 40px, silently. px-lg, bg-surface." },
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
    "Item.target / Item.rel / Item.download / Item.referrerPolicy": {
      type: "the native anchor attributes",
      notes:
        "Item's props extend AnchorHTMLAttributes, so an external destination opens in a new tab through this API. They used to extend HTMLAttributes, which has none of these — the only way out was the `render` slot, which means writing the href twice and keeping the two copies in step. `type` is the one anchor attribute removed: on the button branch it is what stops a nav item submitting a form around it.",
    },
    "Item.isCurrent": {
      type: "boolean",
      default: "false",
      notes:
        "Sets aria-current=\"page\" and makes the item RECEDE: no fill, ink stepped back to muted. You cannot navigate to the page you are on, so the items worth pointing at are the ones at full strength — an emphasised fill there spends the loudest thing in the bar on the least actionable item. FILL and INK are separate channels: fill answers the pointer (hover, on the current item too), ink says where you are. This replaced a four-step fill ramp that was wrong twice — first with hover and current sharing bg-hover, so the page you were on looked like the one under the pointer; then as four steps that ordered correctly in light and INVERTED in dark, 1.031 apart and backwards, because bg-elevated is a surface role and the surface scale inverts. With one fill left there is no ramp to order, which is the point. NOTE the divergence: Sidebar and NavRail still EMPHASISE their current row (nav-active-bg). A rail is a persistent map where the current row anchors you; a bar is a short row you read across. Confirm whether that difference is intended.",
    },
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
    "Do not convey the current page by ink alone — aria-current is what is announced, and it is the channel a screen reader has.",
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
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "the CURRENT item's label — it recedes rather than being emphasised, and a receding label is still body text: WCAG exempts disabled controls, not quiet ones" },
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "the menu button's glyph on its chrome fill, and a nav item's label on the hover fill" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "the current item's label while it is hovered — the fill answers the pointer, the muted ink persists underneath it" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "the menu button's glyph while hovered" },
      { fg: "--ui-text-disabled", bg: "--ui-bg-sunken", floor: "decorative", why: "WCAG 1.4.3 exempts disabled controls, and a disabled chrome control has to read as unavailable — holding it to 4.5:1 would make it indistinguishable from an available one, which is the real failure. The chrome control has no doc of its own (it is a lib recipe), so its states are declared by the component that ships it.", role: "a disabled chrome control" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The bar's inline padding is a raw 20px, off the spacing scale, and the design's own mobile bar uses 12. Shipped as 16.",
    "`--ui-bg-selected` and `--ui-bg-hover` are the SAME value in theme zero's authored light map (neutral-90), which is why the item ramp cannot be built out of interaction roles alone. The contract's own note on bg-selected says \"not hover\"; the authored value makes it hover. Confirm whether a selected fill should sit past `bg-active` in light, as the derivation puts it.",
  ],

  knownGaps: [
    "Header.Item forwards a ref so it can BE a Menu trigger — the sheet draws 'Create' and 'Work' as nav items that open a menu rather than navigate. Compose them as `<Menu.Trigger render={<Header.Item trailing={<ChevronDown/>}>Create</Header.Item>} />`; note the trigger's data-slot then wins over `header-item`, which is true of every render slot here.",
    "The sheet's bar uses a raw 20px inline padding, which is off the spacing scale entirely — and its own mobile drawing of the same bar uses 12. Shipped as px-lg (16); confirm with design.",
    "The hover fill is `bg-elevated`, a SURFACE role — which is also what the chrome control resting beside it in the same bar is filled with, so a hovered nav item and a resting menu button are the same colour. It was a fill RAMP's second step when that mattered; now that the current item carries no fill, hover is the only one and moving it to `bg-hover` — the role named for the job — costs nothing. Left as the sheet draws it; one line to change.",
    "Current is conveyed by ink alone, plus aria-current. `--ui-text-muted` on the bar measures 5.78:1 light / 6.47:1 dark, so it is legible, but a reader with reduced colour discrimination has only the weight-free ink difference to go on visually. The bar has no weight left to spend (12px bold already), which is what ruled out the Sidebar's approach. If that proves too quiet, the channels available are a rule under the item or an opacity step — both drawn decisions, neither taken.",
    "No responsive behaviour of its own. The sheet draws a desktop bar and a mobile bar; which one shows is the caller's layout decision, not a prop.",
    "No sticky or scrolled state, no elevation change on scroll — none is drawn.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/ZBB-0",
} as const;

export type HeaderDoc = typeof headerDoc;
