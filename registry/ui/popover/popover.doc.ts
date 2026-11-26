/** Typed documentation for Popover (CONVENTIONS §11). */

export const popoverDoc = {
  lead: "Keeps supporting content close to the control that opens it.",
  name: "Popover",
  status: "stable",
  summary:
    "A panel anchored to a trigger, for secondary content that should not take over the page. First component built on the Base UI behaviour layer (ADR 0012): positioning, focus restoration, dismissal and ARIA wiring come from there; the API, anatomy and every pixel are ours.",

  anatomy: [
    { part: "trigger", slot: "popover-trigger", notes: "The control that opens it. Pass your own element via `render` — it is never wrapped." },
    { part: "panel", slot: "popover-panel", notes: "The portalled surface. radius-lg, bg-elevated, a border-subtle hairline and shadow-md — Card's surface (issue #40). Not concentric with a radius-md boxed child at p-lg; accepted by the 2026-10-29 owner review." },
    { part: "title", slot: "popover-title", notes: "Names the panel for assistive tech via aria-labelledby, automatically." },
    { part: "description", slot: "popover-description", notes: "body-md at the relaxed leading in secondary ink at `medium` weight, per the actions sheet. The sheet drew 600 there, but its only description sits in a destructive confirmation and that emphasis does not generalise. Carries the unboxed inset plus py-xs." },
    { part: "close", slot: "popover-close", notes: "Optional dismiss control. Takes an element via `render`." },
    { part: "list panel", slot: "popover-panel[data-variant=list]", notes: "variant=\"list\" (#55): Menu's surface, not Card's. 280px wide (w-70, capped by --available-width), radius-md over radius-sm rows at a 4px inset (concentric exactly), bg-surface, a border-subtle hairline, shadow-md, and no padding of its own, so the hairlines between Search, List and Footer run edge to edge." },
    { part: "search", slot: "popover-search", notes: "A bare input on a 36px row, px-md, under a bottom hairline; no field box, because the panel is the box. The glyph sits on the rows' 12px lane, and the typed text lines up with a footer row's label. It takes the panel's initial focus. The bottom hairline takes the focus colour, so the bare input may carry outline-none (§6)." },
    { part: "list", slot: "popover-list", notes: "p-xs around rows that stack flush. It scrolls, not the panel, so the search and the footer stay put. maxRows caps it: 4 rows is 4 × 32 + 8." },
    { part: "row", slot: "popover-row", notes: "Menu's item recipe, DENSE: px-sm py-xs on a 32px floor, body-md. The label lands on a 12px lane (the list's 4 plus the row's 8). A real <button> by default, or the element passed to `render`. isHighlighted paints Menu's highlight for the caller's keyboard model." },
    { part: "footer", slot: "popover-footer", notes: "p-xs under a top hairline. Holds rows (\"Create tag\") or a button pair." },
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

Popover.Panel variant="list"  (#55)
├─ Popover.Search            label (required, visually hidden)
├─ Popover.List              maxRows?
│  └─ Popover.Row            icon? trailing? isHighlighted? isDisabled? render?
└─ Popover.Footer
   └─ Popover.Row            e.g. "Create tag"
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
    variant: { type: '"content" | "list"', default: '"content"', notes: "On Panel. content is a small window at p-lg on Card's surface. list is a picker on Menu's surface: Search, List and Footer, with dense 32px rows (#55). Both are dialogs. In a list panel the rows' keyboard model, the filtering and the selection are the caller's (or Combobox's, #17)." },
    "List.maxRows": { type: "number", notes: "Caps the list at this many 32px rows plus its 8px of inset, then it scrolls. Omit it and the list grows until the panel reaches the space Base UI measured." },
    "Row.isHighlighted": { type: "boolean", notes: "The row the caller's keyboard model points at. Paints Menu's highlight (bg-hover). Pointer hover and keyboard focus paint it too." },
    "Search.label": { type: "string", required: true, notes: "The input's accessible name, visually hidden. A placeholder is not a label (§10)." },
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
    "Use variant=\"list\" for a picker of short names, such as tags, assignees or a project, and give the panel an aria-label, since a list panel has no Title.",
  ],

  dont: [
    "Do not import Base UI types into your own props — `check:boundaries` fails the build, and it is what keeps the layer swappable (ADR 0002).",
    "Do not use a Popover for a message that must be acknowledged — that is a Modal.",
    "Do not add padding to bare text yourself; Title and Description already carry the inset, and doubling it breaks the alignment with boxed children.",
    "Do not give list rows Menu's 46px padding back with a className; the density is the list panel's, and the 12px lane the search glyph sits on depends on it.",
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
    "The panel is capped to --available-height / --available-width (§7c) so a tall popover cannot run off a short window. Neither the cap nor the resulting internal scroll is drawn — the sheet draws one panel short enough that neither applies.",
    "No arrow. Base UI provides Popover.Arrow; the sheet draws none, so none is exposed yet.",
    "No dark-scheme values for the panel are drawn — the resolver derives them, unverified against a design.",
    "A list panel owns no listbox: arrow keys, the highlighted row and selection are the caller's. If three consumers rebuild the same keyboard model, that is a component, not this variant (#55).",
    "The list panel's dark scheme is not drawn; it uses Menu's roles, which are audited.",
    "The actions row is composed at the call site rather than being a Popover.Actions part — the sheet sits it flush at the panel padding while title and description take the inset, so it is deliberately not wrapped.",
  ],

  motion:
    "The panel fades and scales from 98% at --ui-duration-fast with --ui-ease-out, through `data-[starting-style]`/`data-[ending-style]`. `scale` is named in the transition list for the same reason as Modal's — Tailwind v4 writes it standalone, and a list naming `transform` left this panel snapping open. Motion levels (ADR 0028): the scale starts at --ui-enter-scale, which is 1 at `reduced` and `off`, so below `full` the panel only fades — and at `off` the fade is 1ms.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/CXA-0",
} as const;

export type PopoverDoc = typeof popoverDoc;
