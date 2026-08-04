/** Typed documentation for Modal (CONVENTIONS §11). */

export const modalDoc = {
  name: "Modal",
  status: "stable",
  summary:
    "A dialog that takes over the page: scrim behind, focus trapped inside, focus restored to the trigger on close. Second component on the Base UI behaviour layer, deliberately the same shape as Popover.",

  anatomy: [
    { part: "trigger", slot: "modal-trigger", notes: "The control that opens it. Pass your own element via `render` — never wrapped." },
    { part: "scrim", slot: "modal-scrim", notes: "The backdrop. Uses --ui-scrim, a scheme-only role: a warm 16% veil in light, a heavier black in dark." },
    { part: "surface", slot: "modal-surface", notes: "The dialog. radius-lg, p-lg, gap-2xl, bg-surface with shadow-sm. Centred, width-capped by size, and scrolls internally." },
    { part: "title", slot: "modal-title", notes: "title-lg at medium weight. Becomes the dialog's accessible name automatically." },
    { part: "description", slot: "modal-description", notes: "body-md at the relaxed leading in secondary ink. Wired to aria-describedby automatically." },
    { part: "footer", slot: "modal-footer", notes: "The action row, `justify-between` per the sheet." },
    { part: "close", slot: "modal-close", notes: "Any control that dismisses. Takes an element via `render`." },
  ],

  composition: `
Modal                     isOpen? / defaultIsOpen? / onOpenChange? / isDismissable?
├─ Modal.Trigger          render={<Button>…</Button>}
└─ Modal.Surface          size?
   ├─ Modal.Title
   ├─ Modal.Description?
   ├─ <your content>      Inputs, a form, anything
   └─ Modal.Footer
      ├─ Modal.Close      render={<Button variant="secondary">Cancel</Button>}
      └─ <primary action>
  `.trim(),

  props: {
    isOpen: { type: "boolean", notes: "Controlled. Omit and the modal owns it." },
    defaultIsOpen: { type: "boolean", notes: "Uncontrolled starting state." },
    onOpenChange: { type: "(isOpen: boolean) => void", notes: "One callback for both directions (§1). Narrowed from Base UI's signature so no third-party type reaches ours." },
    isDismissable: {
      type: "boolean",
      default: "true",
      notes: "Escape and scrim-click dismiss. On by default — trapping someone in a dialog is a last resort. Turn it off only when losing their work would be worse than the friction.",
    },
    size: { type: '"md" | "lg"', default: '"md"', notes: "A width cap, not a height: the dialog grows with its content and scrolls internally past the viewport." },
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
  ],

  a11y: {
    role: "dialog, modal (from Base UI). The page behind is inert while open.",
    name: "Modal.Title via aria-labelledby, automatically. Modal.Description wires aria-describedby the same way.",
    keyboard: [
      { key: "Enter / Space", does: "Opens from the trigger — native, since the trigger is a real button." },
      { key: "Escape", does: "Closes when isDismissable, and RESTORES FOCUS to the trigger. Asserted in Chromium." },
      { key: "Tab", does: "Cycles within the dialog only; focus cannot reach the page behind." },
    ],
    focus: "Focus moves into the surface on open and returns to the trigger on close. Both asserted in a real browser — focus falling to <body> is the classic hand-rolled-dialog failure.",
    contrast: "Surface is bg-surface on the scrim rather than on the page, so its own boundary is carried by shadow-sm plus the scrim's separation. Title 17.2:1 and description 15.1:1 on the surface in light; 9.6:1 and 8.1:1 in dark.",
  },

  knownGaps: [
    "No close (×) button in the corner — the sheet draws none, and dismissal is the footer's Cancel plus Escape/scrim. Add one when design draws it.",
    "The sheet draws its body as two inline fields; those are Input components at the call site, not part of Modal.",
    "Sizes: the sheet draws one width. md is that width; lg is DERIVED for content-heavy dialogs — confirm with design.",
    "No dark-scheme drawing of the surface or scrim; the resolver derives both.",
    "Base UI is at 1.0.0-rc.0, pre-stable (ADR 0012 records this deliberately).",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/GA9-0",
} as const;

export type ModalDoc = typeof modalDoc;
