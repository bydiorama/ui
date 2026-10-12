/** Typed documentation for Select (CONVENTIONS §11). */

export const selectDoc = {
  name: "Select",
  status: "stable",
  summary:
    "Choose ONE value from a list. The trigger is Input's control surface, exactly as Multiselect's is — a field is a field, and three components inventing three variants of the same box is how a system stops looking like one. Listbox ARIA, typeahead, roving focus and dismissal come from the Base UI behaviour layer (ADR 0012), wrapped so no third-party type reaches a public prop signature.",

  anatomy: [
    { part: "root", slot: "select", notes: "The field column: label, trigger, then error and helper text." },
    { part: "label", slot: "select-label", notes: "Names the trigger via aria-labelledby. sr-only when isLabelHidden, never removed." },
    { part: "trigger", slot: "select-trigger", notes: "Input's control surface at all three sizes, value type included — asserted as a relationship, not as numbers. The size map is the ONLY thing on the trigger that names a type role; a hard-coded text-body-md after it used to win the merge and render md and sm at 14px (#16)." },
    { part: "value", slot: "select-value", notes: "The chosen label, or the placeholder in placeholder ink." },
    { part: "icon", slot: "select-icon", notes: "The chevron. Decorative — the trigger's name comes from the label." },
    { part: "panel", slot: "select-panel", notes: "radius-md over a 4px inset around radius-sm rows — concentric exactly, 4 + 4 = 8 (§6). bg-surface, a 1px edge, shadow-md. Capped to --available-height and scrolls internally (§7c)." },
    { part: "option", slot: "select-option", notes: "p-md, radius-sm when highlighted or selected — a touch target as well as a line of text. With a description it is named by its label (aria-labelledby) and described by the second line (aria-describedby)." },
    { part: "option text", slot: "select-option-text", notes: "The label-over-description stack, 4px apart — Radio's." },
    { part: "option description", slot: "select-option-description", notes: "The optional second line: caption in muted ink (disabled ink on a disabled row). Wraps rather than truncates. Rendered in the popup only, never in the trigger." },
    { part: "indicator", slot: "select-indicator", notes: "The tick on the chosen row." },
  ],

  composition: `
Select   label (required) / isLabelHidden?
         items (required)  { value, label, description?, isDisabled? }[]
                           description → a muted second line in the popup row only
         value? / defaultValue? / onValueChange?
         placeholder? / size? / isDisabled?
         helperText? / errorText? / container?
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a placeholder is not a label. It disappears the moment a value is chosen, taking the field's name with it (§10)." },
    items: { type: "SelectItem[]", required: true, notes: "{ value, label, description?, isDisabled? }. The VALUE is what onValueChange reports; the label is for people. `description` is a second, muted line under the label in the open list — what choosing the option means, for a list where the label does not say (a role, a plan, a permission). It never appears in the trigger, and it is wired as the option's accessible description rather than run into its name." },
    value: { type: "string | null", notes: "Controlled. null means nothing is chosen." },
    onValueChange: { type: "(value: string | null) => void", notes: "One callback (§1). Reports the value, never the label — returning the label would make every consumer map it back." },
    placeholder: { type: "string", default: '"Select…"', notes: "What the box shows while empty. NOT the accessible name." },
    size: { type: '"lg" | "md" | "sm"', default: '"lg"', notes: "48 / 40 / 32px with a 14 / 14 / 12px value — Input's sizes and Input's type steps, because it is Input's surface. md was 12px in the map and rendered 14 anyway, until #16 put the step in the map alone and moved the whole field family's md to body-md." },
    errorText: { type: "string", notes: "Its presence sets aria-invalid and the danger edge, so the two cannot drift apart." },
    helperText: { type: "string", notes: "Persistent guidance. Announced alongside an error rather than replaced by it." },
    container: { type: "HTMLElement | null", default: "document.body", notes: "Where the panel is portalled. Theme tokens are INHERITED custom properties, so a panel in the body leaves any brand scope. See sheet.doc.ts." },
  },

  do: [
    "Give every Select a label; the trigger is otherwise anonymous.",
    "Use it for one value out of a known list — reach for Multiselect when more than one can be chosen.",
    "Mark unavailable options with isDisabled rather than filtering them out, so the list stays stable between renders.",
    "Give options a description when the choice is a permission or a plan — say what it grants or costs, in one line.",
  ],

  dont: [
    "Do not use a placeholder as the label. It is gone as soon as someone chooses.",
    "Do not convey the chosen row by fill alone — the highlighted row already owns a fill, and colour alone is WCAG 1.4.1. Selection is a tick and a weight.",
    "Do not import Base UI types into your own props — `check:boundaries` fails the build (ADR 0002).",
    "Do not put the description into the label (\"Viewer — read only\"): it then appears in the trigger and is announced as part of the name.",
  ],

  a11y: {
    role: "A button trigger paired with a listbox (from Base UI), with one option per item and the chosen one marked.",
    name: "The `label` prop via aria-labelledby. errorText and helperText are wired through aria-describedby together. An option with a description is named by its label alone (aria-labelledby on the option) and described by the second line (aria-describedby) — without the labelledby, its name would be computed from the whole row and the description read twice.",
    keyboard: [
      { key: "Enter / Space", does: "Opens the list from the trigger." },
      { key: "Arrow Up / Down", does: "Moves through the options; disabled ones are skipped." },
      { key: "Typeahead", does: "Jumps to the option starting with what you type." },
      { key: "Escape", does: "Closes and RESTORES FOCUS to the trigger. Asserted in Chromium." },
    ],
    focus: "Focus returns to the trigger on dismiss — falling to <body> is the classic hand-rolled-listbox failure.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-field", floor: "text", role: "the chosen value in the trigger" },
      { fg: "--ui-text-placeholder", bg: "--ui-bg-field", floor: "text", role: "the placeholder" },
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "an option in the panel" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "the highlighted option" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "an option's description" },
      { fg: "--ui-text-muted", bg: "--ui-bg-hover", floor: "text", role: "the highlighted option's description" },
    ],
  },

  needsDesign: [
    "The sheet draws the trigger at px-lg (16) where Input's control is px-md (12). Shipped as Input's, because the whole claim is that a field is a field — confirm which wins.",
    "The panel ships at a 4px inset where the sheet draws 8, so that §6 closes: radius-md (8) over 4px around radius-sm (4) rows is 4 + 4 = 8 exactly. The sheet's own three numbers do not close — 4 + 8 wants a 12px outer radius and the scale has no 12px step. Of the three, the inset carries the least meaning, so it moved and both radii are the sheet's. Bring Paper in line, or say which of the other two should move instead.",
    "The highlighted row is drawn as the palette step --ui-neutral-95 rather than a role. Shipped as bg-hover, the interaction role, because a surface role used as an interaction state is the wrong-category signal the token layer exists to catch. It is one step stronger than drawn.",
    "Row GVO-0 is drawn py-lg px-md where the sheet's other three rows and both of Multiselect's are a uniform p-md. Shipped as p-md, following the majority.",
    "No option GROUPS are drawn, though Base UI supports them.",
    "The option description (#26) is not drawn. Shipped as Radio's description — caption, text-muted, 4px under the label, wrapping — so a second line means one thing across the library. Draw a two-line row on the sheet, at rest, highlighted, selected and disabled.",
  ],

  knownGaps: [
    "No search or filtering inside the list — that is Multiselect's combobox, and a searchable single-select would be a third component.",
    "No option groups and no icons in a row. A per-option description is supported (#26) but is DERIVED — the sheet draws a flat list of labels; the second line follows Radio's description (caption, muted, 4px under the label).",
    "The panel does not re-skin under a brand scope without `container` — the portal-theming gap shared with Modal, Popover, Sheet and Drawer.",
  ],

  motion:
    "The trigger transitions `border-color` and `box-shadow`; the list fades and scales from 98% through `data-[starting-style]`/`data-[ending-style]`. Both at --ui-duration-fast with --ui-ease-out. `scale` is named in the transition list — Tailwind v4 writes it standalone.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/EVQ-0",
} as const;

export type SelectDoc = typeof selectDoc;
