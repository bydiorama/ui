/** Typed documentation for Combobox (CONVENTIONS §11). */

export const comboboxDoc = {
  lead: "Finds and chooses an option by typing or browsing.",
  name: "Combobox",
  status: "experimental",
  summary:
    "An editable text field with a filtered listbox: one committed value, free text allowed, options in labelled groups, rows that can be links, and an action row that is always present. Focus never leaves the input — the highlighted row is an aria-activedescendant, not a focused element, which is why neither Popover (moves focus) nor Menu (actions, not a listbox) fits. Nothing in it is new surface: the field is Input's control and the panel and rows are Select's. The ARIA 1.2 combobox pattern comes from Base UI's Combobox (ADR 0012), as Multiselect's does. Resolves #17.",

  anatomy: [
    { part: "root", slot: "combobox", notes: "The field column: label, control, then error and helper text. The panel portals INTO this node, so a brand scope around the field reaches the panel." },
    { part: "label", slot: "combobox-label", notes: "A real <label for> naming the input. label-md, text-secondary, Select's px-sm inset — the listbox-picker family, not the bare Input. sr-only when isLabelHidden, never removed." },
    { part: "control", slot: "combobox-control", notes: "Input's control, unchanged: h-field-lg/md/sm, px-field-inset-*, the 1.5px border-subtle hairline, bg-field, the two-stop focus ring via focus-within. Open is focused, so the open field always carries the ring." },
    { part: "icon", slot: "(caller's element)", notes: "Optional leading slot, never wrapped (§3). Sized to 16px and muted ink by the control." },
    { part: "input", slot: "combobox-input", notes: "The <input role=\"combobox\">. Keeps focus the whole time. Value at the field's type step, weight 500; the ref lands here (§5)." },
    { part: "clear", slot: "combobox-clear", notes: "Only while the input has TEXT (not only while a value is committed). A 24px square — the SC 2.5.8 floor — radius-sm (radius-full on a pill), Close 16 in text-muted, bg-hover on hover. Out of the tab order; Escape twice is its keyboard path. Named by clearLabel." },
    { part: "trigger", slot: "combobox-trigger", notes: "ChevronDown, ChevronUp while open, 16px in text-muted with a 24px hit area. Opens the full list without typing. Out of the tab order; named by triggerLabel. Omit with hasTrigger={false}." },
    { part: "panel", slot: "combobox-panel", notes: "Select's panel: bg-surface, 1px border-subtle, radius-md over a 4px inset (concentric with radius-sm rows), shadow-md, 8px below the field, min-width the field's, capped at --available-height/width, z --ui-z-dropdown." },
    { part: "status", slot: "combobox-status", notes: "The ONE live region (role=status, polite). A visible status row on the option recipe for loading (Button's spinner), empty and list error (AlertCircle in intent-danger-fg); otherwise a visually hidden result count. Outside the listbox, whose children may only be options and groups." },
    { part: "list", slot: "combobox-list", notes: "role=listbox, and the scroller. aria-busy while isLoading." },
    { part: "group", slot: "combobox-group", notes: "role=group named by its heading. Groups are separated by 8px of SPACE, no rule — menuSeparator as shipped." },
    { part: "group label", slot: "combobox-group-label", notes: "menuGroupLabel: px-md pt-md pb-sm, label-sm, text-muted. Never highlightable." },
    { part: "option", slot: "combobox-option", notes: "Select's row: p-md, radius-sm, gap-sm, body-md, text-primary; rows stack flush. Highlight is bg-hover; selection is weight 600 plus a tick — two channels, never a fill." },
    { part: "option label", slot: "combobox-option-label", notes: "Carries the selected row's weight, so the row itself renders exactly its type role (ADR 0020 §3)." },
    { part: "indicator", slot: "combobox-indicator", notes: "A fixed 16px trailing lane on EVERY row — the tick, the link arrow, or nothing — so labels align." },
    { part: "link option", slot: "combobox-link-option", notes: "The same row as an <a role=\"option\"> (or linkRender), ArrowUpRight in text-muted in the lane. Enter or a press follows the href and commits nothing; never drawn selected. tabIndex -1: a link is otherwise a tab stop, and Tab would walk into the panel." },
    { part: "retry", slot: "combobox-retry", notes: "\"Try again\" under a list error: a real option row with a leading RefreshCw, so the keyboard reaches it. Runs onRetry; commits nothing; keeps the list open." },
    { part: "action region", slot: "combobox-action-region", notes: "Pinned below the rows (sticky to the bottom of the scrolling list, on the panel's fill), 8px of space above, no rule. While the list scrolls, a Fade (bottom, md, ground surface) sits just above it; hidden at the scroll end and when the list fits." },
    { part: "action", slot: "combobox-action", notes: "ComboboxAction: the option recipe with a leading icon slot. role=option, last in arrow order, Enter runs it with the query and closes. Never a value." },
    { part: "error / helper", slot: "combobox-error / combobox-helper", notes: "caption, px-sm. Error first, both in aria-describedby." },
  ],

  composition: `
Combobox   label (required) / isLabelHidden?
           items (required)   ComboboxItem[] | ComboboxItemGroup[]
                              ComboboxItem      { value, label, href?, isDisabled? }
                              ComboboxItemGroup { label, items: ComboboxItem[] }
           value? / defaultValue? / onValueChange?          committed value, by item value
           inputValue? / defaultInputValue? / onInputValueChange?   the text (async hook)
           onSubmitText?                                    Enter with nothing highlighted
           filter?   (item, query) => boolean | null        null = items already filtered
           isLoading? / loadingMessage?
           emptyMessage?   string | (query) => string
           listError? / onRetry? / retryLabel?               the LIST failed, not the field
           resultsMessage?   (count) => string
           action?   <ComboboxAction icon? onAction={(query) => …}>
                       string | (query) => ReactNode
                     </ComboboxAction>
           size? / shape? / surface? / icon? / hasTrigger?
           placeholder? / isDisabled? / isRequired? / helperText? / errorText?
           triggerLabel? / clearLabel? / linkRender? / container? / className?
  `.trim(),

  props: {
    label: { type: "string", required: true, notes: "Required — a placeholder is not a label (§10)." },
    items: { type: "ComboboxItem[] | ComboboxItemGroup[]", required: true, notes: "A flat list or labelled groups. `value` must be unique across groups. `href` makes a row a link; `isDisabled` keeps it visible, unhighlightable and skipped by the arrow keys." },
    value: { type: "string | null", notes: "The committed value, by item value — not the item, so re-fetched results keep it. Separate from the text: free text can sit in the field while a value stays committed, and the field does not distinguish the two visually (the sheet's rule)." },
    onValueChange: { type: "(value: string | null) => void", notes: "Fires on a commit (Enter or a press on an option), and with null when the text is cleared (clear control, Escape twice, or deleting every character). Never for a link, the action or Try again." },
    inputValue: { type: "string", notes: "Controlled text. A blur never rewrites it — Base UI resyncs the text to the committed label when the list closes, and that resync is refused here because it would throw away free text." },
    onInputValueChange: { type: "(inputValue: string) => void", notes: "Every change to the text. The async hook: debounce and abort in the caller (the component holds no timers and no fetch), pass results back as items, set filter={null}." },
    onSubmitText: { type: "(text: string) => void", notes: "Enter with nothing highlighted — the free text, as typed. The list closes; a surrounding form still submits natively. Named onSubmitText, not onSubmit, because a form's onSubmit receives an event and this receives a string." },
    filter: { type: "((item, query) => boolean) | null", default: "case- and accent-insensitive contains on the label", notes: "Only TYPING narrows the list: reopening after a commit shows everything with the committed row highlighted, not a list of one." },
    isLoading: { type: "boolean", default: "false", notes: "aria-busy on the listbox. With no rows to show, a loading status row stands in. Stale rows stay while a refresh is in flight." },
    emptyMessage: { type: "string | ((query) => string)", default: '"No results"', notes: "A status row, then the action — an empty result is never a dead end." },
    listError: { type: "string", notes: "The LIST failed. A status row with AlertCircle; the field stays valid (no aria-invalid). Field validation is errorText." },
    onRetry: { type: "() => void", notes: "Adds Try again as an option under listError." },
    resultsMessage: { type: "(count) => string", default: '"N results"', notes: "Announced politely as results change. A function so the plural is the caller's, in the caller's language (§9)." },
    action: { type: "ReactElement (ComboboxAction)", notes: "Slot (§3): the row pinned below the list, in every state, last in arrow order. ComboboxAction's children may be a function of the query; onAction receives the query." },
    size: { type: '"lg" | "md" | "sm"', default: '"lg"', notes: "Input's ladder: 48 / 40 / 32, value body-md / body-md / caption. The panel's rows do not change with it (Select's rule — see needsDesign)." },
    shape: { type: '"soft" | "full"', default: '"soft"', notes: "Input's two shapes. full insets one space step wider and rounds the clear square; the panel stays radius-md." },
    surface: { type: '"page" | "chrome"', default: '"page"', notes: "Input's ground pair (ADR 0017): enabled and disabled fills chosen together." },
    hasTrigger: { type: "boolean", default: "true", notes: "The chevron. A search field may omit it; the list still opens on typing and ArrowDown." },
    linkRender: { type: "ReactElement", default: "<a />", notes: "Your router's Link (§9: no framework imports). Receives href, the option role and the row classes." },
    errorText: { type: "string", notes: "Field invalid: danger edge, aria-invalid, the message first in aria-describedby." },
    container: { type: "HTMLElement | null", default: "the field's own root", notes: "Where the panel portals. The default keeps it inside any brand scope; pass one only to escape a clipping ancestor." },
  },

  do: [
    "Give every Combobox a label; use isLabelHidden when the design shows none.",
    "Use it where free text matters — search, a person picker that can also search. For one value from a short, known list, use Select.",
    "Pass results by VALUE-stable items, so the highlight and the committed value survive a refresh.",
    "Keep the action row's label in terms of the query: \"Search everything for “Jo”\".",
    "For async results set filter={null}, debounce in the caller, and drive isLoading / listError from the request.",
  ],

  dont: [
    "Do not use listError for a validation problem, or errorText for a failed request — one is the list, the other the field.",
    "Do not put focusable controls inside a row — the row IS the option, and focus never leaves the input.",
    "Do not bold matched substrings: bold is already the selection channel (see knownGaps).",
    "Do not import Base UI types into your own props — check:boundaries fails the build (ADR 0012).",
  ],

  a11y: {
    role: "The ARIA 1.2 combobox: an <input role=\"combobox\" aria-autocomplete=\"list\"> controlling a role=listbox, with role=group sections named by their headings and role=option rows (links included). From Base UI.",
    name: "label via <label for>. errorText and helperText join aria-describedby, error first. The clear control and chevron carry clearLabel and triggerLabel.",
    keyboard: [
      { key: "Typing", does: "Opens the list and filters it (or fires onInputValueChange for async). Nothing is highlighted until the user moves — free text is never silently replaced by the first match." },
      { key: "ArrowDown / ArrowUp", does: "Open the list if closed (ArrowDown highlights the first row). Move through rows in order across groups, skipping disabled rows and group labels, ending on the action. No wrap. From nothing highlighted, ArrowUp lands on the last row." },
      { key: "Home / End", does: "While open: the first row / the action. While closed: move the caret, as in any text field." },
      { key: "Enter", does: "On an option: commit and close. On a link: follow it, commit nothing. On the action: run it with the query and close. On Try again: retry, keep the list open. With nothing highlighted: onSubmitText(text), close." },
      { key: "Escape", does: "First press closes and keeps the text. Second press (list closed) clears the text and the committed value — the clear control's keyboard path." },
      { key: "Tab", does: "Closes without committing the highlight; the free text stays. The clear control, chevron and link rows are out of the tab order, so Tab leaves the field." },
    ],
    focus: "Focus never leaves the input: rows prevent the pointer-down that would blur it, and so does the panel's own inset. The highlight is aria-activedescendant. While open, Base UI's focus manager marks the rest of the page aria-hidden (the input is outside the popup, which makes the manager modal).",
    liveRegion: "One polite role=status in the panel: the loading / empty / error line, or the result count (resultsMessage) when there are rows. When results replace a status, the highlight follows the row's VALUE: kept if it survived, dropped if not — never left on whatever took its index.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-field", floor: "text", role: "the value" },
      { fg: "--ui-text-placeholder", bg: "--ui-bg-field", floor: "text", role: "the placeholder" },
      { fg: "--ui-text-primary", bg: "--ui-bg-field-chrome", floor: "text", role: "the value on a chrome ground" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "non-text", role: "the clear glyph on its hover square" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-base", floor: "text", role: "the label" },
      { fg: "--ui-border-focus", bg: "--ui-bg-base", floor: "non-text", role: "the focus ring" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-base", floor: "text", role: "the field's error message" },
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "an option, the error status text" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "the highlighted option" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "group labels, loading and empty status rows" },
      { fg: "--ui-text-muted", bg: "--ui-bg-hover", floor: "non-text", role: "the link arrow and the action's icon on a highlighted row" },
      { fg: "--ui-intent-danger-fg", bg: "--ui-bg-surface", floor: "non-text", role: "the list-error AlertCircle" },
      {
        fg: "--ui-bg-hover",
        bg: "--ui-bg-surface",
        floor: "decorative",
        role: "the highlight fill against the panel",
        why: "Measured on the sheet at 1.19:1 light / 1.21:1 dark. It is Select's and Menu's value, so not a new defect, and the highlighted row is ALSO announced (aria-activedescendant) and outlined under forced colours. Declared as decorative rather than left unlisted so the number stays measured — and recorded in needsDesign, because a combobox is keyboard-driven far more than a select and this fill is the only visible indicator of where the user is.",
      },
    ],
  },

  forwarding: {
    ref: "Goes to the <input> — the form-control exception in CONVENTIONS §5. The wrapper stays reachable through data-slot.",
    className: "Lands on the outermost field column (data-slot=\"combobox\"), so className=\"w-64\" sizes the whole field and the panel's min-width follows the control.",
    rest: "No native props are spread: every attribute the input carries is owned by the combobox contract (role, aria-*, value). Reach parts with data-slot.",
  },

  needsDesign: [
    "OPEN — highlight contrast. The highlighted row is bg-hover at 1.19:1 (light) / 1.21:1 (dark) against the panel — Select's and Menu's value. Acceptable for a select; a combobox is driven by the keyboard far more, and the fill is the only visible indicator of position. Decide whether the family's highlight should get stronger.",
    "OPEN — panel row size per field size. Rows are body-md / p-md at every field size, as Select's are, so an sm field (32px) opens 46px rows. Confirm, or size the panel with the field.",
    "OPEN — one inset rule for the field family. Label, error and helper take Select's px-sm inset; Input's label sits flush (card.doc.ts already records the alignment gap). Combobox follows Select because it is the same family; choose one rule for all four fields.",
    "OPEN — the pill inset. shape=\"full\" insets one space step wider (16 / 12 / 12) and rounds the clear square, derived from Input's own pill (#18). Whatever #18 lands for Input wins; the popup stays radius-md under a pill field.",
    "OPEN — one empty treatment. Combobox's empty state is a status row on the option recipe (body-md, p-md, text-muted); Multiselect's is button-sm at px-lg. Reconcile.",
    "OPEN — matched-substring emphasis, option descriptions, leading option icons and virtualised long lists are not drawn. Bold is already the selection channel, so a bolded match would collide with it — a different channel is needed if emphasis is wanted.",
    "DERIVED — the clear control (24px, out of the tab order, Escape twice) and the optional chevron trigger are drawn by no other sheet. Confirm they belong to the field family rather than to Combobox alone.",
    "DERIVED — loading, empty and error are single status rows on the option recipe; the spinner is Button's; Try again is an option row with RefreshCw. Confirm the error text colour (text-primary beside a danger AlertCircle) for the family.",
    "INTERPRETED — the sheet places the bottom Fade at the top of the action region (top: -32px, the pre-2026-11 depth; the eased ramp is 48px). Shipped the same way, so it exists only when there is an action row; a list with no action scrolls to the panel edge with no fade. The band is bound to the list (scrollContainer), so it eases out over the last rows rather than switching off at the end.",
    "INTERPRETED — ArrowDown on a CLOSED field opens it AND highlights the first row (Base UI's open-on-arrow, and the APG pattern); typing opens with nothing highlighted. The behaviour table says ArrowDown \"opens the list if closed\" without saying which.",
    "INTERPRETED — Escape twice clears the committed value as well as the text (Base UI's semantics, and consistent with deleting every character). The table says it \"clears the text\".",
  ],

  knownGaps: [
    "Home/End while open, skipping disabled rows, and the highlight following a row's value across results are reached by stepping Base UI's own arrow-key handling (synthetic ArrowUp/ArrowDown on the input): Base UI exposes no imperative highlight API, disables Home/End for a typeable input, and lets the arrow keys land on disabled combobox rows. Contained to combobox.tsx and asserted in the browser test; worth replacing if Base UI grows the API.",
    "While the list is open, Base UI's focus manager marks everything outside the field and its panel aria-hidden. A second focusable field beside an open combobox is therefore aria-hidden-but-focusable for as long as the list is open (Tab closes the list first). It is Base UI's modal-focus-manager behaviour for an input outside its popup, not something this file opts into.",
    "The glyphs on the field — leading icon, clear, chevron — are text-muted on bg-field, a pair the token contract does not audit (check:contrast refuses to accept it as declared for that reason). Select's chevron and Input's icons sit on the same unaudited pair today. The sheet measures it at the placeholder's 5.93:1 in theme zero; adding [--ui-text-muted, --ui-bg-field] to the contract's pairs is a tokens change for the whole field family, left to that change rather than made here.",
    "No form participation by name (no `name` prop) — the committed value is reported through onValueChange only.",
    "The panel portals into the field's own root by default (as Multiselect's does) so it re-skins under a brand scope; an ancestor with overflow: hidden will clip it. Pass `container` to escape.",
    "No virtualisation: every row is in the DOM. Long async lists should be capped by the caller.",
    "Matched text is not emphasised (see needsDesign).",
  ],

  motion:
    "The control transitions border-color, box-shadow and background-color; rows and the clear square transition background-color; the panel fades and scales from 98% through data-[starting-style]/data-[ending-style] — all at --ui-duration-fast with --ui-ease-out (motionMicro). The Fade's visibility is an opacity transition (Fade's own). The loading spinner is Button's animate-spin, stopped under prefers-reduced-motion.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/3O8K-0",
} as const;

export type ComboboxDoc = typeof comboboxDoc;
