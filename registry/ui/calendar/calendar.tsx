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
} from "react";
import { ChevronLeft, ChevronRight } from "griddy-icons";

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

  return (
    <div
      data-slot="calendar"
      className={cn("flex w-80 flex-col rounded-lg bg-surface p-lg shadow-sm", className)}
      {...rest}
    >
      <div data-slot="calendar-header" className="mb-lg flex items-center justify-between gap-sm">
        <NavButton label="Previous month" onClick={() => setVisible(addMonths(visible, -1))} direction="prev" />
        {/*
          A heading, not the sheet's two dropdown buttons. There is no Select
          in this system yet, and a control that looks interactive and is not
          is worse than plain text — recorded in knownGaps.
        */}
        <h2 id={headingId} data-slot="calendar-heading" aria-live="polite" className="text-body-md font-body font-bold leading-flat tracking-tight text-ink-primary">
          {heading}
        </h2>
        <NavButton label="Next month" onClick={() => setVisible(addMonths(visible, 1))} direction="next" />
      </div>

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
              className="flex items-center justify-center py-sm text-label-md font-body font-medium leading-snug tracking-tight text-ink-muted"
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
    </div>
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
