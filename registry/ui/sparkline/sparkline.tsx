import { forwardRef, useId, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import { areaPath, columns, extent, linePath, seriesPoints, type Domain, type PlotBox } from "@/lib/viz";

/**
 * The eight ordinal categorical slots (ADR 0023). A series takes a slot in
 * fixed order and keeps it; a sparkline beside a full chart should take the
 * same slot its series has there.
 */
export type DataSeries = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** The three forms the sheet draws. `line` is the default trend. */
export type SparklineVariant = "line" | "area" | "column";

/**
 * The sheet's two drawn sizes: 160×40 in a specimen row, 120×32 beside a stat
 * tile's value. A sparkline sizes like a word, not like a panel, so these are
 * fixed rather than fluid — a stretched sparkline exaggerates its own slope.
 */
export type SparklineSize = "md" | "sm";

const SIZE = {
  md: { width: 160, height: 40, box: "h-10 w-40" },
  sm: { width: 120, height: 32, box: "h-8 w-30" },
} as const satisfies Record<SparklineSize, { width: number; height: number; box: string }>;

/**
 * Literal class strings per slot — Tailwind finds utilities by scanning
 * source, so a class built from a template string is a class that is never
 * generated. `check:utilities` resolves every one of these against the
 * emitted theme.
 */
const STROKE = {
  1: "stroke-data-cat-1-solid", 2: "stroke-data-cat-2-solid", 3: "stroke-data-cat-3-solid", 4: "stroke-data-cat-4-solid",
  5: "stroke-data-cat-5-solid", 6: "stroke-data-cat-6-solid", 7: "stroke-data-cat-7-solid", 8: "stroke-data-cat-8-solid",
} as const satisfies Record<DataSeries, string>;
const FILL = {
  1: "fill-data-cat-1-solid", 2: "fill-data-cat-2-solid", 3: "fill-data-cat-3-solid", 4: "fill-data-cat-4-solid",
  5: "fill-data-cat-5-solid", 6: "fill-data-cat-6-solid", 7: "fill-data-cat-7-solid", 8: "fill-data-cat-8-solid",
} as const satisfies Record<DataSeries, string>;
/** The area's wash: the slot's own `-bg` role (14%), not a typed opacity. */
const WASH = {
  1: "fill-data-cat-1-bg", 2: "fill-data-cat-2-bg", 3: "fill-data-cat-3-bg", 4: "fill-data-cat-4-bg",
  5: "fill-data-cat-5-bg", 6: "fill-data-cat-6-bg", 7: "fill-data-cat-7-bg", 8: "fill-data-cat-8-bg",
} as const satisfies Record<DataSeries, string>;

/** End marker: a 4px dot inside a 6px ring of the card's surface (the sheet). */
const MARKER_R = 4;
const RING_R = 6;

/**
 * Insets that keep every mark inside the box: the ring around the end marker
 * is 6px, so the right, top and bottom edges leave room for it; the left edge
 * only has to hold the round cap of a 2px stroke.
 */
function plotBox(width: number, height: number): PlotBox {
  return { width, height, inset: { top: RING_R, right: RING_R + 2, bottom: RING_R, left: 2 } };
}

interface SparklineOwnProps {
  /** The series, oldest first. Non-finite values are dropped, not drawn as 0. */
  data: readonly number[];
  /**
   * Required — the accessible name, naming WHAT is measured ("Posters
   * printed, last 12 months"). Not shown: a sparkline sits beside a label the
   * layout already draws.
   */
  label: string;
  /**
   * Required — the takeaway, written by a person ("Rose 12% since January").
   * A sparkline is the one chart allowed to ship without a data table
   * (ADR 0023 §4), and only because this sentence carries the facts instead.
   */
  description: string;
  variant?: SparklineVariant;
  series?: DataSeries;
  size?: SparklineSize;
  /**
   * Marks the latest value with a ringed dot (line and area). On by default:
   * a trend without an end point does not say where it is NOW.
   */
  hasEndMarker?: boolean;
  /** Reserves the box with a skeleton fill, so a row of tiles never jumps. */
  isLoading?: boolean;
  /**
   * The value range the box's height spans, for line and area. Default: the
   * series' own min to max, which stretches any wobble to the full height —
   * right for one sparkline read alone, wrong for a COLUMN of them, where a
   * flat 12 ↔ 13 would draw like a crash beside a real one. Pass one domain
   * to every sparkline in the column so their slopes compare. It is widened
   * to hold every value, so a too-narrow domain never clips the line.
   * Columns ignore it: they stand on zero by construction.
   */
  domain?: readonly [number, number];
}

export interface SparklineProps
  extends SparklineOwnProps,
    Omit<HTMLAttributes<HTMLDivElement>, keyof SparklineOwnProps | "children" | "role"> {}

/**
 * An inline, axis-free trend.
 *
 * One image to assistive technology: `role="img"`, named by `label` and
 * described by `description`. The SVG inside is `aria-hidden` — its paths
 * carry nothing a screen reader could say that the description does not.
 *
 * Server-safe and deterministic: the paths are computed during render from
 * the props alone, rounded to two decimals, so the server and client markup
 * are identical and the component needs no hydration to be correct.
 */
export const Sparkline = forwardRef<HTMLDivElement, SparklineProps>(function Sparkline(
  {
    data,
    label,
    description,
    variant = "line",
    series = 1,
    size = "md",
    hasEndMarker = true,
    isLoading = false,
    domain,
    className,
    ...rest
  },
  ref,
) {
  const descriptionId = useId();
  const { width, height, box } = SIZE[size];

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      aria-describedby={descriptionId}
      aria-busy={isLoading || undefined}
      data-slot="sparkline"
      data-variant={variant}
      data-size={size}
      data-series={series}
      className={cn("relative inline-block shrink-0 align-middle", box, className)}
      {...rest}
    >
      <span id={descriptionId} className="sr-only">
        {description}
      </span>
      {isLoading ? (
        <span data-slot="sparkline-skeleton" className="block size-full rounded-sm bg-sunken" />
      ) : (
        <svg
          aria-hidden="true"
          focusable="false"
          data-slot="sparkline-plot"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block overflow-visible"
        >
          {variant === "column" ? (
            <Columns data={data} width={width} height={height} series={series} />
          ) : (
            <Trend
              data={data}
              width={width}
              height={height}
              series={series}
              hasArea={variant === "area"}
              hasEndMarker={hasEndMarker}
              {...(domain ? { domain } : {})}
            />
          )}
        </svg>
      )}
    </div>
  );
});

function Trend({
  data,
  width,
  height,
  series,
  hasArea,
  hasEndMarker,
  domain,
}: {
  data: readonly number[];
  width: number;
  height: number;
  series: DataSeries;
  hasArea: boolean;
  hasEndMarker: boolean;
  domain?: readonly [number, number];
}) {
  const own = extent(data);
  const span: Domain | undefined =
    domain && own ? [Math.min(domain[0], own[0]), Math.max(domain[1], own[1])] : undefined;
  const points = seriesPoints(data, plotBox(width, height), span);
  if (points.length === 0) return null;
  const last = points[points.length - 1]!;

  // One point is not a trend: the sheet draws it as the bare dot, centred,
  // with no ring (there is no line for the ring to separate it from).
  if (points.length === 1) {
    return <circle data-slot="sparkline-marker" cx={last.x} cy={last.y} r={MARKER_R} className={FILL[series]} />;
  }

  return (
    <>
      {hasArea && <path data-slot="sparkline-area" d={areaPath(points, height)} className={WASH[series]} />}
      <path
        data-slot="sparkline-line"
        d={linePath(points)}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        // The stroke scale's thick step (ADR 0020 §2): 2px at theme zero, and
        // it follows a brand's stroke knob. A width is never a utility here.
        style={{ strokeWidth: "var(--ui-stroke-thick)" }}
        className={STROKE[series]}
      />
      {hasEndMarker && (
        <>
          <circle data-slot="sparkline-marker-ring" cx={last.x} cy={last.y} r={RING_R} className="fill-surface" />
          <circle data-slot="sparkline-marker" cx={last.x} cy={last.y} r={MARKER_R} className={FILL[series]} />
        </>
      )}
    </>
  );
}

function Columns({ data, width, height, series }: { data: readonly number[]; width: number; height: number; series: DataSeries }) {
  // Columns fill the box edge to edge — they have no end marker to make room
  // for. 2px is the dataviz surface gap between fills; 8px the sheet's width.
  const cols = columns(data, { width, height, gap: 2, maxWidth: 8, radius: 4 });
  return (
    <>
      {cols.map((c, i) =>
        c.path ? <path key={i} data-slot="sparkline-column" d={c.path} className={FILL[series]} /> : null,
      )}
    </>
  );
}
