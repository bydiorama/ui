/** Typed documentation for Sheet (CONVENTIONS §11). */

export const sheetDoc = {
  name: "Sheet",
  status: "stable",
  summary:
    "A panel that slides in from the LEFT or RIGHT edge of the screen — the mobile counterpart to a Sidebar, which is what it usually holds. Third component on the Base UI behaviour layer, and deliberately Modal's shape: the focus trap, scroll lock, Escape and focus restoration are the same problem, and only the panel's position differs. Sheet and Drawer are DIFFERENT components here, following shadcn/ui: a Sheet is edge-anchored and dismissed by scrim or Escape; a Drawer comes up from the bottom with a drag handle and is dismissed by dragging. Reaching for one when you want the other is the most common mix-up in this pair.",

  anatomy: [
    { part: "trigger", slot: "sheet-trigger", notes: "The control that opens it — a hamburger, usually. Pass your own element via `render`; never wrapped." },
    { part: "scrim", slot: "sheet-scrim", notes: "The backdrop. --ui-scrim, a scheme-only role: a warm 16% veil in light, a heavier black in dark. The design drew this as a raw #98918A29, which is the same value." },
    { part: "panel", slot: "sheet-panel", notes: "The drawer. Full height, 80% width capped at the rail's own, bg-base with shadow-sm. Carries data-side." },
    { part: "close", slot: "sheet-close", notes: "Any control that dismisses. Takes an element via `render`." },
  ],

  composition: `
Sheet                     isOpen? / defaultIsOpen? / onOpenChange? / isDismissable?
├─ Sheet.Trigger          render={<Button isIconOnly aria-label="Open menu" icon={<Menu />} />}
└─ Sheet.Panel            label (required) / side?
   └─ <your content>      usually a Sidebar, with className="w-full rounded-none"
      └─ Sheet.Close      render={<Button …/>} — inside the content's own header
  `.trim(),

  props: {
    label: {
      type: "string",
      required: true,
      notes: "On Panel. Required — a dialog with no accessible name is announced as 'dialog' and nothing else. There is no Sheet.Title part because the design draws no heading inside the panel; a visible heading is ordinary content the caller supplies.",
    },
    side: {
      type: '"left" | "right"',
      default: '"left"',
      notes: "Which edge it slides from. Only the two INNER corners are rounded — a fully rounded panel leaves four slivers of scrim in the screen corners, which reads as a modal rather than a drawer.",
    },
    isOpen: { type: "boolean", notes: "Controlled. Omit and the sheet owns it." },
    defaultIsOpen: { type: "boolean", notes: "Uncontrolled starting state." },
    onOpenChange: { type: "(isOpen: boolean) => void", notes: "One callback for both directions (§1). Narrowed from Base UI's signature so no third-party type reaches ours." },
    isDismissable: {
      type: "boolean",
      default: "true",
      notes: "Escape and scrim-tap dismiss. On by default: a drawer is a navigation surface, and tapping outside to leave is the gesture every phone user already has. Turning it off cancels those two reasons only — an explicit Sheet.Close still works, or the panel could not be closed at all.",
    },
    container: {
      type: "HTMLElement | null",
      default: "document.body",
      notes: "Where the panel is portalled. Theme tokens are INHERITED custom properties, so a panel in the body leaves any brand scope on a wrapper and paints theme zero — pass the themed element and it inherits again. A prop rather than something resolved automatically, because the container becomes the panel's containing block: an ancestor with a transform or overflow:hidden would clip a full-height fixed drawer, and only the caller knows whether theirs is safe.",
    },
    render: { type: "ReactElement", notes: "On Trigger and Close. Passed through, not wrapped (§3), so the element keeps its tag, ref and accessible name and gains only the ARIA wiring." },
  },

  do: [
    "Open the sheet from the edge its TRIGGER sits on: a menu button in Header.End takes side=\"right\". A drawer that flies in from the opposite edge to the control the user just pressed breaks the connection between them, and `side` defaults to left, so a right-hand trigger has to say so.",
    "Give every Sheet a label; it is the dialog's entire accessible name.",
    "Put a Sidebar inside with className=\"w-full rounded-none\" — the rail's own w-nav and rounded-lg are meant for a docked rail, and the panel already provides both.",
    "Put the close control inside the content's own header band, where the design draws it.",
    "Use side=\"right\" for a panel that belongs to a trailing action, and left for primary navigation.",
  ],

  dont: [
    "Do not use a Sheet on desktop for something a Popover or Modal would do — it covers 80% of the screen for a reason.",
    "Do not add a Sheet-level header. The design's drawer draws its back and close buttons inside the navigation's own header band, and a second one competes with it.",
    "Do not nest a Sheet in a Sheet. A drawer that opens a drawer is a step in a flow, not a layer.",
    "Do not import Base UI types into your own props — `check:boundaries` fails the build (ADR 0002).",
  ],

  a11y: {
    role: "dialog, modal (from Base UI). The page behind is inert and does not scroll while open.",
    name: "The `label` prop, as aria-label. There is no title element to point aria-labelledby at, by design.",
    keyboard: [
      { key: "Enter / Space", does: "Opens from the trigger — native, since the trigger is a real button." },
      { key: "Escape", does: "Closes when isDismissable, and RESTORES FOCUS to the trigger. Asserted in Chromium." },
      { key: "Tab", does: "Cycles within the panel only; focus cannot reach the page behind." },
    ],
    focus: "Focus moves into the panel on open and returns to the trigger on close. Both asserted in a real browser — focus falling to <body> is the classic hand-rolled-drawer failure.",
    motion: "The panel translates in from its edge. `translate` is named explicitly in the transition: Tailwind v4's translate-* writes the standalone property, so a list naming `transform` animates nothing — the defect that had Modal and Popover snapping open. Durations come from --ui-duration-*, which collapse to 1ms under prefers-reduced-motion.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "content on the panel" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The width cap is derived from the rail's width; the sheet draws one 320px viewport.",
  ],

  knownGaps: [
    "No top or bottom side. The design draws left and right only; a bottom sheet is a different pattern with a drag handle and detents, not a fourth value of this prop.",
    "No swipe-to-dismiss. It needs a gesture layer the system does not have, and it must never be the only way to close.",
    "The width cap is DERIVED: the design draws one 320px viewport, where 80% is 256px. The cap at --ui-nav-width (272px) is the rail's own width, chosen because a Sidebar is what the panel holds — confirm with design for a Sheet holding anything else. Override with className.",
    "The design gives the panel a 1px --ui-neutral-90 border and no shadow. That is a raw palette step with no matching role, and the nearest one is a different value; the panel uses shadow-sm like Modal instead, and the border was dropped rather than transcribed.",
    "No visual-regression baseline. The matrix renders components inline and a Sheet portals to document.body, so it is excluded for the same reason Modal and Popover are — its states are covered by the browser contract suite instead.",
    "Brand re-skinning needs `container` — it is not automatic. Without it the panel portals to document.body and leaves the themed subtree; both halves are asserted in the browser suite, and the BrandThemed story passes it. Multiselect's panel still has no equivalent.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/HE2-0",
} as const;

export type SheetDoc = typeof sheetDoc;
