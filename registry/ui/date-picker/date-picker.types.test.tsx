/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { DatePicker } from "./date-picker.tsx";

export function Valid() {
  return (
    <>
      <DatePicker label="Deadline" />
      <DatePicker
        label="Deadline"
        value={new Date()}
        onValueChange={(value: Date | null) => void value}
        isOpen={false}
        onOpenChange={(isOpen: boolean) => void isOpen}
        month={new Date()}
        onMonthChange={(month: Date) => void month}
        isDateDisabled={(date: Date) => date.getDay() === 0}
        formatValue={(date: Date) => date.toISOString()}
        weekStartsOn={1}
        today={new Date(2026, 7, 2, 12)}
        helperText="You can change this later."
        errorText="A deadline is required."
        isDisabled
        isLabelHidden
        container={null}
        className="max-w-nav"
      />
      {/* null is a real selection state, not an omission. */}
      <DatePicker label="Deadline" value={null} />
    </>
  );
}

export function Invalid() {
  {/* A placeholder is not a label — it is gone the moment a date is chosen. */}
  /* @ts-expect-error label is required */
  const a = <DatePicker placeholder="Pick a date" />;

  {/* §1: open state is always the isOpen/onOpenChange pair. */}
  /* @ts-expect-error there is no onClose — open state is onOpenChange(isOpen) */
  const b = <DatePicker label="L" onClose={() => {}} />;

  {/* §1: `default*`, never `initial*`. */}
  /* @ts-expect-error the uncontrolled prop is defaultIsOpen */
  const c = <DatePicker label="L" initialIsOpen />;

  {/* NOT `onSelect` or `onChange` — both are real DOM events that would
      compile against HTMLAttributes and report the directive as unused. */}
  /* @ts-expect-error there is no onDateChange */
  const d = <DatePicker label="L" onDateChange={() => {}} />;

  {/* A date is a Date. Parsing strings is the caller's business. */}
  /* @ts-expect-error value is Date | null, not a string */
  const e = <DatePicker label="L" value="2026-08-03" />;

  {/* The sheet draws Sunday and Monday starts; nothing else is laid out. */}
  /* @ts-expect-error weekStartsOn is a closed union of 0 | 1 */
  const f = <DatePicker label="L" weekStartsOn={6} />;

  {/* One size is drawn. Adding sm/md would be inventing geometry design has
      not specified — recorded in needsDesign rather than guessed at. */}
  /* @ts-expect-error there is no size prop */
  const g = <DatePicker label="L" size="sm" />;

  return [a, b, c, d, e, f, g];
}

export function FormatValueTakesADate() {
  /* @ts-expect-error formatValue returns a string, not a node */
  const a = <DatePicker label="L" formatValue={() => <span>nope</span>} />;
  return [a];
}
