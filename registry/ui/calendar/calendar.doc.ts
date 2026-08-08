/** Typed documentation for Calendar (CONVENTIONS §11). */

export const calendarDoc = {
  name: "Calendar",
  status: "stable",
  summary:
    "A month grid for picking one date, with month and year selects in its header. Ours rather than a library's (ADR 0012): the hard parts are the ARIA grid and the keyboard contract, and both are decisions this system has to own. Month and weekday names come from Intl, so a consumer in another locale gets their own without this library shipping a translation table.",

  anatomy: [
    { part: "root", slot: "calendar", notes: "The card: w-80, p-lg, radius-lg, bg-surface with shadow-sm. Sets --ui-calendar-view-height (292px), the height all three panels share." },
    { part: "header", slot: "calendar-header", notes: "Previous button, the two selects, next button. mb-lg." },
    { part: "heading", slot: "calendar-heading", notes: "The visible month and year, VISUALLY HIDDEN and aria-live: the two triggers name themselves, so without it an arrow press changes the date silently." },
    { part: "prev / next", slot: "calendar-prev, calendar-next", notes: "32px chrome controls. They step whatever panel is open — a month, a year, or a page of years — and their names change with it." },
    { part: "selects", slot: "calendar-selects", notes: "The month and year triggers, gap-xs." },
    { part: "month / year trigger", slot: "calendar-month-trigger, calendar-year-trigger", notes: "Disclosures at h-6. aria-expanded plus a chevron that flips; the open one is inked text-link, so state is never colour alone. data-open for styling." },
    { part: "month / year list", slot: "calendar-month-list, calendar-year-list", notes: "role=listbox replacing the grid IN PLACE, at the grid's own height. Months are one column, years are three." },
    { part: "month / year option", slot: "calendar-month-option, calendar-year-option", notes: "role=option, min-h-8. Carries data-selected and data-current, drawn exactly as the day grid draws selected and today." },
    { part: "grid", slot: "calendar-grid", notes: "role=grid, 7 columns, gap-xs. Rows and cells use display:contents so the grid template reaches the days." },
    { part: "weekday", slot: "calendar-weekday", notes: "role=columnheader. Shows 'Sun', named 'Sunday'. Carries mb-sm, which with the grid's 4px gap makes the 12px separation the sheet draws — the row is display:contents, so the margin cannot live on the row." },
    { part: "day", slot: "calendar-day", notes: "A square button on bg-elevated. Carries data-selected and data-today." },
    { part: "blank", slot: "calendar-blank", notes: "A leading or trailing empty cell. aria-hidden — there is no date there to announce." },
  ],

  composition: `
Calendar   label (required)
           value? / defaultValue? / onValueChange?
           month? / defaultMonth? / onMonthChange?
           isDateDisabled? / weekStartsOn?
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — the grid is otherwise announced as 'grid'." },
    value: { type: "Date | null", notes: "Controlled selection. null means nothing is selected; clicking the selected day again clears it." },
    defaultValue: { type: "Date | null", default: "null", notes: "Uncontrolled starting selection." },
    onValueChange: { type: "(value: Date | null) => void", notes: "One callback for select and clear (§1)." },
    month: { type: "Date", notes: "Controlled visible month — any date within it will do. Omit and the calendar owns it, starting at the selection or today." },
    onMonthChange: { type: "(month: Date) => void", notes: "Fires for the arrows, PageUp/PageDown, and an arrow that walks off the edge of the month." },
    isDateDisabled: { type: "(date: Date) => boolean", notes: "Marks a date unselectable. It sets aria-disabled and stays FOCUSABLE, so a screen-reader user can still read it — a date they cannot reach is one they cannot be told the reason for." },
    today: {
      type: "Date",
      default: "new Date()",
      notes: "Which day is marked as today. The clock is an input this component reads without being asked, and an untestable one — the visual baseline pinned month and value and still failed the next morning, because the ring had moved a cell overnight. Also the honest hook for a server render or a non-local timezone.",
    },
    weekStartsOn: { type: "0 | 1", default: "0", notes: "0 = Sunday, as the sheet draws it. Changing it re-lays the leading blanks, not just the header row." },
  },

  do: [
    "Give the calendar a label describing what the date is for.",
    "Use isDateDisabled for ranges rather than filtering days out — a missing cell breaks the grid's geometry and the arrow keys with it.",
    "Let the arrows walk off the edge of a month; the grid follows, which is what stops the last week being a dead end.",
  ],

  dont: [
    "Do not use the `disabled` attribute for unavailable dates. aria-disabled keeps them readable; `disabled` removes them from the keyboard entirely.",
    "Do not hard-code weekday or month names — Intl already knows them, in the user's locale.",
    "Do not give every day a tab stop. One roving stop is the whole point of the grid pattern.",
  ],

  a11y: {
    role: "grid, with columnheader cells for the weekdays and one gridcell per date. Blank cells are aria-hidden.",
    name: "The `label` prop. Each day is named in FULL ('Monday, 3 August 2026') — a bare '3' locates nothing.",
    keyboard: [
      { key: "Tab", does: "Enters the grid at exactly one day — a roving tabindex, not 31 stops." },
      { key: "Arrow Left / Right", does: "Moves by a day, crossing into the previous or next month when it runs off the edge." },
      { key: "Arrow Up / Down", does: "Moves by a week." },
      { key: "Home / End", does: "First and last day of the WEEK, not of the month." },
      { key: "Page Up / Page Down", does: "Previous and next month, keeping the day of the month." },
      { key: "Enter / Space", does: "Selects the focused day, or clears it if it was already selected. Native — every day is a real button. In a month or year list it chooses the option; role=option cannot contain a button, so activation is implemented rather than inherited." },
      { key: "Escape (in a select)", does: "Closes the month or year list and returns focus to the trigger that opened it." },
      { key: "Arrows (in a select)", does: "Up/Down by a row — one month, or three years — and Left/Right by one. Clamped at the ends rather than wrapped: a year grid that jumps from 2039 to 2013 reads as a bug, and the header arrows page the window anyway." },
    ],
    focus: "The roving stop follows ACTUAL focus, not only clicks: a screen reader can move into any cell without clicking, and the arrows must continue from where the user really is. Opening a select moves focus into it at the current value and centres that row; closing it returns focus to the trigger, so no panel swap ever drops focus on the body.",
    contrastPairs: [
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "an unselected day, month or year" },
      { fg: "--ui-text-primary", bg: "--ui-bg-accent-subtle", floor: "text", role: "the selected day, month or year" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "the weekday headers" },
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "a closed month or year trigger" },
      { fg: "--ui-text-link", bg: "--ui-bg-surface", floor: "text", role: "the OPEN month or year trigger" },
      { fg: "--ui-text-link", bg: "--ui-bg-hover", floor: "text", role: "the open trigger under the pointer" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "any hovered cell or trigger" },
    ],
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "No today state is drawn. The outline is derived — and now carries to the month and year lists too.",
    "The month list fills June while its own header reads August, so the sheet does not say whether the fill marks the VISIBLE month or the selected date's month. Shipped as the visible one, mirroring the day grid where the fill is the selection and the outline is today.",
    "The year grid's window is 27 years centred on the visible year, and the header arrows page it a screenful at a time. The sheet draws one static screenful, so the range and the paging step are both derived.",
    "The month and year triggers are 24px tall — SC 2.5.8's floor exactly, because the sheet's header row is 32px overall and a taller trigger would push the arrows out of line.",
  ],

  knownGaps: [
    "The month and year lists replace the grid IN PLACE rather than opening a Select. Inside DatePicker the calendar is already a popover, and a popover over a popover is two surfaces where the sheet draws one.",
    "The sheet draws a 1.5px border on the selected month row on top of its fill. Not shipped: --ui-bg-accent on --ui-bg-accent-subtle measures 1.3:1, so it identifies nothing the fill and the bold weight do not already carry, and the day grid draws no such border.",
    "An open month or year list is closed by Escape or by its own trigger, not by clicking elsewhere in the card. It is a disclosure that swaps content in place rather than an overlay, and outside-press dismissal on one would be surprising — but the card's padding is a dead zone, which is worth knowing.",
    "One date only. No range, no multiple selection; the sheet draws neither.",
    "One month at a time. No two-up view.",
    "Today is marked with an outline rather than anything the sheet draws — it draws no today state at all, and a calendar without one is disorienting. DERIVED; confirm with design.",
    "No min/max props. `isDateDisabled` covers the same ground and is the more general of the two, but a range would be more convenient.",
    "Day cells are square and fill the column, so their size follows the card's width rather than a token. At the sheet's 320px card they are 38px, comfortably over SC 2.5.8's floor, but a narrower container would shrink them.",
  ],

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/4-0/CZN-0",
} as const;

export type CalendarDoc = typeof calendarDoc;
