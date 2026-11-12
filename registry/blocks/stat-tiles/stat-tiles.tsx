import { Children, createContext, isValidElement, useContext } from "react";
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { Minus, TrendDown, TrendUp } from "griddy-icons";

import { cn } from "@/lib/cn";
import { Skeleton } from "@/ui/skeleton";

/*
 * StatTiles — the first block (Phase 3, `registry/blocks/`). A block composes
 * components; it owns no behaviour layer (ADR 0012, check:boundaries) and no
 * tokens of its own. Drawn on the "Chart --- Stat tiles and Chart card" sheet.
 */

/** Which way is good. The block reads DIRECTION from the change's sign and
 *  cannot know whether a rise is welcome; a rising cost sets `down-is-good`. */
export type StatPolarity = "up-is-good" | "down-is-good";

/** Literal class maps: Tailwind sees only whole class names. */
const TONE = { good: "text-success", bad: "text-danger", flat: "text-ink-muted" } as const;

export interface StatDeltaProps {
  /**
   * The signed change, as a FRACTION for the default percent format
   * (0.12 = 12%). Printed unsigned: the glyph carries the direction, and a
   * "+" beside an up-arrow says it twice.
   */
  change: number;
  /** What the change is against ("vs 1971"). Required: a percentage with no
   *  baseline is a number nobody can read. */
  comparison: string;
  /** Default `up-is-good`. Decides the colour only — never the glyph. */
  polarity?: StatPolarity;
  /**
   * `percent` (default): a relative change, printed "12%". `points`: a change
   * of a SHARE, printed "2.1 pp" — a share going from 40% to 42% rose two
   * percentage points, not 5%, and `Intl` has no unit for that. Both take
   * `change` as a fraction (0.021 = 2.1 points).
   */
  unit?: "percent" | "points";
  /** Default `{ style: "percent", maximumFractionDigits: 0 }`, or for
   *  `points` `{ maximumFractionDigits: 1 }`, applied to the points. */
  format?: Intl.NumberFormatOptions;
  /** The printed points suffix. Default "pp". */
  pointsSuffix?: string;
  /** What a screen reader hears for the suffix. Default "percentage points". */
  pointsLabel?: string;
  locale?: string;
  /** Spoken before the change, since the glyph is hidden. Default "Up". */
  upLabel?: string;
  /** Default "Down". */
  downLabel?: string;
  /** Printed in place of the change when it is zero. Default "No change". */
  flatLabel?: string;
}

/**
 * The change line: a 16px direction glyph, the change in label-sm 600 in the
 * judgement's intent ink, then the comparison in muted 400. Colour is never
 * the only signal — the glyph says which way and the words say against what.
 */
export function StatDelta({
  change,
  comparison,
  polarity = "up-is-good",
  unit = "percent",
  format = unit === "points" ? { maximumFractionDigits: 1 } : { style: "percent", maximumFractionDigits: 0 },
  pointsSuffix = "pp",
  pointsLabel = "percentage points",
  locale,
  upLabel = "Up",
  downLabel = "Down",
  flatLabel = "No change",
}: StatDeltaProps) {
  const formatter = new Intl.NumberFormat(locale, format);
  // Points are the fraction scaled to the percent it is a change of.
  const magnitude = Math.abs(unit === "points" ? change * 100 : change);
  const formatted = formatter.format(magnitude);
  // A change that rounds to zero in the printed format IS no change to the
  // reader: "↗ 0%" in green would claim a movement nobody can see. Read off
  // the formatted digits, so it holds for any `format` the caller passes.
  const printsZero = Number(
    formatter
      .formatToParts(magnitude)
      .filter((p) => p.type === "integer" || p.type === "fraction")
      .map((p) => p.value)
      .join(""),
  ) === 0;
  const direction = !Number.isFinite(change) || printsZero ? "flat" : change > 0 ? "up" : "down";
  const tone = direction === "flat" ? "flat" : (direction === "up") === (polarity === "up-is-good") ? "good" : "bad";
  const Glyph = direction === "up" ? TrendUp : direction === "down" ? TrendDown : Minus;

  return (
    <span data-slot="stat-delta" data-direction={direction} data-tone={tone} className={cn("flex items-center gap-xs", TONE[tone])}>
      <Glyph size={16} aria-hidden="true" className="shrink-0" />
      {direction === "flat" ? (
        <span data-slot="stat-comparison" className="font-body text-label-sm font-regular text-ink-muted">
          {flatLabel} {comparison}
        </span>
      ) : (
        <>
          <span data-slot="stat-change" className="font-body text-label-sm tabular-nums">
            <span className="sr-only">{direction === "up" ? upLabel : downLabel} </span>
            {formatted}
            {unit === "points" && (
              <>
                <span aria-hidden="true">{`\u2009${pointsSuffix}`}</span>
                <span className="sr-only"> {pointsLabel}</span>
              </>
            )}
          </span>
          <span data-slot="stat-comparison" className="font-body text-label-sm font-regular text-ink-muted">
            {comparison}
          </span>
        </>
      )}
    </span>
  );
}

/* ── Tile ──────────────────────────────────────────────────────────────── */

/*
 * The narrow row (sheet: "Narrow row"). A tile with a sparkline needs 280px
 * — 2 × 24 inset, 84px of text, 16px, the 120px trend — so the row is one
 * line only while every tile gets that: four from 1120px, three from 840px.
 * Below, two by two. The ROW's width decides, read as a container query, so
 * a row in a 720px panel wraps on a wide screen too.
 *
 * Each tile is told its place in the row, because the hairlines follow the
 * wrap: a start-side line on the second column, a top line on the second row.
 * Literal class strings, per row length, so Tailwind sees whole names.
 */
const PLACE: Record<number, readonly string[]> = {
  1: ["basis-full"],
  2: ["basis-1/2", "basis-1/2 border-s"],
  3: [
    "basis-1/2 @min-[840px]:basis-1/3",
    "basis-1/2 border-s @min-[840px]:basis-1/3",
    // The odd one out spans the second row rather than leave a hole.
    "basis-full border-t @min-[840px]:basis-1/3 @min-[840px]:border-t-0 @min-[840px]:border-s",
  ],
  4: [
    "basis-1/2 @min-[1120px]:basis-1/4",
    "basis-1/2 border-s @min-[1120px]:basis-1/4",
    "basis-1/2 border-t @min-[1120px]:basis-1/4 @min-[1120px]:border-t-0 @min-[1120px]:border-s",
    "basis-1/2 border-s border-t @min-[1120px]:basis-1/4 @min-[1120px]:border-t-0",
  ],
};

/** A tile's place in its row: [index, count]. Outside a row, a lone tile. */
const TilePlace = createContext<readonly [number, number]>([0, 1]);


interface StatTileOwnProps {
  /** Required — what is measured ("Posters printed"). Stays printed while loading. */
  label: string;
  /**
   * The figure, already formatted by the caller ("1,284", "€3,410"): the
   * block does not compute or format it. `null` is no reading yet — a
   * muted em dash with `emptyText` under it, never a fake zero.
   */
  value: string | null;
  /** The change and its comparison. Omit for a tile with no baseline: no change line is drawn. */
  delta?: StatDeltaProps;
  /**
   * A small trend beside the figure — a `<Sparkline size="sm">`. An
   * element, never data: the block does not draw the chart.
   */
  trend?: ReactElement;
  /** Value and change become skeletons; the label stays. */
  isLoading?: boolean;
  /** Under the dash when `value` is null. Default "No reading yet". */
  emptyText?: string;
  ref?: Ref<HTMLDivElement>;
}

export type StatTileProps = StatTileOwnProps & Omit<HTMLAttributes<HTMLDivElement>, keyof StatTileOwnProps>;

/**
 * One tile: label, figure, change, and an optional trend at the end. A
 * `<div>` grouping a `<dt>` and its `<dd>`s, so the row is one description
 * list and a screen reader hears "Posters printed, 1,284, up 12% vs 1971".
 */
function StatTile({ label, value, delta, trend, isLoading = false, emptyText = "No reading yet", className, ref, ...rest }: StatTileProps) {
  const isEmpty = !isLoading && value === null;
  const [index, count] = useContext(TilePlace);
  const place = PLACE[Math.min(Math.max(count, 1), 4)]![Math.min(index, 3)] ?? "";
  return (
    <div
      ref={ref}
      data-slot="stat-tile"
      aria-busy={isLoading || undefined}
      className={cn(
        // Two columns: the text, and the trend aligned to its foot. A grid
        // rather than nested flex because a <div> in a <dl> may hold only
        // <dt> and <dd> — the trend has to be a sibling of the figure. The
        // tile is a container too, so the trend can move under the text when
        // the tile is narrower than its 280px (see the trend below).
        "@container grid min-w-0 grow-0 grid-cols-[minmax(0,1fr)_auto] content-start items-end gap-y-xs p-xl",
        // The hairlines between tiles, never boxes around each one.
        "border-edge-subtle",
        place,
        className,
      )}
      {...rest}
    >
      <dt data-slot="stat-label" className="col-start-1 font-body text-label-sm font-regular text-ink-muted">
        {label}
      </dt>
      <dd data-slot="stat-value" className="col-start-1 flex h-7.5 items-center">
        {isLoading ? (
          <Skeleton className="h-6 w-24" />
        ) : (
          <span className={cn("font-body text-figure", isEmpty ? "text-ink-muted" : "tabular-nums text-ink-primary")}>
            {isEmpty ? "—" : value}
          </span>
        )}
      </dd>
      {isLoading ? (
        <dd data-slot="stat-delta-row" className="col-start-1 flex h-4 items-center">
          <Skeleton className="h-3 w-18" />
        </dd>
      ) : isEmpty ? (
        <dd data-slot="stat-empty" className="col-start-1 font-body text-label-sm font-regular text-ink-muted">
          {emptyText}
        </dd>
      ) : delta ? (
        <dd data-slot="stat-delta-row" className="col-start-1">
          <StatDelta {...delta} />
        </dd>
      ) : null}
      {trend && !isLoading && !isEmpty && (
        // Beside the text from 220px of content — the sheet's 84px text
        // column, 16px, the 120px trend: 16px off the text, its foot on the
        // change line's. (The row's 280px per tile is that plus the insets
        // and some slack; a tile in a row that just fits keeps it beside.)
        // Narrower, it drops under the change line, 4 + 12 = 16px clear,
        // and the text takes the whole width.
        <dd
          data-slot="stat-trend"
          className="col-start-1 row-start-4 mt-md justify-self-start @min-[220px]:col-start-2 @min-[220px]:row-span-3 @min-[220px]:row-start-1 @min-[220px]:mt-0 @min-[220px]:ms-lg @min-[220px]:self-end"
        >
          {trend}
        </dd>
      )}
    </div>
  );
}

/* ── Row ───────────────────────────────────────────────────────────────── */

interface StatTilesOwnProps {
  /** Two to four `StatTiles.Tile`. More than four stops being a glance. */
  children: ReactNode;
  ref?: Ref<HTMLDListElement>;
}

export type StatTilesProps = StatTilesOwnProps & Omit<HTMLAttributes<HTMLDListElement>, keyof StatTilesOwnProps>;

/**
 * A row of headline numbers in ONE surface frame, tiles separated by
 * hairlines. Each tile is a label, a figure at the fixed `figure` role, a
 * change line whose colour says whether the move is good, and an optional
 * sparkline. A `<dl>`: the label is the term, the figure and change its
 * descriptions.
 */
function StatTilesRoot({ children, className, ref, ...rest }: StatTilesProps) {
  return (
    <dl
      ref={ref}
      data-slot="stat-tiles"
      className={cn("@container flex min-w-0 flex-wrap rounded-md border border-edge-subtle bg-surface", className)}
      {...rest}
    >
      {Children.toArray(children)
        .filter(isValidElement)
        .map((child, i, tiles) => (
          <TilePlace.Provider key={child.key ?? i} value={[i, tiles.length]}>
            {child}
          </TilePlace.Provider>
        ))}
    </dl>
  );
}

/** `<StatTiles>` with `StatTiles.Tile` children. */
export const StatTiles = Object.assign(StatTilesRoot, { Tile: StatTile });

/* ── Figure (shared with ChartCard) ────────────────────────────────────── */

export interface StatFigureProps {
  /** The formatted figure ("2,370"). */
  value: string;
  delta?: StatDeltaProps;
  /** The tile's own skeletons (96×24 and 72×12) in the figure's 30px row, so
   *  a loading card neither prints a stale change nor jumps when data lands. */
  isLoading?: boolean;
}

/**
 * A figure and its change on one baseline, 12px apart — the tile's own
 * parts at the tile's sizes, laid out in a row for a chart head.
 */
export function StatFigure({ value, delta, isLoading = false }: StatFigureProps) {
  if (isLoading) {
    return (
      <div data-slot="stat-figure" className="flex h-7.5 items-center gap-x-md">
        <Skeleton className="h-6 w-24" />
        {delta && <Skeleton className="h-3 w-18" />}
      </div>
    );
  }
  return (
    <div data-slot="stat-figure" className="flex flex-wrap items-baseline gap-x-md">
      <span data-slot="stat-value" className="font-body text-figure tabular-nums text-ink-primary">
        {value}
      </span>
      {delta && <StatDelta {...delta} />}
    </div>
  );
}
