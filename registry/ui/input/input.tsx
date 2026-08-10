import { forwardRef, useId, type InputHTMLAttributes, type ReactElement } from "react";

import { cn } from "@/lib/cn";

export type InputSize = "lg" | "md" | "sm";

/** The ground the field is cut from — see the `surface` prop (ADR 0017). */
export type InputSurface = "page" | "chrome";

/**
 * The enabled and disabled fills, PAIRED by ground.
 *
 * Paired rather than picked separately because the page's disabled fill and
 * chrome's enabled fill are the same colour in theme zero: neutral-90 under a
 * white page reads as unavailable, and the identical neutral-90 inside a
 * neutral-95 inspector reads as a well. Choosing them independently is exactly
 * how the editor's recessed field came to be drawn in the disabled fill.
 */
const SURFACE = {
  page: { rest: "bg-field", disabled: "bg-field-disabled" },
  chrome: { rest: "bg-field-chrome", disabled: "bg-field-chrome-disabled" },
} as const satisfies Record<InputSurface, { rest: string; disabled: string }>;

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
  /**
   * WHICH GROUND the field is cut from (ADR 0017). A field is a well, and a
   * well means nothing on its own — it means something against its floor.
   *
   * `page` is a field on the document: flush with it, identified by its
   * hairline. `chrome` is a field inside an inspector, an island or a sheet,
   * where the floor is `bg-elevated` and the field is genuinely recessed.
   *
   * It selects the enabled AND disabled fills together, as a PAIR, which is
   * the point: the page's disabled fill and chrome's enabled fill are the same
   * colour, so picking them independently is how a recessed field ends up
   * drawn as an unavailable one. The component cannot infer this — a panel
   * knows it is a panel and an input does not — so it is a prop rather than
   * something clever with inheritance, which a portalled surface would break.
   */
  surface?: InputSurface;
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
    surface = "page",
    isDisabled = false,
    isRequired = false,
    isInvalid = false,
    helperText,
    errorText,
    icon,
    iconEnd,
    className,
    id,
    "aria-describedby": consumerDescribedBy,
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
    [errorText ? errorId : null, helperText ? helperId : null, consumerDescribedBy]
      .filter(Boolean)
      .join(" ") || undefined;

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
          // 1.5px is the sheet's hairline and it is NOT a mistake that this
          // computes to 1px in the test browser. Chromium floors a border to
          // whole DEVICE pixels: at devicePixelRatio 1, anything under 2px
          // reports 1px; at 2 (where the design was drawn, and where most
          // users are) it renders as a true 1.5. The CSS is exactly
          // `border-width: 1.5px` — verified in the compiled sheet — so there
          // is nothing to fix here, and `border-hairline.browser.test.tsx`
          // pins the platform behaviour so this is not re-investigated.
          "flex w-full shrink-0 items-center overflow-clip rounded-md border-[1.5px]",
          // Both icon slots at 16px, as Button sizes its own — see the note
          // there. griddy's IconBase hard-codes width/height="24", so an
          // unsized slot rendered every leading and trailing glyph oversize.
          "[&_svg]:size-4 [&_svg]:shrink-0",
          "transition-[border-color,box-shadow,background-color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
          "border-edge-subtle",
          // The fill comes from the GROUND-and-state pair, never from a
          // surface role directly: `bg-sunken` used to carry disabled, which
          // made it impossible to draw a recessed field on a chrome panel
          // without it reading as unavailable (ADR 0017).
          isDisabled ? SURFACE[surface].disabled : SURFACE[surface].rest,
          // Hover is DERIVED, not drawn in the sheet: it mirrors Button's
          // secondary variant (subtle → default) so controls behave alike.
          !isDisabled && !invalid && "hover:border-edge-default",
          invalid && "border-danger",
          // The visible focus indicator. Border colour alone would fail
          // SC 1.4.11 against the resting border, so the ring carries it.
          // The ring is a box-shadow, and forced-colors mode forces box-shadow
          // to `none` — so in Windows High Contrast this indicator would simply
          // not exist. The outline is the fallback; it costs nothing outside
          // forced colours, where it never applies.
          "focus-within:border-edge-focus focus-within:shadow-(--ui-focus-ring)",
          "focus-within:forced-colors:outline focus-within:forced-colors:outline-2",
          SIZE[size],
        )}
      >
        {icon}
        <input
          {...rest}
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
