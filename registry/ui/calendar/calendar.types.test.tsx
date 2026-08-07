/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Calendar } from "./calendar.tsx";

export function Valid() {
  return (
    <>
      <Calendar label="Choose a date" />
      <Calendar
        label="Choose a date"
        value={new Date()}
        onValueChange={(value: Date | null) => void value}
        month={new Date()}
        onMonthChange={(month: Date) => void month}
        isDateDisabled={(date: Date) => date.getDay() === 0}
        weekStartsOn={1}
        className="max-w-nav"
      />
      {/* null is a real selection state, not an omission. */}
      <Calendar label="Choose a date" value={null} />
    </>
  );
}

export function Invalid() {
  {/* The grid is otherwise announced as "grid". */}
  /* @ts-expect-error label is required */
  const a = <Calendar />;

  {/* The sheet draws Sunday and Monday starts; nothing else is laid out. */}
  /* @ts-expect-error weekStartsOn is a closed union of 0 | 1 */
  const b = <Calendar label="L" weekStartsOn={3} />;

  {/* §1: one callback named for the value, never onDateChange/onPick.
      NOT `onSelect` — that is a real DOM event and compiles fine, the same
      trap `onDrop` sets on CardSorting. The root spreads HTMLAttributes. */}
  /* @ts-expect-error there is no onDateChange */
  const c = <Calendar label="L" onDateChange={() => {}} />;

  {/* A date is a Date. Parsing strings is the caller's business. */}
  /* @ts-expect-error value is Date | null, not a string */
  const d = <Calendar label="L" value="2026-08-03" />;

  return [a, b, c, d];
}

export function TodayIsInjectable() {
  return (
    <>
      <Calendar label="Choose a date" today={new Date(2026, 7, 6, 12)} />
      {/* Omitting it is valid — it falls back to the real clock. */}
      <Calendar label="Choose a date" />
    </>
  );
}

export function TodayIsADate() {
  /* @ts-expect-error today is a Date, not a timestamp */
  const a = <Calendar label="Choose a date" today={1786000000000} />;
  /* @ts-expect-error today is a Date, not a string */
  const b = <Calendar label="Choose a date" today="2026-08-06" />;
  return [a, b];
}
