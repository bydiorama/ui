import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";

export type TextareaSize = "lg" | "md" | "sm";

/** The ground the field is cut from — see the `surface` prop (ADR 0017). */
export type TextareaSurface = "page" | "chrome";

/**
 * The enabled and disabled fills, PAIRED by ground — Input's table, for the
 * same reason the geometry is Input's: the two fields have to sit in one form
 * without a seam, and a fill that differs by ground is no exception.
 */
const SURFACE = {
  page: { rest: "bg-field", disabled: "bg-field-disabled" },
  chrome: { rest: "bg-field-chrome", disabled: "bg-field-chrome-disabled" },
} as const satisfies Record<TextareaSurface, { rest: string; disabled: string }>;

/**
 * Geometry per size, DERIVED from Input's table rather than drawn.
 *
 * Input is `h-12 px-md py-sm text-body-md` / `h-10 p-sm text-caption` /
 * `h-8 px-sm py-xs text-caption`. Everything there except the height carries
 * over unchanged, because the two fields have to sit in one form without a
 * seam — that the surfaces match is asserted per size as a RELATIONSHIP
 * against a real Input, not as numbers, so they cannot drift apart silently.
 *
 * The height is the part that cannot carry over. Input's is a constant; a
 * textarea's is `rows` line boxes, so the same `rows` gives a different box at
 * each size and that is correct — what a size changes here is the LINE, not
 * the count. The `gap-*` steps do not carry over either: they spaced Input's
 * icon slots, and there are none here.
 *
 *   lg  6 x (14px x 1.3 = 18.2)  + py-sm x2 (16) + border = 127.125px
 *   md  6 x (12px x 1.3 = 15.6)  + p-sm  x2 (16) + border = 111.5625px
 *   sm  6 x (12px x 1.3 = 15.6)  + py-xs x2  (8) + border = 103.5625px
 *
 * (Chromium lays a line box out at 1/64px, and floors the 1.5px border to 1
 * device pixel at dPR 1 — the browser test carries the full derivation.) The
 * lg box is the sheet's 128px; leading-snug is why. The sheet stored a raw
 * `18px`, a ratio of 1.286 that is off the `--ui-leading-*` scale entirely,
 * and snug is the nearest role at 0.2px per line.
 */
const SIZE = {
  lg: "px-md py-sm text-body-md",
  md: "p-sm text-caption",
  sm: "px-sm py-xs text-caption",
} as const satisfies Record<TextareaSize, string>;

const DEFAULT_ROWS = 6;

interface TextareaBaseProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    // `cols` is omitted because it does NOT WORK here, not because a nicer
    // spelling exists. The control is `w-full`, so a textarea's intrinsic
    // character width never reaches layout: measured, `cols={5}` rendered at
    // the same 412px as no cols at all. A prop that is accepted, forwarded,
    // set as an attribute and has no effect is the worst kind — it reads as
    // supported. Width comes from the field's own `className`.
    "cols" | "disabled" | "required"
  > {
  /**
   * Required — every field has a label (CONVENTIONS §10). Use `isLabelHidden`
   * when the design shows none; a placeholder is not a label, because it
   * disappears the moment the user types.
   */
  label: string;
  /** Renders the label visually hidden rather than omitting it. */
  isLabelHidden?: boolean;
  /**
   * Matches Input's scale, so a form can mix the two at one size. It changes
   * the inset and the line — never `rows`, which stays the caller's count.
   */
  size?: TextareaSize;
  /**
   * WHICH GROUND the field is cut from (ADR 0017) — `page` for a field on the
   * document, `chrome` for one inside an inspector, island or sheet. Selects
   * the enabled and disabled fills together as a pair; see Input for why they
   * cannot be picked independently.
   */
  surface?: TextareaSurface;
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
  /**
   * Vertical drag-to-grow. On by default because a textarea whose content
   * outgrows it is the normal case and the native grip is the affordance
   * users already know. Turn it off inside a surface that cannot reflow — a
   * fixed panel, a drawer, a table cell. Horizontal resize is never offered:
   * it breaks the layout that contains the field.
   */
  isResizable?: boolean;
}

export type TextareaProps = TextareaBaseProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    isLabelHidden = false,
    size = "lg",
    surface = "page",
    isDisabled = false,
    isRequired = false,
    isInvalid = false,
    isResizable = true,
    helperText,
    errorText,
    rows = DEFAULT_ROWS,
    className,
    id,
    "aria-describedby": consumerDescribedBy,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const helperId = `${textareaId}-helper`;
  const errorId = `${textareaId}-error`;

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
    // control: `<Textarea className="w-64" />` should size the whole field,
    // and the control's `w-full` follows it. Reaching a specific part from
    // outside is what the `data-slot` attributes are for.
    <div data-slot="field" className={cn("flex flex-col gap-sm", className)}>
      <label
        data-slot="label"
        htmlFor={textareaId}
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
        The chrome lives on this wrapper and the PADDING lives on the textarea,
        which is the one place this differs from Input's split. Two reasons,
        both about the block axis:

        - The native resize grip is painted at the textarea's own bottom-right
          corner. With the padding on the wrapper it would float 12px inside
          the box; with the padding on the control it sits in the corner where
          the user reaches for it.
        - Dragging that grip sets an inline height on the TEXTAREA. The
          wrapper has no height of its own (`items-start`, height from the
          child), so the box grows with the drag instead of clipping it.

        Clicking the inset area then lands on the textarea rather than on dead
        wrapper padding, which is a small win the split buys for free.

        Focus is drawn here via focus-within — for a text field, showing focus
        on pointer click is correct, unlike a button.
      */}
      <div
        data-slot="control"
        data-size={size}
        data-invalid={invalid || undefined}
        data-disabled={isDisabled || undefined}
        className={cn(
          // 1.5px is the sheet's hairline and it is NOT a mistake that this
          // computes to 1px in the test browser — see the note in Input and
          // `border-hairline.browser.test.tsx`, which pins the platform
          // behaviour so it is not re-investigated.
          // `shrink-0` for the same reason Input carries it: the field is a
          // flex column, and inside a height-constrained one a control with no
          // shrink guard gets compressed below the rows it was asked for.
          // `items-start` is the other half — it stops the textarea being
          // stretched to a wrapper height, so the CHILD's height is the box's
          // height and a resize drag grows the box instead of being clipped.
          "flex w-full shrink-0 items-start overflow-clip rounded-md border-[1.5px]",
          "transition-[border-color,box-shadow,background-color]", motionMicro,
          "border-edge-subtle",
          // The fill comes from the GROUND-and-state pair, never from a surface
          // role directly — see Input, and ADR 0017.
          isDisabled ? SURFACE[surface].disabled : SURFACE[surface].rest,
          // Hover is DERIVED, not drawn in the sheet: it mirrors Input, which
          // mirrors Button's secondary variant, so every control on a form
          // behaves alike.
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
        )}
      >
        <textarea
          {...rest}
          ref={ref}
          id={textareaId}
          rows={rows}
          data-slot="textarea"
          disabled={isDisabled}
          required={isRequired}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full min-w-0 bg-transparent",
            SIZE[size],
            // The leading is set once for every size rather than per step:
            // the ROLE is "snug" at all three, and only the size it multiplies
            // changes. A textarea is the first component where this is
            // load-bearing — an unset leading falls to the font's own, which
            // is what made Badge's two sizes identical.
            "font-body font-medium leading-snug",
            "text-ink-primary placeholder:text-ink-placeholder",
            isResizable ? "resize-y" : "resize-none",
            // A disabled field cannot be dragged either — the grip would be
            // the one part of it that still responded.
            "disabled:resize-none disabled:cursor-not-allowed disabled:text-ink-disabled",
            // Safe here — and only here: this textarea never draws its own
            // focus ring, the wrapper does. `outline-none` on an element that
            // DOES own its focus ring poisons --tw-outline-style (see Button).
            "outline-none",
          )}
        />
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
