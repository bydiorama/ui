/** Typed documentation for Modal (CONVENTIONS §11). */

export const modalDoc = {
  name: "Modal",
  status: "stable",
  summary:
    "A dialog that takes over the page: scrim behind, focus trapped inside, focus restored to the trigger on close. Second component on the Base UI behaviour layer, deliberately the same shape as Popover. Its surface is deliberately Card's — same 24px corner, border-subtle hairline, shadow-md and title-sm header — so a dialog raised over cards reads as the same object as them (#23, the owner's redraw of the portal's 'Remove member' confirm). Only the ground (bg-surface: the scrim already separates it from the page) and the gap (gap-2xl) differ.",

  anatomy: [
    { part: "trigger", slot: "modal-trigger", notes: "The control that opens it. Pass your own element via `render` — never wrapped." },
    { part: "scrim", slot: "modal-scrim", notes: "The backdrop. Uses --ui-scrim, a scheme-only role: a warm 16% veil in light, a heavier black in dark." },
    { part: "surface", slot: "modal-surface", notes: "The dialog. Card's surface class for class — radius-xl, a 1px border-subtle hairline and shadow-md — on bg-surface, with p-lg and gap-2xl. Centred, width-capped by size, and scrolls internally." },
    { part: "title", slot: "modal-title", notes: "Card.Header's title: title-sm at the role's own 600, inset by Card's unboxed px-sm. Becomes the dialog's accessible name automatically." },
    { part: "description", slot: "modal-description", notes: "body-md in secondary ink, inset px-sm with the title so the two share a left edge (CONVENTIONS §6). Wired to aria-describedby automatically." },
    { part: "footer", slot: "modal-footer", notes: "The action row, `justify-between` per the sheet." },
    { part: "close", slot: "modal-close", notes: "Any control that dismisses. Takes an element via `render`." },
  ],

  composition: `
Modal                     isOpen? / defaultIsOpen? / onOpenChange? / isDismissable?
├─ Modal.Trigger          render={<Button>…</Button>}
└─ Modal.Surface          size? / initialFocus? / finalFocus?
   ├─ Modal.Title
   ├─ Modal.Description?
   ├─ <your content>      Inputs, a form, anything
   └─ Modal.Footer
      ├─ Modal.Close      render={<Button variant="secondary">Cancel</Button>}
      └─ <primary action>
  `.trim(),

  props: {
    "Surface.initialFocus": { type: "RefObject<HTMLElement | null> | (() => HTMLElement | null)", notes: "Where focus lands when the dialog opens. The default is the first tabbable element inside it; a confirmation whose first control is destructive should pass Cancel's ref instead. A function is called at open time; returning null, or a ref that is still empty, keeps the default rather than dropping focus. Restated as ModalFocusTarget, the same shape as Sheet's SheetFocusTarget, and deliberately not Base UI's, whose `false` would leave focus behind the scrim." },
    "Surface.finalFocus": { type: "RefObject<HTMLElement | null> | (() => HTMLElement | null)", notes: "Where focus goes when the dialog closes. The default is the trigger, or whatever was focused before it opened. Set it when that element will be gone, for example the row a delete confirmation removes, so focus lands somewhere real rather than on <body>. Same fallback rule as initialFocus." },
    isOpen: { type: "boolean", notes: "Controlled. Omit and the modal owns it." },
    defaultIsOpen: { type: "boolean", notes: "Uncontrolled starting state." },
    onOpenChange: { type: "(isOpen: boolean) => void", notes: "One callback for both directions (§1). Narrowed from Base UI's signature so no third-party type reaches ours." },
    isDismissable: {
      type: "boolean",
      default: "true",
      notes: "Escape and scrim-click dismiss. On by default — trapping someone in a dialog is a last resort. Turn it off only when losing their work would be worse than the friction.",
    },
    size: { type: '"md" | "lg"', default: '"md"', notes: "A width cap, not a height: the dialog grows with its content and scrolls internally past the viewport. 416px (the drawn width) and 640px. These were max-w-md/max-w-xl, which resolve against this system's SPACING scale rather than Tailwind's container scale — 12px and 24px caps that min-w-80 overrode, so both sizes rendered identically until it was measured." },
    container: {
      type: "HTMLElement | null",
      default: "document.body",
      notes: "Where the dialog is portalled. Theme tokens are INHERITED custom properties, so a surface in the body leaves any brand scope on a wrapper and paints theme zero. Pass the themed element to bring it back; see sheet.doc.ts for why it is a prop rather than automatic.",
    },
    render: { type: "ReactElement", notes: "On Trigger and Close. Passed through, not wrapped (§3), so the element keeps its tag, ref and accessible name and gains only the ARIA wiring." },
  },

  do: [
    "Give every modal a Modal.Title — it is the accessible name, with no aria-label to keep in sync.",
    "Put the dismissing action in Modal.Close and the committing one beside it; the footer separates them deliberately.",
    "Use isDismissable={false} only for genuinely destructive or unsaved-work cases, and always leave an explicit Cancel.",
    "Let long content scroll inside the surface — it is capped to the viewport already.",
  ],

  dont: [
    "Do not use a Modal for a message that does not need acknowledgement; that is a Banner, or a Popover.",
    "Do not nest modals. If a modal needs a second decision, it needs a second step.",
    "Do not import Base UI types into your own props — `check:boundaries` fails the build (ADR 0002).",
    "Do not pass isModal; a Modal is always modal, and a non-modal dialog with a scrim is a Popover wearing a costume.",
    "Do not restyle the surface or title away from Card's at the call site. The browser test compares Modal's computed radius, border, shadow and title to a rendered Card's, so the two move together; a local override (the portal shipped one on modal-surface and modal-title before #23) is a fork of both. ADR 0016's table listed Modal under shadow-sm; it now takes md with Card, recorded as an amendment there.",
  ],

  a11y: {
    role: "dialog, modal (from Base UI). The page behind is inert while open.",
    name: "Modal.Title via aria-labelledby, automatically. Modal.Description wires aria-describedby the same way.",
    keyboard: [
      { key: "Enter / Space", does: "Opens from the trigger — native, since the trigger is a real button." },
      { key: "Escape", does: "Closes when isDismissable, and RESTORES FOCUS to the trigger. Asserted in Chromium." },
      { key: "Tab", does: "Cycles within the dialog only; focus cannot reach the page behind." },
    ],
    focus: "Focus moves into the surface on open and returns to the trigger on close. Both asserted in a real browser — focus falling to <body> is the classic hand-rolled-dialog failure. `initialFocus` and `finalFocus` on the Surface move either end deliberately; both are asserted too, against the default they replace.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "the title on the surface" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-surface", floor: "text", role: "the description" },
      { fg: "--ui-border-subtle", bg: "--ui-bg-surface", floor: "decorative", role: "the surface hairline", why: "the dialog's boundary is the scrim plus shadow-md; the hairline says where the surface ends, as on Card (ADR 0010 point 2, ADR 0016 point 6)" },
    ],
  },

  knownGaps: [
    "No close (×) button in the corner — the sheet draws none, and dismissal is the footer's Cancel plus Escape/scrim. Add one when design draws it.",
    "The sheet draws its body as two inline fields; those are Input components at the call site, not part of Modal.",
    "Sizes: the sheet draws one width. md is that width; lg is DERIVED for content-heavy dialogs — confirm with design.",
    "No dark-scheme drawing of the surface or scrim; the resolver derives both.",
    "ALIGNMENT GAP, shared with Card: Title and Description take the unboxed px-sm, but an Input's own label does not, so a field placed directly in the dialog has its label 8px left of the title. Card records the same gap; whichever fix lands there (an inset-aware Input or a field wrapper) applies here too.",
    "The redraw annotates the title inset as py-xs px-sm. Card.Header carries px-sm only, and this matches Card literally, so the title has no vertical inset of its own. If the drawing's py-xs is wanted, it belongs on Card.Header too, or the two headers stop matching.",
  ],

  motion:
    "The scrim fades and the panel fades and scales from 98%, both at --ui-duration-fast with --ui-ease-out, driven by `data-[starting-style]` and `data-[ending-style]`. `scale` is named explicitly in the transition list: Tailwind v4 writes `scale-*` as the standalone `scale` property, so the original list naming `transform` animated nothing and the modal snapped open at full size. Measured with getAnimations() in Chromium, which is how that became a fact rather than a theory.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/GA9-0",
} as const;

export type ModalDoc = typeof modalDoc;
