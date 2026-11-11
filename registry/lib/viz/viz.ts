/**
 * The data-visualisation maths layer (ADR 0023).
 *
 * Pure functions that turn numbers into numbers and SVG path strings. Nothing
 * here renders, reads the DOM or knows a token: chart components draw every
 * mark and paint it from the contract. That split is the ADR 0002 amendment —
 * maths is infrastructure, drawing is ours.
 *
 * V1 imports no maths module. A linear scale and a polyline are a few lines of
 * arithmetic; `d3-scale` / `d3-shape` are admitted, behind this file, when a
 * chart needs band or time scales or curves. No signature here may then expose
 * their types (`check:boundaries`).
 *
 * DETERMINISM. Every coordinate is rounded to two decimals before it is
 * written into a path, so the server and the client produce the same string
 * for the same data (no hydration mismatch) and the visual gate compares like
 * with like (ADR 0023 §7).
 */

/** A closed numeric interval `[min, max]`. */
export type Domain = readonly [number, number];

/** Two decimals: below a device pixel at any DPR, and stable across engines. */
export function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The finite values of a series, in order. `NaN`, `±Infinity` and holes are
 * dropped rather than drawn: a chart that plots `NaN` at y=0 states a value
 * nobody measured.
 */
export function finite(values: readonly number[]): number[] {
  return values.filter((v) => Number.isFinite(v));
}

/** `[min, max]` of the finite values, or `null` when there are none. */
export function extent(values: readonly number[]): Domain | null {
  const xs = finite(values);
  if (xs.length === 0) return null;
  let min = xs[0]!;
  let max = xs[0]!;
  for (const v of xs) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
}

/**
 * A linear map from `domain` to `range`. A zero-width domain (every value
 * equal) maps to the MIDDLE of the range — a flat series is drawn as a level
 * line, not pinned to an edge where it would read as a minimum or a maximum.
 */
export function linearScale(domain: Domain, range: Domain): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  if (span === 0) {
    const mid = (r0 + r1) / 2;
    return () => mid;
  }
  return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** An open polyline through the points: `M x y L x y …`. Empty for none. */
export function linePath(points: readonly Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`)
    .join("");
}

/**
 * The polyline closed down to `baseline` — the area under a line. Empty for
 * fewer than two points: one point has no area, and a zero-width sliver would
 * still be painted by some engines.
 */
export function areaPath(points: readonly Point[], baseline: number): string {
  if (points.length < 2) return "";
  const first = points[0]!;
  return `${linePath(points)}V${round(baseline)}H${round(first.x)}Z`;
}

/**
 * A column standing on `baseline`, its DATA end rounded (the dataviz mark
 * spec: 4px at the data end, square at the axis, so the baseline reads as one
 * edge). The radius is clamped to half the width and to the height, so a
 * short or narrow column never draws a corner bigger than itself.
 */
export function columnPath(x: number, width: number, top: number, baseline: number, radius: number): string {
  const height = baseline - top;
  if (height <= 0 || width <= 0) return "";
  const r = Math.max(0, Math.min(radius, width / 2, height));
  const x0 = round(x);
  const x1 = round(x + width);
  const b = round(baseline);
  const t = round(top);
  if (r === 0) return `M${x0} ${b}V${t}H${x1}V${b}Z`;
  const rr = round(r);
  return `M${x0} ${b}V${round(top + r)}a${rr} ${rr} 0 0 1 ${rr} -${rr}H${round(x + width - r)}a${rr} ${rr} 0 0 1 ${rr} ${rr}V${b}Z`;
}

/** The inner box a chart plots into, after its own insets. */
export interface PlotBox {
  readonly width: number;
  readonly height: number;
  readonly inset: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
}

/**
 * Points for a series spread evenly across the plot, oldest first. Index, not
 * time: a sparkline's points are equally spaced by construction, and a time
 * scale is the full chart's job.
 */
export function seriesPoints(values: readonly number[], box: PlotBox, domain?: Domain): Point[] {
  const xs = finite(values);
  const ext = domain ?? extent(xs);
  if (!ext || xs.length === 0) return [];
  const { width, height, inset } = box;
  const y = linearScale(ext, [height - inset.bottom, inset.top]);
  if (xs.length === 1) return [{ x: width / 2, y: height / 2 }];
  const x = linearScale([0, xs.length - 1], [inset.left, width - inset.right]);
  return xs.map((v, i) => ({ x: x(i), y: y(v) }));
}

export interface Column {
  readonly path: string;
  readonly value: number;
}

/**
 * Columns for a series across `width`, standing on zero. The domain always
 * contains zero — a column's length IS its value, and a baseline above zero
 * would make 4 look twice as big as 3. Negative values hang below the zero
 * line with their data end (bottom) rounded.
 *
 * `gap` is the surface gap between neighbours (the dataviz spacer: 2px or
 * more), `maxWidth` caps a column so a three-point series is not three slabs.
 */
export function columns(
  values: readonly number[],
  { width, height, gap, maxWidth, radius }: { width: number; height: number; gap: number; maxWidth: number; radius: number },
): Column[] {
  const xs = finite(values);
  if (xs.length === 0) return [];
  const [lo, hi] = extent(xs)!;
  const y = linearScale([Math.min(0, lo), Math.max(0, hi)], [height, 0]);
  const zero = y(0);
  const n = xs.length;
  const barWidth = Math.max(1, Math.min(maxWidth, (width - gap * (n - 1)) / n));
  const step = n === 1 ? 0 : (width - barWidth) / (n - 1);
  const offset = n === 1 ? (width - barWidth) / 2 : 0;
  return xs.map((v, i) => {
    const x = offset + i * step;
    const top = y(v);
    const path =
      v >= 0
        ? columnPath(x, barWidth, top, zero, radius)
        : flipY(columnPath(x, barWidth, 2 * zero - top, zero, radius), zero);
    return { path, value: v };
  });
}

/**
 * Mirror a path about the horizontal line `axis`, by rewriting every absolute
 * y and negating every relative one. Used only for the columns `columnPath`
 * writes (M/V/H/a/Z), which is why it can be this small.
 */
function flipY(path: string, axis: number): string {
  return path
    .replace(/M(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => `M${x} ${round(2 * axis - Number(y))}`)
    .replace(/V(-?[\d.]+)/g, (_, y) => `V${round(2 * axis - Number(y))}`)
    .replace(/a([\d.]+) ([\d.]+) 0 0 1 (-?[\d.]+) (-?[\d.]+)/g, (_, rx, ry, dx, dy) =>
      `a${rx} ${ry} 0 0 0 ${dx} ${round(-Number(dy))}`,
    );
}

/** `value` as a fraction of `[min, max]`, clamped into 0…1. A zero-width range is 0. */
export function ratioOf(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max <= min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/**
 * A circular arc that starts at 12 o'clock and runs clockwise through
 * `ratio` of the full turn — the radial meter's fill. Empty at 0; at 1 the
 * circle is drawn as two half arcs, because a single SVG arc whose start and
 * end coincide draws nothing at all.
 */
export function arcPath(cx: number, cy: number, r: number, ratio: number): string {
  const t = Math.min(1, Math.max(0, ratio));
  if (t === 0) return "";
  const top = `M${round(cx)} ${round(cy - r)}`;
  const rr = round(r);
  if (t === 1) {
    return `${top}A${rr} ${rr} 0 1 1 ${round(cx)} ${round(cy + r)}A${rr} ${rr} 0 1 1 ${round(cx)} ${round(cy - r)}`;
  }
  const angle = t * 2 * Math.PI;
  const x = cx + r * Math.sin(angle);
  const y = cy - r * Math.cos(angle);
  return `${top}A${rr} ${rr} 0 ${t > 0.5 ? 1 : 0} 1 ${round(x)} ${round(y)}`;
}

/**
 * Format a number for a person, through `Intl` and nothing else (ADR 0023 §1:
 * no d3-format specifier in a public prop). `locale` undefined means the
 * runtime's — pass one explicitly when the server and client may differ.
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale?: string): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/* ── V2: axes, bands, stacks and markers ─────────────────────────────────── */

/** The steps a tick interval may take, per decade. 4 is in the set because
 *  the Line sheet's stacked area reads 0 · 400 · 800, and 5 alone would make
 *  it 0 · 500 · 1000 with a third of the plot empty. */
const NICE_STEPS = [1, 2, 2.5, 4, 5, 10] as const;

/** The smallest nice step at or above `raw`. */
export function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const decade = 10 ** Math.floor(Math.log10(raw));
  for (const m of NICE_STEPS) {
    const step = Number((m * decade).toPrecision(12));
    if (step >= raw * (1 - 1e-9)) return step;
  }
  return 10 * decade;
}

/** The next nice step strictly above `step`. */
function nextNiceStep(step: number): number {
  return niceStep(step * 1.000001);
}

export interface ValueAxis {
  /** The drawn domain, from the first tick to the last. */
  readonly domain: Domain;
  /** `intervals + 1` evenly spaced ticks, zero always among them. */
  readonly ticks: readonly number[];
}

/**
 * A value axis with a FIXED number of intervals (the anatomy sheet: "fixed
 * count of five" ticks), on nice steps, that always contains zero — a bar's
 * length is its value, and a line chart on the same frame reads alike. The
 * step grows until the data fits, so a negative minimum costs resolution, not
 * a sixth tick.
 */
export function valueAxis(values: readonly number[], intervals: number): ValueAxis {
  const n = Math.max(1, Math.round(intervals));
  const ext = extent(values);
  const lo = Math.min(0, ext?.[0] ?? 0);
  const hi = Math.max(0, ext?.[1] ?? 0);
  if (lo === hi) {
    const ticks = Array.from({ length: n + 1 }, (_, i) => i);
    return { domain: [0, n], ticks };
  }
  let step = niceStep((hi - lo) / n);
  let start = Math.floor(lo / step) * step;
  for (let guard = 0; start + step * n < hi && guard < 32; guard++) {
    step = nextNiceStep(step);
    start = Math.floor(lo / step) * step;
  }
  const ticks = Array.from({ length: n + 1 }, (_, i) => Number((start + i * step).toPrecision(12)));
  return { domain: [ticks[0]!, ticks[n]!], ticks };
}

/**
 * Bars in one band, side by side (grouped) and centred: each at most
 * `maxWidth` (the sheet's 24px), `gap` apart (the 2px surface gap), and the
 * group no wider than `fill` of the band so neighbouring groups stay apart.
 * Returns each bar's left edge and the shared width.
 */
export function groupedBars(
  bandStart: number,
  bandWidth: number,
  count: number,
  { maxWidth = 24, gap = 2, fill = 0.8 }: { maxWidth?: number; gap?: number; fill?: number } = {},
): { readonly xs: readonly number[]; readonly width: number } {
  const n = Math.max(1, count);
  const room = bandWidth * fill - gap * (n - 1);
  const width = Math.max(1, Math.min(maxWidth, room / n));
  const group = width * n + gap * (n - 1);
  const left = bandStart + (bandWidth - group) / 2;
  return { xs: Array.from({ length: n }, (_, i) => round(left + i * (width + gap))), width: round(width) };
}

/**
 * Evenly spaced x positions for `count` categories across `width`, inset at
 * both ends so an end marker is not cut by the plot's edge (the Line sheet
 * insets 8px). One category sits in the middle.
 */
export function pointPositions(count: number, width: number, inset = 8): number[] {
  if (count <= 0) return [];
  if (count === 1) return [round(width / 2)];
  const x = linearScale([0, count - 1], [inset, width - inset]);
  return Array.from({ length: count }, (_, i) => round(x(i)));
}

/**
 * Which category labels an axis can print without collision: every `stride`th
 * one, always the first and the last. `minGap` is the space one label needs.
 */
export function labelIndices(count: number, width: number, minGap = 56): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const fit = Math.max(2, Math.floor(width / minGap) + 1);
  if (count <= fit) return Array.from({ length: count }, (_, i) => i);
  const stride = Math.ceil((count - 1) / (fit - 1));
  const out: number[] = [];
  for (let i = 0; i < count - 1; i += stride) out.push(i);
  // Drop a penultimate label that would crowd the last one.
  if (out.length > 1 && count - 1 - out[out.length - 1]! < stride / 2) out.pop();
  out.push(count - 1);
  return out;
}

export interface StackedValue {
  /** The segment's lower edge, in data units. */
  readonly y0: number;
  /** Its upper edge. `y1 - y0` is the value. */
  readonly y1: number;
}

/**
 * Stack series on each other, per category, in series order. Positive values
 * stack up from zero and negative values down from it, so a negative segment
 * never hides inside a positive one. A non-finite value is a zero-height
 * segment: it keeps its place, so the series above do not shift.
 */
export function stackSeries(series: readonly (readonly number[])[]): StackedValue[][] {
  const length = Math.max(0, ...series.map((s) => s.length));
  const up = new Array<number>(length).fill(0);
  const down = new Array<number>(length).fill(0);
  return series.map((values) =>
    Array.from({ length }, (_, i) => {
      const v = values[i];
      if (v === undefined || !Number.isFinite(v)) return { y0: up[i]!, y1: up[i]! };
      if (v >= 0) {
        const y0 = up[i]!;
        up[i] = y0 + v;
        return { y0, y1: up[i]! };
      }
      const y0 = down[i]!;
      down[i] = y0 + v;
      return { y0, y1: down[i]! };
    }),
  );
}

/**
 * The shape that tells a series apart without its colour (ADR 0023 §4), in
 * slot order. The sheets draw the first three; 4–8 are the plan's diamond and
 * then shapes chosen to stay distinct at 8px.
 */
export const MARKER_SHAPES = [
  "circle", "square", "triangle", "diamond", "triangle-down", "plus", "hexagon", "pentagon",
] as const;
export type MarkerShape = (typeof MARKER_SHAPES)[number];

/**
 * A filled marker of half-size `r`, centred on (cx, cy), as a path. At r=4 the
 * circle, square and triangle are the Line sheet's 8px end markers; at r=6
 * they are the surface ring drawn under them.
 */
export function markerPath(shape: MarkerShape, cx: number, cy: number, r: number): string {
  const p = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${round(cx + x)} ${round(cy + y)}`).join("") + "Z";
  switch (shape) {
    case "circle":
      return `M${round(cx - r)} ${round(cy)}a${round(r)} ${round(r)} 0 1 0 ${round(2 * r)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-2 * r)} 0Z`;
    case "square":
      return p([[-r, -r], [r, -r], [r, r], [-r, r]]);
    case "triangle":
      return p([[0, -1.25 * r], [1.25 * r, r], [-1.25 * r, r]]);
    case "triangle-down":
      return p([[-1.25 * r, -r], [1.25 * r, -r], [0, 1.25 * r]]);
    case "diamond":
      return p([[0, -1.3 * r], [1.3 * r, 0], [0, 1.3 * r], [-1.3 * r, 0]]);
    case "plus": {
      const a = r * 0.4;
      return p([[-a, -r], [a, -r], [a, -a], [r, -a], [r, a], [a, a], [a, r], [-a, r], [-a, a], [-r, a], [-r, -a], [-a, -a]]);
    }
    case "hexagon":
      return p(Array.from({ length: 6 }, (_, i) => {
        const t = (Math.PI / 3) * i;
        return [1.1 * r * Math.cos(t), 1.1 * r * Math.sin(t)] as const;
      }));
    case "pentagon":
      return p(Array.from({ length: 5 }, (_, i) => {
        const t = -Math.PI / 2 + ((2 * Math.PI) / 5) * i;
        return [1.15 * r * Math.cos(t), 1.15 * r * Math.sin(t)] as const;
      }));
  }
}

/**
 * A bar from the zero line to `valueY`, its data end rounded whichever side of
 * zero it falls: up for a positive value, down for a negative one.
 */
export function barPath(x: number, width: number, valueY: number, zeroY: number, radius: number): string {
  if (valueY <= zeroY) return columnPath(x, width, valueY, zeroY, radius);
  return flipY(columnPath(x, width, 2 * zeroY - valueY, zeroY, radius), zeroY);
}

/**
 * A horizontal bar from `zeroX` to `valueX`, `height` tall from `y`, its DATA
 * end rounded and the axis end square — `barPath` turned on its side, for the
 * Bar sheet's ranked rows. Negative values grow left and round their left end.
 * The radius is clamped to half the height and to the length.
 */
export function rowBarPath(y: number, height: number, valueX: number, zeroX: number, radius: number): string {
  const length = Math.abs(valueX - zeroX);
  if (length <= 0 || height <= 0) return "";
  const r = round(Math.max(0, Math.min(radius, height / 2, length)));
  const z = round(zeroX);
  const y0 = round(y);
  const y1 = round(y + height);
  if (r === 0) return `M${z} ${y0}H${round(valueX)}V${y1}H${z}Z`;
  if (valueX > zeroX) {
    return `M${z} ${y0}H${round(valueX - r)}a${r} ${r} 0 0 1 ${r} ${r}V${round(y + height - r)}a${r} ${r} 0 0 1 -${r} ${r}H${z}Z`;
  }
  return `M${z} ${y0}H${round(valueX + r)}a${r} ${r} 0 0 0 -${r} ${r}V${round(y + height - r)}a${r} ${r} 0 0 0 ${r} ${r}H${z}Z`;
}

/**
 * The region between two polylines over the same x positions — a stacked
 * area's segment. `top` runs left to right, `bottom` is walked back, so the
 * path closes without crossing itself. Empty for fewer than two points.
 */
export function bandPath(top: readonly Point[], bottom: readonly Point[]): string {
  if (top.length < 2 || bottom.length !== top.length) return "";
  const back = [...bottom].reverse().map((p) => `L${round(p.x)} ${round(p.y)}`).join("");
  return `${linePath(top)}${back}Z`;
}

/* ── Time ─────────────────────────────────────────────────────────────── */

/** The calendar unit a set of time ticks steps by. */
export type TimeUnit = "day" | "month" | "year";

export interface TimeTick {
  /** Milliseconds since the epoch, at a UTC unit boundary. */
  readonly value: number;
}

export interface TimeTicks {
  readonly unit: TimeUnit;
  /** How many units each tick steps: 1, 2, 5 years; 3 months; 7 days. */
  readonly step: number;
  readonly ticks: readonly TimeTick[];
}

const DAY = 86_400_000;
/** Candidate steps, finest first. Weeks start on Monday (epoch day 4 is a Monday). */
const TIME_STEPS: ReadonlyArray<readonly [TimeUnit, number]> = [
  ["day", 1], ["day", 2], ["day", 7], ["day", 14],
  ["month", 1], ["month", 2], ["month", 3], ["month", 6],
  ["year", 1], ["year", 2], ["year", 5], ["year", 10], ["year", 20], ["year", 50], ["year", 100],
];

function* stepsFrom(start: number, end: number, unit: TimeUnit, step: number): Generator<number> {
  const d = new Date(start);
  if (unit === "year") {
    let y = Math.ceil(d.getUTCFullYear() / step) * step;
    if (Date.UTC(y, 0, 1) < start) y += step;
    for (; Date.UTC(y, 0, 1) <= end; y += step) yield Date.UTC(y, 0, 1);
  } else if (unit === "month") {
    let m = d.getUTCFullYear() * 12 + d.getUTCMonth();
    m = Math.ceil(m / step) * step;
    if (Date.UTC(Math.floor(m / 12), m % 12, 1) < start) m += step;
    for (; Date.UTC(Math.floor(m / 12), m % 12, 1) <= end; m += step) yield Date.UTC(Math.floor(m / 12), m % 12, 1);
  } else {
    // Days count from the epoch; a 7- or 14-day step is anchored on Mondays.
    const offset = step >= 7 ? 4 : 0;
    let n = Math.ceil((start / DAY - offset) / step) * step + offset;
    for (; n * DAY <= end; n += step) yield n * DAY;
  }
}

/**
 * Tick positions for a time axis: the finest calendar step (days, months,
 * years) that puts at most `maxTicks` ticks inside `[start, end]`, every tick
 * on a UTC boundary. UTC, not local time, so the server and the reader's
 * browser place the same ticks: a local midnight is a different instant in
 * every time zone, and the markup would not agree.
 *
 * Sub-day data (hours, minutes) is not covered: the finest step is one day.
 */
export function timeTicks(domain: Domain, maxTicks: number): TimeTicks {
  const [start, end] = domain;
  const limit = Math.max(1, Math.floor(maxTicks));
  for (const [unit, step] of TIME_STEPS) {
    const ticks: TimeTick[] = [];
    for (const value of stepsFrom(start, end, unit, step)) {
      ticks.push({ value });
      if (ticks.length > limit) break;
    }
    if (ticks.length <= limit) return { unit, step, ticks };
  }
  // A span longer than a hundred steps of a hundred years: the coarsest step.
  const [unit, step] = TIME_STEPS[TIME_STEPS.length - 1]!;
  return { unit, step, ticks: [...stepsFrom(start, end, unit, step)].map((value) => ({ value })) };
}

/** `Intl.DateTimeFormat` options for a tick at this unit. Always UTC. */
export function tickDateFormat(unit: TimeUnit): Intl.DateTimeFormatOptions {
  if (unit === "year") return { year: "numeric", timeZone: "UTC" };
  if (unit === "month") return { month: "short", year: "numeric", timeZone: "UTC" };
  return { month: "short", day: "numeric", timeZone: "UTC" };
}

/**
 * The coarsest date format that tells every point apart: yearly data reads
 * "1957", monthly "Mar 1957", daily "Mar 4, 1957", anything finer adds the
 * time. Used for the table, the tooltip and the announcement, where a reader
 * needs the point's own date rather than the nearest tick's.
 */
export function pointDateFormat(values: readonly number[]): Intl.DateTimeFormatOptions {
  const ds = values.filter(Number.isFinite).map((v) => new Date(v));
  const midnight = ds.every((d) => d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0);
  if (!midnight) return { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" };
  if (ds.every((d) => d.getUTCMonth() === 0 && d.getUTCDate() === 1)) return { year: "numeric", timeZone: "UTC" };
  if (ds.every((d) => d.getUTCDate() === 1)) return { month: "short", year: "numeric", timeZone: "UTC" };
  return { dateStyle: "medium", timeZone: "UTC" };
}

/**
 * x positions for points at the given times, proportional to time and inset
 * at both ends like `pointPositions`. One point, or all at one instant, sits
 * in the middle.
 */
export function timePositions(values: readonly number[], width: number, inset = 8): number[] {
  if (values.length === 0) return [];
  const first = values[0]!;
  const last = values[values.length - 1]!;
  if (values.length === 1 || last === first) return values.map(() => round(width / 2));
  const x = linearScale([first, last], [inset, width - inset]);
  return values.map((v) => round(x(v)));
}
