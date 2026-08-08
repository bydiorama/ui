/** Typed documentation for Menu (CONVENTIONS §11). */

export const menuDoc = {
  name: "Menu",
  status: "stable",
  summary:
    "A list of commands, opened from a trigger. The whole ARIA menu contract — role=menu and menuitem, roving focus, typeahead, Escape and outside-press dismissal, submenu timing and the aria-haspopup/aria-expanded wiring — comes from the Base UI behaviour layer (ADR 0012), wrapped so no third-party type reaches a public prop signature. Its panel and rows are the shared menu surface, which ContextMenu draws from the same recipe.",

  anatomy: [
    { part: "trigger", slot: "menu-trigger", notes: "A render slot. Pass a Button; it keeps its own type, ref and accessible name and gains only the ARIA wiring." },
    { part: "panel", slot: "menu-panel", notes: "role=menu. radius-md over a 4px inset around radius-sm rows — 4 + 4 = 8, concentric (§6). Capped to --available-height/width, so it shrinks rather than running off a short window." },
    { part: "item", slot: "menu-item", notes: "role=menuitem. p-md, radius-sm, 16px/600 in primary ink — identical IN ROLE to a Select option, because two panels on one page should be one panel. Carries data-highlighted from the behaviour layer, which is what the arrow keys move." },
    { part: "item label", slot: "menu-item-label", notes: "Truncates. The icon and trailing slots sit outside it, so a long label never pushes them out of the row." },
    { part: "separator", slot: "menu-separator", notes: "role=separator. SPACE, not a rule — 8px above and below, and nothing painted. Announced either way, which is the half that matters." },
    { part: "group", slot: "menu-group", notes: "role=group, named by its label so a screen reader announces the grouping the eye gets from the spacing." },
    { part: "group label", slot: "menu-group-label", notes: "A heading, never interactive. label-sm in muted ink." },
    { part: "sub trigger", slot: "menu-sub-trigger", notes: "A row that opens a nested panel beside itself. Chevron RIGHT — see needsDesign." },
  ],

  composition: `
Menu                       isOpen? / defaultIsOpen? / onOpenChange? / isModal?
├─ Menu.Trigger render={<Button/>}
└─ Menu.Panel              side? / align? / sideOffset? / container?
   ├─ Menu.Item            icon? / trailing? / isDisabled? / onSelect? / render?
   ├─ Menu.Separator
   ├─ Menu.Group label="…"
   │  └─ Menu.Item
   └─ Menu.Sub
      ├─ Menu.SubTrigger
      └─ Menu.Panel
  `.trim(),

  props: {
    isOpen: { type: "boolean", notes: "Controlled open state. Omit and the menu owns it — the behaviour layer already implements the controlled/uncontrolled contract, so running useControllableState over it as well would be two implementations of one thing." },
    defaultIsOpen: { type: "boolean", notes: "Uncontrolled starting state — never `initialIsOpen` (§1)." },
    onOpenChange: { type: "(isOpen: boolean) => void", notes: "Fires for the trigger, Escape, an outside press and a chosen item." },
    isModal: { type: "boolean", notes: "Traps focus and blocks the page behind. A menu is not modal by default; a menu that must be answered is a Modal (§7a)." },
    "Panel.side": { type: '"top" | "right" | "bottom" | "left"', default: '"bottom"', notes: "Preferred side. Base UI flips it when it would collide." },
    "Panel.align": { type: '"start" | "center" | "end"', default: '"start"' },
    "Panel.container": { type: "HTMLElement | null", notes: "Where to portal. Theme tokens are INHERITED custom properties, so a panel on document.body leaves a brand scope behind and paints theme zero." },
    "Item.onSelect": { type: "() => void", notes: "Named for the verb (§1). NOT onClick: a menu row is chosen by keyboard as often as by pointer, and a handler named for one input is how the other gets forgotten." },
    "Item.icon": { type: "ReactElement", notes: "Leading glyph. The component sizes it to 16 (§7) — an unsized slot ships griddy's 24." },
    "Item.trailing": { type: "ReactElement", notes: "A shortcut hint, a check, a count." },
    "Item.render": { type: "ReactElement", notes: "Renders the row as something else — an <a> for a link. Note that the row's own data-slot loses to the rendered element's, which is true of every render slot here." },
    "Item.isDisabled": { type: "boolean", default: "false", notes: "Sets aria-disabled and refuses activation by pointer and by Enter, but stays REACHABLE by the arrow keys so it can be announced. This doc originally claimed the arrows skipped it; the browser test disagreed, and the behaviour layer was right." },
    "Group.label": { type: "string", notes: "Names the group AND draws its heading. Without it the grouping is visual only." },
  },

  do: [
    "Use Menu for actions. A list of links is navigation, and role=menu full of links announces them as commands — the Sidebar is the shape for that.",
    "Give a destructive item its own trailing confirmation, or open a Modal from it; a menu row cannot be undone.",
    "Pass `container` when the trigger sits inside a brand-themed scope.",
    "Keep labels short enough not to truncate — the label is the only thing announced.",
  ],

  dont: [
    "Do not put a form inside a menu. Typeahead swallows the keystrokes; that is a Popover.",
    "Do not nest more than one level of Menu.Sub. Base UI supports it and a pointer user cannot reliably hold the path.",
    "Do not use onClick on Menu.Item — there is no such prop, deliberately.",
  ],

  a11y: {
    role: "menu, with menuitem rows, group and separator. All from Base UI, including the trigger's aria-haspopup and aria-expanded.",
    name: "The trigger names the menu. Each row is named by its own label text; an icon-only row would announce nothing, so the label is required.",
    keyboard: [
      { key: "Enter / Space (on the trigger)", does: "Opens the menu and focuses its first item." },
      { key: "Arrow Down / Up", does: "Moves the highlight through EVERY row, disabled ones included, wrapping at the ends. Reaching a disabled row is deliberate — it is announced as disabled rather than hidden, for the same reason Calendar keeps unavailable dates focusable: a row a screen-reader user cannot reach is one they cannot be told the reason for." },
      { key: "Arrow Right (on a sub trigger)", does: "Opens the nested panel; Arrow Left closes it and returns." },
      { key: "Typeahead", does: "Jumps to the row whose label starts with what was typed." },
      { key: "Enter / Space (on a row)", does: "Chooses it and closes the menu." },
      { key: "Escape", does: "Closes and returns focus to the trigger." },
    ],
    focus: "The panel takes focus on open and returns it to the trigger on close, both from the behaviour layer. Highlight is `data-highlighted`, which moves with the arrows and with the pointer alike — and it carries a forced-colors outline, because forced colours flattens the author background that otherwise carries it.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "a resting menu row" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "the highlighted row" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "a group heading" },
      {
        fg: "--ui-border-subtle",
        bg: "--ui-bg-surface",
        floor: "decorative",
        role: "the panel edge",
        why: "ADR 0010: the panel is identified by its fill and shadow against the page, not by its hairline. The separator paints nothing at all — it is space plus a role.",
      },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The sheet draws a chevron-DOWN on 'Admin Settings' and 'Team Settings', and the second variant shows a second level expanded INLINE beneath its parent, in the same panel, in muted nav ink. That is a disclosure, not a submenu. Shipped as a Base UI submenu with a chevron-RIGHT, because an inline disclosure inside role=menu breaks the roving-focus model that makes a menu a menu — and because the Sidebar already ships exactly the inline pattern, with the same layer names the sheet uses here ('Primary Level 1 Item', 'Second Level 2 Item'). If the drawing is the intent, this surface is a Sidebar inside a Popover and not a Menu at all. This is the one question worth answering first.",
    "The sheet paints the panel --ui-bg-surface and its rows --ui-nav-ink, which mixes two role families: the nav inks are derived against --ui-nav-bg, the rail they belong to. Declaring --ui-nav-ink-muted on --ui-bg-surface made the resolver's own audit fail at 1.03:1 in dark for the saturated-accent seed, because no single ink can serve two surfaces a brand has pulled that far apart. Shipped with --ui-text-primary on --ui-bg-surface and --ui-bg-hover for the highlight, which is what Select's list already uses. The artboard's layer names say where the mix came from — the rows are Sidebar frames, copied.",
    "The panel's inset is drawn at 8px, which does not close §6's arithmetic — 4 + 8 wants a 12px outer radius and the scale has no 12px step. Shipped at 4px, exactly as Select's panel resolved the identical problem.",
    "No disabled row is drawn; its ink is derived from --ui-nav-ink-disabled.",
    "No icons are drawn on any row, though the slot exists.",
    "The trigger is drawn as a medium Button with a chevron; nothing says whether the chevron should flip when the menu opens, as the Date Picker's does.",
  ],

  knownGaps: [
    "No checkbox or radio items, though Base UI provides both. The sheet draws neither.",
    "No keyboard-shortcut column. `trailing` will hold one, but there is no styled part for it.",
    "The panel has one width, driven by min-w-56 and its content. The sheet draws a panel that fills its column.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/K09-0",
} as const;

export type MenuDoc = typeof menuDoc;
