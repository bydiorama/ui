import {
  useCallback, useEffect, useId, useRef, useState,
  type CSSProperties, type MouseEvent, type ReactNode, type Ref,
} from "react";
import { ChevronDown } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { Checkbox } from "@/ui/checkbox";
import { Skeleton } from "@/ui/skeleton";
import { useControllableState } from "@/hooks/use-controllable-state";

export type TableSize = "lg" | "md" | "sm";
export type TableLayout = "fixed" | "auto";
export type TableSortDirection = "ascending" | "descending";

export interface TableSort {
  columnKey: string;
  direction: TableSortDirection;
}

/**
 * Density, transcribed from the sheet's own Sizes section.
 *
 * "Density changes row height, inline padding and body size — never the lane
 * system", which is why the lane widths belong to the caller and only these
 * five values move.
 */
const SIZE = {
  sm: { row: "h-9", head: "h-8", body: "text-body-sm", inline: 12, pl: "pl-md", pr: "pr-md" },
  md: { row: "h-11", head: "h-10", body: "text-body-md", inline: 16, pl: "pl-lg", pr: "pr-lg" },
  lg: { row: "h-14", head: "h-12", body: "text-body-lg", inline: 24, pl: "pl-xl", pr: "pr-xl" },
} as const satisfies Record<TableSize, { row: string; head: string; body: string; inline: number; pl: string; pr: string }>;

/**
 * The select lane is `2 x inline + 16` at every size — 40 / 48 / 64, which is
 * what the sheet draws at sm, md and lg. Written as arithmetic rather than as
 * three numbers so a fourth size cannot land somewhere else.
 */
const selectLaneWidth = (size: TableSize) => SIZE[size].inline * 2 + 16;

/** The sheet draws three different bar lengths down the loading body. */
const SKELETON_WIDTHS = ["w-3/5", "w-2/5", "w-4/5"] as const;

/**
 * Anything inside a row that answers a click on its own.
 *
 * A press on the row toggles selection, and the checkbox inside it does the
 * same — so without this guard a click on the checkbox toggles twice and lands
 * back where it started. It is what makes row-press work at all, not a nicety.
 */
const INTERACTIVE =
  "a,button,input,select,textarea,label,[role='button'],[role='link'],[role='menuitem'],[contenteditable='true']";

export interface TableColumn<Row> {
  /** Stable identity. The React key, and the value in `sort.columnKey`. */
  key: string;
  /**
   * The column's name. Always a string, never a slot: it is the header every
   * cell beneath it is associated with, and a `<th>` full of markup announces
   * the markup.
   */
  header: string;
  /**
   * Visually hide the header while keeping it for assistive tech. The sheet
   * draws the trailing action lane with an EMPTY header cell, and an unnamed
   * column is one a screen reader cannot explain. Same shape as a field's
   * `isLabelHidden` (§10).
   */
  isHeaderHidden?: boolean;
  /**
   * The lane, in px. Omit it on exactly one column and that column FLEXES —
   * the sheet's "lanes are fixed, the primary column flexes". Omit it on
   * several and they share what is left.
   */
  width?: number;
  /** `end` right-aligns the lane. Never `left`/`right` (§10). */
  align?: "start" | "end";
  /**
   * Sets the lane in tabular figures so digits form a column, and right-aligns
   * it unless `align` says otherwise. Figures that do not line up are figures
   * nobody can compare down the page.
   */
  isNumeric?: boolean;
  /**
   * Offers the column's sort control. The Table reports the intent and sorts
   * NOTHING: the rows it renders are the rows it was handed, in the order it
   * was handed them.
   */
  isSortable?: boolean;
  /**
   * The sheet's darker, medium-weight lane. Defaults to the first data column,
   * which is what the sheet draws ("primary · flex"). Set it false there, or
   * true elsewhere, to move the emphasis.
   */
  isPrimary?: boolean;
  /** The cell body for one row. A render prop, so the row type flows through. */
  cell: (row: Row) => ReactNode;
}

interface TableBaseProps<Row> {
  /**
   * The table's accessible name, in a visually hidden `<caption>`. Required
   * for the reason a field's `label` is: an unnamed table announces as
   * "table", and a page with three of them announces three of those. The sheet
   * draws no visible caption, so none is offered rather than invented.
   */
  caption: string;
  columns: TableColumn<Row>[];
  /** Rendered in the order given. Sorting and filtering stay with the caller. */
  rows: Row[];
  /** Stable identity per row, and the value the selection API speaks in. */
  getRowId: (row: Row) => string;
  size?: TableSize;
  /** Controlled sort. `null` means no column is sorted. */
  sort?: TableSort | null;
  defaultSort?: TableSort | null;
  /** Fires with the column and direction the reader asked for. */
  onSortChange?: (sort: TableSort) => void;
  /**
   * Rows the reader can see but not act on: muted ink, no hover, and a
   * checkbox that is genuinely `disabled` rather than merely ignored.
   */
  isRowDisabled?: (row: Row) => boolean;
  /**
   * The frame keeps its shape and the header stays; only the body changes.
   * `aria-busy` goes on the body, so assistive tech is told the region is
   * updating rather than told there are three rows of nothing.
   */
  isLoading?: boolean;
  /** How many placeholder rows to draw. Purely visual. */
  loadingRowCount?: number;
  /**
   * What the body shows when `rows` is empty — an `EmptyState`, typically.
   * The header and the lane widths stay: a table that collapses to a sentence
   * loses the one thing that said what was being filtered.
   */
  empty?: ReactNode;
  /**
   * How the lanes are sized.
   *
   * `fixed` is the DEFAULT and it is what the sheet draws: lanes are declared,
   * the primary column flexes, and the header, the rows, the skeleton and the
   * empty state all agree because none of them depends on content. That
   * agreement is the whole reason the lane system exists, and it is the reason
   * this default differs from the browser's — under `auto` the lanes shift
   * between loading and loaded, because the skeleton's placeholder text is not
   * the data's.
   *
   * `auto` is the browser's own algorithm: every lane sizes to its content,
   * `width` becomes a hint rather than an instruction, and the table grows past
   * its container rather than squeezing. Reach for it when the content is
   * unknown — which is most tables that were not drawn — and accept the shift.
   */
  layout?: TableLayout;
  /**
   * A floor for the grid, in px, below which the frame scrolls horizontally
   * instead of compressing.
   *
   * Optional and unset by default, because a table that fits should not invent
   * a scrollbar. With `layout="auto"` it is usually unnecessary: content
   * already pushes the grid past the frame. With `fixed` it is the ONLY way to
   * scroll, since `w-full` means the lanes always add up to the container.
   */
  minWidth?: number;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Selection is all-or-nothing, and its labels are REQUIRED by the type.
 *
 * A row checkbox with no accessible name announces as "checkbox", and eight of
 * them announce as eight checkboxes called "checkbox" — the state is readable
 * and the subject is not. Making that a compile error is the trade Button's
 * `isIconOnly` makes: invisible in every visual check, total for a screen
 * reader user, free to catch here.
 */
interface SelectableProps<Row> {
  isSelectable: true;
  /** Names one row's checkbox: "Select Jan Tschichold". */
  getRowLabel: (row: Row) => string;
  /** Names the header checkbox: "Select all designers". */
  selectAllLabel: string;
  selectedIds?: string[];
  defaultSelectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

interface NonSelectableProps {
  isSelectable?: false;
  getRowLabel?: never;
  selectAllLabel?: never;
  selectedIds?: never;
  defaultSelectedIds?: never;
  onSelectionChange?: never;
}

export type TableProps<Row> = TableBaseProps<Row> & (SelectableProps<Row> | NonSelectableProps);

/**
 * A data surface built from hairlines, not fills.
 *
 * A real `<table>`, because the semantics are the product: the row/column
 * relationship, a sortable column header, a caption. A grid of divs with ARIA
 * bolted on can only ever re-describe what `<th scope>` already says.
 *
 * The frame is a `bg-elevated` mat with `p-xs` of padding, and the body inside
 * it clips at `--ui-table-body-radius` — `radius-lg` minus that padding, which
 * is the concentric rule (§6) written as arithmetic. It lands on the sheet's
 * 12px exactly, and 12 is not a step on the `--ui-radius-*` scale
 * (4/8/16/24/32), so writing it as a value would have meant writing a step
 * that does not exist.
 *
 * The dividers are `border-b-elevated`: the mat itself, showing between rows
 * that float on it. A dedicated border role would be one more value free to
 * drift from the surface it is imitating.
 *
 * The fill, the divider and the first row's corners all sit on the CELLS. That
 * is not a preference — `border-radius` does not apply in the collapsing
 * border model and a `<tr>` renders none in either, so the sheet's rounded
 * first row forces the separate model, and once the corners are on the cells a
 * row-level fill would paint a square corner behind them.
 *
 * `ref` is a plain prop rather than `forwardRef` because this component is
 * generic in `Row`, and `forwardRef` erases the type parameter. React 19 takes
 * `ref` as a prop natively, so §5 is satisfied without the cast that idiom
 * normally needs.
 */
export function Table<Row>({
  caption,
  columns,
  rows,
  getRowId,
  size = "md",
  sort,
  defaultSort = null,
  onSortChange,
  isRowDisabled,
  isLoading = false,
  loadingRowCount = 3,
  empty,
  layout = "fixed",
  minWidth,
  isSelectable = false,
  getRowLabel,
  selectAllLabel,
  selectedIds,
  defaultSelectedIds,
  onSelectionChange,
  className,
  ref,
}: TableProps<Row>) {
  const metrics = SIZE[size];
  const captionId = useId();

  /**
   * The scroll region is a tab stop ONLY while it actually scrolls.
   *
   * A region a keyboard user cannot reach is content they cannot read (SC
   * 2.1.1), so a scrolling frame has to be focusable. Making it unconditionally
   * focusable is the version most implementations ship, and it puts a silent,
   * nameless tab stop in front of every table that fits — so the tabindex is
   * driven by measurement instead. `scrollWidth > clientWidth` is the whole
   * test, re-run on resize because the answer changes with the viewport rather
   * than with the data.
   */
  const clip = useRef<HTMLDivElement | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  useEffect(() => {
    const node = clip.current;
    if (!node) return;
    const measure = () => setIsScrollable(node.scrollWidth > node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
    // Re-measured when the shape of the grid changes, not only on resize: a
    // column added or a layout swapped changes the answer without any element
    // changing size.
  }, [columns, layout, minWidth, size, isSelectable]);

  const [activeSort, setSort] = useControllableState<TableSort | null>({
    ...(sort !== undefined ? { value: sort } : {}),
    defaultValue: defaultSort,
    ...(onSortChange
      ? {
          onChange: (next: TableSort | null) => {
            if (next) onSortChange(next);
          },
        }
      : {}),
  });

  const [selection, setSelection] = useControllableState<string[]>({
    ...(selectedIds !== undefined ? { value: selectedIds } : {}),
    defaultValue: defaultSelectedIds ?? [],
    ...(onSelectionChange ? { onChange: onSelectionChange } : {}),
  });

  const selectableIds = rows.filter((row) => !isRowDisabled?.(row)).map(getRowId);
  const selectedSet = new Set(selection);
  const selectedCount = selectableIds.filter((id) => selectedSet.has(id)).length;
  const isAllSelected = selectableIds.length > 0 && selectedCount === selectableIds.length;
  const isSomeSelected = selectedCount > 0 && !isAllSelected;

  const toggleRow = useCallback(
    (id: string, isChecked: boolean) => {
      setSelection(
        isChecked
          ? [...selection.filter((each) => each !== id), id]
          : selection.filter((each) => each !== id),
      );
    },
    [selection, setSelection],
  );

  /**
   * A mixed box resolves to "all", never to "none". Clicking it when three of
   * eight are chosen means "the rest too" far more often than it means
   * "discard what I picked", and the undo for the wrong guess is eight clicks.
   */
  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelection(selection.filter((id) => !selectableIds.includes(id)));
      return;
    }
    setSelection([...new Set([...selection, ...selectableIds])]);
  }, [isAllSelected, selection, selectableIds, setSelection]);

  const requestSort = useCallback(
    (columnKey: string) => {
      const isSame = activeSort?.columnKey === columnKey;
      setSort({
        columnKey,
        direction: isSame && activeSort?.direction === "ascending" ? "descending" : "ascending",
      });
    },
    [activeSort, setSort],
  );

  const handleRowClick = (row: Row, id: string) => (event: MouseEvent<HTMLTableRowElement>) => {
    if (isRowDisabled?.(row)) return;
    // A click that came from the row's own checkbox, its action button or a
    // link has already been answered. Toggling again would undo it.
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    toggleRow(id, !selectedSet.has(id));
  };

  const columnCount = columns.length + (isSelectable ? 1 : 0);

  /**
   * Every cell's inline padding. The lane gutter sits on its RIGHT — the sheet
   * draws `padding-right` on all of them — and the leading lane opens the row.
   */
  const padding = (index: number) => cn(metrics.pr, index === 0 && !isSelectable && metrics.pl);

  /**
   * A row's fill, its divider and its corners — on the CELLS, because that is
   * the only place they can be.
   *
   * `border-radius` does not apply in the collapsing border model, and a `<tr>`
   * does not render one in either model, so the sheet's rounded first row is a
   * property of its cells. Once the corners are there the fill has to follow:
   * a row-level background would paint a square corner behind a rounded cell.
   * The divider follows too — the separate model ignores borders on a row.
   */
  const rowSurface = (options: {
    isSelected?: boolean;
    isPressable?: boolean;
    isFirst: boolean;
    isLast: boolean;
    isLeading: boolean;
    isTrailing: boolean;
  }) =>
    cn(
      "transition-[background-color]", motionMicro,
      options.isSelected ? "bg-accent-subtle" : "bg-surface",
      options.isPressable &&
        (options.isSelected
          ? "group-hover/row:bg-accent-subtle-hover group-active/row:bg-accent-subtle-hover"
          : "group-hover/row:bg-hover group-active/row:bg-active"),
      // The mat showing between rows that float on it. Not on the last row:
      // the frame's own padding closes the body.
      !options.isLast && "border-b border-b-elevated",
      // The sheet rounds the FIRST data row's top corners at radius-md, so the
      // body reads as a slab under the header rather than as its continuation.
      // The last row's bottom corners are the body clip's, at the concentric
      // radius.
      options.isFirst && options.isLeading && "rounded-tl-md",
      options.isFirst && options.isTrailing && "rounded-tr-md",
    );

  return (
    <div
      ref={ref}
      data-slot="table"
      data-size={size}
      style={
        {
          // The concentric radius, as the arithmetic rather than as a number
          // (§6): outer minus the mat's padding. It lands on the sheet's 12px
          // exactly, and 12 is not on the --ui-radius-* scale, so writing it
          // as a value would have meant writing a step that does not exist.
          "--ui-table-body-radius": "calc(var(--ui-radius-lg) - var(--ui-space-xs))",
        } as CSSProperties
      }
      className={cn("w-full rounded-lg border border-edge-subtle bg-elevated p-xs", className)}
    >
      {/*
        The body's own clip, and the reason it is a separate node.

        Clipping on the FRAME cuts the corners along the frame's 15px curve
        offset by 4px of padding, which is a shallow bite rather than a 12px
        round — visibly not the corner the sheet draws. A `<tr>` cannot carry a
        border-radius in either border model, so the radius cannot go on the
        rows either. One element that clips at exactly the inner radius solves
        both, and leaves the rows and cells untouched.
      */}
      {/*
        `overflow-x-auto`, not `overflow-clip`. It still clips the corners —
        any non-visible overflow does — and it adds the one thing clipping
        could not: a table too wide for its frame SCROLLS rather than losing
        its right-hand columns silently. Clipping was the documented behaviour
        and it is the worse half of the two, because data disappears with no
        affordance at all.

        role/aria/tabIndex are applied together or not at all: a named region
        that cannot be reached is as useless as a reachable one with no name.
      */}
      <div
        ref={clip}
        data-slot="table-body-clip"
        data-scrollable={isScrollable || undefined}
        className="overflow-x-auto rounded-(--ui-table-body-radius)"
        {...(isScrollable ? { role: "region", "aria-labelledby": captionId, tabIndex: 0 } : {})}
      >
        <table
          data-slot="table-grid"
          {...(minWidth === undefined ? {} : { style: { minWidth } })}
          className={cn(
            // SEPARATE, not collapse. `border-radius` does not apply in the
            // collapsing model at all, and the sheet rounds the first data
            // row's top corners — so the corners, the row fills and the
            // dividers all have to live on the CELLS. `border-spacing-0`
            // keeps them touching, which is what collapse was doing for us.
            "w-full border-separate border-spacing-0 text-left",
            layout === "auto" ? "table-auto" : "table-fixed",
            metrics.body,
          )}
        >
        <caption id={captionId} className="sr-only">{caption}</caption>

        <colgroup>
          {isSelectable ? <col style={{ width: selectLaneWidth(size) }} /> : null}
          {columns.map((column) => (
            <col
              key={column.key}
              {...(column.width === undefined ? {} : { style: { width: column.width } })}
            />
          ))}
        </colgroup>

        <thead data-slot="table-head">
          <tr data-slot="table-header-row" className={metrics.head}>
            {isSelectable ? (
              <th
                scope="col"
                data-slot="table-select-all"
                className={cn("bg-elevated align-middle", metrics.pl)}
              >
                <Checkbox
                  // `flex`, not Checkbox's own `inline-flex`. An inline-flex
                  // box is BASELINE-aligned in the cell, and its baseline is
                  // its first flex item's — which holds a glyph when checked
                  // or mixed and nothing when unchecked. The header box moved
                  // half a pixel every time the selection changed, which reads
                  // as a wiggle because it is one. A block-level flex box is
                  // laid out by the cell's align-middle instead, so the glyph
                  // cannot move it.
                  className="flex"
                  isChecked={isAllSelected}
                  isIndeterminate={isSomeSelected}
                  isDisabled={selectableIds.length === 0}
                  onCheckedChange={toggleAll}
                >
                  <span className="sr-only">{selectAllLabel}</span>
                </Checkbox>
              </th>
            ) : null}

            {columns.map((column, index) => {
              const sorted =
                activeSort && activeSort.columnKey === column.key ? activeSort : null;
              const isEnd = column.align === "end" || (column.isNumeric && column.align === undefined);
              const label = (
                <span className={cn(column.isHeaderHidden && "sr-only")}>{column.header}</span>
              );

              return (
                <th
                  key={column.key}
                  scope="col"
                  data-slot="table-header-cell"
                  {...(sorted
                    ? { "aria-sort": sorted.direction }
                    : column.isSortable
                      ? { "aria-sort": "none" as const }
                      : {})}
                  className={cn(
                    "bg-elevated font-body text-label-sm leading-normal font-medium align-middle",
                    sorted ? "text-ink-primary" : "text-ink-muted",
                    isEnd && "text-right",
                    // A sortable header's fill covers the whole lane, so its
                    // padding belongs to the button that draws that fill.
                    column.isSortable ? "p-0" : padding(index),
                  )}
                >
                  {column.isSortable ? (
                    <button
                      type="button"
                      data-slot="table-sort"
                      data-state={sorted ? sorted.direction : "none"}
                      onClick={() => requestSort(column.key)}
                      className={cn(
                        // The size's own header height, NOT `h-full`: a table
                        // cell has no definite height for a child percentage
                        // to resolve against, so `h-full` measured 16px — the
                        // glyph — and the hover fill was a stripe through the
                        // middle of the lane.
                        "group/sort flex w-full cursor-pointer items-center gap-xs",
                        metrics.head,
                        isEnd && "justify-end",
                        padding(index),
                        sorted && "font-bold text-ink-primary",
                        "transition-[background-color,color]", motionMicro,
                        "hover:bg-hover hover:text-ink-primary",
                        // No bare `outline` beside `outline-2`: tailwind-merge
                        // reads the two as one group and DELETES the first, so
                        // the style keyword never reaches the DOM. v4's
                        // `outline-2` already carries `--tw-outline-style:
                        // solid` — the same shape Button uses.
                        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring",
                      )}
                    >
                      {label}
                      <ChevronDown
                        aria-hidden="true"
                        data-slot="table-sort-indicator"
                        className={cn(
                          "size-4 shrink-0",
                          "transition-[opacity,rotate]", motionMicro,
                          // Latent until the column is asked about. The glyph
                          // is always in the layout, so revealing it moves
                          // nothing — which is why it is opacity rather than a
                          // conditional render.
                          sorted
                            ? "opacity-100"
                            : "opacity-0 group-hover/sort:opacity-40 group-focus-visible/sort:opacity-40",
                          sorted?.direction === "ascending" && "rotate-180",
                        )}
                      />
                    </button>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody data-slot="table-body" {...(isLoading ? { "aria-busy": true } : {})}>
          {isLoading ? (
            Array.from({ length: loadingRowCount }, (_, rowIndex) => {
              const surface = {
                isFirst: rowIndex === 0,
                isLast: rowIndex === loadingRowCount - 1,
              };
              return (
              <tr key={`loading-${rowIndex}`} data-slot="table-loading-row" className={metrics.row}>
                {isSelectable ? (
                  <td
                    className={cn(
                      "align-middle",
                      metrics.pl,
                      rowSurface({ ...surface, isLeading: true, isTrailing: false }),
                    )}
                  >
                    <span className="block size-4.5 rounded-sm bg-sunken" />
                  </td>
                ) : null}
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={cn(
                      "align-middle",
                      padding(index),
                      rowSurface({
                        ...surface,
                        isLeading: !isSelectable && index === 0,
                        isTrailing: index === columns.length - 1,
                      }),
                    )}
                  >
                    <Skeleton
                      data-slot="table-skeleton"
                      className={cn(
                        // 10px, not Skeleton's 16px default: these sit inside
                        // a dense row rather than standing in for a line of
                        // body text.
                        "h-2.5",
                        // A deterministic ripple rather than random widths: a
                        // visual baseline has to be reproducible.
                        SKELETON_WIDTHS[(rowIndex + index) % SKELETON_WIDTHS.length],
                        (column.align === "end" || column.isNumeric) && "ml-auto",
                      )}
                    />
                  </td>
                ))}
              </tr>
              );
            })
          ) : rows.length === 0 ? (
            <tr data-slot="table-empty-row">
              {/*
                `aria-live` rather than `role="status"`: a status role would
                REPLACE the cell's own role and take the row/column
                relationship with it. The attribute is global and changes
                nothing about what this element is.
              */}
              <td
                data-slot="table-empty"
                colSpan={columnCount}
                aria-live="polite"
                // The empty body is a first row like any other, so it takes
                // the same corners. The rule is "the body's top edge is
                // rounded", not "a data row is".
                className="rounded-t-md bg-surface"
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => {
              const isFirst = rowIndex === 0;
              const isLast = rowIndex === rows.length - 1;
              const id = getRowId(row);
              const isDisabled = isRowDisabled?.(row) ?? false;
              const isSelected = selectedSet.has(id);
              const isPressable = isSelectable && !isDisabled;

              return (
                <tr
                  key={id}
                  data-slot="table-row"
                  data-state={isSelected ? "selected" : "default"}
                  {...(isDisabled ? { "data-disabled": true } : {})}
                  {...(isPressable ? { onClick: handleRowClick(row, id) } : {})}
                  className={cn(
                    "group/row",
                    metrics.row,
                    isPressable && "cursor-pointer",
                    // The row a keyboard user is standing in. Rows are not tab
                    // stops — everything a row does is reachable from the
                    // checkbox inside it — so this fires when a control in the
                    // row takes focus, which is the state the sheet is drawing.
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-focus-ring",
                  )}
                >
                  {isSelectable ? (
                    <td
                      data-slot="table-select-row"
                      className={cn(
                        "align-middle",
                        metrics.pl,
                        rowSurface({
                          isSelected,
                          isPressable,
                          isFirst,
                          isLast,
                          isLeading: true,
                          isTrailing: false,
                        }),
                      )}
                    >
                      <Checkbox
                        // See the header box: block-level, so a row's own
                        // checkbox cannot shift when its glyph appears.
                        className="flex"
                        isChecked={isSelected}
                        isDisabled={isDisabled}
                        onCheckedChange={(next) => toggleRow(id, next)}
                      >
                        <span className="sr-only">{getRowLabel?.(row)}</span>
                      </Checkbox>
                    </td>
                  ) : null}

                  {columns.map((column, index) => {
                    const isPrimary = column.isPrimary ?? (index === 0);
                    const isEnd =
                      column.align === "end" || (column.isNumeric && column.align === undefined);

                    return (
                      <td
                        key={column.key}
                        data-slot="table-cell"
                        className={cn(
                          "align-middle leading-normal tracking-normal",
                          padding(index),
                          rowSurface({
                            isSelected,
                            isPressable,
                            isFirst,
                            isLast,
                            isLeading: !isSelectable && index === 0,
                            isTrailing: index === columns.length - 1,
                          }),
                          isPrimary ? "font-medium" : "font-regular",
                          // The sheet draws a disabled row in `text-disabled`,
                          // which measures 2.09:1 in light. WCAG exempts an
                          // inactive CONTROL's label; a row's data is content,
                          // and a name nobody can read is not a quieter row,
                          // it is a lost one. `muted` is the quietest ink that
                          // still clears AA on this surface.
                          isDisabled
                            ? "text-ink-muted"
                            : isPrimary
                              ? "text-ink-primary"
                              : "text-ink-secondary",
                          isEnd && "text-right",
                          column.isNumeric && "tabular-nums",
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
