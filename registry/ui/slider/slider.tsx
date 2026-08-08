"use client";

import { Slider as BaseSlider } from "@base-ui/react/slider";
import { useId, type ComponentPropsWithoutRef, type ReactElement } from "react";
import { Minus, Plus } from "griddy-icons";

import { chromeControl } from "@/lib/chrome-control";
import { cn } from "@/lib/cn";

/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

export type SliderSize = "xl" | "lg" | "md" | "sm";

/**
 * Track and thumb per size, transcribed from the redrawn sheet.
 *
 * `fill` is rounded on its LEADING edge only. The fill ends at the thumb's
 * centre, so a trailing radius curves away from the thumb and leaves a
 * crescent of track between the two — visible as a notch at every value. With
 * the trailing edge square the fill runs straight under the thumb and the two
 * read as one continuous form, which is how the sheet draws it. At 100% the
 * square corner sits beneath the thumb, which covers it.
 *
 * The thumb is NOT one shape scaled four ways, which is the assumption that
 * produced a 20px circle at xl before the sheet was read properly: it is a
 * 16px circle at sm and md, a 24px circle at lg, and at xl a 32x16 VERTICAL
 * PILL that spans the full height of the bar. The last one is the reason the
 * xl row reads as a bar with a grip rather than as a track with a dot.
 *
 * The three pill sizes are the sheet's 8/16/24 tracks. `xl` is the fourth
 * thing it draws: a 32px bar squared off to `radius-md` rather than a pill,
 * used wherever the slider shares a row with other 32px controls (the
 * steppers, and the value Select beside them). Its radius differs from the
 * others for that reason and not by oversight — a pill next to a
 * soft-cornered Select reads as a different family, which is the same
 * argument Button's own per-size radius makes.
 */
const SIZE = {
  xl: { track: "h-8 rounded-md", fill: "rounded-l-md", thumb: "h-8 w-4", pad: "" },
  lg: { track: "h-6 rounded-full", fill: "rounded-l-full", thumb: "size-6", pad: "" },
  md: { track: "h-4 rounded-full", fill: "rounded-l-full", thumb: "size-4", pad: "py-xs" },
  sm: { track: "h-2 rounded-full", fill: "rounded-l-full", thumb: "size-4", pad: "py-sm" },
} as const satisfies Record<
  SliderSize,
  { track: string; fill: string; thumb: string; pad: string }
>;

/**
 * `pad` is the SC 2.5.8 top-up, and only where the track needs one.
 *
 *   sm   8 + py-sm (8+8) = 24   md  16 + py-xs (4+4) = 24
 *   lg  24 + nothing    = 24   xl  32 + nothing    = 32
 *
 * A flat `py-sm` on all four was the first version and it was wrong in three
 * of them: it made every row 16px taller than the sheet draws it — md 32
 * instead of 16, lg 40 instead of 24, xl 48 instead of 32 — for a target that
 * lg and xl already clear on their own. Measured, not reasoned: the row and
 * the 32px steppers still LOOKED aligned, because the buttons centre inside
 * whatever height the row has, so nothing about the render gave it away.
 */

interface SliderBaseProps {
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
  /**
   * Slot: a control that sits after the track and shows or sets the value —
   * the sheet puts a Select there. An ELEMENT, never a config (§3): the
   * options and their formatting belong to the caller, and building a Select
   * into a Slider would mean this component owning a data prop.
   */
  valueControl?: ReactElement;
}

/**
 * The −/+ pair is optional, and its labels are REQUIRED with it. Two icon-only
 * buttons with no accessible name announce as "button, button", and the
 * component cannot write the words — it has no i18n runtime (§9) and does not
 * know what is being stepped.
 */
type SliderStepperProps =
  | { hasSteppers?: false; decrementLabel?: undefined; incrementLabel?: undefined }
  | { hasSteppers: true; decrementLabel: string; incrementLabel: string };

export type SliderProps = SliderBaseProps & SliderStepperProps;

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
export function Slider(props: SliderProps) {
  const {
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
    size = "md",
    className,
    valueControl,
  } = props;
  const hasSteppers = props.hasSteppers === true;
  const labelId = useId();
  const geometry = SIZE[size];

  // The steppers move the value by one `step`, clamped — the same arithmetic
  // the keyboard already performs, so the two cannot disagree. Reading the
  // current value from `value ?? defaultValue` keeps an uncontrolled slider
  // stepping from where it actually is on first press.
  const current = value ?? defaultValue ?? min;
  const stepBy = (delta: number) => {
    if (!onValueChange) return;
    onValueChange(Math.min(max, Math.max(min, current + delta * step)));
  };

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

      {/* The row. It exists whether or not there are steppers, so the track's
          own layout does not change shape when they appear. */}
      <div data-slot="slider-row" className="flex w-full items-center gap-sm">
        {hasSteppers && (
          <button
            type="button"
            data-slot="slider-decrement"
            aria-label={props.decrementLabel}
            disabled={isDisabled || current <= min}
            onClick={() => stepBy(-1)}
            className={chromeControl()}
          >
            <Minus aria-hidden="true" />
          </button>
        )}

        <BaseSlider.Control
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Control>>({
            "data-slot": "slider-control",
            // The CONTROL is the pointer target and must clear 24px even when
            // the painted track is 8px (SC 2.5.8) — so it is padded, not
            // resized. Only the sizes that need it are padded; see SIZE.
            className: cn(
              "relative flex flex-1 touch-none items-center select-none",
              geometry.pad,
              isDisabled ? "cursor-not-allowed" : "cursor-pointer",
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
                // A background-IMAGE, so it needs the `image:` hint —
                // `bg-(--ui-gradient-accent)` would set a background-COLOUR to
                // a gradient string and paint nothing at all.
                //
                // The ramp is its own role rather than the sheet's raw
                // blue-80 → blue-70, which measures 1.24:1 and 1.80:1 against
                // this track in light. Both stops of the role clear 3:1 in
                // both schemes; check:contrast measures them.
                className: cn("h-full bg-(image:--ui-gradient-accent)", geometry.fill),
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
                  "rounded-full bg-base shadow-sm",
                  geometry.thumb,
                  // A 2px accent ring is what makes the thumb legible on the
                  // fill: white on the sheet's pale blue-80 measures 1.51:1,
                  // under SC 1.4.11, which is why the ring takes the legible
                  // role instead — 3.73:1 in light.
                  "border-2 border-accent-legible",
                  "transition-[box-shadow] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
                  "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
                  "disabled:border-edge-subtle",
                ),
              })}
            />
          </BaseSlider.Track>
        </BaseSlider.Control>

        {hasSteppers && (
          <button
            type="button"
            data-slot="slider-increment"
            aria-label={props.incrementLabel}
            disabled={isDisabled || current >= max}
            onClick={() => stepBy(1)}
            className={chromeControl()}
          >
            <Plus aria-hidden="true" />
          </button>
        )}

        {valueControl}
      </div>
    </BaseSlider.Root>
  );
}
