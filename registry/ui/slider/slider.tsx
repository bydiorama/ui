"use client";

import { Slider as BaseSlider } from "@base-ui/react/slider";
import { useId, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from "react";
import { Minus, Plus } from "griddy-icons";

import { chromeControl } from "@/lib/chrome-control";
import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { useControllableState } from "@/hooks/use-controllable-state";

/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

export type SliderSize = "xl" | "lg" | "md" | "sm";
/** `track` is the slider as it has always been; `inline` puts label and value inside the bar. */
export type SliderVariant = "track" | "inline";
/** Inline sits on the FIELD ladder (32 / 40 / 48); `xl` is a track-only size. */
export type SliderInlineSize = Exclude<SliderSize, "xl">;

/**
 * Track and thumb per size, transcribed from the redrawn sheet. Exported
 * because RangeSlider draws the same track ladder and the same thumb — one
 * table, so the two cannot drift apart. Its browser test compares them.
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
 *
 * `inset` is HALF THE THUMB, as horizontal padding on the control.
 *
 * Base UI centres the thumb on the value, so at the minimum its centre sits on
 * the track's left edge and half of it hangs off — into the stepper button
 * sitting 8px away, which is what "the slider positions are too close to the
 * buttons" looks like. Insetting the track by half a thumb makes the thumb's
 * OUTER edge land on the control's edge at both extremes: it can no longer
 * reach a neighbour, and the track it travels is exactly the track it paints.
 *
 *   sm/md/xl  thumb 16 -> px-sm  (8)      lg  thumb 24 -> px-md (12)
 *
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
 *
 * `origin` is the origin mark's height: the track plus `space-xs` above and
 * below, so it reads as a tick through the track rather than a stripe on it.
 */
export const SLIDER_SIZE = {
  xl: { track: "h-8 rounded-md", fill: "rounded-l-md", thumb: "h-8 w-4", pad: "", inset: "px-sm" },
  lg: { track: "h-6 rounded-full", fill: "rounded-l-full", thumb: "size-6", pad: "", inset: "px-md" },
  md: { track: "h-4 rounded-full", fill: "rounded-l-full", thumb: "size-4", pad: "py-xs", inset: "px-sm" },
  sm: { track: "h-2 rounded-full", fill: "rounded-l-full", thumb: "size-4", pad: "py-sm", inset: "px-sm" },
} as const satisfies Record<
  SliderSize,
  { track: string; fill: string; thumb: string; pad: string; inset: string }
>;

/**
 * The inline bar, on Input's field ladder so it lines up with the fields it
 * sits beside in a panel. The handle is the bar minus 8 above and below — so
 * it never meets the bar's 8px corner radius, even flush at 0 or 100.
 *
 *   sm  32 bar · handle 16 · inset 8    caption (Input sm's role)
 *   md  40 bar · handle 24 · inset 12   body-sm
 *   lg  48 bar · handle 32 · inset 16   body-md
 */
const INLINE_SIZE = {
  sm: { bar: "h-field-sm", inset: "px-sm", text: "text-caption", handle: "h-4" },
  md: { bar: "h-field-md", inset: "px-md", text: "text-body-sm", handle: "h-6" },
  lg: { bar: "h-field-lg", inset: "px-lg", text: "text-body-md", handle: "h-8" },
} as const satisfies Record<SliderInlineSize, { bar: string; inset: string; text: string; handle: string }>;

/**
 * The thumb every track-variant slider draws, Slider's and RangeSlider's
 * alike. The LIFT (hover and drag) is not here, because the two components
 * disagree about what lifts: one thumb lifts for the whole control, but of
 * two thumbs only the one being moved should.
 *
 * Every state is keyed off what Base UI actually renders, which is not the
 * thumb div's own pseudo-classes:
 *
 * - Focus lands on the native `input[type=range]` INSIDE the thumb, so a
 *   `focus-visible:` utility on the div never matched — the ring was declared
 *   and never painted. `has-focus-visible:` matches the div while the input
 *   holds keyboard focus. The ring is listed before `--ui-shadow-sm` so the
 *   thumb keeps its own shadow beneath the ring, as the sheet draws it.
 * - A div has no `:disabled`, so `disabled:` never matched either. Base UI
 *   writes `data-disabled` on the thumb; that is what disabled keys off.
 *
 * A caller's lift must be written `not-has-focus-visible:…` — two box-shadow
 * utilities under different modifiers are not a conflict tailwind-merge can
 * see, so which one wins would fall to Tailwind's variant order. Exclusive by
 * construction instead: focused means the ring, whatever else is true.
 */
export function sliderThumbClass(size: SliderSize) {
  return cn(
    "rounded-full bg-base shadow-sm",
    SLIDER_SIZE[size].thumb,
    // A 2px accent ring is what makes the thumb legible on the fill: white on
    // the sheet's pale blue-80 measures 1.51:1, under SC 1.4.11, which is why
    // the ring takes the legible role instead — 3.73:1 in light.
    "border-thick border-accent-legible",
    "transition-[box-shadow]", motionMicro,
    "has-focus-visible:shadow-[var(--ui-focus-ring),var(--ui-shadow-sm)]",
    "has-focus-visible:forced-colors:outline has-focus-visible:forced-colors:outline-focus",
    "data-disabled:border-edge-subtle data-disabled:shadow-none",
  );
}

interface SliderBaseProps {
  /**
   * Required — a slider with no name announces only a number (§10). Use
   * `isLabelHidden` when the design shows none.
   */
  label: string;
  isLabelHidden?: boolean;
  /**
   * Shows the current value beside the label, as the sheet draws it. The
   * inline variant always shows it — with no thumb, the number IS the readout.
   */
  hasValueText?: boolean;
  /**
   * The value as words or with its unit — "Mostly formal", "12 px", "45°".
   * Shown in the value slot AND written to the input's `aria-valuetext`, so
   * what is seen and what is heard cannot drift apart.
   */
  formatValue?: (value: number) => string;
  /**
   * What a screen reader announces for the value, when it should differ from
   * what is shown. Overrides `formatValue` for the announcement only. Becomes
   * `aria-valuetext` on the thumb's input, the element that carries the slider
   * role — the label still names the control; this only says where it is.
   *
   * Restated in our own shape rather than Base UI's
   * `(formattedValue, value, index)`: one thumb has no index, and the
   * pre-formatted string is the library's locale formatting, which is what
   * a caller writing this function is replacing.
   */
  getAriaValueText?: (value: number) => string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /**
   * Where the fill starts. Defaults to `min` — a value that grows from
   * nothing. Set it inside the range and the slider becomes BIPOLAR: an
   * origin mark is drawn, the fill runs from it toward the thumb, and a drag
   * released within one `step` of it lands on it.
   */
  origin?: number;
  isDisabled?: boolean;
  className?: string;
}

/**
 * The −/+ pair is optional, and its labels are REQUIRED with it. Two icon-only
 * buttons with no accessible name announce as "button, button", and the
 * component cannot write the words — it has no i18n runtime (§9) and does not
 * know what is being stepped.
 */
type SliderStepperProps =
  | {
      hasSteppers?: false;
      decrementLabel?: undefined;
      incrementLabel?: undefined;
      decrementIcon?: undefined;
      incrementIcon?: undefined;
    }
  | {
      hasSteppers: true;
      decrementLabel: string;
      incrementLabel: string;
      /**
       * Slots: the stepper glyphs, defaulting to −/+.
       *
       * They exist because a stepper's MARK depends on what is being stepped,
       * not just its label. Image Edit steps a rotation, where the two ends are
       * counter-clockwise and clockwise rather than less and more — the sheet
       * draws curved arrows there, and −/+ beside a value in degrees reads as
       * a different control. The labels already vary for the same reason; this
       * is the visual half of the same fact.
       */
      decrementIcon?: ReactElement;
      incrementIcon?: ReactElement;
    };

type SliderTrackVariantProps = {
  variant?: "track";
  size?: SliderSize;
  /** The pole at the start of the track — "Casual". Drawn under the track's start. */
  startLabel?: string;
  /** The pole at the end of the track — "Formal". Drawn under the track's end. */
  endLabel?: string;
  /**
   * Slot: a control that sits after the track and shows or sets the value —
   * the sheet puts a Select there. An ELEMENT, never a config (§3): the
   * options and their formatting belong to the caller, and building a Select
   * into a Slider would mean this component owning a data prop.
   */
  valueControl?: ReactElement;
} & SliderStepperProps;

/**
 * The inline bar has no row for anything but itself: steppers, a value
 * control and poles all need a lane beside or under a track, and the whole
 * point of the variant is that there isn't one. Typed `never` rather than
 * omitted, because TypeScript's excess-property check runs against the whole
 * union and would wave `hasSteppers` through as "a prop some member has".
 */
type SliderInlineVariantProps = {
  variant: "inline";
  size?: SliderInlineSize;
  startLabel?: never;
  endLabel?: never;
  valueControl?: never;
  hasSteppers?: never;
  decrementLabel?: never;
  incrementLabel?: never;
  decrementIcon?: never;
  incrementIcon?: never;
};

export type SliderProps = SliderBaseProps & (SliderTrackVariantProps | SliderInlineVariantProps);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const single = (next: number | readonly number[]) =>
  Array.isArray(next) ? (next[0] as number) : (next as number);

/**
 * A single-value slider: a track, a bar with its label inside (`inline`), or
 * a value between two named poles (`origin` + `startLabel` / `endLabel`).
 *
 * The behaviour is Base UI's (ADR 0012), and it is the reason not to hand-roll
 * one: pointer capture, keyboard stepping, Home/End, RTL, touch, and
 * `aria-valuetext` are each individually easy to get *almost* right, and the
 * near-misses only surface for someone using a keyboard or a screen reader.
 *
 * Single value only. Two thumbs are RangeSlider: the value becomes a pair,
 * each thumb needs its own name, and the two must never cross.
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
    className,
    formatValue,
    getAriaValueText,
  } = props;
  const isInline = props.variant === "inline";
  const labelId = useId();

  // The value lives HERE, controlled or not, because three things draw from it
  // that Base UI's own parts cannot: the steppers (which step from where the
  // thumb actually is — before this an uncontrolled slider stepped once from
  // its default and stopped), the fill from an origin, and the leaning pole.
  const [current, setCurrent] = useControllableState<number>({
    value,
    defaultValue: defaultValue ?? min,
    onChange: onValueChange,
  });
  const origin = props.origin === undefined ? undefined : clamp(props.origin, min, max);

  const stepBy = (delta: number) => setCurrent(clamp(current + delta * step, min, max));

  // Announce what is shown unless the caller asked for something else.
  const announce = getAriaValueText ?? formatValue;

  const root = (children: ReactNode) => (
    <BaseSlider.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Root>>({
        min,
        max,
        step,
        disabled: isDisabled,
        value: current,
        // Narrowed from Base UI's (number | number[]) to our single value, so
        // no third-party shape reaches the signature and a caller never has to
        // destructure an array for a control with one thumb.
        onValueChange: (next: number | readonly number[]) => setCurrent(single(next)),
        // The origin's soft detent: a POINTER released within one step of the
        // origin lands on it, so "neither" is reachable by hand. Keyboard
        // commits are left alone — one arrow press from the origin must stay
        // one step away, or the step beside it could never be reached.
        ...(origin !== undefined
          ? {
              onValueCommitted: (next: number | readonly number[], details: { reason: string }) => {
                const v = single(next);
                const byPointer = details.reason === "drag" || details.reason === "track-press";
                if (byPointer && v !== origin && Math.abs(v - origin) <= step) setCurrent(origin);
              },
            }
          : {}),
        // Inline's handle is 2px: its EDGE, not its centre, meets the bar's
        // edge at 0 and 100, so it sits flush instead of half-clipped.
        ...(isInline ? { thumbAlignment: "edge" } : {}),
        "aria-labelledby": labelId,
        // The GROUP is disabled, not just its input. Without this, the label
        // and value — spans the group names, not a <label> tied to the input —
        // read to assistive tech (and to axe) as ordinary text that happens to
        // be grey, rather than as the parts of a control that is off.
        "aria-disabled": isDisabled || undefined,
        className: cn("flex w-full flex-col gap-sm", className),
      })}
    >
      {children}
    </BaseSlider.Root>
  );

  // Tabular figures: the value changes under a drag, and proportional digits
  // make the whole row shimmer as it does.
  const valueText = (className: string) => (
    <BaseSlider.Value
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Value>>({
        "data-slot": "slider-value",
        className: cn(
          "shrink-0 font-body tabular-nums",
          isDisabled ? "text-ink-disabled" : "text-ink-primary",
          className,
        ),
        children: (formatted: readonly string[], values: readonly number[]) =>
          formatValue ? formatValue(values[0] as number) : formatted[0],
      })}
    />
  );

  const thumbA11y = {
    // Base UI renders a native input[type=range] inside the thumb; that input
    // is the control, and naming the surrounding group does not name it.
    "aria-labelledby": labelId,
    // Base UI calls this with (formatted, value, index) and writes the result
    // to the INPUT's aria-valuetext — the thumb div is not the control.
    // Narrowed to the value alone (see the prop).
    ...(announce
      ? { getAriaValueText: (_formatted: string, next: number) => announce(next) }
      : {}),
  };

  // Positions along the track, as percentages: the track is inset by half a
  // thumb (track variant) or is the whole bar (inline), so 0–100% of it is
  // exactly min–max either way.
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const lean = origin === undefined ? 0 : Math.sign(current - origin);

  if (isInline) {
    const g = INLINE_SIZE[props.size ?? "md"];
    return root(
      <BaseSlider.Control
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Control>>({
          "data-slot": "slider-control",
          "data-variant": "inline",
          "data-size": props.size ?? "md",
          className: cn(
            "relative flex w-full touch-none items-center overflow-clip rounded-md select-none",
            g.bar,
            isDisabled ? "cursor-not-allowed bg-field-disabled" : "group/slider-control cursor-pointer bg-elevated",
            "data-dragging:cursor-grabbing",
            // The ring goes on the BAR. The input is inside the 2px handle, and
            // a ring around a 2px line is a smudge, not an indicator.
            "transition-[box-shadow]", motionMicro,
            "has-focus-visible:shadow-(--ui-focus-ring)",
            "has-focus-visible:forced-colors:outline has-focus-visible:forced-colors:outline-focus",
          ),
        })}
      >
        {/* The track IS the bar's whole box — no inset, because the handle is
            2px and sits flush at both ends. */}
        <BaseSlider.Track
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Track>>({
            "data-slot": "slider-track",
            className: "h-full w-full",
          })}
        >
          {origin === undefined ? (
            <BaseSlider.Indicator
              {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Indicator>>({
                "data-slot": "slider-fill",
                className: inlineFillClass(isDisabled),
              })}
            />
          ) : (
            <>
              <div
                data-slot="slider-fill"
                aria-hidden="true"
                className={cn("absolute inset-y-0", inlineFillClass(isDisabled))}
                style={{
                  insetInlineStart: `${Math.min(pct(origin), pct(current))}%`,
                  width: `${Math.abs(pct(current) - pct(origin))}%`,
                }}
              />
              {/* Two notches on the bar's edges rather than a line through it:
                  a full-height line would read as a second handle and cross
                  the label. */}
              <span
                data-slot="slider-origin"
                aria-hidden="true"
                className="absolute top-0 h-1.5 w-0 -translate-x-1/2 rounded-b-full border-s-thick border-edge-default"
                style={{ insetInlineStart: `${pct(origin)}%` }}
              />
              <span
                data-slot="slider-origin"
                aria-hidden="true"
                className="absolute bottom-0 h-1.5 w-0 -translate-x-1/2 rounded-t-full border-s-thick border-edge-default"
                style={{ insetInlineStart: `${pct(origin)}%` }}
              />
            </>
          )}
          <BaseSlider.Thumb
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Thumb>>({
              "data-slot": "slider-thumb",
              ...thumbA11y,
              // A 2px HANDLE, drawn as a stroke: --ui-border-strong at rest
              // (4.8:1 on the fill, 5.4:1 on the bar), primary ink while the
              // pointer is over the bar or dragging it.
              className: cn(
                "w-0 rounded-full border-s-thick",
                g.handle,
                "transition-[border-color]", motionMicro,
                isDisabled
                  ? "border-ink-disabled"
                  : "border-edge-strong group-hover/slider-control:border-ink-primary data-dragging:border-ink-primary has-focus-visible:border-ink-primary",
              ),
            })}
          />
        </BaseSlider.Track>

        {/* Label and value paint ABOVE the fill and the handle, and let every
            press through to the bar beneath — the whole bar is the target. */}
        <div
          data-slot="slider-content"
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-between gap-sm",
            g.inset,
          )}
        >
          <span
            id={labelId}
            data-slot="slider-label"
            className={cn(
              "min-w-0 flex-1 truncate font-body",
              g.text,
              isDisabled ? "text-ink-disabled" : "text-ink-secondary",
              isLabelHidden && "sr-only",
            )}
          >
            {label}
          </span>
          {valueText(g.text)}
        </div>
      </BaseSlider.Control>,
    );
  }

  const size = props.size ?? "md";
  const geometry = SLIDER_SIZE[size];
  const hasSteppers = props.hasSteppers === true;
  const hasPoles = props.startLabel !== undefined || props.endLabel !== undefined;

  return root(
    <>
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
            "flex-1 text-body-sm font-body",
            isDisabled ? "text-ink-disabled" : "text-ink-muted",
            isLabelHidden && "sr-only",
          )}
        >
          {label}
        </span>
        {hasValueText && valueText("text-body-sm")}
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
            {props.decrementIcon ?? <Minus aria-hidden="true" />}
          </button>
        )}

        <BaseSlider.Control
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Control>>({
            "data-slot": "slider-control",
            "data-variant": "track",
            // The CONTROL is the pointer target and must clear 24px even when
            // the painted track is 8px (SC 2.5.8) — so it is padded, not
            // resized. Only the sizes that need it are padded; see SLIDER_SIZE.
            // It is also the hover GROUP: a press anywhere on it moves the
            // thumb, so anywhere on it is where the thumb should lift.
            className: cn(
              "relative flex flex-1 touch-none items-center select-none",
              geometry.pad,
              geometry.inset,
              isDisabled ? "cursor-not-allowed" : "group/slider-control cursor-pointer",
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
            {origin === undefined ? (
              <BaseSlider.Indicator
                {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Indicator>>({
                  "data-slot": "slider-fill",
                  // A background-IMAGE, so it needs the `image:` hint —
                  // `bg-(--ui-gradient-accent)` would set a background-COLOUR to
                  // a gradient string and paint nothing at all.
                  //
                  // The ramp is the sheet's own blue-80 → blue-70: 1.24:1 and
                  // 1.80:1 against this track in light. A SECONDARY cue — the
                  // thumb's ring carries SC 1.4.11, and check:contrast measures it.
                  className: cn("h-full", trackFillClass(isDisabled), geometry.fill),
                })}
              />
            ) : (
              <>
                {/* From the origin to the thumb, square at both ends. Below
                    the origin the same ramp is MIRRORED, so it always deepens
                    toward the thumb: the further it leans, the stronger. */}
                <div
                  data-slot="slider-fill"
                  data-lean={lean < 0 ? "start" : lean > 0 ? "end" : "none"}
                  aria-hidden="true"
                  className={cn("absolute inset-y-0", trackFillClass(isDisabled), lean < 0 && "-scale-x-100")}
                  style={{
                    insetInlineStart: `${Math.min(pct(origin), pct(current))}%`,
                    width: `${Math.abs(pct(current) - pct(origin))}%`,
                  }}
                />
                {/* Above the fill, below the thumb: at the origin its two
                    ends show above and below the thumb — the mark for
                    "centred". */}
                <span
                  data-slot="slider-origin"
                  aria-hidden="true"
                  className={cn(
                    "absolute -inset-y-xs w-0 -translate-x-1/2 rounded-full border-s-thick",
                    isDisabled ? "border-edge-subtle" : "border-edge-default",
                  )}
                  style={{ insetInlineStart: `${pct(origin)}%` }}
                />
              </>
            )}
            <BaseSlider.Thumb
              {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSlider.Thumb>>({
                "data-slot": "slider-thumb",
                ...thumbA11y,
                className: cn(
                  sliderThumbClass(size),
                  // The lift: --ui-shadow-md while the pointer is anywhere on
                  // the control, and for the whole of a drag even once the
                  // pointer has left it. Never while focused — see
                  // sliderThumbClass on why these must be exclusive.
                  "group-hover/slider-control:not-has-focus-visible:shadow-md",
                  "data-dragging:not-has-focus-visible:shadow-md",
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
            {props.incrementIcon ?? <Plus aria-hidden="true" />}
          </button>
        )}

        {props.valueControl}
      </div>

      {hasPoles && (
        // Aligned to the CONTROL's edges, where the thumb's outer edge lands
        // at either extreme. The pole the value leans toward lifts to the
        // primary ink — a static cue, never animated.
        <div
          data-slot="slider-poles"
          className="flex items-start justify-between gap-sm text-caption font-body"
        >
          <span
            data-slot="slider-pole-start"
            data-leaning={lean < 0 || undefined}
            className={poleClass(isDisabled, lean < 0)}
          >
            {props.startLabel}
          </span>
          <span
            data-slot="slider-pole-end"
            data-leaning={lean > 0 || undefined}
            className={cn("text-end", poleClass(isDisabled, lean > 0))}
          >
            {props.endLabel}
          </span>
        </div>
      )}
    </>,
  );
}

function trackFillClass(isDisabled: boolean) {
  return isDisabled ? "bg-field-chrome-disabled" : "bg-(image:--ui-gradient-accent)";
}

/**
 * The inline fill is the accent WASH, flat: a gradient behind a line of text
 * makes the text sit on two grounds at once. It steps to the hover wash while
 * the pointer is over the bar or dragging it — one direction (more accent) in
 * both schemes.
 */
function inlineFillClass(isDisabled: boolean) {
  return isDisabled
    ? "h-full bg-field-chrome-disabled"
    : cn(
        "h-full bg-accent-subtle",
        "transition-[background-color]", motionMicro,
        "group-hover/slider-control:bg-accent-subtle-hover data-dragging:bg-accent-subtle-hover",
      );
}

function poleClass(isDisabled: boolean, isLeaning: boolean) {
  if (isDisabled) return "text-ink-disabled";
  return isLeaning ? "text-ink-primary" : "text-ink-muted";
}
