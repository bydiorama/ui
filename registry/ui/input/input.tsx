import { forwardRef, useId, type InputHTMLAttributes, type ReactElement } from "react";

import { cn } from "@/lib/cn";

export type InputSize = "lg" | "md" | "sm";

/**
 * Geometry per size, transcribed from the approved design.
 *
 * Heights are 48/40/32 — all three clear the 24px WCAG 2.5.8 floor, and `lg`
 * is the 44px+ touch target for primary forms.
 */
const SIZE = {
  lg: "h-12 gap-sm px-md py-sm text-body-md",
  md: "h-10 gap-xs p-sm text-caption",
  sm: "h-8 gap-xs px-sm py-xs text-caption",
} as const satisfies Record<InputSize, string>;

interface InputBaseProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "disabled" | "size" | "required"> {
  /**
   * Required — every input has a label (CONVENTIONS §10). Use `isLabelHidden`
   * when the design shows none; a placeholder is not a label, because it
   * disappears the moment the user types.
   */
  label: string;
  /** Renders the label visually hidden rather than omitting it. */
  isLabelHidden?: boolean;
  size?: InputSize;
  isDisabled?: boolean;
  isRequired?: boolean;
  /**
   * Marks the field invalid. `errorText` implies this, so it is only needed
   * for a field whose error is reported somewhere else (a form-level summary).
   */
  isInvalid?: boolean;
  /** Persistent guidance. Stays visible alongside an error. */
  helperText?: string;
  /** The error message. Its presence makes the field invalid. */
  errorText?: string;
  /** Slot: leading adornment. Never wrapped (CONVENTIONS §3). */
  icon?: ReactElement;
  /** Slot: trailing adornment — a reveal toggle, a unit, a clear button. */
  iconEnd?: ReactElement;
}

export type InputProps = InputBaseProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    isLabelHidden = false,
    size = "lg",
    isDisabled = false,
    isRequired = false,
    isInvalid = false,
    helperText,
    errorText,
    icon,
    iconEnd,
    className,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  // An error message present without aria-invalid is a field that looks wrong
  // and announces fine — so the message drives the state rather than trusting
  // callers to keep two props in sync.
  const invalid = isInvalid || Boolean(errorText);

  // Both are announced when both exist: an error rarely makes the guidance
  // irrelevant, and dropping it mid-correction is exactly when it is needed.
  const describedBy =
    [errorText ? errorId : null, helperText ? helperId : null].filter(Boolean).join(" ") || undefined;

  return (
    // `className` lands on the outermost node (CONVENTIONS §5), not on the
    // control: `<Input className="w-64" />` should size the whole field, and
    // the control's `w-full` follows it. Reaching a specific part from outside
    // is what the `data-slot` attributes are for.
    <div data-slot="field" className={cn("flex flex-col gap-sm", className)}>
      <label
        data-slot="label"
        htmlFor={inputId}
        className={cn(
          "text-label-md font-body font-medium text-ink-secondary",
          // Visually hidden, not `hidden` — the label must still reach the
          // accessibility tree and still be clickable as a target.
          isLabelHidden && "sr-only",
        )}
      >
        {label}
        {isRequired && (
          <span aria-hidden="true" className="text-danger">
            {" *"}
          </span>
        )}
      </label>

      {/*
        The border lives on this wrapper, not the input, so leading/trailing
        slots sit inside one control surface. Focus is drawn here via
        focus-within — for a text field, showing focus on pointer click is
        correct, unlike a button.
      */}
      <div
        data-slot="control"
        data-size={size}
        data-invalid={invalid || undefined}
        data-disabled={isDisabled || undefined}
        className={cn(
          "flex w-full shrink-0 items-center overflow-clip rounded-md border-[1.5px]",
          "transition-[border-color,box-shadow,background-color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
          "bg-base border-edge-subtle",
          // Hover is DERIVED, not drawn in the sheet: it mirrors Button's
          // secondary variant (subtle → default) so controls behave alike.
          !isDisabled && !invalid && "hover:border-edge-default",
          invalid && "border-danger",
          isDisabled && "bg-sunken",
          // The visible focus indicator. Border colour alone would fail
          // SC 1.4.11 against the resting border, so the ring carries it.
          "focus-within:border-edge-focus focus-within:shadow-(--ui-focus-ring)",
          SIZE[size],
        )}
      >
        {icon}
        <input
          ref={ref}
          id={inputId}
          data-slot="input"
          disabled={isDisabled}
          required={isRequired}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-ink-primary placeholder:text-ink-placeholder",
            "font-body font-medium",
            // Safe here — and only here: this input never draws its own focus
            // ring, the wrapper does. `outline-none` on an element that DOES
            // own its focus ring poisons --tw-outline-style (see Button).
            "outline-none",
            "disabled:cursor-not-allowed disabled:text-ink-disabled",
          )}
          {...rest}
        />
        {iconEnd}
      </div>

      {errorText && (
        <p data-slot="error" id={errorId} className="text-caption font-body text-danger">
          {errorText}
        </p>
      )}
      {helperText && (
        <p data-slot="helper" id={helperId} className="text-caption font-body text-ink-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});
