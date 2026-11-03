"use client";

import { Slider as BaseSlider } from "@base-ui/react/slider";
import { useId, useState, type ComponentPropsWithoutRef, type ReactElement } from "react";

import { cn } from "@/lib/cn";
import { useControllableState } from "@/hooks/use-controllable-state";
import { SLIDER_SIZE, sliderThumbClass, type SliderSize } from "@/ui/slider";

/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

/** Two ends, in order. A tuple rather than `number[]`: there are exactly two thumbs. */
export type RangeSliderValue = readonly [number, number];

export interface RangeSliderProps {
  /** Required — names the GROUP. Each thumb is named separately, below. */
  label: string;
  isLabelHidden?: boolean;
  /**
   * Required — each thumb is its own `input[type=range]`, and an input needs
   * its own name: "Earliest year", "Latest year". Two thumbs named only by the
   * group announce as "slider, slider", and a screen reader user cannot tell
   * which end they are moving.
   */
  startThumbLabel: string;
  endThumbLabel: string;
  value?: RangeSliderValue;
  defaultValue?: RangeSliderValue;
  onValueChange?: (value: RangeSliderValue) => void;
  min?: number;
  max?: number;
  step?: number;
  /**
   * How close the thumbs may get, in steps. They may meet (0, the default)
   * but never cross: a thumb dragged into the other stops there rather than
   * pushing it or swapping places.
   */
  minStepsBetweenValues?: number;
  /**
   * One END as text — "1925", "€48". Applied to each end; the readout joins
   * them with an en dash and collapses equal ends to one. Also each thumb's
   * aria-valuetext.
   */
  formatValue?: (value: number) => string;
  /**
   * The readout beside the label. On by default — unlike Slider: a range with
   * no readout cannot be read without dragging both ends.
   */
  hasValueText?: boolean;
  size?: SliderSize;
  isDisabled?: boolean;
  className?: string;
  /**
   * Slot: a row under the track that shows or sets the ends — two Input sm
   * fields, as the sheet draws. An element, never a config (§3).
   */
  valueControl?: ReactElement;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Two thumbs on one track; the fill is the span between them.
 *
 * Its own component rather than a Slider prop, because three things change at
 * once: the value's TYPE (a pair), the accessible names (one per thumb), and
 * the collision rule. Everything visible is Slider's — the same track ladder
 * and the same thumb, read from Slider's own table so the two cannot drift.
 */
export function RangeSlider({
  label,
  isLabelHidden = false,
  startThumbLabel,
  endThumbLabel,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  minStepsBetweenValues = 0,
  formatValue,
  hasValueText = true,
  size = "md",
  isDisabled = false,
  className,
  valueControl,
}: RangeSliderProps) {
  const labelId = useId();
  const geometry = SLIDER_SIZE[size];
  const [current, setCurrent] = useControllableState<RangeSliderValue>({
    value,
    defaultValue: defaultValue ?? [min, max],
    onChange: onValueChange,
  });
  // Which thumb a pointer is moving. Base UI's `data-dragging` is ROOT state —
  // it lands on both thumbs at once — but only the moving one should lift.
  const [movingThumb, setMovingThumb] = useState(-1);

  const format = (v: number, fallback: string) => (formatValue ? formatValue(v) : fallback);
  const names = [startThumbLabel, endThumbLabel] as const;

  return (
    <BaseSlider.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Root>>({
        min,
        max,
        step,
        minStepsBetweenValues,
        disabled: isDisabled,
        value: current,
        // Never cross: Base UI's default PUSHES the other thumb, which moves a
        // value the user was not touching.
        thumbCollisionBehavior: "none",
        onValueChange: (next: readonly number[], details: { reason: string; activeThumbIndex: number }) => {
          if (details.reason === "drag" || details.reason === "track-press") {
            setMovingThumb(details.activeThumbIndex);
          }
          setCurrent([
            clamp(next[0] as number, min, max),
            clamp(next[1] as number, min, max),
          ]);
        },
        onValueCommitted: () => setMovingThumb(-1),
        "aria-labelledby": labelId,
        // The group is disabled, not only its inputs — see Slider.
        "aria-disabled": isDisabled || undefined,
        className: cn("flex w-full flex-col gap-sm", className),
      })}
    >
      <div
        data-slot="range-slider"
        data-size={size}
        className={cn(
          "flex items-center justify-between gap-sm",
          isLabelHidden && !hasValueText && "sr-only",
        )}
      >
        <span
          id={labelId}
          data-slot="slider-label"
          className={cn(
            "flex-1 text-body-sm font-body",
            isDisabled ? "text-ink-disabled" : "text-ink-muted",
            isLabelHidden && "sr-only",
          )}
        >
          {label}
        </span>
        {hasValueText && (
          <BaseSlider.Value
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Value>>({
              "data-slot": "slider-value",
              className: cn(
                "shrink-0 text-body-sm font-body tabular-nums",
                isDisabled ? "text-ink-disabled" : "text-ink-primary",
              ),
              // An en dash WITH spaces, and one number when the ends meet —
              // "1950 – 1950" reads as a mistake.
              children: (formatted: readonly string[], values: readonly number[]) => {
                const start = format(values[0] as number, formatted[0] ?? "");
                const end = format(values[1] as number, formatted[1] ?? "");
                return values[0] === values[1] ? start : `${start} – ${end}`;
              },
            })}
          />
        )}
      </div>

      <BaseSlider.Control
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Control>>({
          "data-slot": "slider-control",
          // Slider's control, character for character: padded to the 24px
          // target where the track is thinner, inset by half a thumb so both
          // thumbs' outer edges land on the control's edges at the extremes.
          className: cn(
            "relative flex w-full touch-none items-center select-none",
            geometry.pad,
            geometry.inset,
            isDisabled ? "cursor-not-allowed" : "cursor-pointer",
            "data-dragging:cursor-grabbing",
          ),
        })}
      >
        <BaseSlider.Track
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Track>>({
            "data-slot": "slider-track",
            className: cn("w-full bg-sunken", geometry.track),
          })}
        >
          <BaseSlider.Indicator
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Indicator>>({
              "data-slot": "slider-fill",
              // FLAT --ui-bg-accent, square at both ends (they run under the
              // thumbs). A span has no direction, so the gradient — which says
              // "more toward the end" — is true of one value and not of an
              // interval. It is the gradient's own first stop.
              className: cn("h-full", isDisabled ? "bg-field-chrome-disabled" : "bg-accent"),
            })}
          />
          {([0, 1] as const).map((index) => (
            <BaseSlider.Thumb
              key={index}
              {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Thumb>>({
                index,
                "data-slot": "slider-thumb",
                "data-end": index === 0 ? "start" : "end",
                "data-moving": movingThumb === index || undefined,
                // aria-label, not aria-labelledby: Base UI only falls back to
                // the group's label when no label is given, and a labelledby
                // would outrank the per-thumb name and announce "Active years"
                // twice.
                getAriaLabel: (i: number) => names[i] ?? label,
                ...(formatValue
                  ? { getAriaValueText: (_formatted: string, next: number) => formatValue(next) }
                  : {}),
                className: cn(
                  sliderThumbClass(size),
                  // Only the thumb being moved lifts, and a hovered thumb —
                  // never both. Base UI already paints the moving one on top.
                  "hover:not-has-focus-visible:not-data-disabled:shadow-md",
                  "data-moving:not-has-focus-visible:shadow-md",
                ),
              })}
            />
          ))}
        </BaseSlider.Track>
      </BaseSlider.Control>

      {valueControl}
    </BaseSlider.Root>
  );
}
