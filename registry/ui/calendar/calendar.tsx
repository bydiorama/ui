"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type Ref,
} from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "griddy-icons";

import { cn } from "@/lib/cn";
import { chromeControl } from "@/lib/chrome-control";
import { useControllableState } from "@/hooks/use-controllable-state";

/**
 * A month grid for picking one date.
 *
 * Ours, not a library's (ADR 0012): the hard parts here are the ARIA grid and
 * the keyboard contract, and both are decisions this system has to own. Date
 * arithmetic is done with plain `Date` at local noon — see `addDays`.
 *
 * Month and weekday names come from `Intl`, a platform built-in, so a consumer
 * in another locale gets their own names without this library shipping a
 * translation table it would have to maintain.
 */

/**
 * All arithmetic happens at 12:00 local.
 *
 * A date at midnight plus 24 hours is not reliably the next day: on the
 * morning a DST transition moves the clock forward, midnight + 24h lands on
 * the same date twice, or skips one. Noon has twelve hours of slack in both
 * directions, so no real-world offset can push it across a day boundary.
 */
function at(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function startOfDay(date: Date): Date {
  return at(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return at(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  // Day 1, so adding a month to the 31st cannot roll into the month after
  // next — `new Date(2026, 0, 31)` plus one month is 3 March, not February.
  return at(date.getFullYear(), date.getMonth() + months, 1);
}

/** Moves by whole months without letting a long month skip a shorter one. */
function addMonthsClamped(date: Date, months: number): Date {
  const target = addMonths(date, months);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return at(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  return Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
}

/**
 * Which of the three panels the card is showing.
 *
 * Not three components: they share the header, the card and the visible
 * month, and the whole point of the month and year triggers is that they swap
 * what sits underneath them in place. An anchored popover here would put a
 * second surface on top of a surface that is already a popover in DatePicker.
 */
type CalendarView = "days" | "months" | "years";

/**
 * The year grid pages by a whole screenful, and the window is centred on the
 * visible year — 13 either side, so the current year sits in the middle row
 * of nine exactly as the sheet draws it.
 */
const YEAR_COLUMNS = 3;
const YEAR_ROWS = 9;
const YEARS_PER_PAGE = YEAR_COLUMNS * YEAR_ROWS;
const YEAR_RADIUS = (YEARS_PER_PAGE - 1) / 2;

export interface CalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Required — names the grid, which is otherwise announced as "grid". */
  label: string;
  /** Controlled selection. `null` means nothing is selected. */
  value?: Date | null;
  defaultValue?: Date | null;
  /** Always `onValueChange(value)` — never onSelect/onChange (§1). */
  onValueChange?: (value: Date | null) => void;
  /** Controlled visible month. Any date within it will do. */
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** Marks a date unselectable. It stays focusable, so it can be read. */
  isDateDisabled?: (date: Date) => boolean;
  /** 0 = Sunday, as the sheet draws it. 1 = Monday. */
  weekStartsOn?: 0 | 1;
  /**
   * Which day is "today". Defaults to the real clock.
   *
   * It exists because the clock is an INPUT this component reads without
   * being asked, and an untestable one: the visual baseline pinned `month`
   * and `defaultValue` and still failed the morning after it was recorded,
   * because the today ring had moved a cell overnight. Anything that renders
   * differently tomorrow needs a seam, or its test is a scheduled failure.
   *
   * Also the honest hook for a server-rendered or non-local timezone, where
   * the browser's midnight is not the user's.
   */
  today?: Date;
}

export function Calendar({
  label,
  value,
  defaultValue = null,
  onValueChange,
  month,
  defaultMonth,
  onMonthChange,
  isDateDisabled,
  weekStartsOn = 0,
  today: todayProp,
  className,
  ...rest
}: CalendarProps) {
  const gridId = useId();
  const headingId = useId();
  const monthListId = useId();
  const yearListId = useId();

  const [view, setView] = useState<CalendarView>("days");
  /**
   * How many screenfuls the year grid has been paged from the visible year.
   * Reset every time the grid opens, so the year on the trigger is always the
   * one the grid is centred on when it appears.
   */
  const [yearPage, setYearPage] = useState(0);
  const monthTriggerRef = useRef<HTMLButtonElement>(null);
  const yearTriggerRef = useRef<HTMLButtonElement>(null);

  const [selected, setSelected] = useControllableState<Date | null>({
    ...(value !== undefined ? { value } : {}),
    defaultValue,
    ...(onValueChange ? { onChange: onValueChange } : {}),
  });

  const [visible, setVisible] = useControllableState<Date>({
    ...(month !== undefined ? { value: month } : {}),
    defaultValue: defaultMonth ?? startOfDay(selected ?? new Date()),
    ...(onMonthChange ? { onChange: onMonthChange } : {}),
  });

  /**
   * The one date in the grid that is in the tab order (a roving tabindex).
   * A grid of 31 tab stops is what the ARIA pattern exists to avoid.
   */
  const [focusedDate, setFocusedDate] = useState<Date>(() => startOfDay(selected ?? visible));
  const shouldFocus = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const year = visible.getFullYear();
  const monthIndex = visible.getMonth();

  // Keep the focused date inside the visible month when the month changes
  // underneath it — otherwise the roving tabindex points at nothing.
  useEffect(() => {
    setFocusedDate((current) =>
      current.getFullYear() === year && current.getMonth() === monthIndex
        ? current
        : at(year, monthIndex, 1),
    );
  }, [year, monthIndex]);

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>('[data-slot="calendar-day"][tabindex="0"]')?.focus();
  }, [focusedDate]);

  const weekdays = useMemo(() => {
    const format = new Intl.DateTimeFormat(undefined, { weekday: "short" });
    // 4 Jan 1970 was a Sunday, so this walks a real week without hardcoding
    // names this library would then have to translate.
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(Date.UTC(1970, 0, 4 + ((i + weekStartsOn) % 7)));
      return { short: format.format(day), long: new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(day) };
    });
  }, [weekStartsOn]);

  const heading = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(visible),
    [visible],
  );

  /** Month names from Intl, for the same reason the weekday names are. */
  const monthNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(undefined, { month: "long" });
    return Array.from({ length: 12 }, (_, i) => format.format(new Date(2000, i, 1, 12)));
  }, []);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: "long" }).format(visible),
    [visible],
  );
  const yearLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(visible),
    [visible],
  );

  const dayLabel = useCallback(
    (date: Date) => new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(date),
    [],
  );

  /** Leading blanks plus every day of the month, in week-sized rows. */
  const weeks = useMemo(() => {
    const first = at(year, monthIndex, 1);
    const blanks = (first.getDay() - weekStartsOn + 7) % 7;
    const days = new Date(year, monthIndex + 1, 0).getDate();
    const cells: Array<Date | null> = [
      ...Array.from({ length: blanks }, () => null),
      ...Array.from({ length: days }, (_, i) => at(year, monthIndex, i + 1)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  }, [year, monthIndex, weekStartsOn]);

  const moveFocus = useCallback(
    (next: Date) => {
      shouldFocus.current = true;
      setFocusedDate(next);
      if (next.getFullYear() !== year || next.getMonth() !== monthIndex) {
        setVisible(at(next.getFullYear(), next.getMonth(), 1));
      }
    },
    [year, monthIndex, setVisible],
  );

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focusedDate, -1),
      ArrowRight: () => addDays(focusedDate, 1),
      ArrowUp: () => addDays(focusedDate, -7),
      ArrowDown: () => addDays(focusedDate, 7),
      Home: () => addDays(focusedDate, -((focusedDate.getDay() - weekStartsOn + 7) % 7)),
      End: () => addDays(focusedDate, 6 - ((focusedDate.getDay() - weekStartsOn + 7) % 7)),
      PageUp: () => addMonthsClamped(focusedDate, -1),
      PageDown: () => addMonthsClamped(focusedDate, 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveFocus(move());
  }

  const today = startOfDay(todayProp ?? new Date());

  /** Closes a select and hands focus back to the trigger that opened it. */
  const closeView = useCallback((restoreTo: "month" | "year") => {
    setView("days");
    (restoreTo === "month" ? monthTriggerRef : yearTriggerRef).current?.focus();
  }, []);

  const openView = useCallback((next: Exclude<CalendarView, "days">) => {
    if (next === "years") setYearPage(0);
    setView((current) => (current === next ? "days" : next));
  }, []);

  /**
   * The arrows step whatever the panel underneath them is showing, and say so.
   * A button labelled "Previous month" that moves a year is a lie a screen
   * reader has no way to catch.
   */
  const paging = {
    days: {
      prev: { label: "Previous month", go: () => setVisible(addMonths(visible, -1)) },
      next: { label: "Next month", go: () => setVisible(addMonths(visible, 1)) },
    },
    months: {
      prev: { label: "Previous year", go: () => setVisible(addMonths(visible, -12)) },
      next: { label: "Next year", go: () => setVisible(addMonths(visible, 12)) },
    },
    years: {
      prev: { label: "Previous years", go: () => setYearPage((page) => page - 1) },
      next: { label: "Next years", go: () => setYearPage((page) => page + 1) },
    },
  }[view];

  const yearWindowCentre = year + yearPage * YEARS_PER_PAGE;

  return (
    <div
      data-slot="calendar"
      className={cn(
        // The month and year panels are exactly as tall as the day grid they
        // replace, so opening one does not resize the card — which, inside
        // DatePicker's popover, would mean the panel jumping under the cursor.
        // A component variable rather than a literal (§6): it is the one
        // number here a consumer might legitimately need to change.
        "[--ui-calendar-view-height:292px]",
        "flex w-80 flex-col rounded-lg bg-surface p-lg shadow-sm",
        className,
      )}
      {...rest}
    >
      <div data-slot="calendar-header" className="mb-lg flex items-center justify-between gap-sm">
        <NavButton label={paging.prev.label} onClick={paging.prev.go} direction="prev" />
        {/*
          The visible month still has to be ANNOUNCED — the two triggers name
          themselves, not the date the grid is showing, and a month change
          driven by the arrows would otherwise be silent. Visually hidden, so
          the sheet's two dropdowns are all that is drawn.
        */}
        <span id={headingId} data-slot="calendar-heading" aria-live="polite" className="sr-only">
          {heading}
        </span>
        <div data-slot="calendar-selects" className="flex items-start gap-xs">
          <ViewTrigger
            ref={monthTriggerRef}
            slot="calendar-month-trigger"
            label={monthLabel}
            accessibleName="Choose a month"
            controls={monthListId}
            isOpen={view === "months"}
            onClick={() => openView("months")}
          />
          <ViewTrigger
            ref={yearTriggerRef}
            slot="calendar-year-trigger"
            label={yearLabel}
            accessibleName="Choose a year"
            controls={yearListId}
            isOpen={view === "years"}
            onClick={() => openView("years")}
          />
        </div>
        <NavButton label={paging.next.label} onClick={paging.next.go} direction="next" />
      </div>

      {view === "months" && (
        <OptionList
          id={monthListId}
          slot="calendar-month"
          label="Month"
          columns={1}
          options={monthNames.map((name, index) => ({
            key: index,
            label: name,
            isSelected: index === monthIndex,
            isCurrent: index === today.getMonth() && year === today.getFullYear(),
          }))}
          onSelect={(index) => {
            setVisible(at(year, index, 1));
            closeView("month");
          }}
          onDismiss={() => closeView("month")}
        />
      )}

      {view === "years" && (
        <OptionList
          id={yearListId}
          slot="calendar-year"
          label="Year"
          columns={YEAR_COLUMNS}
          options={Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
            const value = yearWindowCentre - YEAR_RADIUS + i;
            return {
              key: value,
              label: String(value),
              isSelected: value === year,
              isCurrent: value === today.getFullYear(),
            };
          })}
          onSelect={(value) => {
            setVisible(at(value, monthIndex, 1));
            closeView("year");
          }}
          onDismiss={() => closeView("year")}
        />
      )}

      {/*
        Unmounted, not `hidden`. The attribute's UA rule is `display: none` at
        author-origin zero specificity, and `grid` below is an author rule —
        so a hidden grid stays on screen, which is a bug that looks like
        nothing at all until a select is opened.
      */}
      {view === "days" && (
      <div
        ref={gridRef}
        role="grid"
        id={gridId}
        aria-label={label}
        aria-describedby={headingId}
        data-slot="calendar-grid"
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-xs"
      >
        <div role="row" className="contents">
          {weekdays.map((day) => (
            <span
              key={day.long}
              role="columnheader"
              aria-label={day.long}
              data-slot="calendar-weekday"
              // text-ink-muted, NOT the sheet's --ui-text-disabled: a weekday
              // name is not a disabled control, and that role measures under
              // 2:1 on this surface. A real defect, corrected in Paper.
              //
              // mb-sm on top of the grid's 4px gap makes the 12px the sheet
              // actually draws (`margin-bottom: var(--ui-space-md)` on DZO-0
              // and JNV-0). The row is `display: contents`, so the margin has
              // to live on the CELLS — and without it the header sat on the
              // first week and the grid came out 8px short, which is also
              // what made a month select resize the card on open.
              className="mb-sm flex items-center justify-center py-sm text-label-md font-body font-medium leading-snug tracking-tight text-ink-muted"
            >
              {day.short}
            </span>
          ))}
        </div>

        {weeks.map((week, w) => (
          <div key={w} role="row" className="contents">
            {week.map((date, d) =>
              date === null ? (
                <span key={`${w}-${d}`} role="gridcell" aria-hidden="true" data-slot="calendar-blank" />
              ) : (
                <span
                  key={date.toISOString()}
                  role="gridcell"
                  // `aria-selected` lives on the GRIDCELL, not on the button:
                  // it is not an allowed attribute on role=button — axe says
                  // so — and the ARIA grid pattern puts the selection state on
                  // the cell, with the button inside it as the thing pressed.
                  aria-selected={isSameDay(date, selected)}
                  className="contents"
                >
                  <button
                    type="button"
                    data-slot="calendar-day"
                    data-selected={isSameDay(date, selected) || undefined}
                    data-today={isSameDay(date, today) || undefined}
                    aria-label={dayLabel(date)}
                    aria-disabled={isDateDisabled?.(date) || undefined}
                    // The roving tab stop. Exactly one day is reachable by Tab;
                    // the arrows do the rest, which is the whole point of a grid.
                    tabIndex={isSameDay(date, focusedDate) ? 0 : -1}
                    // The roving tab stop follows ACTUAL focus, not only
                    // clicks. A screen reader can move focus into any cell
                    // without clicking it, and without this the arrows carried
                    // on from wherever the component last thought it was —
                    // focus day 10, press Right, land on 16.
                    onFocus={() => setFocusedDate(date)}
                    onClick={() => {
                      if (isDateDisabled?.(date)) return;
                      setSelected(isSameDay(date, selected) ? null : date);
                      setFocusedDate(date);
                    }}
                    className={cn(
                      "flex aspect-square cursor-pointer items-center justify-center rounded-md",
                      "text-button-sm font-body font-medium leading-flat",
                      "bg-elevated text-ink-muted",
                      "transition-[background-color,color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
                      "hover:bg-hover hover:text-ink-primary",
                      // The selected fill is --ui-bg-accent-subtle; the sheet
                      // drew a raw --ui-blue-90, corrected in Paper.
                      "data-[selected]:bg-accent-subtle data-[selected]:text-ink-primary data-[selected]:font-bold",
                      // Today is marked by an outline, not a fill, so it can
                      // coexist with the selection rather than compete with it.
                      "data-[today]:outline data-[today]:outline-edge-default",
                      "aria-disabled:cursor-not-allowed aria-disabled:text-ink-disabled aria-disabled:bg-sunken",
                      "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
                    )}
                  >
                    {date.getDate()}
                  </button>
                </span>
              ),
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

interface OptionListProps {
  id: string;
  /** `data-slot` stem — the list gets `-list`, each cell `-option`. */
  slot: string;
  label: string;
  columns: number;
  options: ReadonlyArray<{ key: number; label: string; isSelected: boolean; isCurrent: boolean }>;
  onSelect: (key: number) => void;
  onDismiss: () => void;
}

/**
 * The month list and the year grid, which differ only in their column count.
 *
 * A listbox rather than 12 (or 27) buttons: a grid of tab stops is what the
 * roving pattern exists to avoid, and it is the same reason the day grid has
 * one. `role="option"` cannot contain a button, so the cells are divs that
 * implement activation themselves — the trade the listbox pattern always
 * makes, and the reason Enter and Space are both handled below.
 */
function OptionList({ id, slot, label, columns, options, onSelect, onDismiss }: OptionListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.isSelected));
  const [active, setActive] = useState(selectedIndex);
  /** Only the FIRST reveal centres the list; arrowing afterwards should not
   *  yank the whole page under the user on every keystroke. */
  const hasOpened = useRef(false);

  useEffect(() => {
    const cell = listRef.current?.querySelector<HTMLElement>('[role="option"][tabindex="0"]');
    if (!cell) return;
    cell.focus({ preventScroll: true });
    cell.scrollIntoView({ block: hasOpened.current ? "nearest" : "center" });
    hasOpened.current = true;
  }, [active]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const last = options.length - 1;
    const moves: Record<string, () => number> = {
      ArrowLeft: () => active - 1,
      ArrowRight: () => active + 1,
      ArrowUp: () => active - columns,
      ArrowDown: () => active + columns,
      Home: () => 0,
      End: () => last,
    };
    if (event.key === "Escape") {
      event.preventDefault();
      onDismiss();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(options[active]!.key);
      return;
    }
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    // Clamped, not wrapped: a year grid that jumps from 2039 to 2013 on one
    // Down press reads as a bug, and the arrows page the window anyway.
    setActive(Math.min(last, Math.max(0, move())));
  }

  return (
    <div
      ref={listRef}
      id={id}
      role="listbox"
      aria-label={label}
      data-slot={`${slot}-list`}
      onKeyDown={onKeyDown}
      className={cn(
        "grid content-start gap-sm overflow-y-auto rounded-sm",
        // Exactly the day grid's height, so the card does not resize.
        "h-(--ui-calendar-view-height)",
        columns === 1 ? "grid-cols-1" : "grid-cols-3",
      )}
    >
      {options.map((option, index) => (
        <div
          key={option.key}
          role="option"
          aria-selected={option.isSelected}
          data-slot={`${slot}-option`}
          data-selected={option.isSelected || undefined}
          data-current={option.isCurrent || undefined}
          tabIndex={index === active ? 0 : -1}
          // The roving stop follows ACTUAL focus, for the same reason the day
          // grid's does — assistive tech moves focus without clicking.
          onFocus={() => setActive(index)}
          onClick={() => onSelect(option.key)}
          className={cn(
            // min-h-8 rather than padding alone: py-sm around 12px leading-flat
            // text is 8 + 12 + 8 = 28, and the sheet draws 32.
            "flex min-h-8 cursor-pointer items-center justify-center rounded-md px-md py-sm",
            "text-button-sm font-body font-medium leading-flat",
            "bg-elevated text-ink-muted",
            "transition-[background-color,color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
            "hover:bg-hover hover:text-ink-primary",
            // Selected and current are drawn exactly as the day grid draws
            // them — fill for the choice, outline for today — rather than as
            // the sheet's two 1.5px borders. One vocabulary per component, and
            // accent-on-accent-subtle measures 1.3:1, so that border was
            // decoration the fill already carries.
            "data-[selected]:bg-accent-subtle data-[selected]:text-ink-primary data-[selected]:font-bold",
            "data-[current]:outline data-[current]:outline-edge-default",
            "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
          )}
        >
          {option.label}
        </div>
      ))}
    </div>
  );
}

interface ViewTriggerProps {
  ref: Ref<HTMLButtonElement>;
  slot: string;
  /** What is drawn — "August", "2026". */
  label: string;
  /** What is announced. "August" alone does not say what pressing it does. */
  accessibleName: string;
  controls: string;
  isOpen: boolean;
  onClick: () => void;
}

/** One of the header's two disclosures. */
function ViewTrigger({ ref, slot, label, accessibleName, controls, isOpen, onClick }: ViewTriggerProps) {
  return (
    <button
      ref={ref}
      type="button"
      data-slot={slot}
      data-open={isOpen || undefined}
      aria-label={accessibleName}
      aria-expanded={isOpen}
      aria-controls={isOpen ? controls : undefined}
      onClick={onClick}
      className={cn(
        // h-6 is SC 2.5.8's 24px floor exactly: p-xs (4) + 16px leading-flat
        // text + p-xs (4). Recorded in knownGaps rather than quietly grown,
        // because the sheet draws the header at 32px overall and a taller
        // trigger would push the arrows out of line.
        "flex h-6 cursor-pointer items-center justify-center gap-xs rounded-sm p-xs",
        // text-button-lg, NOT text-title-sm. Both peak at 16px, but the title
        // roles are FLUID — clamp(...vw...) — and this panel is a fixed 320px
        // that a narrow viewport does not shrink. title-sm computed to 12.17px
        // on a phone, worst exactly where the sheet draws 16.
        "text-button-lg font-body font-bold leading-flat tracking-tight",
        "text-ink-primary [&_svg]:size-4 [&_svg]:shrink-0",
        "transition-[background-color,color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
        "hover:bg-hover",
        // The open one is inked with the accent LINK role. The sheet drew a
        // raw --ui-blue-70, which is the DARK scheme's value for that role and
        // measures 2.1:1 on a light panel. Corrected in Paper.
        "data-[open]:text-ink-link",
        "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
      )}
    >
      {label}
      {isOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
    </button>
  );
}

function NavButton({ label, onClick, direction }: { label: string; onClick: () => void; direction: "prev" | "next" }) {
  return (
    <button
      type="button"
      aria-label={label}
      data-slot={`calendar-${direction}`}
      onClick={onClick}
      // The 32px chrome control, shared rather than redrawn. This was a
      // bespoke `size-8 rounded-md` with NO fill — the sheet draws it on
      // --ui-bg-elevated, and the fill was simply missing.
      className={chromeControl()}
    >
      {direction === "prev" ? (
        <ChevronLeft size={16} aria-hidden="true" />
      ) : (
        <ChevronRight size={16} aria-hidden="true" />
      )}
    </button>
  );
}
