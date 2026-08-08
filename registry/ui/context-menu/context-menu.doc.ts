/** Typed documentation for ContextMenu (CONVENTIONS §11). */

export const contextMenuDoc = {
  name: "ContextMenu",
  status: "stable",
  summary:
    "The same menu, opened by a right-click on a region rather than by a button. Only three parts live here — Root, Trigger and Panel — because Base UI's ContextMenu re-exports Menu's Item, Group, Separator and Submenu verbatim: they are the same rows in the same popup, and duplicating them would create two drawings of one surface. The keyboard path matters more here than anywhere else in this library, because a surface that only opens on right-click is unreachable without a pointer — and it depends on the region being FOCUSABLE, which is the caller's job.",

  anatomy: [
    { part: "trigger", slot: "context-menu-trigger", notes: "The region a right-click opens the menu over. Renders a div rather than wrapping in one, so the area the user aims at is the element the caller already has." },
    { part: "panel", slot: "context-menu-panel", notes: "role=menu, from the SHARED menu surface — the same recipe Menu.Panel uses. Anchored to the POINTER, not to an element, so it takes no side or align." },
    { part: "rows", slot: "menu-item, menu-separator, menu-group", notes: "Menu's own parts, used inside this root. Not re-exported here: one surface, one set of parts." },
  ],

  composition: `
ContextMenu                  isOpen? / defaultIsOpen? / onOpenChange?
├─ ContextMenu.Trigger       render? — the region that responds to a right-click
└─ ContextMenu.Panel         container?
   ├─ Menu.Item              icon? / trailing? / isDisabled? / onSelect?
   ├─ Menu.Separator
   └─ Menu.Group label="…"
  `.trim(),

  props: {
    isOpen: { type: "boolean", notes: "Controlled open state. Omit and the menu owns it." },
    defaultIsOpen: { type: "boolean", notes: "Uncontrolled starting state — never `initialIsOpen` (§1)." },
    onOpenChange: { type: "(isOpen: boolean) => void", notes: "Fires for the right-click, the context-menu key, Escape, an outside press and a chosen item." },
    "Trigger.render": { type: "ReactElement", notes: "Slot: the region itself. Never wrapped (§3) — the hit area is the caller's own element." },
    "Panel.container": { type: "HTMLElement | null", notes: "Where to portal. Theme tokens are INHERITED custom properties, so a panel on document.body leaves a brand scope behind and paints theme zero." },
  },

  do: [
    "Give every context menu action a second route — a toolbar button, a Menu, a keyboard shortcut. A right-click is a shortcut, never the only way to do something.",
    "Keep the trigger region visibly bounded, or nobody discovers it is there.",
    "Use Menu.Item and Menu.Separator inside it. They are the same parts by construction.",
  ],

  dont: [
    "Do not make a context menu the only path to an action. Touch has no right-click.",
    "Do not nest a ContextMenu inside another ContextMenu's trigger — the inner one wins and the outer becomes unreachable.",
    "Do not suppress the browser's own context menu on a region where the user might want it — a text selection, an image, a link.",
  ],

  a11y: {
    role: "menu, with menuitem rows — Base UI's, identical to Menu's.",
    name: "The panel has no trigger label to inherit, so the ROWS carry all the meaning. Give the trigger region an accessible name of its own if the menu's actions depend on which region was clicked.",
    keyboard: [
      { key: "Shift + F10", does: "Opens the menu on the focused region — via the BROWSER, not via this library. Chrome and Firefox fire a native `contextmenu` event on the focused element for this chord, and Base UI listens for that event and nothing else. It therefore works only if the region is focusable, and it cannot be proved with a synthetic key press: Playwright dispatches keys through CDP, which never produces the native contextmenu, so such a test fails on working code." },
      { key: "Context Menu key", does: "The same, on keyboards that have the dedicated key — and the same caveat." },
      { key: "Arrow Down / Up", does: "Moves the highlight through every row, disabled ones included — they are announced as disabled rather than hidden. See Menu's note." },
      { key: "Enter / Space", does: "Chooses the highlighted row and closes." },
      { key: "Escape", does: "Closes and returns focus to the trigger region." },
    ],
    focus: "The trigger region must be focusable for the keyboard path to exist — pass a focusable element through `render`, or give the region a tabIndex. A div with no tab stop can only ever be right-clicked, and nothing in this library will warn you. Escape restores focus to wherever it was when the menu opened, which is the region only if the region had it.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "a resting row — the shared menu surface" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "the highlighted row" },
      {
        fg: "--ui-border-subtle",
        bg: "--ui-bg-surface",
        floor: "decorative",
        role: "the panel edge",
        why: "ADR 0010: the panel is identified by its fill and shadow against the page, not by its hairline.",
      },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The Context Menu artboard draws the panel with no trigger at all, so nothing says what the right-clickable region looks like — whether it takes a hover, a focus ring, or any affordance announcing that a menu exists there. A surface with no discoverability is one most users never find.",
    "The same inline-versus-flyout question as Menu: the second variant draws a second level expanded inside the panel. See menu.doc.ts, where it is recorded in full.",
    "The panel is drawn identically to Menu's, which is why they share one recipe — confirm that is intentional and not a copy that will be revised on one artboard only.",
  ],

  knownGaps: [
    "The keyboard path is the browser's, not ours. Base UI's trigger has no keydown handler at all; it listens for `contextmenu` and nothing else. That is the right layering — the platform already does the job (§9) — but it means the path is untestable here and silently absent on any region the caller forgets to make focusable. A `tabIndex` default on the trigger was considered and rejected: it would put every right-clickable region into the tab order, which is worse.",
    "No long-press support for touch. Base UI does not provide it, and a touch user reaches these actions only through whatever second route the caller supplies.",
    "No checkbox or radio items, though Base UI provides both. The sheet draws neither.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/KN4-0",
} as const;

export type ContextMenuDoc = typeof contextMenuDoc;
