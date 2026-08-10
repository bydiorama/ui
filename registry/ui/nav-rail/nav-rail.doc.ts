/** Typed documentation for NavRail (CONVENTIONS §11). */

export const navRailDoc = {
  name: "NavRail",
  status: "stable",
  summary:
    "The navigation rail at its narrow width: 48px, one icon per row. A SIBLING of Sidebar rather than a mode of it, because six of Sidebar's ten parts change what they MEAN at this width rather than what they measure — CONVENTIONS §7a already splits Sheet from Drawer on that test. The one-line difference: at full width a row is a slot, at rail width a row is a control. Shares the --ui-nav-* family and the row lane with Sidebar, so a layout can swap one for the other without the navigation changing colour.",

  anatomy: [
    { part: "root", slot: "nav-rail", notes: "A <nav>, named by its label. w-nav-rail (--ui-nav-rail-width, 3rem), bg-nav, radius-lg, overflow-clip. The width is MEASURED, not chosen: the artboard declares none, it is fit-content around space-sm padding on the shared 32px chrome control." },
    { part: "label", slot: "nav-rail-label", notes: "Names the landmark, and can never be shown — there is no room for a heading at 48px, so unlike Sidebar there is no isLabelHidden to get wrong." },
    { part: "body", slot: "nav-rail-body", notes: "p-sm, the same 8px Sidebar's body carries, which is what puts a row on the same lane in both. gap-md between groups against gap-xs within one — that DIFFERENCE is the grouping, and nothing is painted. A gap at all would be wrong in Sidebar, whose rows carry their own 12px padding; a rail row is a bare 32px square, so the gap is the only rhythm there is." },
    { part: "section", slot: "nav-rail-section", notes: "A named <ul>, grouped by SPACE. This is where Sidebar's FIRST LEVEL goes: a primary label with a chevron cannot exist at 48px, so the group keeps its name for assistive tech and its own tighter gap. It shipped with a hairline above it and that was wrong — Menu.Separator had already written the rule down (\"SPACE, not a rule\"), and a painted line inside a 48px control is clutter." },
    { part: "item", slot: "nav-rail-item", notes: "A 32px square at radius-md with a 16px glyph — the chrome control's geometry and none of its colour, because the page's bg-elevated/ink-primary is exactly what the nav family exists to avoid. An <a> when given href, a <button> otherwise." },
    { part: "slot", slot: "nav-rail-slot", notes: "A row holding a control the caller supplies — the expand toggle, an Avatar. The row's box and nothing else: no role, no tab stop, no name of its own. A 32px chrome control drops in at exactly the row's size, because that is the size the row was built from." },
    { part: "spacer", slot: "nav-rail-spacer", notes: "flex-1, aria-hidden. Pushes what follows to the bottom." },
  ],

  composition: `
NavRail                    label (required, always hidden)
├─ NavRail.Slot            <button className={chromeControl()}>  — expand to Sidebar
├─ NavRail.Section         label (required, always hidden)
│  └─ NavRail.Item         icon + label (both required) / href? isCurrent? isDisabled?
├─ NavRail.Section         …a second group, divided by a hairline
├─ NavRail.Spacer
└─ NavRail.Slot            <Avatar …/>  — opens the account menu

NavRail and Sidebar are ALTERNATIVES. Neither knows about the other and
neither owns the state: which one renders is the caller's decision, exactly as
it already was between Sidebar and Header.MenuButton. See ADR 0015.
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a page may carry several <nav> landmarks and they are indistinguishable without names. Unlike Sidebar's there is no option to show it; 48px has no room for a heading." },
    "Item.icon": { type: "ReactElement", required: true, notes: "REQUIRED, and a type rather than a doc note. The label is invisible at this width, so a row with no glyph is a blank square — there is no text to fall back to. Same precedent as Button's icon-only variant requiring aria-label." },
    "Item.label": { type: "string", required: true, notes: "The accessible name, and the only name the row has. Rendered as aria-label AND as title, so a pointer user gets the platform's own tooltip. See knownGaps — title is a placeholder for a Tooltip this library does not have." },
    "Item.href": { type: "string", notes: "OPTIONAL. With it the row is a real <a> — middle-click, open-in-new-tab and the UA's focus handling come free. Without it the row is a <button>, i.e. an action. It is never a container: nothing Sidebar puts in a slot-row fits in a 32px square." },
    "Item.isCurrent": { type: "boolean", default: "false", notes: "Sets aria-current=\"page\" and takes the third step of a three-step fill ramp: transparent → --ui-nav-hover-bg → --ui-nav-active-bg. Both, not either — a fill conveys nothing to a screen reader (WCAG 1.4.1). It shipped with hover and current sharing ONE fill and a 2px bar down the leading edge separating them; the family gained a hover step instead, because a rule inside a control is clutter." },
    "Item.isDisabled": { type: "boolean", default: "false", notes: "Unavailable. The row STAYS in the tab order and keeps its role, announced as disabled — a row a screen-reader user cannot reach is one they cannot be told the reason for. Navigation is prevented on the click, never by dropping the href, and never with pointer-events-none." },
    "Item.render": { type: "ReactElement", notes: "Slot: swap the row's own <a>/<button> for this element — render={<Link href={href} />} so the app's router owns the transition. Passed through, never wrapped (§3)." },
    "Section.label": { type: "string", required: true, notes: "Required and always invisible. The two-level tree does not survive the width: the second level becomes the only level, and the first becomes a named group." },
  },

  do: [
    "Give every row an icon that reads without its label. The label is the accessible name, not a fallback — nothing renders it.",
    "Group rows with NavRail.Section so the hairlines carry the structure the first level used to.",
    "Put the expand control and the Avatar in NavRail.Slot, and style the expand control with @/lib/chrome-control — it is 32px, which is the row's own size.",
    "Set isCurrent on exactly one row, so the marker and the announcement agree.",
    "Own the rail-or-Sidebar choice in the layout. Neither component has a responsive mode, by design.",
  ],

  dont: [
    "Do not treat this as Sidebar collapsed. They are siblings (ADR 0015); a layout renders one or the other, and a transition between them is a cross-fade of two trees rather than one component animating.",
    "Do not put a search field, a Progress bar or anything else Sidebar slots into a row. A rail row is a control, not a container — that is the whole reason this component exists.",
    "Do not convey the current row by fill alone — aria-current is what is announced.",
    "Do not reach for a partial edge — a left bar, a bottom rule, an inset stripe — for ANY state. It reads as clutter at this density. Depth, a full outline or elevation; never a ruler (ui-craft rule 20).",
    "Do not add a second level. There is no room for a disclosure, and a flyout would be a Menu — compose one if you need it.",
    "Do not reach for chromeControl on a row. It carries the PAGE's bg-elevated and ink-primary, so a themed rail would re-skin everything except its own navigation.",
  ],

  a11y: {
    role: "navigation landmark. A Section is a named <ul> of rows; rows outside a Section are not list items.",
    name: "The `label` prop via aria-labelledby, always visually hidden. Each row carries its own name through aria-label, because it renders no text.",
    keyboard: [
      { key: "Tab", does: "Walks the rows in document order — the platform's own behaviour." },
      { key: "Enter", does: "Follows a link row, or activates a button row. Native in both cases." },
      { key: "—", does: "No arrow-key navigation, for Sidebar's reason: it would mean taking the links out of the tab order. A nav is not a menu." },
    ],
    target: "A row is a 32px square — the shared chrome control's size, comfortably over SC 2.5.8's 24px floor rather than exactly on it, which is where Header's 24px item sits.",
    contrastPairs: [
      { fg: "--ui-nav-ink-muted", bg: "--ui-nav-bg", floor: "non-text", role: "a resting row's glyph — non-text, because the row renders no text at all" },
      { fg: "--ui-nav-ink", bg: "--ui-nav-hover-bg", floor: "non-text", role: "a hovered row's glyph on the hover fill" },
      { fg: "--ui-nav-ink-muted", bg: "--ui-nav-active-bg", floor: "non-text", role: "the current row's glyph — the ink does not move between states on this rail, so this is the resting ink measured on the current fill" },
      { fg: "--ui-nav-ink-disabled", bg: "--ui-nav-bg", floor: "decorative", why: "WCAG 1.4.3 exempts disabled controls, and a disabled row has to read as unavailable — holding it to the non-text floor would make it indistinguishable from an available one, which is the actual failure. It is still derived to sit clearly below --ui-nav-ink-muted rather than vanishing.", role: "a disabled row's glyph" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "No expanded-rail transition is drawn. NavRail and Sidebar are separate trees (ADR 0015), so swapping them is a re-render; if a layout ever wants the width to animate, that is the trigger to revisit the decision.",
  ],

  knownGaps: [
    "There is no fourth fill for current AND hovered — pointing at the row you are already on does not deepen it, where Header's bar does. Not laziness: a step past --ui-nav-active-bg is an accent WASH under the `tinted` nav style, landing darker for a dark accent and lighter for a light one, so the two grounds straddle the ink and no single value clears both. Three fills the resolver can always satisfy beat four that break a brand style.",
    "Label discovery by pointer rests on the native `title` attribute, which is slow, unstyleable, invisible on touch and not reachable by keyboard. It ships because the platform's own affordance is strictly better than none, and it is the one line to delete when this library grows a Tooltip. The keyboard and screen-reader paths do NOT depend on it — the name comes from aria-label.",
    "No collapsed-rail toggle of its own. The expand control is a caller-supplied Slot, because the rail does not own which of the two navigations is showing.",
    "check:controls does not see this component's <button>. The gate matches a literal `<button` in JSX and NavRail chooses its tag dynamically, exactly as Header and Sidebar do — the gate documents the limitation, and this is the third component to land in it.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/12HF-0",
} as const;

export type NavRailDoc = typeof navRailDoc;
