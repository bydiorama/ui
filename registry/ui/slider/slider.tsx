"use client";

import { Slider as BaseSlider } from "@base-ui-components/react/slider";
import { useId, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

export type SliderSize = "lg" | "sm";

/** Track heights from the sheet: 20px and 8px. The thumb is 20px in both. */
const SIZE = {
  lg: "h-5",
  sm: "h-2",
} as const satisfies Record<SliderSize, string>;

export interface SliderProps {
  /**
   * Required — a slider with no name announces only a number (§10). Use
   * `isLabelHidden` when the design shows none.
   */
  label: string;
  isLabelHidden?: boolean;
  /** Shows the current value beside the label, as the sheet draws it. */
  hasValueText?: boolean;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  isDisabled?: boolean;
  size?: SliderSize;
  className?: string;
}

/**
 * A single-value slider.
 *
 * The behaviour is Base UI's (ADR 0012), and it is the reason not to hand-roll
 * one: pointer capture, keyboard stepping, Home/End, RTL, touch, and
 * `aria-valuetext` are each individually easy to get *almost* right, and the
 * near-misses only surface for someone using a keyboard or a screen reader.
 *
 * Single value only, deliberately. A range slider is a different control with
 * two thumbs, a minimum gap and its own ARIA, and the sheet draws neither.
 */
export function Slider({
  label,
  isLabelHidden = false,
  hasValueText = false,
  value,
  defaultValue,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  isDisabled = false,
  size = "lg",
  className,
}: SliderProps) {
  const labelId = useId();

  return (
    <BaseSlider.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Root>>({
        min,
        max,
        step,
        disabled: isDisabled,
        ...(value !== undefined ? { value } : {}),
        ...(defaultValue !== undefined ? { defaultValue } : {}),
        // Narrowed from Base UI's (number | number[]) to our single value, so
        // no third-party shape reaches the signature and a caller never has to
        // destructure an array for a control with one thumb.
        ...(onValueChange
          ? {
              onValueChange: (next: number | readonly number[]) =>
                onValueChange(Array.isArray(next) ? (next[0] as number) : (next as number)),
            }
          : {}),
        "aria-labelledby": labelId,
        className: cn("flex w-full flex-col gap-sm", className),
      })}
    >
      <div
        data-slot="slider"
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
            "flex-1 text-body-sm font-body font-medium leading-normal text-ink-muted",
            isLabelHidden && "sr-only",
          )}
        >
          {label}
        </span>
        {hasValueText && (
          <BaseSlider.Value
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Value>>({
              "data-slot": "slider-value",
              className: "text-body-sm font-body font-medium leading-normal text-ink-primary",
            })}
          />
        )}
      </div>

      <BaseSlider.Control
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Control>>({
          "data-slot": "slider-control",
          // The CONTROL is the pointer target and must clear 24px even when the
          // painted track is 8px (SC 2.5.8) — so it is padded, not resized.
          className: cn(
            "relative flex w-full touch-none items-center py-sm select-none",
            isDisabled ? "cursor-not-allowed" : "cursor-pointer",
          ),
        })}
      >
        <BaseSlider.Track
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Track>>({
            "data-slot": "slider-track",
            className: cn("w-full rounded-full bg-sunken", SIZE[size]),
          })}
        >
          <BaseSlider.Indicator
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Indicator>>({
              "data-slot": "slider-fill",
              className: "h-full rounded-full bg-accent-legible",
            })}
          />
          <BaseSlider.Thumb
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Thumb>>({
              "data-slot": "slider-thumb",
              // Base UI renders a native input[type=range] inside the thumb;
              // that input is the control, and naming the surrounding group
              // does not name it.
              "aria-labelledby": labelId,
              className: cn(
                "size-5 rounded-full bg-base shadow-sm",
                // A 2px accent ring is what makes the thumb legible on the
                // fill: white on the pale accent measures 1.5:1 on its own,
                // under SC 1.4.11. The sheet draws the ring for this reason.
                "border-2 border-accent-legible",
                "transition-[box-shadow] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
                "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
                "disabled:border-edge-subtle",
              ),
            })}
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
