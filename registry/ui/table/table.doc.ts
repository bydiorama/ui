/**
 * Typed documentation for Table.
 *
 * One source for the docs site, Storybook autodocs and MCP answers. Prose that
 * is not here does not exist as far as tooling is concerned (CONVENTIONS §11).
 */

export const tableDoc = {
  name: "Table",
  status: "stable",
  summary:
    "A data surface built from hairlines, not fills. A real <table> with fixed lanes and one flexing column, three densities, sortable headers, row selection with a mixed select-all, and loading and empty bodies that keep the header and the lane widths. It sorts nothing and filters nothing — it reports what the reader asked for.",

  anatomy: [
    {
      part: "table",
      slot: "table",
      notes:
        "The frame: a bg-elevated mat, 1px subtle edge, radius-lg and 4px of padding. Owns className, the ref, data-size, and --ui-table-body-radius.",
    },
    {
      part: "body clip",
      slot: "table-body-clip",
      notes:
        "The node that rounds the header's top corners and the last row's bottom ones, clipping at radius-lg minus the mat's padding — the concentric rule (§6) as arithmetic, landing on the sheet's 12px. It exists because neither of the alternatives works: clipping on the FRAME cuts along the frame's own curve offset by its padding, which is a shallow bite rather than a 12px round, and a <tr> cannot carry a border-radius in either border model.",
    },
    { part: "grid", slot: "table-grid", notes: "The <table>: table-fixed, border-SEPARATE at zero spacing, with a <colgroup> carrying the lane widths and an sr-only <caption>. Separate rather than collapse because border-radius does not apply in the collapsing model at all, and the first data row is rounded." },
    { part: "head", slot: "table-head", notes: "The <thead>. One row, at the size's own height, filled bg-elevated so it reads as part of the mat." },
    { part: "header cell", slot: "table-header-cell", notes: "A <th scope=\"col\">. Carries aria-sort when the column is sortable." },
    { part: "sort", slot: "table-sort", notes: "The sort control, which IS the header cell — full-bleed inside the <th> so its hover fill covers the lane. data-state is none/ascending/descending." },
    { part: "sort indicator", slot: "table-sort-indicator", notes: "A ChevronDown, always in the layout at opacity 0 so revealing it moves nothing. 40% on hover or focus, solid when sorted, rotated for ascending." },
    { part: "body", slot: "table-body", notes: "The <tbody>. Carries aria-busy while loading." },
    { part: "row", slot: "table-row", notes: "A <tr>. Carries data-state selected/default, data-disabled, the press target and the focus ring — but NOT the fill, the divider or the corners. Those are on its cells: a <tr> renders no border-radius in either border model, and the separate model ignores a border on a row." },
    { part: "select-all", slot: "table-select-all", notes: "The header's select lane. Holds a Checkbox whose mixed state resolves to ALL." },
    { part: "select-row", slot: "table-select-row", notes: "A row's select lane. Holds the row's own Checkbox, which is the non-colour half of what a selected row communicates." },
    { part: "cell", slot: "table-cell", notes: "A <td>. Primary ink and medium weight on the primary column, secondary and regular elsewhere. Also carries the row's fill and hover/press states, the 1px bg-elevated divider, and — on the first row's outer two cells — the radius-md top corners." },
    { part: "loading row", slot: "table-loading-row", notes: "A placeholder row at the real row's height, in the real lanes." },
    { part: "skeleton", slot: "table-skeleton", notes: "A composed Skeleton at h-2.5, the denser row's height rather than the component's 16px default. Widths still ripple deterministically by row and column — a visual baseline has to be reproducible, which the harness now achieves by pausing the pulse at its first keyframe rather than by the bar being static. Requires the skeleton item." },
    { part: "empty", slot: "table-empty", notes: "One cell spanning every lane, marked aria-live=\"polite\". Renders whatever `empty` was given." },
  ],

  composition: `
Table<Row>
├─ caption        string (required) — the sr-only accessible name
├─ columns        TableColumn<Row>[]
│   ├─ key          string
│   ├─ header       string          isHeaderHidden?  boolean
│   ├─ width?       number          — omit on ONE column and it flexes
│   ├─ align?       "start" | "end" isNumeric?  boolean
│   ├─ isSortable?  boolean         isPrimary?  boolean
│   └─ cell         (row: Row) => ReactNode
├─ rows           Row[]             getRowId  (row: Row) => string
├─ size?          "sm" | "md" | "lg"   — md is the drawn default
├─ sort? / defaultSort?   TableSort | null      onSortChange?  (sort) => void
├─ isSelectable?  true — then getRowLabel AND selectAllLabel are REQUIRED
│   ├─ selectedIds? / defaultSelectedIds?   string[]
│   └─ onSelectionChange?  (ids: string[]) => void
├─ isRowDisabled? (row: Row) => boolean
├─ isLoading?     boolean           loadingRowCount?  number
└─ empty?         ReactNode — an EmptyState, typically
  `.trim(),

  props: {
    caption: {
      type: "string",
      required: true,
      notes:
        "The table's accessible name, in a visually hidden <caption>. Required for the reason a field's label is: an unnamed table announces as 'table', and a page with three announces three of those. No visible caption is drawn on the sheet, so none is offered — inventing one would mean designing it here.",
    },
    columns: {
      type: "TableColumn<Row>[]",
      required: true,
      notes:
        "The lane system. `width` in px pins a lane; omitting it on exactly one column makes that column flex, which is the sheet's 'lanes are fixed, the primary column flexes'. Density never touches these — it moves row height, inline padding and body size only.",
    },
    rows: {
      type: "Row[]",
      required: true,
      notes:
        "Rendered in the order given. Table sorts nothing: `onSortChange` reports the intent and the data stays with the caller (§9 — no data layer). A component that sorted its own copy would be a second source of truth for the order.",
    },
    getRowId: {
      type: "(row: Row) => string",
      required: true,
      notes: "Stable identity: the React key, and the value the selection API speaks in. Index-based keys break selection the moment rows reorder, which is the first thing sorting does.",
    },
    size: {
      type: '"sm" | "md" | "lg"',
      default: '"md"',
      notes:
        "Row 36/44/56, header 32/40/48, inline padding 12/16/24, body 13/14/16. md is the value the sheet labels 'default'. The select lane follows as 2 x inline + 16 — 40/48/64, exactly as drawn.",
    },
    isSortable: {
      type: "boolean",
      notes:
        "Per column. Offers a real <button> filling the header cell. The indicator is latent (opacity 0) until the column is hovered, focused or sorted — it is present in the layout throughout, so nothing reflows when it appears.",
    },
    isNumeric: {
      type: "boolean",
      notes: "Sets the lane in tabular figures and right-aligns it unless `align` overrides. Figures that do not line up are figures nobody can compare down the page.",
    },
    isPrimary: {
      type: "boolean",
      default: "the first column",
      notes: "The sheet's darker, medium-weight lane. Defaults by position because that is what the sheet draws ('primary · flex'); set it false there, or true elsewhere, to move the emphasis.",
    },
    isHeaderHidden: {
      type: "boolean",
      notes: "Per column. The sheet draws the trailing action lane with an EMPTY header cell — this keeps the name for assistive tech and hides the paint, the same shape a field's isLabelHidden uses.",
    },
    isSelectable: {
      type: "true",
      notes:
        "Turns on the select lane and the select-all box, and REQUIRES getRowLabel and selectAllLabel by the type. A row checkbox with no accessible name announces as 'checkbox', and eight of them announce as eight of those.",
    },
    getRowLabel: {
      type: "(row: Row) => string",
      notes: "Required whenever isSelectable is set. 'Select Jan Tschichold' — the state is already readable; this is what supplies the subject.",
    },
    selectAllLabel: { type: "string", notes: "Required whenever isSelectable is set. Names the header checkbox." },
    onSelectionChange: { type: "(ids: string[]) => void", notes: "Fires with the whole selection, controlled or not. A mixed select-all resolves to ALL — see a11y.keyboard." },
    isRowDisabled: {
      type: "(row: Row) => boolean",
      notes:
        "The row cannot be selected: its checkbox is genuinely `disabled`, its press affordance is gone, and its ink drops to muted. NOT text-disabled, which the sheet draws and which measures 2.09:1 — see needsDesign.",
    },
    isLoading: {
      type: "boolean",
      default: "false",
      notes:
        "The frame keeps its shape and the header stays; only the body changes. aria-busy goes on the <tbody>, so assistive tech is told the region is updating rather than told there are three rows of nothing.",
    },
    layout: {
      type: '"fixed" | "auto"',
      default: '"fixed"',
      notes:
        "How the lanes are sized. `fixed` is the sheet's model and stays the DEFAULT even though the browser's own default is auto — under `auto` the lanes shift between loading and loaded, because the skeleton's placeholder text is not the data's, and lane agreement across header, rows, skeleton and empty state is the whole reason the lane system exists. `auto` hands sizing back to the browser: every lane fits its content, `width` becomes a hint, and the grid grows past its frame rather than squeezing. Reach for it when the content is unknown, which is most tables that were never drawn.",
    },
    minWidth: {
      type: "number",
      notes:
        "A floor for the grid in px, below which the frame scrolls horizontally instead of compressing. Unset by default — a table that fits should not invent a scrollbar. With `auto` it is usually unnecessary; with `fixed` it is the ONLY way to scroll, because `w-full` means the lanes always add up to the container.",
    },
    empty: {
      type: "ReactNode",
      notes:
        "What the body shows when `rows` is empty — an EmptyState, typically. The header and the lane widths stay, because a table that collapses to a sentence loses the one thing that said what was being filtered.",
    },
  },

  do: [
    "Reach for layout=\"auto\" when the content is unknown, and keep `fixed` when the sheet drew the lanes. The trade is lane stability between loading and loaded, not correctness.",
    "Give a wide table a `minWidth` so it scrolls rather than compressing. The scroll region names itself from the caption and becomes a tab stop only while it actually scrolls, which is SC 2.1.1 without a tab stop in front of every table that fits.",
    "Give exactly one column no `width` — that is the lane that flexes.",
    "Mark money, counts and years `isNumeric` so the figures form a column.",
    "Hold the sort state and do the sorting yourself; `onSortChange` reports, it does not act.",
    "Put row actions in a column of their own with `isHeaderHidden`, a fixed width and `align: \"end\"` — the sheet's trailing lane is a column like any other.",
    "Pass an EmptyState to `empty` so a filtered-to-nothing table still says what to do next.",
  ],

  dont: [
    "Do not sort `rows` inside a render function passed to `cell` — the cell is called per row and cannot see the set.",
    "Do not use the row index as `getRowId`; sorting reorders rows and the selection follows the wrong ones.",
    "Do not put a second interactive control in the primary cell expecting the row press to ignore it — it will, but a row that both navigates and selects is two contracts on one target.",
    "Do not set `isLoading` and pass `empty` expecting both; loading wins, which is the correct order — an empty state shown while data is in flight tells the reader the search failed.",
    "Do not reach for a Table to lay out a form or a card grid. This is tabular data; the semantics are the product.",
  ],

  a11y: {
    role:
      "A native <table> with <caption>, <thead>, <th scope=\"col\"> and <tbody>. No ARIA table roles: a grid of divs with ARIA bolted on can only re-describe what the elements already say.",
    name: "The `caption` prop, in a visually hidden <caption> element.",
    keyboard: [
      { keys: "Tab", does: "Moves through the select-all box, then each row's checkbox and each row's own controls, in visual order." },
      { keys: "Space", does: "Toggles the focused checkbox. Native behaviour — nothing here re-implements it." },
      { keys: "Enter / Space", does: "Activates a column's sort control, flipping to descending if that column is already ascending." },
      { keys: "Click on a row", does: "Toggles selection, when the table is selectable. A pointer convenience for what the checkbox already does; a click that came from a control inside the row is left alone." },
    ],
    targetSize:
      "Every checkbox is a Checkbox, whose label row is padded to a 24px target around an 18px box — SC 2.5.8's floor. The sort control fills its header cell: 32px tall at the smallest size, and the full lane wide.",
    focus:
      "Each control owns its own indicator. The ROW additionally draws a 2px inset outline whenever a control inside it has focus-visible, which is what the sheet's focus row is describing — it says which row you are standing in while tabbing down a column of checkboxes. An outline rather than a box-shadow, so it survives forced-colors mode.",
    selection:
      "A selected row is its wash plus its checked box — no leading edge, no marker. Rows are not tab stops and carry no aria-selected. Everything a row does is reachable from the checkbox inside it, and aria-selected on a row is only meaningful inside role=\"grid\" — which would mean full APG grid navigation, not an attribute. A mixed select-all resolves to ALL, never to none: at three of eight chosen, 'the rest too' is the far more common intent and the undo for guessing wrong is eight clicks.",
    contrastPairs: [
      { fg: "--ui-text-primary", bg: "--ui-bg-surface", floor: "text", role: "the primary column's ink on a resting row" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-surface", floor: "text", role: "every other column's ink on a resting row" },
      { fg: "--ui-text-muted", bg: "--ui-bg-surface", floor: "text", role: "a disabled row's ink — the sheet's text-disabled measures 2.09:1 here, see needsDesign" },
      { fg: "--ui-text-muted", bg: "--ui-bg-elevated", floor: "text", role: "a resting column header, on the mat" },
      { fg: "--ui-text-primary", bg: "--ui-bg-hover", floor: "text", role: "the hovered row's primary ink, and a sortable header's label under the pointer" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-hover", floor: "text", role: "the hovered row's other lanes" },
      { fg: "--ui-text-muted", bg: "--ui-bg-hover", floor: "text", role: "the other column headers while one of them is hovered" },
      { fg: "--ui-text-primary", bg: "--ui-bg-active", floor: "text", role: "the pressed row's primary ink" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-active", floor: "text", role: "the pressed row's other lanes" },
      { fg: "--ui-text-primary", bg: "--ui-bg-accent-subtle", floor: "text", role: "the selected row's primary ink" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-accent-subtle", floor: "text", role: "the selected row's other lanes" },
      { fg: "--ui-text-primary", bg: "--ui-bg-accent-subtle-hover", floor: "text", role: "the selected row under the pointer" },
      { fg: "--ui-text-secondary", bg: "--ui-bg-accent-subtle-hover", floor: "text", role: "the same row's other lanes" },
      {
        fg: "--ui-focus-ring-color",
        bg: "--ui-bg-surface",
        floor: "non-text",
        role: "the row's focus outline. Every other ring pair in this system is measured against the page; a row is one surface step off it",
      },
      {
        fg: "--ui-bg-elevated",
        bg: "--ui-bg-surface",
        floor: "decorative",
        why: "The row divider, which is the mat itself showing between rows that float on it — 1.08:1 light, 1.25:1 dark. It separates rows that are already separated by their content and their lane alignment; a conformant hairline here would draw a grid, which is the thing the sheet is explicitly not doing.",
      },
      {
        fg: "--ui-bg-sunken",
        bg: "--ui-bg-surface",
        floor: "decorative",
        why: "The loading placeholder bars. They carry no information — aria-busy on the body is what tells anyone anything — and a conformant bar would read as content that has arrived.",
      },
    ],
  },

  forwarding: {
    ref: "The outermost node, the frame. Table is not a form control, so the §5 default applies — and it is a plain `ref` prop rather than forwardRef, which erases the `Row` type parameter. React 19 takes ref as a prop natively.",
    className: "Lands on the frame, so width, margin and a max-height wrapper behave predictably. The <table> itself is data-slot=\"table-grid\".",
    rest: "Not spread. Table's surface is its named props; reaching an inner part is what the data-slots are for.",
  },

  /** Open questions for design. Collected by `pnpm design:gaps`. */
  needsDesign: [
    "Hover and pressed rows are painted the SAME value (--ui-neutral-95) while the sheet's own gutter annotates them bg-hover and bg-active. Two states that render identically give a press no feedback at all. Shipped per the annotation. Confirm.",
    "The frame, the header fill and the row divider are all drawn as the raw palette step --ui-neutral-95. Shipped as --ui-bg-elevated, the role that resolves to it — a palette step in a component is a role that has not been named.",
    "The selected+hover row is a raw hex (#C3DBE7), annotated 'new token'. Shipped as --ui-bg-accent-subtle-hover, pinned to that hex in light and derived at the matching alpha in dark.",
    "The sortable-hover and sorted-descending header rows appear SWAPPED: the sheet's hover row is weight 600 with a solid arrow and its sorted row is 550 with a muted one, the opposite of the gutter. Shipped per the gutter — which is also the version that does not reflow the header on hover.",
    "The header-state matrix types its labels 550 / 0.02em / leading-flat; five other header rows on the sheet use label-sm / 500 / leading-normal. Shipped as the majority. Confirm the outlier.",
    "sm is annotated 'radius-md 8' and painted radius-lg, like md and lg. Shipped uniform at radius-lg.",
    "The inner radius is drawn at 12px, which is off the --ui-radius-* scale (4/8/16/24/32). Shipped as calc(radius-lg - space-xs) on a clipping node of its own, which is the concentric arithmetic and lands on 12 exactly. Confirm, or put 12 on the scale.",
    "The first data row is drawn with radius-md top corners while the header above it and the last row below it are drawn at 12px — three different corner values in one frame. All three ship as drawn.",
    "The selected row's '3px accent-legible edge' is annotated in the gutter and never painted. NOT shipped: selection is only reachable through the select lane, so a selected row always carries a checked box, which is the non-colour channel SC 1.4.1 asks for. Building it also floored --ui-bg-accent-legible against the accent wash and darkened the Switch, the Slider, Progress and ImageUpload — a table row costing four other components a shade. Confirm the annotation is stale.",
    "The disabled row is annotated text-disabled, which measures 2.09:1 in light. WCAG exempts an inactive CONTROL's label; a row's DATA is content. Shipped at text-muted, the quietest ink that clears AA here.",
    "The checkbox is scaled 16/18/20 with radii 4/4/5 across the three sizes, and the Checkbox sheet defines exactly one 18px box at radius-sm — 5px is off the radius scale. Shipped at 18 everywhere. If Checkbox should grow a size axis that is Checkbox's change, with its own sheet.",
    "The gap between a header label and its sort arrow is 6px, which is off the spacing scale (4/8/12). Shipped at space-xs.",
    "The latent sort arrow and the visible one are DIFFERENT glyphs on the sheet — a stemmed down-arrow at opacity 0, a chevron when shown. Shipped as ChevronDown throughout.",
    "No scroll behaviour is drawn. Lanes shrink proportionally below their declared widths rather than overflowing, because the frame clips to draw its corners. Confirm what a table narrower than its lane sum should do.",
    "No focused-ROW behaviour is drawn beyond the ring: the sheet shows a focus ring on a row containing no focusable element. Rows are not tab stops here. Confirm whether a row should be activatable, which would make this a grid.",
    "No sticky header is drawn, and the frame clips, so one cannot be added without changing the frame.",
  ],

  knownGaps: [
    "The row fill, the divider and the first row's corners live on the CELLS, not the row. A consumer styling the table-row slot with a background paints behind the cells and sees nothing; reach for the table-cell slot instead.",
    "With `rows` empty and no `empty` passed, the body is one blank row at the lane widths. That is deliberate — the frame never collapses — but it says nothing, so pass an EmptyState.",
    "A selected row is distinguished by its wash and by its checked box, and by nothing else. There is no leading edge or marker; a consumer who needs one adds it to a cell through the table-cell slot.",
    "Table sorts and filters nothing. `onSortChange` reports the intent; ordering the rows is the caller's.",
    "Row selection has no shift-click range. The checkbox and the row press each toggle one row.",
    "The row press has no keyboard counterpart of its own — the checkbox inside the row is that path. There is no way to activate a row from the keyboard without moving to its checkbox first.",
    "Under the default `fixed` layout a table still fits its container by squeezing, because `w-full` makes the lanes add up to it — `minWidth` or `layout=\"auto\"` is what makes it scroll instead. What no longer happens is the frame CLIPPING the overflow away, which is what it used to do: columns past the edge disappeared with no affordance at all.",
    "Column widths are px numbers. Percentages and fr units are not supported — the lane system exists so the header, the rows, the skeleton and the empty state agree, and mixed units make that agreement conditional on the container. `layout=\"auto\"` is the escape hatch, and it trades exactly that agreement away: the lanes will move when the data arrives.",
    "No column-priority hiding and no card/stacked view. The two other standard responsive strategies are compositions rather than props — a caller narrows `columns` at a breakpoint, or renders something else entirely below one.",
    "`isLoading` wins over `empty`. There is no state that shows both.",
    "The focus ring on a row is square; the sheet draws it at radius-sm. A <tr> cannot reliably take a border-radius in either border model, and the ring is drawn on the row rather than on its cells.",
  ],

  motion:
    "Rows transition `background-color` on hover; sortable header cells transition `background-color` and `color`; the sort indicator transitions `opacity` and `rotate`, so it fades in when a column is asked about and flips between ascending and descending. All at --ui-duration-fast with --ui-ease-out. `rotate` is named individually — Tailwind v4 writes it standalone. The glyph is always in the layout, so revealing it moves nothing.",

  design: "https://app.paper.design/file/01KZ39A2BC286MT85M658NRR4R/8-0/SWQ-0",
} as const;

export type TableDoc = typeof tableDoc;
