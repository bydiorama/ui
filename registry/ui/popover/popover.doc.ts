/** Typed documentation for Popover (CONVENTIONS §11). */

export const popoverDoc = {
  name: "Popover",
  status: "stable",
  summary:
    "A panel anchored to a trigger, for secondary content that should not take over the page. First component built on the Base UI behaviour layer (ADR 0012): positioning, focus restoration, dismissal and ARIA wiring come from there; the API, anatomy and every pixel are ours.",

  anatomy: [
    { part: "trigger", slot: "popover-trigger", notes: "The control that opens it. Pass your own element via `render` — it is never wrapped." },
    { part: "panel", slot: "popover-panel", notes: "The portalled surface. radius-xl, bg-elevated, a border-subtle hairline and shadow-md. 24 = a boxed child's radius-md (8) + this panel's p-lg (16), concentric exactly." },
    { part: "title", slot: "popover-title", notes: "Names the panel for assistive tech via aria-labelledby, automatically." },
    { part: "description", slot: "popover-description", notes: "body-md at the relaxed leading in secondary ink at `medium` weight, per the actions sheet. The sheet drew 600 there, but its only description sits in a destructive confirmation and that emphasis does not generalise. Carries the unboxed inset plus py-xs." },
    { part: "close", slot: "popover-close", notes: "Optional dismiss control. Takes an element via `render`." },
  ],

  composition: `
Popover                      isOpen? / defaultIsOpen? / onOpenChange? / isModal?
├─ Popover.Trigger           render={<Button>…</Button>}
└─ Popover.Panel             side? align? sideOffset? alignOffset?
   ├─ Popover.Title          inset — bare text
   ├─ Popover.Description    inset — bare text
   ├─ Banner                 flush — the sheet's info well IS the Banner component
   ├─ <any boxed child>      flush — an Input, a card
   └─ Popover.Close          render={<Button>…</Button>}
  `.trim(),

  props: {
    container: {
      type: "HTMLElement | null",
      default: "document.body",
      notes: "Where the panel is portalled. Theme tokens are INHERITED custom properties, so a panel in the body leaves any brand scope on a wrapper and paints theme zero. Pass the themed element to bring it back; see sheet.doc.ts for why it is a prop rather than automatic.",
    },
    isOpen: { type: "boolean", notes: "Controlled. Omit and the popover owns it." },
    defaultIsOpen: { type: "boolean", notes: "Uncontrolled starting state." },
    onOpenChange: {
      type: "(isOpen: boolean) => void",
      notes: "One callback for both directions (§1) — never onOpen + onClose. Narrowed from Base UI's (open, eventDetails) so no third-party type reaches the signature.",
    },
    isModal: { type: "boolean", notes: "Traps focus and blocks the page behind. A hint is not modal; a short form usually is." },
    side: { type: '"top" | "right" | "bottom" | "left"', default: '"bottom"', notes: "Preferred side. Flips automatically on collision." },
    align: { type: '"start" | "center" | "end"', default: '"center"' },
    sideOffset: { type: "number", default: "8", notes: "Distance from the trigger, matching --ui-space-sm." },
    render: { type: "ReactElement", notes: "On Trigger and Close. The element is passed through, not wrapped (§3), so it keeps its tag, classes, ref and accessible name and gains only the ARIA wiring." },
  },

  do: [
    "Pass your own control into Trigger's `render` — a Button, usually — so the trigger keeps its own accessible name.",
    "Give every panel a Popover.Title; it becomes the panel's accessible name with no aria-label to keep in sync.",
    "Let boxed children (info wells, inputs) sit flush; use Title/Description for bare text so the inset is applied for you.",
    "Use isModal for a panel containing a form, so focus cannot escape behind it.",
  ],

  dont: [
    "Do not import Base UI types into your own props — `check:boundaries` fails the build, and it is what keeps the layer swappable (ADR 0002).",
    "Do not use a Popover for a message that must be acknowledged — that is a Modal.",
    "Do not add padding to bare text yourself; Title and Description already carry the inset, and doubling it breaks the alignment with boxed children.",
    "Do not reach for a Popover as a tooltip. A tooltip is hover-triggered and non-interactive; this is a focusable dialog.",
  ],

  a11y: {
    role: "dialog (from Base UI). The trigger carries aria-haspopup=\"dialog\" and aria-expanded, verified in Chromium.",
    name: "Popover.Title, wired through aria-labelledby automatically. A panel with no Title needs an explicit aria-label.",
    keyboard: [
      { key: "Enter / Space", does: "Opens from the trigger — native, since the trigger is a real button." },
      { key: "Escape", does: "Closes and RESTORES FOCUS to the trigger. Asserted in a real browser: focus falling to <body> is the classic hand-rolled-popover failure." },
      { key: "Tab", does: "Moves through the panel's own focusable content; with isModal it is trapped." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-elevated", floor: "text", role: "the title on the panel" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-elevated", floor: "text", role: "the description" },
      { fg: "--ui-bg-elevated", bg: "--ui-bg-base", floor: "decorative", role: "the panel against the page", why: "the boundary is the hairline plus shadow-md, not the fill (ADR 0010)" },
    ],
    dismissal: "Outside click, Escape and focus-out all dismiss, without swallowing events the page needs.",
  },

  knownGaps: [
    "Not drawn in the sheet, so DERIVED and marked as such: placement (bottom), 8px offset, collision padding, and the enter/exit transition. Confirm with design.",
    "No arrow. Base UI provides Popover.Arrow; the sheet draws none, so none is exposed yet.",
    "No dark-scheme values for the panel are drawn — the resolver derives them, unverified against a design.",
    "The actions row is composed at the call site rather than being a Popover.Actions part — the sheet sits it flush at the panel padding while title and description take the inset, so it is deliberately not wrapped.",
    "Base UI is at 1.0.0-rc.0, a pre-stable release (ADR 0012 records this deliberately). Expect API movement before 1.0 final.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/CXA-0",
} as const;

export type PopoverDoc = typeof popoverDoc;
