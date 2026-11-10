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

/**
 * Format a number for a person, through `Intl` and nothing else (ADR 0023 §1:
 * no d3-format specifier in a public prop). `locale` undefined means the
 * runtime's — pass one explicitly when the server and client may differ.
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions, locale?: string): string {
  return new Intl.NumberFormat(locale, options).format(value);
}
