/** Typed documentation for Sheet (CONVENTIONS §11). */

export const sheetDoc = {
  name: "Sheet",
  status: "stable",
  summary:
    "A panel that slides in from the LEFT or RIGHT edge of the screen — the mobile counterpart to a Sidebar, which is what it usually holds. Third component on the Base UI behaviour layer, and deliberately Modal's shape: the focus trap, scroll lock, Escape and focus restoration are the same problem, and only the panel's position differs. Sheet and Drawer are DIFFERENT components here, following shadcn/ui: a Sheet is edge-anchored and dismissed by scrim or Escape; a Drawer comes up from the bottom with a drag handle and is dismissed by dragging. Reaching for one when you want the other is the most common mix-up in this pair.",

  anatomy: [
    { part: "trigger", slot: "sheet-trigger", notes: "The control that opens it — a hamburger, usually. Pass your own element via `render`; never wrapped." },
    { part: "scrim", slot: "sheet-scrim", notes: "The backdrop. --ui-scrim, a scheme-only role: a warm 16% veil in light, a heavier black in dark. The design drew this as a raw #98918A29, which is the same value. It is the ONLY thing separating the panel from the page — 1.16:1 in light, 1.61:1 in dark." },
    { part: "panel", slot: "sheet-panel", notes: "The drawer. Full height, 80% of the viewport floored at 256 and capped by `size`, bg-base with --ui-shadow-md — the value the sheet draws, approved 2026-08-25 over Modal's shadow-sm. No padding of its own — every inset belongs to a region inside. Carries data-side, data-size and data-overflow-top/bottom, and is the `group/sheet` the hairlines key off." },
    { part: "header", slot: "sheet-header", notes: "The 48px chrome band. p-sm uniform, justify-between — the same 48px as Header's bar, so the band and the bar it covers sit at one height, and 8 plus a 32px chrome control's own 8 puts the glyph on the body's 16px lane. Pinned. Optional, and absent from the navigation composition where Sidebar.Group is already that band." },
    { part: "title", slot: "sheet-title", notes: "body-lg / bold / one line, clipped — Drawer.Title's values exactly, from the same drawing. It sits at the TOP OF THE BODY, not in the band: at the band's 8px inset a text node would miss the body's 16px lane by exactly 8. Renders Base UI's Dialog.Title, so it wins the accessible name." },
    { part: "body", slot: "sheet-body", notes: "The content region, inset space-lg, and the only part that scrolls — it takes the slack the header and footer leave. A named tab stop with a visible ring WHILE it scrolls and not otherwise (SC 2.1.1); carries data-scrollable." },
    { part: "footer", slot: "sheet-footer", notes: "The action region, inset space-lg. Buttons STACK full width — Drawer's footer, not Modal's justify-between row, because a panel this narrow has no room for two side by side. 104px with two md buttons: 16 + 32 + 8 + 32 + 16. Pinned." },
    { part: "close", slot: "sheet-close", notes: "Any control that dismisses. Takes an element via `render`. Never rendered for you." },
  ],

  composition: `
Sheet                     isOpen? / defaultIsOpen? / onOpenChange? / isDismissable?
├─ Sheet.Trigger          render={<Button isIconOnly aria-label="Open menu" icon={<Menu />} />}
└─ Sheet.Panel            label (required) / side? / size? / container?
   ├─ Sheet.Header        the 48px chrome band — chromeControls, never a Title
   │  └─ Sheet.Close      render={<Button isIconOnly aria-label="Close" icon={<Close />} />}
   ├─ Sheet.Body          the only region that scrolls
   │  └─ Sheet.Title      first child of the Body, not of the band
   └─ Sheet.Footer        actions, stacked full width

Or, for the navigation composition, no regions at all:

Sheet
├─ Sheet.Trigger
└─ Sheet.Panel            label (required) — size defaults to sm, the rail's width
   └─ Sidebar             className="h-full w-full rounded-none"
      └─ Sheet.Close      inside Sidebar.Group, which IS the 48px band
  `.trim(),

  props: {
    label: {
      type: "string",
      required: true,
      notes: "On Panel. Required — a dialog with no accessible name is announced as 'dialog' and nothing else. There is no Sheet.Title part IN CODE yet; the design draws one (see knownGaps), and until it lands a visible heading is ordinary content the caller supplies. When Title arrives, `label` stays required as it is on Drawer, and the two must say the same thing: aria-labelledby beats aria-label when both are present.",
    },
    size: {
      type: '"sm" | "md" | "lg"',
      default: '"sm"',
      notes: "On Panel. The width CAP, not a width: the panel is 80% of the viewport, floored at 256 and capped here. sm is --ui-nav-width (272), md is --ui-dialog-width-md (416) and lg is --ui-dialog-width-lg (640) — three width tokens that already existed, so a Sheet and a Modal holding the same form are the same width. It defaults to sm because that IS the geometry Sheet shipped before the axis existed; reach for md whenever the panel is not holding the navigation rail.",
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
    "Put the close control inside the header band — Sidebar.Group in the navigation composition, Sheet.Header everywhere else. There is no automatic close button, so it is never rendered for you.",
    "Put Sheet.Title at the top of Sheet.Body, never inside Sheet.Header. The band is inset 8 so a 32px chrome control's glyph lands on the body's 16px lane; a text node at that same 8 misses the lane by exactly 8.",
    "Use size=\"md\" for anything that is not the navigation rail. The default is sm because that is what the component already shipped, not because it is the common case.",
    "Use side=\"right\" for a panel that belongs to a trailing action, and left for primary navigation.",
  ],

  dont: [
    "Do not use a Sheet on desktop for something a Popover or Modal would do — it covers 80% of the screen for a reason.",
    "Do not add a second header band on top of the navigation's own. Inside the rail composition Sidebar.Group already IS the 48px band at the same p-sm inset, so a Sheet.Header there would compete with it.",
    "Do not put a Button in Sheet.Header where the design draws chrome. A 32px fill with no edge is page chrome, not one of the five button types (§7b) — `chromeControl` is the recipe.",
    "Do not nest a Sheet in a Sheet. A drawer that opens a drawer is a step in a flow, not a layer.",
    "Do not import Base UI types into your own props — `check:boundaries` fails the build (ADR 0002).",
  ],

  a11y: {
    role: "dialog, modal (from Base UI). The page behind is inert and does not scroll while open.",
    name: "The `label` prop as aria-label, and `Sheet.Title` as aria-labelledby when there is one. BOTH are set and aria-labelledby wins, so two that disagree announce the Title and leave `label` silently unused — asserted in the browser suite, in both directions.",
    keyboard: [
      { key: "Enter / Space", does: "Opens from the trigger — native, since the trigger is a real button." },
      { key: "Escape", does: "Closes when isDismissable, and RESTORES FOCUS to the trigger. Asserted in Chromium." },
      { key: "Tab", does: "Cycles within the panel only; focus cannot reach the page behind." },
      { key: "Tab to Sheet.Body", does: "Reaches the scroll region — but ONLY while it actually scrolls, so a panel whose content fits has no silent tab stop in it. Arrow keys and Page Up/Down then scroll it (SC 2.1.1)." },
    ],
    focus: "Focus moves into the panel on open and returns to the trigger on close. Both asserted in a real browser — focus falling to <body> is the classic hand-rolled-drawer failure.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-base", floor: "text", role: "content on the panel" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "NOT SHEET'S — it belongs to --ui-bg-active and `registry/lib/chrome-control`, which has no doc of its own, so this is the only place it gets reported. In DARK the band control's interaction ramp crosses the surface it sits on: rest #373430 and hover #3c3936 are darker than the panel, pressed #494643 is lighter than it, so a resting control reads recessed and a pressed one reads raised. Monotonic in value, inverted in apparent direction. Light never does this because bg-base is the extreme of the scale there rather than a value inside it; Header measured REST against the bar in both schemes and stopped there.",
    "NOT SHEET'S — same owner as above. --ui-bg-hover and --ui-bg-sunken are the SAME value in light, so a hovered band control and a disabled one paint an identical fill and only the ink separates them, at 15.53:1 and 1.76:1. Tolerable here, since a disabled control cannot enter hover and the two are never adjacent. The number worth acting on is the wider one: SIX --ui-bg-* roles resolve to #EDE8E3 in light — sunken, muted, hover, selected, field-disabled and field-chrome — so any two of them meeting on one surface are indistinguishable, and the hover/selected collision already recorded in the design-component skill is one case of six rather than a pair. Dark separates all six.",
  ],

  knownGaps: [
    "BUILT 2026-08-25 from `Component --- Sheet`: Header, Title, Body, Footer and the sm/md/lg width axis. Two things the drawing had to give up on contact with the browser, both recorded here rather than left to be re-derived. (1) The pinned hairlines are an INSET BOX-SHADOW, not the border the sheet named. `h-12` is a border-box height, so a border-b takes its pixel out of the 32px content lane and `items-center` pays it back as 7.5 above and 8.5 below — the Tabs defect exactly. A box-shadow costs no layout, so the band keeps a true uniform 8px inset, which the geometry spec now proves. Header's principle is kept: always declared, only the colour changes. (2) Sheet.Body needed a keyboard path nothing had drawn — see the next entry.",
    "Sheet.Body is a named tab stop with a visible ring ONLY while it actually scrolls (SC 2.1.1), which is Table's rule in the other axis. Nothing drew it: a body holding static text has no focusable child to scroll it into view, and making it unconditionally focusable puts a silent tab stop in front of every panel whose content fits. The name is the panel's own `label`, which is why that prop lives on the Panel rather than being duplicated.",
    "No top or bottom side, where shadcn's Sheet has all four. §7a splits the pair on the GESTURE: a Drawer carries a handle, follows the finger and closes past a velocity threshold, so a bottom Sheet would be a Drawer that cannot be dragged. This is the one thing a consumer arriving from shadcn will reach for and not find.",
    "No swipe-to-dismiss. It needs a gesture layer the system does not have, and it must never be the only way to close (SC 2.5.7).",
    "No automatic close button, so no showCloseButton prop to turn one off. In the navigation composition the close belongs to Sidebar's own group and a second would compete with it; elsewhere the caller places it in the band. A control the component renders and the caller has to suppress is a control in the wrong place twice.",
    "No Description part, where Modal and shadcn both have one. No drawing shows a paragraph under a sheet's title and Drawer has none either, so Sheet follows its nearer sibling. Add it when a design needs it rather than for symmetry.",
    "DECIDED 2026-08-25: the panel takes --ui-shadow-md, the value the sheet draws and the one Drawer ships from the same drawing, rather than Modal's shadow-sm. It is doing real work rather than decorating — the panel and the page are BOTH --ui-bg-base, so in light the scrim leaves only a 1.16:1 step between them and a single 0.5px blur does not close it. Dark reaches 1.61:1 on its own, because that scrim is black at 55%. No conformance floor applies to a surface boundary, so the number is one to know rather than a failure; if a wider gap is ever wanted it belongs to --ui-scrim, not here.",
    "SHEET AND DRAWER ARE TOLD APART BY GEOMETRY, not only by the gesture. A Sheet is edge-FLUSH: two rounded corners, no border, because an edge on the inner side alone is a rule rather than a boundary. A Drawer FLOATS — inset 4px on its free sides, all four corners at --ui-radius-lg, and a 1px border — which is what makes its own artboard's three panels one component at three sizes, the desktop one included. §7a splits them on the gesture and that still holds; this is the test that settles a STATIC drawing, where no gesture is visible to read.",
    "CORRECTED: the '1px --ui-neutral-90 border' this entry used to claim was a misreading. The drawn panel's edge is --ui-nav-border, a real role, and it is there because that drawing floats the panel inside a window frame on all four sides. This panel is flush with three viewport edges, so it carries no border — an edge on the inner side alone is a rule, not a boundary.",
    "The geometry spec covers the PANEL only. Sheet.Header's uniform 8px inset has no spec case because its two children are a caller-supplied chrome control and a Sheet.Close, which share no single data-slot for the geometry harness to union; it is asserted directly in the browser suite instead.",
    "The RECORD PANEL composition is drawn on the sheet and is not a part: a chrome band carrying Close plus record pagination, an identity block and a completeness hero at the top of the Body, then an Accordion of field groups in its CARD variant — plain has no hover, and six pressable section headers on one surface is the case that needs one. The hero is a composition rather than a component on purpose: Banner is the nearest thing and does not fit, being `items-center` with one text slot where this stacks a label row, a bar, a sentence and two controls. It carries NO fill, which the composition forced rather than chose — bg-elevated was the obvious answer and Accordion's card variant already owns that fill on the same surface, so a filled hero and a field group would have read as the same kind of thing. Every value is a role; if a completeness meter recurs it wants a name rather than being rebuilt per call site.",
    "The identity block SCROLLS rather than pinning, because the band is chrome-only. Checked against the field rather than asserted: of six CRM detail panels surveyed, four pin one compact row and put the identity in the scrolling body, and one scrolls everything. A caller who needs it pinned composes a second band today.",
    "No visual-regression baseline. The matrix renders components inline and a Sheet portals to document.body, so it is excluded for the same reason Modal and Popover are, and the browser contract suite covers it instead — which is now the only thing watching three regions and a three-value width axis.",
    "Brand re-skinning needs `container` — it is not automatic. Without it the panel portals to document.body and leaves the themed subtree; both halves are asserted in the browser suite, and the BrandThemed story passes it. Multiselect's panel still has no equivalent.",
  ],

  motion:
    "Two movements. The pinned regions' hairlines fade their COLOUR in and out as Sheet.Body scrolls — a box-shadow rather than a border, so the 48px band cannot jog by the pixel a border-box border would cost it, and always declared so only the colour animates (Header's rule). The panel translates in from its edge and the scrim fades, both at --ui-duration-base with --ui-ease-out. `translate` is named explicitly in the transition: Tailwind v4's translate-* writes the standalone property, so a list naming `transform` animates nothing — the defect that had Modal and Popover snapping open. Durations come from --ui-duration-*, which collapse to 1ms under prefers-reduced-motion.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/2UF0-0",
} as const;

export type SheetDoc = typeof sheetDoc;
