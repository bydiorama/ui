import { forwardRef, useId, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ProgressSize = "lg" | "sm";

/**
 * `solid` is the default because it is the one that survives contact with a
 * brand: the fill is a meaningful graphic and must clear 3:1, which the accent
 * role guarantees and a three-stop sweep cannot. `gradient` is the sheet's
 * brand expression, for the hero case where progress IS the screen.
 */
export type ProgressVariant = "solid" | "gradient";

/** Track heights from the sheet: 20px and 8px. */
const SIZE = {
  lg: "h-5",
  sm: "h-2",
} as const satisfies Record<ProgressSize, string>;

interface ProgressOwnProps {
  /** Current value, clamped into 0…max. */
  value: number;
  max?: number;
  /**
   * Required — a bar with no name announces only a number (§10). Use
   * `isLabelHidden` when the design shows none.
   */
  label: string;
  isLabelHidden?: boolean;
  /** Shows the percentage beside the label, as the sheet draws it. */
  hasValueText?: boolean;
  size?: ProgressSize;
  variant?: ProgressVariant;
}

export interface ProgressProps
  extends ProgressOwnProps,
    Omit<HTMLAttributes<HTMLDivElement>, keyof ProgressOwnProps> {}

/**
 * A determinate progress bar.
 *
 * The bar is a `<div role="progressbar">` rather than `<progress>`: the native
 * element cannot be styled to this design across browsers, and unlike a
 * checkbox or a button it brings no behaviour to lose — a progress bar has no
 * interaction to inherit. The ARIA it does need is three attributes, all set
 * here and asserted in a real browser.
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  {
    value,
    max = 100,
    label,
    isLabelHidden = false,
    hasValueText = false,
    size = "lg",
    variant = "solid",
    className,
    ...rest
  },
  ref,
) {
  const labelId = useId();
  // Clamped rather than trusted: a fill wider than its track is a layout bug
  // that only shows up with real data.
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = (clamped / safeMax) * 100;

  return (
    <div
      ref={ref}
      data-slot="progress"
      data-size={size}
      data-variant={variant}
      className={cn("flex w-full flex-col gap-sm", className)}
      {...rest}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-sm",
          // Removed from the flow entirely when nothing is visible, so the
          // gap does not reserve empty space above the track.
          isLabelHidden && !hasValueText && "sr-only",
        )}
      >
        <span
          id={labelId}
          data-slot="progress-label"
          className={cn(
            "flex-1 text-body-sm font-body font-medium leading-normal text-ink-muted",
            isLabelHidden && "sr-only",
          )}
        >
          {label}
        </span>
        {hasValueText && (
          <span
            data-slot="progress-value"
            className="text-body-sm font-body font-medium leading-normal text-ink-secondary"
          >
            {`${Math.round(percent)}%`}
          </span>
        )}
      </div>

      <div
        data-slot="track"
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className={cn("relative w-full overflow-hidden rounded-full bg-sunken", SIZE[size])}
      >
        <div
          data-slot="fill"
          // Width, not transform: scaling would squash the rounded ends into
          // ellipses. The transition enumerates its property (§8).
          style={{ width: `${percent}%` }}
          className={cn(
            "h-full rounded-full",
            // The gradient is a background-IMAGE, so it needs the image type
            // hint — `bg-(--ui-gradient-brand)` would set a background-COLOUR
            // to a gradient string and paint nothing at all.
            variant === "gradient" ? "bg-(image:--ui-gradient-brand)" : "bg-accent-legible",
            "transition-[width] duration-(--ui-duration-base) ease-(--ui-ease-out)",
          )}
        />
      </div>
    </div>
  );
});
