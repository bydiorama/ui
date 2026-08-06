/** Typed documentation for Drawer (CONVENTIONS §11). */

export const drawerDoc = {
  name: "Drawer",
  status: "stable",
  summary:
    "A panel that comes up from the bottom and is dismissed by dragging it down. Distinct from Sheet, and the distinction is the GESTURE rather than the geometry (CONVENTIONS §7a): a Sheet is anchored to a side edge and dismissed by scrim or Escape, while a Drawer carries a handle and follows the finger. Base UI supplies the focus trap and scroll lock; the drag is ours, with no drag library in the dependency list.",

  anatomy: [
    { part: "trigger", slot: "drawer-trigger", notes: "The control that opens it. Pass your own element via `render` — never wrapped." },
    { part: "scrim", slot: "drawer-scrim", notes: "The backdrop, --ui-scrim. The sheet drew this as --ui-bg-emphasis-active, an opaque surface role with no alpha; corrected in Paper." },
    { part: "panel", slot: "drawer-panel", notes: "The drawer. Inset 4px on three sides, radius-lg on all four corners, bg-base with a 1px edge and shadow-md. Capped at 80% of the viewport." },
    { part: "handle", slot: "drawer-handle", notes: "A real <button> covering the full 32px header band. Drag it to dismiss; tap it to dismiss without dragging." },
    { part: "handleBar", slot: "drawer-handle-bar", notes: "The 8px pill at 30% width, bg-sunken. Decorative — the button around it is the control." },
    { part: "title", slot: "drawer-title", notes: "body-lg at bold weight, clamped to one line. Becomes nothing automatically — the panel's `label` is the accessible name." },
    { part: "body", slot: "drawer-body", notes: "p-lg, gap-sm. Scrolls when the drawer hits its cap." },
    { part: "footer", slot: "drawer-footer", notes: "p-lg, gap-sm, and a COLUMN — buttons stack full width, unlike Modal's row." },
  ],

  composition: `
Drawer                     isOpen? / defaultIsOpen? / onOpenChange? / isDismissable?
├─ Drawer.Trigger          render={<Button>…</Button>}
└─ Drawer.Panel            label (required) / handleLabel? / container?
   ├─ (drag handle)        drawn by Panel, not composed
   ├─ Drawer.Title?
   ├─ Drawer.Body
   │  └─ <your content>    Inputs, a form, anything
   └─ Drawer.Footer
      ├─ <primary action>  <Button isFullWidth shape="pill">
      └─ Drawer.Close      render={<Button variant="secondary" isFullWidth shape="pill">Cancel</Button>}
  `.trim(),

  props: {
    label: {
      type: "string",
      required: true,
      notes: "On Panel. A dialog with no accessible name is announced as 'dialog' and nothing else. Drawer.Title is visible content and is not wired to it automatically — use the same words in both.",
    },
    handleLabel: {
      type: "string",
      default: '"Close"',
      notes: "The handle is a real button as well as a drag target, so it needs a name. Rename it when 'Close' would be ambiguous on the screen.",
    },
    isOpen: { type: "boolean", notes: "Controlled. Omit and the drawer owns it." },
    defaultIsOpen: { type: "boolean", notes: "Uncontrolled starting state." },
    onOpenChange: { type: "(isOpen: boolean) => void", notes: "One callback for both directions (§1). Narrowed from Base UI's signature so no third-party type reaches ours." },
    isDismissable: {
      type: "boolean",
      default: "true",
      notes: "Escape and scrim-tap. It does NOT disable the drag: the handle is the drawer's defining affordance, and a drawer you can grab but not move is broken furniture. Use a Modal if the decision genuinely cannot be deferred.",
    },
    container: {
      type: "HTMLElement | null",
      default: "document.body",
      notes: "Where the panel is portalled. Theme tokens are INHERITED custom properties, so a panel in the body leaves any brand scope on a wrapper and paints theme zero. See sheet.doc.ts for why it is a prop rather than automatic.",
    },
  },

  do: [
    "Give every drawer a label, and repeat it as a Drawer.Title when the design shows a heading.",
    "Stack footer actions full width — that is what the sheet draws, and the bottom of the screen is where a thumb lands.",
    "Reach for a Drawer when the content is a quick, deferrable task on a phone; reach for a Sheet when it is navigation.",
  ],

  dont: [
    "Do not use a Drawer where a Sheet belongs. They are not `side` variants of one component: a Drawer's contract is a gesture, and a Sheet has no handle, no velocity threshold and no body that follows the finger.",
    "Do not put a long scrolling list in the body and expect the drag to work from anywhere — the handle is the drag target, deliberately, so a scroll inside the body never fights the gesture.",
    "Do not rely on the drag alone to convey dismissal; the scrim, Escape and a tap on the handle all close it, which is what WCAG 2.5.7 asks for.",
    "Do not import Base UI types into your own props — `check:boundaries` fails the build (ADR 0002).",
  ],

  a11y: {
    role: "dialog, modal (from Base UI). The page behind is inert and does not scroll while open.",
    name: "The `label` prop, as aria-label.",
    keyboard: [
      { key: "Enter / Space", does: "Opens from the trigger, and closes from the handle — it is a real button, so both are native." },
      { key: "Escape", does: "Closes when isDismissable, and RESTORES FOCUS to the trigger. Asserted in Chromium." },
      { key: "Tab", does: "Cycles within the panel only; focus cannot reach the page behind." },
    ],
    pointer:
      "The drag is never the only way out. SC 2.5.7 (Dragging Movements) requires a single-pointer alternative to any dragging movement: tapping the same handle closes it, as do the scrim and Escape.",
    target: "The handle button is the full 32px header band, not the 8px bar inside it — the bar alone would be an 8px target against SC 2.5.8's 24px floor.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "the title and content on the panel" },
      { fg: "--ui-bg-sunken", bg: "--ui-bg-base", floor: "decorative", why: "The handle bar is a grip, not a control boundary — the 32px button around it is the control, and its focus ring is what has to be visible. Holding the bar itself to 3:1 would make it a dark slab across the top of every drawer.", role: "the handle bar against the panel" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "No snap points or detents are drawn — one resting height only.",
    "The 80% height cap is derived from a single drawing.",
    "Two SELECT fields are drawn in the content and there is no Select component.",
  ],

  knownGaps: [
    "No snap points. The sheet draws one resting height, so there are no detents to snap between — a half-open state would need design.",
    "Drag works from the HANDLE only, not the whole panel. Dragging from anywhere means arbitrating with scroll position inside the body on every pointer move; the handle is unambiguous, and it is the affordance the sheet draws.",
    "The 80% height cap is DERIVED. The sheet draws one drawer nearly filling its window, which is a demo height rather than a rule — confirm with design.",
    "The scrim does not fade with the drag. It fades on open and close only; tying its opacity to the offset is a refinement, not a contract.",
    "The sheet's own content draws two SELECT fields (Occupation, Visibility). There is no Select component in this system yet and Multiselect is the wrong shape for a single value, so the story uses Inputs in their place.",
    "No visual-regression baseline — the matrix renders inline and a Drawer portals to document.body, the same exclusion Modal, Popover and Sheet have.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/HYB-0",
} as const;

export type DrawerDoc = typeof drawerDoc;
