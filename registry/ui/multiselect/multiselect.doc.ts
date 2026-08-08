/** Typed documentation for Multiselect (CONVENTIONS §11). */

export const multiselectDoc = {
  name: "Multiselect",
  status: "stable",
  summary:
    "A filterable list of options where more than one can be chosen, with the selection shown as removable chips. The hardest ARIA pattern in the library — none of it is written here; it comes from the Base UI behaviour layer (ADR 0012).",

  anatomy: [
    { part: "root", slot: "multiselect", notes: "The field wrapper. className lands here (§5)." },
    { part: "label", slot: "multiselect-label", notes: "Names the trigger via aria-labelledby. Takes the unboxed inset." },
    { part: "trigger", slot: "multiselect-trigger", notes: "48px, radius-md — the SAME control surface as Input size lg, asserted as a relationship rather than as numbers." },
    { part: "chips", slot: "multiselect-chips", notes: "The selection, as Badge components with real remove buttons. Hidden when empty." },
    { part: "panel", slot: "multiselect-panel", notes: "The portalled list surface. radius-lg, bg-surface, hairline and shadow-md." },
    { part: "search", slot: "multiselect-search", notes: "Filters the list. Carries its own accessible name (\"Search <label>\")." },
    { part: "option", slot: "multiselect-option", notes: "A row. IS the control — it carries role=option, which is why it holds a checkbox VISUAL rather than a Checkbox component." },
  ],

  composition: `
Multiselect
├─ label            string (required) — the accessible name
├─ items            { value, label, isDisabled? }[]
├─ value? / defaultValue?   string[] — by item value
├─ onValueChange?   (value: string[]) => void
└─ placeholder? / searchPlaceholder? / emptyMessage?
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a control has a name (§10). Use isLabelHidden when the design shows none; a placeholder is not a label." },
    items: { type: "readonly MultiselectItem[]", required: true, notes: "The full option set. Filtering happens inside; do not filter this yourself." },
    value: { type: "readonly string[]", notes: "Controlled selection, by item value — not by object identity, so a re-fetched list does not lose the selection." },
    defaultValue: { type: "readonly string[]", notes: "Uncontrolled starting selection." },
    onValueChange: { type: "(value: string[]) => void", notes: "Fires with the new selection as values. Narrowed from Base UI's item objects so no third-party shape reaches the signature." },
    emptyMessage: { type: "string", default: '"No matches"', notes: "Shown when the search matches nothing — never leave a filtered list silently blank." },
    isDisabled: { type: "boolean", default: "false" },
  },

  do: [
    "Give it a real label; it becomes the trigger's accessible name.",
    "Key the selection by value, so a re-fetched item list keeps it.",
    "Let the search do the filtering — pass the whole item set.",
    "Write item labels that read on their own; the chip's remove button is named from them.",
  ],

  dont: [
    "Do not filter `items` yourself in response to the search; the component and its ARIA already do.",
    "Do not nest a Checkbox component in a row — the row IS the option, and a real input inside role=option is a second control inside the first.",
    "Do not use this for a single choice; that is a Select.",
    "Do not import Base UI types into your own props — check:boundaries fails the build (ADR 0002).",
  ],

  a11y: {
    role: "combobox trigger + listbox with aria-multiselectable, from Base UI. Options carry aria-selected.",
    name: "The `label` prop via aria-labelledby. The search input has its own name; each chip's remove button is named \"Remove <label>\".",
    keyboard: [
      { key: "Enter / Space", does: "Opens the list from the trigger." },
      { key: "Type", does: "Filters. Active-descendant management stays with the behaviour layer." },
      { key: "Arrows / Home / End", does: "Move through options without moving DOM focus off the input." },
      { key: "Enter", does: "Toggles the active option and KEEPS the list open — choosing three things should not cost three round trips." },
      { key: "Escape", does: "Closes and restores focus to the trigger. Asserted in Chromium." },
    ],
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-field", floor: "text", role: "the trigger value" },
      { fg: "--ui-text-on-accent", bg: "--ui-bg-accent", floor: "non-text", role: "the tick on a selected row" },
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "option ink on the panel" },
    ],
  },

  knownGaps: [
    "Nine design defects were corrected rather than transcribed — see the ledger entry. Most consequential: an 11px chip label (below the 12px floor), a 1.51:1 tick, and four palette steps where intent/accent roles exist.",
    "Chips are Badge components rather than Base UI's Chip parts, so the arrow-key navigation BETWEEN chips that Base UI offers is not adopted. Removal is still fully keyboard operable via each chip's button.",
    "The option row reuses Checkbox's visual language but not the component; the two could drift. A shared visual primitive would fix it and does not exist yet.",
    "No grouping, no async loading, no create-on-the-fly. None are drawn.",
    "The panel is radius-md over a 4px inset around radius-sm children — the search field and every row — so §6 closes at 4 + 4 = 8. The sheet draws an 8px inset (J3M-0), which does not close on any radius the scale has; see the same note in select.doc.ts.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/J2X-0",
} as const;

export type MultiselectDoc = typeof multiselectDoc;
