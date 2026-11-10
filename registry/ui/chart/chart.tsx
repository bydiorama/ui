"use client";

import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { ChartTable } from "griddy-icons";

import { cn } from "@/lib/cn";
import {
  MARKER_SHAPES,
  areaPath,
  bandPath,
  barPath,
  groupedBars,
  labelIndices,
  linePath,
  linearScale,
  markerPath,
  pointPositions,
  round,
  rowBarPath,
  stackSeries,
  valueAxis,
  type MarkerShape,
  type Point,
  type StackedValue,
} from "@/lib/viz";
import { Button } from "@/ui/button";
import { Table, type TableColumn } from "@/ui/table";

/** One of the eight ordinal data slots (ADR 0023 §5). */
export type ChartSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type ChartSize = "md" | "sm";

/** A series: which field of each row it reads, and what a person calls it. */
export interface ChartSeries<Row> {
  key: keyof Row & string;
  /** Shown in the legend, the tooltip, the table header and every announcement. */
  label: string;
  /**
   * The slot this series wears. Defaults to its position. Pin it when a filter
   * can remove series, so the survivors keep their colour — colour follows the
   * entity, never its rank.
   */
  slot?: ChartSlot;
}

/* Literal class maps: Tailwind sees only whole class names, never `fill-${x}`. */
const FILL = {
  1: "fill-data-cat-1-solid", 2: "fill-data-cat-2-solid", 3: "fill-data-cat-3-solid", 4: "fill-data-cat-4-solid",
  5: "fill-data-cat-5-solid", 6: "fill-data-cat-6-solid", 7: "fill-data-cat-7-solid", 8: "fill-data-cat-8-solid",
} as const satisfies Record<ChartSlot, string>;
const STROKE = {
  1: "stroke-data-cat-1-solid", 2: "stroke-data-cat-2-solid", 3: "stroke-data-cat-3-solid", 4: "stroke-data-cat-4-solid",
  5: "stroke-data-cat-5-solid", 6: "stroke-data-cat-6-solid", 7: "stroke-data-cat-7-solid", 8: "stroke-data-cat-8-solid",
} as const satisfies Record<ChartSlot, string>;
const WASH = {
  1: "fill-data-cat-1-bg", 2: "fill-data-cat-2-bg", 3: "fill-data-cat-3-bg", 4: "fill-data-cat-4-bg",
  5: "fill-data-cat-5-bg", 6: "fill-data-cat-6-bg", 7: "fill-data-cat-7-bg", 8: "fill-data-cat-8-bg",
} as const satisfies Record<ChartSlot, string>;

/** Plot height and tick intervals per size: the Anatomy sheet's 240px with
 *  five ticks, and the Line sheet's 160px with three. */
const SIZE = {
  md: { height: 240, intervals: 4 },
  sm: { height: 160, intervals: 2 },
} as const satisfies Record<ChartSize, { height: number; intervals: number }>;

/** Width before the plot is measured — the server's render, and the first
 *  client one, so the two agree (ADR 0023 §7). */
const DEFAULT_WIDTH = 640;
/** The lane the Line sheet keeps right of the plot for direct labels. */
const LABEL_LANE = 96;
/** A direct label sits this far right of its end marker (sheet: 360 → 376). */
const LABEL_OFFSET = 16;
/** The data end of a bar: radius-sm, 4px. */
const BAR_RADIUS = 4;
/** The surface gap between touching marks. */
const MARK_GAP = 2;
/** Direct labels at the line end for up to four series; beyond that the
 *  legend carries identity alone (the dataviz rule the sheets follow). */
const MAX_DIRECT_LABELS = 4;
/** Skeleton column heights while loading, as fractions of the plot. */
const SKELETON = [0.35, 0.55, 0.65, 0.45, 0.8, 0.6] as const;

/** The Bar sheet's horizontal rows: a 168px name lane, 24px bars 16px apart. */
const NAME_LANE = 168;
const ROW_HEIGHT = 24;
const ROW_GAP = 16;
const ROW_PITCH = ROW_HEIGHT + ROW_GAP;
/** Kept clear right of the plot so the longest bar's value never clips. */
const VALUE_LANE = 56;
/** A row's value sits this far past its bar's end (sheet: gap 8). */
const VALUE_OFFSET = 8;

/**
 * Forced colours take every slot colour away, so each slot gets its own fill
 * instead: slot 1 solid system ink, slot 2 the anatomy sheet's solid 45°
 * hatch, and 3–8 the rest of the family (135°, cross, horizontal, vertical,
 * grid, outline) so no two series ever share one. A 6px pitch, as drawn.
 */
const HATCH = {
  2: "M-1 1l2-2M0 6l6-6M5 7l2-2",
  3: "M-1 5l2 2M0 0l6 6M5 -1l2 2",
  4: "M-1 1l2-2M0 6l6-6M5 7l2-2M-1 5l2 2M0 0l6 6M5 -1l2 2",
  5: "M0 3H6",
  6: "M3 0V6",
  7: "M0 3H6M3 0V6",
  8: "",
} as const satisfies Record<Exclude<ChartSlot, 1>, string>;

/**
 * The classes and custom property that put a slot's forced-colours fill on a
 * mark. `forced-color-adjust: none` keeps the UA from flattening the pattern
 * back to one ink — the fills it sets are system colours, so they still follow
 * the reader's theme.
 */
function forcedFill(slot: ChartSlot, hatchId: string): { className: string; style?: CSSProperties } {
  if (slot === 1) return { className: "forced-color-adjust-none forced-colors:fill-[CanvasText]" };
  return {
    className: "forced-color-adjust-none forced-colors:fill-(--chart-hatch) forced-colors:stroke-[CanvasText]",
    style: { "--chart-hatch": `url(#${hatchId}-${slot})` } as CSSProperties,
  };
}

/** The patterns `forcedFill` points at. Painted only through forced colours. */
function HatchDefs({ id }: { id: string }) {
  return (
    <defs>
      {(Object.keys(HATCH) as `${Exclude<ChartSlot, 1>}`[]).map((slot) => (
        <pattern
          key={slot}
          id={`${id}-${slot}`}
          width={6}
          height={6}
          patternUnits="userSpaceOnUse"
          className="forced-color-adjust-none"
        >
          <rect width={6} height={6} className="fill-[Canvas]" />
          {HATCH[slot] && <path d={HATCH[slot]} fill="none" strokeWidth={1} className="stroke-[CanvasText]" />}
        </pattern>
      ))}
    </defs>
  );
}

interface ResolvedSeries {
  key: string;
  label: string;
  slot: ChartSlot;
  shape: MarkerShape;
  values: number[];
}

interface Active {
  index: number;
  series: number;
}

interface ChartContextValue {
  categories: string[];
  series: ResolvedSeries[];
  stacks: StackedValue[][] | null;
  layout: "band" | "point";
  /** Horizontal bars: categories run down the rows, values across. */
  isHorizontal: boolean;
  /** Horizontal only: a value's x position. */
  valueX: (value: number) => number;
  /** Prefix of this chart's forced-colours pattern ids. */
  hatchId: string;
  /** The SVG's full width: the plot plus any direct-label lane. */
  width: number;
  plotWidth: number;
  height: number;
  y: (value: number) => number;
  /** Centre of category `i` on the x axis. */
  x: (index: number) => number;
  bandWidth: number;
  hasDirectLabels: boolean;
  /** The series whose legend entry the pointer is on; the others dim. */
  emphasis: string | null;
  active: Active | null;
  isFocused: boolean;
  format: (value: number) => string;
}

const ChartContext = createContext<ChartContextValue | null>(null);

function useChart(part: string): ChartContextValue {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error(`<Chart.${part}> must be a direct child of <Chart>.`);
  return ctx;
}

/** Where each bar of category `i` sits, grouped or stacked. Shared by the
 *  marks and the focus ring, so the ring can never miss its bar. */
function barGeometry(ctx: ChartContextValue, i: number, s: number): { x: number; width: number; top: number; bottom: number } | null {
  const { series, stacks, bandWidth, y } = ctx;
  if (ctx.isHorizontal) {
    const value = series[s]?.values[i];
    if (value === undefined || !Number.isFinite(value)) return null;
    const a = ctx.valueX(0);
    const b = ctx.valueX(value);
    return { x: Math.min(a, b), width: Math.abs(b - a), top: i * ROW_PITCH, bottom: i * ROW_PITCH + ROW_HEIGHT };
  }
  const bandStart = ctx.x(i) - bandWidth / 2;
  const zero = y(0);
  if (stacks) {
    const { xs, width } = groupedBars(bandStart, bandWidth, 1);
    const seg = stacks[s]?.[i];
    if (!seg || seg.y0 === seg.y1) return null;
    return { x: xs[0]!, width, top: y(Math.max(seg.y0, seg.y1)), bottom: y(Math.min(seg.y0, seg.y1)) };
  }
  const value = series[s]?.values[i];
  if (value === undefined || !Number.isFinite(value)) return null;
  const { xs, width } = groupedBars(bandStart, bandWidth, series.length, { gap: MARK_GAP });
  const vy = y(value);
  return { x: xs[s]!, width, top: Math.min(vy, zero), bottom: Math.max(vy, zero) };
}

/**
 * The Bar sheet's legend hover: every series but the one under the pointer
 * drops to 0.32, so a reader can pick one out of a crowd. Instant, like every
 * other data change here.
 */
function dim(ctx: ChartContextValue, key: string): string | undefined {
  return ctx.emphasis !== null && ctx.emphasis !== key ? "opacity-32" : undefined;
}

/* ── Marks ─────────────────────────────────────────────────────────────── */

export interface ChartBarsProps {
  /**
   * `horizontal` is the Bar sheet's ranked rows: names on the left, the value
   * at each bar's tip, no axis. One series only, never stacked — grouped and
   * stacked horizontal bars are not designed.
   */
  orientation?: "vertical" | "horizontal";
}

/** Columns: grouped side by side, or stacked when the chart is `isStacked`. */
function Bars({ orientation = "vertical" }: ChartBarsProps) {
  const ctx = useChart("Bars");
  const { series, stacks, categories, y, hatchId } = ctx;
  const zero = y(0);
  if (orientation === "horizontal") {
    const s = series[0]!;
    const forced = forcedFill(s.slot, hatchId);
    return (
      <g data-slot="chart-bars">
        <g data-slot="chart-series" data-series={s.key} className={cn(FILL[s.slot], forced.className)} style={forced.style}>
          {s.values.map((v, i) => {
            if (!Number.isFinite(v)) return null;
            const top = i * ROW_PITCH;
            return <path key={i} data-slot="chart-bar" d={rowBarPath(top, ROW_HEIGHT, ctx.valueX(v), ctx.valueX(0), BAR_RADIUS)} />;
          })}
        </g>
        {s.values.map((v, i) => {
          if (!Number.isFinite(v)) return null;
          const end = ctx.valueX(v);
          const isNegative = v < 0;
          return (
            <text
              key={i}
              data-slot="chart-value"
              x={round(end + (isNegative ? -VALUE_OFFSET : VALUE_OFFSET))}
              y={i * ROW_PITCH + ROW_HEIGHT / 2}
              dominantBaseline="central"
              textAnchor={isNegative ? "end" : "start"}
              className="fill-ink-primary font-body text-label-sm tabular-nums"
            >
              {ctx.format(v)}
            </text>
          );
        })}
      </g>
    );
  }
  return (
    <g data-slot="chart-bars">
      {series.map((s, si) => (
        <g
          key={s.key}
          data-slot="chart-series"
          data-series={s.key}
          className={cn(FILL[s.slot], forcedFill(s.slot, hatchId).className, dim(ctx, s.key))}
          style={forcedFill(s.slot, hatchId).style}
        >
          {categories.map((_, i) => {
            const g = barGeometry(ctx, i, si);
            if (!g) return null;
            if (stacks) {
              const seg = stacks[si]![i]!;
              const positive = seg.y1 >= seg.y0;
              // Only the outermost segment rounds; the 2px surface gap opens
              // on the baseline side of every segment that stands on another.
              const isOuter = !stacks.slice(si + 1).some((next) => {
                const n = next[i]!;
                return n.y1 !== n.y0 && (n.y1 >= n.y0) === positive;
              });
              const onBase = positive ? seg.y0 === 0 : seg.y0 === 0;
              const gap = onBase ? 0 : MARK_GAP;
              const top = positive ? g.top : g.top + gap;
              const bottom = positive ? g.bottom - gap : g.bottom;
              if (bottom - top <= 0) return null;
              const d = positive
                ? barPath(g.x, g.width, top, bottom, isOuter ? BAR_RADIUS : 0)
                : barPath(g.x, g.width, bottom, top, isOuter ? BAR_RADIUS : 0);
              return <path key={i} data-slot="chart-bar" d={d} />;
            }
            const value = s.values[i]!;
            return <path key={i} data-slot="chart-bar" d={barPath(g.x, g.width, y(value), zero, BAR_RADIUS)} />;
          })}
        </g>
      ))}
    </g>
  );
}

/** Runs of consecutive finite points. A missing value breaks the line rather
 *  than bridging it — a bridge states readings nobody took. */
function runs(values: readonly number[], x: (i: number) => number, y: (v: number) => number): Point[][] {
  const out: Point[][] = [];
  let run: Point[] = [];
  values.forEach((v, i) => {
    if (Number.isFinite(v)) run.push({ x: x(i), y: y(v) });
    else if (run.length) {
      out.push(run);
      run = [];
    }
  });
  if (run.length) out.push(run);
  return out;
}

/** The ringed marker the Line sheet draws at a line's end and at the crosshair. */
function Marker({ shape, slot, cx, cy }: { shape: MarkerShape; slot: ChartSlot; cx: number; cy: number }) {
  return (
    <>
      <path d={markerPath(shape, cx, cy, 6)} className="fill-surface" />
      <path d={markerPath(shape, cx, cy, 4)} className={FILL[slot]} />
    </>
  );
}

/** The polylines, with a marker and a direct label at each line's end. */
function SeriesLines({ series, values }: { series: ResolvedSeries[]; values: (s: ResolvedSeries, i: number) => number[] }) {
  const ctx = useChart("Lines");
  const { x, y, hasDirectLabels } = ctx;
  return (
    <g data-slot="chart-lines">
      {series.map((s, si) => {
        const vals = values(s, si);
        const parts = runs(vals, x, y);
        const last = parts.at(-1)?.at(-1);
        return (
          <g key={s.key} data-slot="chart-series" data-series={s.key} className={dim(ctx, s.key)}>
            {parts.map((pts, ri) => (
              <path
                key={ri}
                data-slot="chart-line"
                d={linePath(pts)}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={STROKE[s.slot]}
                style={LINE_STROKE}
              />
            ))}
            {hasDirectLabels && last && (
              <>
                <Marker shape={s.shape} slot={s.slot} cx={last.x} cy={last.y} />
                <text
                  data-slot="chart-direct-label"
                  x={round(last.x + LABEL_OFFSET)}
                  y={round(last.y)}
                  dominantBaseline="central"
                  className="fill-ink-primary font-body text-label-sm"
                >
                  {s.label}
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** One 2px line per series. */
function Lines() {
  const ctx = useChart("Lines");
  return <SeriesLines series={ctx.series} values={(s, si) => (ctx.stacks ? ctx.stacks[si]!.map((v) => v.y1) : s.values)} />;
}

/** A wash under each line — stacked bands when the chart is `isStacked` —
 *  then the lines on top, as the Line sheet layers them. */
function Areas() {
  const ctx = useChart("Areas");
  const { series, stacks, x, y } = ctx;
  return (
    <g data-slot="chart-areas">
      {series.map((s, si) => {
        if (stacks) {
          const top = stacks[si]!.map((v, i) => ({ x: x(i), y: y(v.y1) }));
          const bottom = stacks[si]!.map((v, i) => ({ x: x(i), y: y(v.y0) }));
          return <path key={s.key} data-slot="chart-area" d={bandPath(top, bottom)} className={cn(WASH[s.slot], dim(ctx, s.key))} />;
        }
        return runs(s.values, x, y).map((pts, ri) => (
          <path key={`${s.key}-${ri}`} data-slot="chart-area" d={areaPath(pts, y(0))} className={cn(WASH[s.slot], dim(ctx, s.key))} />
        ));
      })}
      <Lines />
    </g>
  );
}

export interface ChartRuleProps {
  /** Where the rule crosses the value axis. It is included in the axis domain. */
  value: number;
  /** Required — a rule with no words is a line nobody can read ("Target 340"). */
  label: string;
}

/**
 * A solid threshold or target across the plot, with its label — never a
 * dashed line (ADR 0023 §6). The label sits above the rule at the plot's end,
 * not in the direct-label lane, where it would collide with a line ending
 * near the same value.
 */
function Rule({ value, label }: ChartRuleProps) {
  const { y, plotWidth } = useChart("Rule");
  const ry = round(y(value)) + 0.5;
  return (
    <g data-slot="chart-rule">
      <path d={`M0 ${ry}H${plotWidth}`} className="stroke-edge-strong" style={GRID_STROKE} />
      <text
        data-slot="chart-rule-label"
        x={plotWidth}
        y={ry - 6}
        textAnchor="end"
        className="fill-ink-primary font-body text-label-sm"
      >
        {label}
      </text>
    </g>
  );
}

const LINE_STROKE = { strokeWidth: "var(--ui-stroke-thick)" } as const;
const GRID_STROKE = { strokeWidth: "var(--ui-stroke-default)" } as const;
const FOCUS_STROKE = { strokeWidth: "var(--ui-stroke-thick)" } as const;

/* ── Root ──────────────────────────────────────────────────────────────── */

interface ChartOwnProps<Row> {
  /** Rows, one per category, in axis order. */
  data: readonly Row[];
  /** The field that names each category: the x axis. */
  x: keyof Row & string;
  /** Required — the x axis's name, used as the first column of the table. */
  xLabel: string;
  /** One to eight series. A ninth is never a generated colour: fold it into "Other". */
  series: readonly ChartSeries<Row>[];
  /** Required — the visible title, and the chart's accessible name. */
  label: string;
  /** Required — the takeaway a person wrote ("Posters led books every year"). */
  description: string;
  /** Stack the series instead of grouping or overlaying them. */
  isStacked?: boolean;
  size?: ChartSize;
  /** `Intl.NumberFormat` options for values and ticks. Never a format string. */
  format?: Intl.NumberFormatOptions;
  /** The locale for `format`. Pass it when the server's may differ from the reader's. */
  locale?: string;
  /** Reserves the frame with skeleton marks while the data loads. */
  isLoading?: boolean;
  /** Shown over an empty plot when `data` has no rows. */
  emptyText?: string;
  /** The table toggle's accessible name. */
  tableLabel?: string;
  /** The marks: `Chart.Bars`, `Chart.Lines`, `Chart.Areas`, `Chart.Rule`. */
  children: ReactNode;
  ref?: Ref<HTMLElement>;
}

export type ChartProps<Row> = ChartOwnProps<Row> &
  Omit<HTMLAttributes<HTMLElement>, keyof ChartOwnProps<Row> | "title">;

/**
 * A chart frame: title and takeaway, the view-as-table toggle, the legend, a
 * value axis on nice ticks, the category axis, and the marks passed as
 * children. Every chart ships its data table (ADR 0023 §4); this frame makes
 * that true by construction rather than by a prop someone can forget.
 *
 * The plot is ONE tab stop. Arrow keys move along the categories (←/→) and
 * between series (↑/↓), Home and End go to the ends, Escape clears; every move
 * is announced politely as "category, series, value".
 */
function ChartRoot<Row>(props: ChartProps<Row>) {
  const {
    data,
    x: xKey,
    xLabel,
    series: seriesProp,
    label,
    description,
    isStacked = false,
    size = "md",
    format: formatOptions,
    locale,
    isLoading = false,
    emptyText,
    tableLabel = "View as table",
    children,
    className,
    ref,
    ...rest
  } = props;

  if (seriesProp.length < 1 || seriesProp.length > 8) {
    throw new Error(
      `<Chart> takes one to eight series; it got ${seriesProp.length}. A ninth series is never a generated colour — fold it into "Other" or use small multiples (ADR 0023 §5).`,
    );
  }

  const titleId = useId();
  const descriptionId = useId();
  const [isTable, setIsTable] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [hover, setHover] = useState<number | null>(null);
  const [emphasis, setEmphasis] = useState<string | null>(null);
  const [focus, setFocus] = useState<Active | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const plotRef = useRef<HTMLDivElement>(null);

  // Measure the plot column; the server and the first client render use
  // DEFAULT_WIDTH, so the markup agrees until the browser knows better.
  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry?.contentRect.width ?? 0);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isTable]);

  const format = useMemo(() => {
    const nf = new Intl.NumberFormat(locale, formatOptions);
    return (v: number) => nf.format(v);
  }, [locale, formatOptions]);

  const hatchId = useId();
  const marks = Children.toArray(children);
  const barsMark = marks.find((c) => isValidElement<ChartBarsProps>(c) && c.type === Bars);
  const layout: "band" | "point" = barsMark ? "band" : "point";
  const isHorizontal = isValidElement<ChartBarsProps>(barsMark) && barsMark.props.orientation === "horizontal";
  const ruleValues = marks.flatMap((c) =>
    isValidElement<ChartRuleProps>(c) && c.type === Rule ? [c.props.value] : [],
  );
  if (isHorizontal && (seriesProp.length !== 1 || isStacked || ruleValues.length > 0 || marks.length > 1)) {
    throw new Error(
      "<Chart.Bars orientation=\"horizontal\"> draws one series on its own: no stacking, no second mark, no rule. Grouped and stacked horizontal bars are not designed yet.",
    );
  }

  const categories = useMemo(() => data.map((row) => String(row[xKey])), [data, xKey]);
  const series: ResolvedSeries[] = useMemo(
    () =>
      seriesProp.map((s, i) => {
        const slot = s.slot ?? ((i + 1) as ChartSlot);
        return {
          key: s.key,
          label: s.label,
          slot,
          shape: MARKER_SHAPES[slot - 1]!,
          values: data.map((row) => {
            const v = row[s.key];
            return typeof v === "number" ? v : v == null || v === "" ? Number.NaN : Number(v);
          }),
        };
      }),
    [seriesProp, data],
  );
  const stacks = useMemo(() => (isStacked ? stackSeries(series.map((s) => s.values)) : null), [isStacked, series]);

  const count = categories.length;
  const { intervals } = SIZE[size];
  // Horizontal rows set their own height: the sheet's 24px bars, 16px apart.
  // Loading and empty reserve four rows, so the frame does not collapse.
  const rows = isLoading || count === 0 ? 4 : count;
  const height = isHorizontal ? rows * ROW_PITCH - ROW_GAP : SIZE[size].height;
  const axisValues = stacks ? stacks.flat().flatMap((v) => [v.y0, v.y1]) : series.flatMap((s) => s.values);
  const axis = valueAxis([...axisValues, ...ruleValues], intervals);
  const y = linearScale(axis.domain, [height, 0]);

  const hasDirectLabels = layout === "point" && !isStacked && series.length <= MAX_DIRECT_LABELS;
  const plotWidth = Math.max(0, width - (hasDirectLabels ? LABEL_LANE : 0));
  // The value axis runs across, on the same nice domain a column chart would
  // use; the lane on the right keeps the longest value's label inside.
  const valueX = linearScale(axis.domain, [0, Math.max(0, plotWidth - VALUE_LANE)]);
  const bandWidth = count > 0 ? plotWidth / count : plotWidth;
  const points = pointPositions(count, plotWidth);
  const xAt = (i: number) => (layout === "band" ? bandWidth * i + bandWidth / 2 : (points[i] ?? 0));

  const isEmpty = !isLoading && count === 0;
  const isInteractive = !isLoading && !isEmpty;
  const active = isFocused ? focus : hover !== null ? { index: hover, series: 0 } : null;

  const ctx: ChartContextValue = {
    categories, series, stacks, layout, isHorizontal, valueX, hatchId, width, plotWidth, height, y, x: xAt, bandWidth,
    hasDirectLabels, active, isFocused, format, emphasis,
  };

  const announce = useCallback(
    (a: Active) => {
      const s = series[a.series]!;
      const v = stacks ? stacks[a.series]![a.index]!.y1 - stacks[a.series]![a.index]!.y0 : s.values[a.index]!;
      setAnnouncement(`${categories[a.index]}, ${s.label}, ${Number.isFinite(v) ? format(v) : "—"}`);
    },
    [series, stacks, categories, format],
  );

  const move = (next: Active) => {
    setFocus(next);
    announce(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    const cur = focus ?? { index: 0, series: 0 };
    const last = count - 1;
    const forward = () => ({ ...cur, index: Math.min(last, cur.index + 1) });
    const back = () => ({ ...cur, index: Math.max(0, cur.index - 1) });
    // Categories follow the axis they sit on: across for columns and lines,
    // down for horizontal rows (whose single series leaves ←/→ nothing to do).
    const arrows: Record<string, () => Active | null> = isHorizontal
      ? { ArrowDown: forward, ArrowUp: back, ArrowRight: () => cur, ArrowLeft: () => cur }
      : {
          ArrowRight: forward,
          ArrowLeft: back,
          ArrowUp: () => ({ ...cur, series: Math.min(series.length - 1, cur.series + 1) }),
          ArrowDown: () => ({ ...cur, series: Math.max(0, cur.series - 1) }),
        };
    const keys: Record<string, () => Active | null> = {
      ...arrows,
      Home: () => ({ ...cur, index: 0 }),
      End: () => ({ ...cur, index: last }),
      Escape: () => null,
    };
    const handler = keys[event.key];
    if (!handler) return;
    event.preventDefault();
    const next = handler();
    if (next) move(next);
    else {
      setFocus(null);
      setIsFocused(false);
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    if (isHorizontal) {
      // The whole row pitch is the target, gap included, so the pointer never
      // falls between rows into nothing.
      const row = Math.floor((event.clientY - rect.top + ROW_GAP / 2) / ROW_PITCH);
      return setHover(Math.max(0, Math.min(count - 1, row)));
    }
    if (px > plotWidth) return setHover(null);
    let index = 0;
    if (layout === "band") index = Math.floor(px / bandWidth);
    else {
      let best = Number.POSITIVE_INFINITY;
      points.forEach((p, i) => {
        if (Math.abs(p - px) < best) {
          best = Math.abs(p - px);
          index = i;
        }
      });
    }
    setHover(Math.max(0, Math.min(count - 1, index)));
  };

  const tickIndices = layout === "band" ? labelIndices(count, plotWidth, 48) : labelIndices(count, plotWidth, 64);

  return (
    <figure
      ref={ref}
      data-slot="chart"
      data-layout={layout}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={isLoading || undefined}
      className={cn("flex flex-col gap-lg rounded-md border border-edge-subtle bg-surface p-xl", className)}
      {...rest}
    >
      <div data-slot="chart-head" className="flex items-start gap-lg">
        <div className="flex min-w-0 flex-1 flex-col">
          <span id={titleId} data-slot="chart-title" className="font-body text-label-md text-ink-primary">
            {label}
          </span>
          <p id={descriptionId} data-slot="chart-description" className="font-body text-body-sm text-ink-muted">
            {description}
          </p>
        </div>
        <Button
          data-slot="chart-table-toggle"
          variant="secondary"
          size="md"
          isIconOnly
          aria-label={tableLabel}
          aria-pressed={isTable}
          isDisabled={isLoading}
          icon={<ChartTable aria-hidden />}
          onClick={() => setIsTable((t) => !t)}
        />
      </div>

      {isTable ? (
        <ChartDataTable caption={label} xLabel={xLabel} categories={categories} series={series} format={format} />
      ) : (
        <>
          {series.length > 1 && (
            <ul data-slot="chart-legend" className="flex flex-wrap gap-lg">
              {series.map((s) => (
                <li
                  key={s.key}
                  data-slot="chart-legend-item"
                  onPointerEnter={() => setEmphasis(s.key)}
                  onPointerLeave={() => setEmphasis(null)}
                  className="flex items-center gap-xs"
                >
                  <svg aria-hidden="true" focusable="false" width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
                    <path
                      d={markerPath(s.shape, 4, 4, 4)}
                      className={cn(FILL[s.slot], forcedFill(s.slot, hatchId).className)}
                      style={forcedFill(s.slot, hatchId).style}
                    />
                  </svg>
                  <span data-slot="chart-legend-label" className="font-body font-regular text-label-sm text-ink-secondary">
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div data-slot="chart-plot-row" className="flex gap-sm">
            {isHorizontal ? (
              <div data-slot="chart-y-axis" aria-hidden="true" style={{ width: NAME_LANE }} className="relative shrink-0">
                {!isLoading &&
                  categories.map((c, i) => (
                    <span
                      key={i}
                      data-slot="chart-tick"
                      // pt-sm on the plot column: each name centres on its 24px bar.
                      style={{ top: i * ROW_PITCH + 8, height: ROW_HEIGHT }}
                      className="absolute inset-x-0 flex items-center font-body font-regular text-label-sm text-ink-muted"
                    >
                      <span className="truncate">{c}</span>
                    </span>
                  ))}
              </div>
            ) : (
            <div data-slot="chart-y-axis" aria-hidden="true" className="relative w-8 shrink-0">
              {!isLoading &&
                !isEmpty &&
                axis.ticks.map((t) => (
                  <span
                    key={t}
                    data-slot="chart-tick"
                    // The plot column starts 8px lower (pt-sm), so a 16px label
                    // whose top is at y(t) is centred on its gridline.
                    style={{ top: round(y(t)) }}
                    className="absolute end-0 font-body font-regular text-label-sm whitespace-nowrap tabular-nums text-ink-muted"
                  >
                    {format(t)}
                  </span>
                ))}
            </div>
            )}

            <div className="relative flex min-w-0 flex-1 flex-col gap-sm pt-sm">
              <div
                ref={plotRef}
                data-slot="chart-plot"
                tabIndex={isInteractive ? 0 : undefined}
                role={isInteractive ? "group" : undefined}
                aria-labelledby={isInteractive ? titleId : undefined}
                aria-describedby={isInteractive ? descriptionId : undefined}
                onKeyDown={isInteractive ? onKeyDown : undefined}
                onFocus={(e) => {
                  if (!isInteractive || !e.currentTarget.matches(":focus-visible")) return;
                  setIsFocused(true);
                  const start = focus ?? { index: 0, series: 0 };
                  move(start);
                }}
                onBlur={() => setIsFocused(false)}
                onPointerMove={isInteractive ? onPointerMove : undefined}
                onPointerLeave={isInteractive ? () => setHover(null) : undefined}
                className="relative rounded-sm outline-offset-2 focus-visible:outline-none"
              >
                <ChartContext.Provider value={ctx}>
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    width={width}
                    height={height + 1}
                    viewBox={`0 0 ${width} ${height + 1}`}
                    className="block overflow-visible"
                  >
                    <HatchDefs id={hatchId} />
                    {isLoading ? (
                      isHorizontal ? (
                        <RowSkeleton width={Math.max(0, plotWidth - VALUE_LANE)} rows={rows} />
                      ) : (
                        <Skeleton width={plotWidth} height={height} />
                      )
                    ) : (
                      <>
                        {!isEmpty &&
                          !isHorizontal &&
                          axis.ticks.slice(1).map((t) => (
                            <path
                              key={t}
                              data-slot="chart-grid"
                              d={`M0 ${round(y(t)) + 0.5}H${plotWidth}`}
                              className="stroke-edge-subtle"
                              style={GRID_STROKE}
                            />
                          ))}
                        {active && isHorizontal && (
                          <rect
                            data-slot="chart-highlight"
                            x={0}
                            y={active.index * ROW_PITCH - ROW_GAP / 2}
                            width={plotWidth}
                            height={ROW_PITCH}
                            className="fill-hover"
                          />
                        )}
                        {active && layout === "band" && !isHorizontal && (
                          <rect
                            data-slot="chart-highlight"
                            x={round(bandWidth * active.index)}
                            y={0}
                            width={round(bandWidth)}
                            height={height}
                            className="fill-hover"
                          />
                        )}
                        {!isEmpty && children}
                        {!isHorizontal && (
                          <path
                            data-slot="chart-baseline"
                            d={`M0 ${round(y(0)) + 0.5}H${plotWidth}`}
                            className="stroke-edge-default"
                            style={GRID_STROKE}
                          />
                        )}
                        {active && layout === "point" && <Crosshair {...ctx} index={active.index} />}
                        {active && isFocused && <FocusRing ctx={ctx} active={active} />}
                      </>
                    )}
                  </svg>
                </ChartContext.Provider>

                {isEmpty && emptyText && (
                  <p
                    data-slot="chart-empty"
                    style={{ width: plotWidth }}
                    className="absolute inset-y-0 start-0 grid place-items-center font-body text-body-sm text-ink-muted"
                  >
                    {emptyText}
                  </p>
                )}

                {/* Horizontal rows print every value at the tip; a tooltip would repeat it. */}
                {active && !isHorizontal && <ChartTooltip ctx={ctx} index={active.index} />}
              </div>

              {!isHorizontal && (
              <div data-slot="chart-x-axis" aria-hidden="true" style={{ width: plotWidth }} className="relative h-4">
                {!isLoading &&
                  tickIndices.map((i) => {
                    const edge = layout === "point" && i === 0 ? "start" : layout === "point" && i === count - 1 && count > 1 ? "end" : null;
                    return (
                      <span
                        key={i}
                        data-slot="chart-tick"
                        style={
                          edge === "start"
                            ? { insetInlineStart: 0 }
                            : edge === "end"
                              ? { insetInlineEnd: 0 }
                              : { insetInlineStart: round(xAt(i)), transform: "translateX(-50%)" }
                        }
                        className="absolute top-0 font-body font-regular text-label-sm whitespace-nowrap tabular-nums text-ink-muted"
                      >
                        {categories[i]}
                      </span>
                    );
                  })}
              </div>
              )}
            </div>
          </div>
        </>
      )}

      <div data-slot="chart-announcer" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </figure>
  );
}

function Skeleton({ width, height }: { width: number; height: number }) {
  const n = SKELETON.length;
  const band = width / n;
  return (
    <g data-slot="chart-skeleton">
      {SKELETON.map((h, i) => {
        const { xs, width: w } = groupedBars(band * i, band, 1);
        return <path key={i} d={barPath(xs[0]!, w, height * (1 - h), height, BAR_RADIUS)} className="fill-sunken" />;
      })}
      <path d={`M0 ${height + 0.5}H${width}`} className="stroke-edge-default" style={GRID_STROKE} />
    </g>
  );
}

/** Horizontal rows while loading: the same sunken marks, turned on their side. */
function RowSkeleton({ width, rows }: { width: number; rows: number }) {
  return (
    <g data-slot="chart-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <path key={i} d={rowBarPath(i * ROW_PITCH, ROW_HEIGHT, width * SKELETON[i % SKELETON.length]!, 0, BAR_RADIUS)} className="fill-sunken" />
      ))}
    </g>
  );
}

/** A solid vertical rule at the hovered category, with every series' marker on it. */
function Crosshair(props: ChartContextValue & { index: number }) {
  const { x, y, height, series, stacks, index } = props;
  const cx = round(x(index)) + 0.5;
  return (
    <g data-slot="chart-crosshair">
      <path d={`M${cx} 0V${height}`} className="stroke-edge-default" style={GRID_STROKE} />
      {series.map((s, si) => {
        const v = stacks ? stacks[si]![index]!.y1 : s.values[index]!;
        if (!Number.isFinite(v)) return null;
        return <Marker key={s.key} shape={s.shape} slot={s.slot} cx={x(index)} cy={y(v)} />;
      })}
    </g>
  );
}

/** The keyboard focus ring: 2px focus ink, 2px off the mark (the anatomy
 *  sheet's ring at x−3, w+6, radius 6). */
function FocusRing({ ctx, active }: { ctx: ChartContextValue; active: Active }) {
  if (ctx.layout === "band") {
    const g = barGeometry(ctx, active.index, active.series);
    if (!g) return null;
    return (
      <rect
        data-slot="chart-focus-ring"
        x={round(g.x - 3)}
        y={round(g.top - 3)}
        width={round(g.width + 6)}
        height={round(g.bottom - g.top + 6)}
        rx={6}
        fill="none"
        className="stroke-edge-focus"
        style={FOCUS_STROKE}
      />
    );
  }
  const s = ctx.series[active.series]!;
  const v = ctx.stacks ? ctx.stacks[active.series]![active.index]!.y1 : s.values[active.index]!;
  if (!Number.isFinite(v)) return null;
  return (
    <circle
      data-slot="chart-focus-ring"
      cx={round(ctx.x(active.index))}
      cy={round(ctx.y(v))}
      r={9}
      fill="none"
      className="stroke-edge-focus"
      style={FOCUS_STROKE}
    />
  );
}

/**
 * The values of one category, beside its band or crosshair. aria-hidden: the
 * live region has already said the focused value, and reading the whole card
 * on every move would bury it.
 */
function ChartTooltip({ ctx, index }: { ctx: ChartContextValue; index: number }) {
  const { x, width, plotWidth, series, stacks, categories, format, bandWidth, layout } = ctx;
  const cx = x(index);
  const reach = layout === "band" ? bandWidth / 2 + 8 : 16;
  const onRight = cx < plotWidth / 2;
  return (
    <div
      data-slot="chart-tooltip"
      aria-hidden="true"
      style={onRight ? { insetInlineStart: round(cx + reach) } : { insetInlineEnd: round(width - cx + reach) }}
      className="pointer-events-none absolute top-lg flex w-max flex-col gap-xs rounded-md border border-edge-subtle bg-elevated px-md py-sm shadow-md"
    >
      <span data-slot="chart-tooltip-title" className="font-body text-label-sm text-ink-primary">
        {categories[index]}
      </span>
      {series.map((s, si) => {
        const v = stacks ? stacks[si]![index]!.y1 - stacks[si]![index]!.y0 : s.values[index]!;
        return (
          <span key={s.key} data-slot="chart-tooltip-row" className="flex items-center gap-sm">
            <svg aria-hidden="true" focusable="false" width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
              <path d={markerPath(s.shape, 4, 4, 4)} className={FILL[s.slot]} />
            </svg>
            <span data-slot="chart-tooltip-label" className="flex-1 font-body font-regular text-label-sm text-ink-muted">
              {s.label}
            </span>
            <span data-slot="chart-tooltip-value" className="ps-md font-body text-label-sm tabular-nums text-ink-primary">
              {Number.isFinite(v) ? format(v) : "—"}
            </span>
          </span>
        );
      })}
    </div>
  );
}

interface TableRow {
  id: string;
  category: string;
  values: number[];
}

/** The chart's data as a Table: the alternative that holds every fact. */
function ChartDataTable({
  caption,
  xLabel,
  categories,
  series,
  format,
}: {
  caption: string;
  xLabel: string;
  categories: string[];
  series: ResolvedSeries[];
  format: (v: number) => string;
}) {
  const rows: TableRow[] = categories.map((c, i) => ({ id: `${i}`, category: c, values: series.map((s) => s.values[i]!) }));
  const columns: TableColumn<TableRow>[] = [
    { key: "category", header: xLabel, isPrimary: true, cell: (r) => r.category },
    ...series.map((s, si) => ({
      key: s.key,
      header: s.label,
      isNumeric: true,
      align: "end" as const,
      cell: (r: TableRow) => (Number.isFinite(r.values[si]!) ? format(r.values[si]!) : "—"),
    })),
  ];
  return (
    <div data-slot="chart-table">
      <Table caption={caption} columns={columns} rows={rows} getRowId={(r) => r.id} size="sm" />
    </div>
  );
}

/** Compound chart: `<Chart>` with `Chart.Bars`, `.Lines`, `.Areas`, `.Rule` as children. */
export const Chart = Object.assign(ChartRoot, { Bars, Lines, Areas, Rule });

/**
 * BarChart's props. Horizontal is the Bar sheet's ranked rows, and the type
 * holds its limits: exactly one series, never stacked.
 */
export type BarChartProps<Row> = Omit<ChartProps<Row>, "children"> &
  (
    | { orientation?: "vertical" }
    | { orientation: "horizontal"; series: readonly [ChartSeries<Row>]; isStacked?: false }
  );

/** Grouped (or, with `isStacked`, stacked) vertical bars; or, with
 *  `orientation="horizontal"`, one series as ranked rows. */
export function BarChart<Row>({ orientation = "vertical", ...props }: BarChartProps<Row>) {
  return (
    <Chart {...(props as ChartProps<Row>)}>
      <Chart.Bars orientation={orientation} />
    </Chart>
  );
}

/** Lines with end markers and direct labels (up to four series). */
export function LineChart<Row>(props: Omit<ChartProps<Row>, "children">) {
  return (
    <Chart {...(props as ChartProps<Row>)}>
      <Chart.Lines />
    </Chart>
  );
}

/** Washes under lines; with `isStacked`, stacked bands. */
export function AreaChart<Row>(props: Omit<ChartProps<Row>, "children">) {
  return (
    <Chart {...(props as ChartProps<Row>)}>
      <Chart.Areas />
    </Chart>
  );
}
