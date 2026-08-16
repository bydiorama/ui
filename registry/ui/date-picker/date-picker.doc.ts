/** Typed documentation for DatePicker (CONVENTIONS §11). */

export const datePickerDoc = {
  name: "DatePicker",
  status: "stable",
  summary:
    "A date field that opens a Calendar. Two things this system already owns, composed: the field is Input's control surface — a field is a field — and the panel is the Calendar card itself rather than a second surface wrapped around one. Anchoring, dismissal and focus restoration come from Base UI (ADR 0012); the grid, its ARIA and its keyboard contract are ours.",

  anatomy: [
    { part: "root", slot: "date-picker", notes: "Label, field, panel and messages as one accessible unit. flex column, gap-sm." },
    { part: "label", slot: "date-picker-label", notes: "Required. px-sm — bare text inside a rounded surface takes the inset (§6). isLabelHidden renders it sr-only rather than omitting it." },
    { part: "trigger", slot: "date-picker-trigger", notes: "Input's lg control, character for character: h-12, px-md, radius-md, 1.5px border-subtle on bg-field. The browser test compares it to a live Select rather than to a number." },
    { part: "value", slot: "date-picker-value", notes: "The formatted date, or the placeholder in ink-placeholder. Truncates rather than wrapping — the control has one line." },
    { part: "icon", slot: "date-picker-icon", notes: "Chevron down closed, up open. A second channel beside aria-expanded." },
    { part: "panel", slot: "date-picker-panel", notes: "Positioning only — no fill, no edge, no radius. The Calendar card IS the panel; wrapping one surface in another would draw two boundaries where the sheet draws one." },
    { part: "error", slot: "date-picker-error", notes: "Rendered before the helper, so a correction is read first." },
    { part: "helper", slot: "date-picker-helper", notes: "Persistent guidance. Stays visible alongside an error." },
  ],

  composition: `
DatePicker   label (required)
             value? / defaultValue? / onValueChange?
             isOpen? / defaultIsOpen? / onOpenChange?
             placeholder? / formatValue?
             helperText? / errorText? / isDisabled? / isLabelHidden?
             month? / defaultMonth? / onMonthChange?
             isDateDisabled? / weekStartsOn? / today?
             container?
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a placeholder is not a label. It disappears the moment a date is chosen, taking the field's name with it." },
    isLabelHidden: { type: "boolean", default: "false", notes: "Visually hidden, never omitted. A field with no name is a field a screen reader cannot describe." },
    value: { type: "Date | null", notes: "Controlled selection. null means nothing is chosen." },
    defaultValue: { type: "Date | null", default: "null", notes: "Uncontrolled starting selection." },
    onValueChange: { type: "(value: Date | null) => void", notes: "One callback for choose and clear (§1)." },
    isOpen: { type: "boolean", notes: "Controlled open state. Runs through useControllableState rather than being left to the behaviour layer, because choosing a date has to CLOSE the panel and Base UI offers no imperative close." },
    defaultIsOpen: { type: "boolean", default: "false", notes: "Uncontrolled starting state — never `initialIsOpen` (§1)." },
    onOpenChange: { type: "(isOpen: boolean) => void", notes: "Fires for the trigger, Escape, an outside press and a chosen date." },
    placeholder: { type: "string", default: '"Pick a date"', notes: "What the empty box shows. NOT the accessible name." },
    formatValue: {
      type: "(value: Date) => string",
      default: 'Intl at dateStyle: "long"',
      notes: "The sheet draws 'August 3rd, 2026'. No Intl option produces an English ordinal, and hand-rolling one would be correct in exactly one language — so the default is the platform's and the ordinal is a call-site decision.",
    },
    isDisabled: { type: "boolean", default: "false", notes: "The native attribute, never pointer-events: none — a disabled control still has to be hoverable to explain itself." },
    helperText: { type: "string", notes: "Persistent guidance, announced through aria-describedby alongside any error." },
    errorText: { type: "string", notes: "Its presence sets aria-invalid and the danger border, so the two cannot drift apart." },
    month: { type: "Date", notes: "Controlled visible month, forwarded to Calendar. Any date within it will do." },
    defaultMonth: { type: "Date", notes: "Which month opens first. Omit and the Calendar starts at the selection, or today." },
    onMonthChange: { type: "(month: Date) => void", notes: "Fires for the arrows, the month and year selects, and an arrow key that walks off the edge." },
    isDateDisabled: { type: "(date: Date) => boolean", notes: "Marks a date unselectable. It stays FOCUSABLE, so a screen-reader user can still be told why." },
    weekStartsOn: { type: "0 | 1", default: "0", notes: "0 = Sunday, as the sheet draws it." },
    today: { type: "Date", default: "new Date()", notes: "Which day is marked as today. The clock is an untestable input; see the fuller note on Calendar." },
    container: { type: "HTMLElement | null", notes: "Where to portal the panel. Theme tokens are INHERITED custom properties, so a panel on document.body leaves a brand scope behind and paints theme zero. Pass the themed element to bring it back inside." },
  },

  do: [
    "Give the field a label describing what the date is for — 'Deadline', not 'Date'.",
    "Pass `today` in a test or a server render; the real clock makes any baseline a scheduled failure.",
    "Use `isDateDisabled` for unavailable ranges rather than filtering days out — a missing cell breaks the grid's geometry and the arrow keys with it.",
    "Pass `container` when the field sits inside a brand-themed scope and the panel must inherit it.",
  ],

  dont: [
    "Do not use the placeholder as the label. It is gone the moment a date is chosen.",
    "Do not reach for a date library to format the value — `formatValue` takes a function, and Intl already knows every locale this component would otherwise have to ship a table for.",
    "Do not wrap the panel in a card of your own. The Calendar already is one.",
  ],

  a11y: {
    role: "A button that owns a dialog-less popover: aria-expanded and aria-controls come from the behaviour layer. Inside it, the Calendar is an ARIA grid with its own contract.",
    name: "The `label` prop, wired with aria-labelledby. Helper and error text are both joined into aria-describedby — an error rarely makes the guidance irrelevant, and dropping it mid-correction is exactly when it is needed.",
    keyboard: [
      { key: "Enter / Space", does: "Opens the panel. Native — the trigger is a real button." },
      { key: "Escape", does: "Closes the panel and returns focus to the trigger." },
      { key: "Tab", does: "Enters the open panel at one day, not thirty-one. The Calendar's roving tabindex owns the rest." },
      { key: "(on open)", does: "Focus lands on the DAY the grid is resting on, not on the previous-month arrow — Base UI's default first-focusable would put the keyboard three Tabs from the thing the field exists to choose." },
      { key: "Arrows", does: "Move within the Calendar — see its own keyboard table." },
    ],
    focus: "Choosing a date closes the panel and Base UI restores focus to the trigger. CLEARING — clicking the selected day again — deliberately leaves it open, because the next thing that user wants is another date.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-field", floor: "text", role: "the chosen date in the field" },
      { fg: "--ui-text-placeholder", bg: "--ui-bg-field", floor: "text", role: "the placeholder" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the label" },
      { fg: "--ui-text-muted", bg: "--ui-bg-base", floor: "text", role: "the helper text" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-base", floor: "text", role: "the error message" },
      { fg: "--ui-text-primary", bg: "--ui-bg-sunken", floor: "text", role: "a disabled field's remaining ink" },
      {
        fg: "--ui-border-subtle",
        bg: "--ui-bg-base",
        floor: "decorative",
        role: "the field's resting edge",
        why: "ADR 0010: the field is identified by its fill, label and padding, not by its hairline. `border-control` is the conformant boundary for engagements that require one.",
      },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "The sheet draws the trigger at px-lg (16) where Input's control is px-md (12) — the same divergence Select records. Shipped as Input's, because the whole claim is that a field is a field.",
    "One size only. The sheet draws the 48px field and nothing else, so there is no sm/md geometry to follow even though Input, Select and Multiselect all have one.",
    "The field draws 'August 3rd, 2026' — an English ordinal no Intl option produces. Shipped as dateStyle: 'long' ('3 August 2026' / 'August 3, 2026' by locale), with formatValue as the call-site escape hatch.",
    "No disabled, error or busy state is drawn for the field; all three are derived from Input's.",
    "No clear affordance is drawn. Clearing is 'click the selected day again', which is discoverable only by accident — a trailing clear control would need designing.",
  ],

  knownGaps: [
    "One date only. No range and no time-of-day; the sheet draws neither.",
    "The panel is a popover, not a dialog: it does not trap focus, because a date field is not a decision that must be acknowledged (§7a).",
    "No min/max props. `isDateDisabled` covers the same ground and is the more general of the two.",
    "The trigger is not a text input — a date cannot be typed. That is the sheet's design, and it costs keyboard users the fastest path to a distant date; the year select is the mitigation.",
  ],

  motion:
    "The field transitions `border-color` and `box-shadow` on focus at --ui-duration-fast with --ui-ease-out; the calendar panel fades and scales from 98% through `data-[starting-style]`/`data-[ending-style]` over the same timing. `scale` is named in the transition list — Tailwind v4 writes `scale-*` standalone, so a list naming `transform` animates nothing.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/JI1-0",
} as const;

export type DatePickerDoc = typeof datePickerDoc;
