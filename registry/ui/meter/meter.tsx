import { forwardRef, useId, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import { arcPath, ratioOf } from "@/lib/viz";

/**
 * A reading that has crossed a limit. Each one REQUIRES its words
 * (`statusText`): the fill changes colour, and colour alone may not carry the
 * state (SC 1.4.1), so the sheet prints "84%, near limit" beside the bar.
 */
export type MeterStatus = "warning" | "danger";

export type MeterShape = "linear" | "radial";

/** Fill per state. The default is the legible accent, not a data slot: a
 *  meter is one measurement, not a series (the sheet's "Meter fill role"). */
const FILL = {
  normal: "bg-accent-legible",
  warning: "bg-warning",
  danger: "bg-danger",
} as const;
const ARC = {
  normal: "stroke-accent-legible",
  warning: "stroke-warning",
  danger: "stroke-danger",
} as const;

/** Radial geometry from the sheet: an 80px box, r=34, an 8px track. */
const RING = { size: 80, r: 34 } as const;

type ValueProps =
  | {
      /** The reading. Clamped into min…max for drawing; the clamped value is announced. */
      value: number;
      emptyText?: never;
    }
  | {
      /** No reading yet. The track is drawn empty and `emptyText` says why. */
      value: null;
      /** Required with no value — an empty bar with no words reads as zero. */
      emptyText: string;
    };

type StatusProps =
  | { status?: undefined; statusText?: never }
  | {
      status: MeterStatus;
      /** The words for the state ("near limit"), shown after the value and announced with it. */
      statusText: string;
    };

type ShapeProps =
  | {
      shape?: "linear";
      /** A goal on the same scale, drawn as a rule across the track. */
      target?: number;
      /** Required with a target — the rule's label ("Target 75%"). */
      targetText?: string;
    }
  | {
      /** The 80px ring the sheet pairs with a stat. Takes no target: the sheet draws none on it. */
      shape: "radial";
      target?: never;
      targetText?: never;
    };

type TargetProps = { target?: undefined; targetText?: never } | { target: number; targetText: string };

interface MeterBaseProps {
  /** Required — names what is measured. Use `isLabelHidden` when the layout shows it elsewhere. */
  label: string;
  isLabelHidden?: boolean;
  min?: number;
  max?: number;
  /**
   * What the value reads as, shown and announced. Defaults to the rounded
   * percentage of the range. Pass it for units ("412 of 600 sheets").
   */
  valueText?: string;
  /** Reserves the meter's height with an empty track while the reading loads. */
  isLoading?: boolean;
}

type NativeProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  keyof MeterBaseProps | "value" | "role" | "children" | "emptyText" | "status" | "target" | "shape"
>;

export type MeterProps = MeterBaseProps & ValueProps & StatusProps & ShapeProps & TargetProps & NativeProps;

/**
 * One value against a range: a gauge, not a task. That is the line between
 * Meter and Progress — "68% of the paper stock is left" is a measurement that
 * can go up or down; "68% uploaded" is a task that only finishes.
 *
 * `role="meter"` (ARIA 1.2) with the clamped value, the range and a
 * `aria-valuetext` that is exactly what is printed, status words included.
 * The native `<meter>` cannot be styled to this design across engines, and it
 * has no behaviour to lose — it is output, like Progress.
 */
export const Meter = forwardRef<HTMLDivElement, MeterProps>(function Meter(props, ref) {
  const {
    label,
    isLabelHidden = false,
    min = 0,
    max = 100,
    value,
    emptyText,
    valueText,
    status,
    statusText,
    shape = "linear",
    target,
    targetText,
    isLoading = false,
    className,
    ...rest
  } = props;

  const labelId = useId();
  const hasReading = value !== null && Number.isFinite(value) && !isLoading;
  const clamped = hasReading ? Math.min(max, Math.max(min, value)) : null;
  const ratio = clamped === null ? 0 : ratioOf(clamped, min, max);
  const reading = clamped === null ? null : (valueText ?? `${Math.round(ratio * 100)}%`);
  // Printed and announced as one string, so the two can never disagree.
  const spoken = reading === null ? null : status ? `${reading}, ${statusText}` : reading;
  const tone = status ?? "normal";

  // Only a reading is a meter. With no value, aria-valuenow would have to be
  // invented, so the track is decoration and the words carry the state.
  const meterAria =
    clamped === null
      ? { "aria-hidden": true as const }
      : {
          role: "meter",
          "aria-labelledby": labelId,
          "aria-valuenow": clamped,
          "aria-valuemin": min,
          "aria-valuemax": max,
          "aria-valuetext": spoken ?? undefined,
        };

  const labelEl = (
    <span
      id={labelId}
      data-slot="meter-label"
      className={cn("text-label-sm font-body text-ink-muted", (isLabelHidden || shape === "radial") && "sr-only")}
    >
      {label}
    </span>
  );

  if (shape === "radial") {
    const c = RING.size / 2;
    return (
      <div
        ref={ref}
        data-slot="meter"
        data-shape="radial"
        data-status={status}
        aria-busy={isLoading || undefined}
        className={cn("inline-flex flex-col items-center gap-sm", className)}
        {...rest}
      >
        {labelEl}
        <div data-slot="meter-ring" className="relative grid size-20 shrink-0 place-items-center" {...meterAria}>
          <svg
            aria-hidden="true"
            focusable="false"
            width={RING.size}
            height={RING.size}
            viewBox={`0 0 ${RING.size} ${RING.size}`}
            className="absolute inset-0"
          >
            <circle data-slot="meter-track" cx={c} cy={c} r={RING.r} fill="none" className="stroke-sunken" style={TRACK_STROKE} />
            {ratio > 0 && (
              <path
                data-slot="meter-fill"
                d={arcPath(c, c, RING.r, ratio)}
                fill="none"
                strokeLinecap="round"
                className={ARC[tone]}
                style={TRACK_STROKE}
              />
            )}
          </svg>
          {reading !== null && (
            <span data-slot="meter-value" aria-hidden="true" className="relative text-label-md font-body tabular-nums text-ink-primary">
              {reading}
            </span>
          )}
        </div>
        {status && reading !== null && (
          <span data-slot="meter-status" aria-hidden="true" className="text-label-sm font-body text-ink-muted">
            {statusText}
          </span>
        )}
        {value === null && !isLoading && (
          <span data-slot="meter-empty" className="text-label-sm font-body text-ink-muted">{emptyText}</span>
        )}
      </div>
    );
  }

  const targetRatio = target === undefined ? null : ratioOf(target, min, max);

  return (
    <div
      ref={ref}
      data-slot="meter"
      data-shape="linear"
      data-status={status}
      aria-busy={isLoading || undefined}
      className={cn("flex w-full flex-col gap-sm", className)}
      {...rest}
    >
      <div className={cn("flex items-baseline justify-between gap-sm", isLabelHidden && reading === null && value !== null && "sr-only")}>
        {labelEl}
        {spoken !== null && (
          // aria-hidden: the meter announces this through aria-valuetext, and
          // reading it twice is noise.
          <span data-slot="meter-value" aria-hidden="true" className="text-label-sm font-body tabular-nums text-ink-primary">
            {spoken}
          </span>
        )}
        {value === null && !isLoading && (
          <span data-slot="meter-empty" className="text-label-sm font-body text-ink-muted">{emptyText}</span>
        )}
      </div>

      <div
        data-slot="meter-bar"
        className={cn("relative flex shrink-0 items-center", targetRatio === null ? "h-sm" : "h-lg")}
        {...meterAria}
      >
        <div data-slot="meter-track" className="absolute inset-x-0 h-sm rounded-full bg-sunken">
          {ratio > 0 && (
            <div
              data-slot="meter-fill"
              style={{ width: `${ratio * 100}%` }}
              className={cn("h-full rounded-full", FILL[tone])}
            />
          )}
        </div>
        {targetRatio !== null && (
          <div
            data-slot="meter-target"
            aria-hidden="true"
            style={{ insetInlineStart: `${targetRatio * 100}%` }}
            // A solid rule (ADR 0023 §6), border-strong at the thick stroke:
            // the strongest LINE role, audited at 3:1 on the page and the card.
            className="absolute inset-y-0 border-s-thick border-edge-strong"
          />
        )}
      </div>

      {targetRatio !== null && targetText !== undefined && (
        <div className="relative h-lg">
          <span
            data-slot="meter-target-label"
            // Starts at the rule in the first half, ends at it in the second,
            // so it never runs off the bar's far end.
            style={
              targetRatio <= 0.5
                ? { insetInlineStart: `${targetRatio * 100}%` }
                : { insetInlineEnd: `${(1 - targetRatio) * 100}%` }
            }
            className="absolute top-0 text-label-sm font-body whitespace-nowrap text-ink-muted"
          >
            {targetText}
          </span>
        </div>
      )}
    </div>
  );
});

/** The ring's thickness is the linear track's height (space-sm, 8px), so the two shapes move together. */
const TRACK_STROKE = { strokeWidth: "var(--ui-space-sm)" } as const;
