import test from "node:test";
import assert from "node:assert/strict";

import { MARKER_SHAPES, arcPath, bins, bandPath, barPath, rowBarPath, ratioOf, areaPath, columnPath, columns, extent, finite, formatNumber, groupedBars, labelIndices, linearScale, linePath, markerKeyPath, markerPath, pointPositions, round, seriesPoints, stackSeries, valueAxis, timeTicks, tickDateFormat, pointDateFormat, timePositions } from "./viz.ts";

const BOX = { width: 160, height: 40, inset: { top: 6, right: 8, bottom: 6, left: 2 } } as const;

test("finite() drops the values nobody measured", () => {
  assert.deepEqual(finite([1, Number.NaN, 2, Number.POSITIVE_INFINITY, 3]), [1, 2, 3]);
});

test("extent() is null for an empty or all-NaN series", () => {
  assert.equal(extent([]), null);
  assert.equal(extent([Number.NaN]), null);
  assert.deepEqual(extent([3, -1, 7]), [-1, 7]);
});

test("linearScale maps ends to ends, and a flat domain to the middle", () => {
  const s = linearScale([0, 10], [100, 0]);
  assert.equal(s(0), 100);
  assert.equal(s(10), 0);
  assert.equal(s(5), 50);
  assert.equal(linearScale([4, 4], [40, 0])(4), 20, "a flat series is a level line, not an edge");
});

test("round() is two decimals — the determinism contract", () => {
  assert.equal(round(1 / 3), 0.33);
  assert.equal(round(151.6000000001), 151.6);
});

test("seriesPoints spreads oldest → newest inside the insets", () => {
  const pts = seriesPoints([0, 5, 10], BOX);
  assert.deepEqual(pts[0], { x: 2, y: 34 }, "the minimum sits on the bottom inset");
  assert.deepEqual(pts[2], { x: 152, y: 6 }, "the maximum sits on the top inset, short of the marker ring");
  assert.equal(pts[1]!.x, 77);
});

test("seriesPoints centres a single point, as the sheet's one-point state does", () => {
  assert.deepEqual(seriesPoints([42], BOX), [{ x: 80, y: 20 }]);
  assert.deepEqual(seriesPoints([], BOX), []);
});

test("linePath and areaPath are byte-identical across calls (server = client)", () => {
  const pts = seriesPoints([3, 1, 4, 1, 5, 9, 2, 6], BOX);
  assert.equal(linePath(pts), linePath(seriesPoints([3, 1, 4, 1, 5, 9, 2, 6], BOX)));
  assert.match(linePath(pts), /^M2 [\d.]+(L[\d.]+ [\d.]+){7}$/);
  assert.match(areaPath(pts, 40), /V40H2Z$/, "the area closes down to the baseline and back");
  assert.equal(areaPath(pts.slice(0, 1), 40), "", "one point has no area");
});

test("columnPath rounds the data end and clamps the radius to the column", () => {
  assert.equal(columnPath(0, 8, 8, 40, 4), "M0 40V12a4 4 0 0 1 4 -4H4a4 4 0 0 1 4 4V40Z");
  assert.equal(columnPath(0, 8, 38, 40, 4), "M0 40V40a2 2 0 0 1 2 -2H6a2 2 0 0 1 2 2V40Z", "a 2px column gets a 2px corner");
  assert.equal(columnPath(0, 8, 40, 40, 4), "", "a zero-height column draws nothing");
});

test("columns always include zero, keep a gap, and cap their width", () => {
  const cols = columns([1, 2, 3], { width: 160, height: 40, gap: 2, maxWidth: 8, radius: 4 });
  assert.equal(cols.length, 3);
  // The tallest column reaches the top; the shortest is a third of it,
  // because the domain starts at ZERO, not at the minimum.
  assert.match(cols[2]!.path, /^M152 40V4a4/);
  assert.match(cols[0]!.path, /^M0 40V30\.67a4/);
});

test("negative columns hang below zero with their data end rounded", () => {
  const [pos, neg] = columns([2, -2], { width: 40, height: 40, gap: 2, maxWidth: 8, radius: 4 });
  assert.match(pos!.path, /^M0 20V4a4 4 0 0 1 4 -4/);
  assert.match(neg!.path, /^M32 20V36a4 4 0 0 0 4 4/);
});

test("formatNumber goes through Intl and honours its options", () => {
  assert.equal(formatNumber(1284, undefined, "en-GB"), "1,284");
  assert.equal(formatNumber(0.12, { style: "percent" }, "en-GB"), "12%");
});

test("ratioOf clamps into 0…1 and survives a bad range", () => {
  assert.equal(ratioOf(68, 0, 100), 0.68);
  assert.equal(ratioOf(150, 0, 100), 1);
  assert.equal(ratioOf(-5, 0, 100), 0);
  assert.equal(ratioOf(5, 10, 10), 0, "a zero-width range is empty, not NaN");
  assert.equal(ratioOf(Number.NaN, 0, 100), 0);
});

test("arcPath reproduces the sheet's 68% arc, and closes at 100%", () => {
  // The Paper sheet draws exactly this path on an 80px ring, r=34.
  assert.equal(arcPath(40, 40, 34, 0.68), "M40 6A34 34 0 1 1 9.24 54.48");
  assert.equal(arcPath(40, 40, 34, 0.25), "M40 6A34 34 0 0 1 74 40", "a quarter is the small arc");
  assert.equal(arcPath(40, 40, 34, 0), "");
  assert.equal(arcPath(40, 40, 34, 1), "M40 6A34 34 0 1 1 40 74A34 34 0 1 1 40 6", "a full turn is two halves");
});

test("valueAxis: fixed intervals on nice steps, the sheets' axes", () => {
  assert.deepEqual(valueAxis([120, 320, 240], 4).ticks, [0, 100, 200, 300, 400]);
  assert.deepEqual(valueAxis([60, 310], 2).ticks, [0, 200, 400]);
  assert.deepEqual(valueAxis([700], 2).ticks, [0, 400, 800]);
  assert.deepEqual(valueAxis([3, 4], 4).ticks, [0, 1, 2, 3, 4]);
  // zero is a tick, and the count holds, when the data goes negative
  const neg = valueAxis([-30, 90], 4);
  assert.equal(neg.ticks.length, 5);
  assert.ok(neg.ticks.includes(0));
  assert.ok(neg.domain[0] <= -30 && neg.domain[1] >= 90);
  // all zero, or nothing: a unit axis, not a NaN one
  assert.deepEqual(valueAxis([], 2).ticks, [0, 1, 2]);
});

test("groupedBars: the anatomy sheet's band of 114 with two 24px bars 2px apart", () => {
  assert.deepEqual(groupedBars(0, 114, 2), { xs: [32, 58], width: 24 });
  const narrow = groupedBars(0, 30, 3);
  assert.ok(narrow.width < 24 && narrow.width >= 1);
  assert.ok(narrow.xs[0]! >= 0 && narrow.xs[2]! + narrow.width <= 30);
});

test("pointPositions and labelIndices", () => {
  assert.deepEqual(pointPositions(3, 116), [8, 58, 108]);
  assert.deepEqual(pointPositions(1, 100), [50]);
  assert.deepEqual(labelIndices(6, 684), [0, 1, 2, 3, 4, 5]);
  const few = labelIndices(24, 300);
  assert.equal(few[0], 0);
  assert.equal(few[few.length - 1], 23);
  assert.ok(few.length <= 6);
});

test("stackSeries stacks up from zero, negatives down, holes keep their place", () => {
  const s = stackSeries([[1, -2, Number.NaN], [3, -1, 4]]);
  assert.deepEqual(s[0], [{ y0: 0, y1: 1 }, { y0: 0, y1: -2 }, { y0: 0, y1: 0 }]);
  assert.deepEqual(s[1], [{ y0: 1, y1: 4 }, { y0: -2, y1: -3 }, { y0: 0, y1: 4 }]);
});

test("markerPath draws the sheet's end markers", () => {
  assert.equal(markerPath("square", 360, 78, 4), "M356 74L364 74L364 82L356 82Z");
  assert.equal(markerPath("triangle", 360, 136, 4), "M360 131L365 140L355 140Z");
  for (const shape of MARKER_SHAPES) assert.match(markerPath(shape, 10, 10, 4), /^M.*Z$/);
});

test("barPath rounds the data end on either side of zero; bandPath closes a stack", () => {
  assert.equal(barPath(32, 24, 168, 240, 4), columnPath(32, 24, 168, 240, 4));
  const down = barPath(0, 10, 50, 20, 4);
  assert.match(down, /^M0 20V/);
  assert.ok(!down.includes("NaN"));
  assert.equal(
    bandPath([{ x: 0, y: 10 }, { x: 10, y: 5 }], [{ x: 0, y: 20 }, { x: 10, y: 15 }]),
    "M0 10L10 5L10 15L0 20Z",
  );
  assert.equal(bandPath([{ x: 0, y: 1 }], [{ x: 0, y: 2 }]), "");
});

test("rowBarPath is the Bar sheet's horizontal row: 24 tall, data end rounded", () => {
  // The sheet's first row: 264 wide, 24 tall, radius 4 on the right only.
  assert.equal(rowBarPath(0, 24, 264, 0, 4), "M0 0H260a4 4 0 0 1 4 4V20a4 4 0 0 1 -4 4H0Z");
  // A negative value grows left from zero and rounds its LEFT end.
  assert.equal(rowBarPath(0, 24, 60, 100, 4), "M100 0H64a4 4 0 0 0 -4 4V20a4 4 0 0 0 4 4H100Z");
  // A bar shorter than the radius never draws a corner bigger than itself.
  assert.match(rowBarPath(0, 24, 2, 0, 4), /^M0 0H0a2 2/);
  assert.equal(rowBarPath(0, 24, 50, 50, 4), "");
});

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

test("timeTicks: whole UTC years, the finest step that fits", () => {
  const t = timeTicks([Date.UTC(1951, 0, 1), Date.UTC(1975, 6, 1)], 6);
  assert.equal(t.unit, "year");
  assert.equal(t.step, 5);
  assert.deepEqual(t.ticks.map((k) => iso(k.value)), ["1955-01-01", "1960-01-01", "1965-01-01", "1970-01-01", "1975-01-01"]);
});

test("timeTicks: months for a year of data, aligned to the step", () => {
  const t = timeTicks([Date.UTC(1972, 0, 15), Date.UTC(1972, 11, 20)], 4);
  assert.equal(t.unit, "month");
  assert.equal(t.step, 3);
  assert.deepEqual(t.ticks.map((k) => iso(k.value)), ["1972-04-01", "1972-07-01", "1972-10-01"]);
});

test("timeTicks: days, and weeks start on a Monday", () => {
  const days = timeTicks([Date.UTC(1972, 2, 1), Date.UTC(1972, 2, 4)], 10);
  assert.deepEqual([days.unit, days.step], ["day", 1]);
  assert.equal(days.ticks.length, 4);
  const weeks = timeTicks([Date.UTC(1972, 2, 1), Date.UTC(1972, 2, 29)], 5);
  assert.deepEqual([weeks.unit, weeks.step], ["day", 7]);
  for (const k of weeks.ticks) assert.equal(new Date(k.value).getUTCDay(), 1, `${iso(k.value)} is a Monday`);
});

test("timeTicks never exceeds the budget, and every tick lies inside the domain", () => {
  for (const [a, b, n] of [[Date.UTC(1440, 0, 1), Date.UTC(1972, 0, 1), 6], [Date.UTC(1972, 0, 1), Date.UTC(1972, 0, 2), 2], [Date.UTC(1900, 5, 3), Date.UTC(1999, 8, 9), 9]] as const) {
    const t = timeTicks([a, b], n);
    assert.ok(t.ticks.length <= n, `${t.ticks.length} ticks for a budget of ${n}`);
    for (const k of t.ticks) assert.ok(k.value >= a && k.value <= b);
  }
});

test("tick and point formats are UTC, so server and browser print the same date", () => {
  for (const unit of ["day", "month", "year"] as const) assert.equal(tickDateFormat(unit).timeZone, "UTC");
  assert.deepEqual(pointDateFormat([Date.UTC(1957, 0, 1), Date.UTC(1961, 0, 1)]), { year: "numeric", timeZone: "UTC" });
  assert.deepEqual(pointDateFormat([Date.UTC(1957, 2, 1), Date.UTC(1957, 5, 1)]), { month: "short", year: "numeric", timeZone: "UTC" });
  assert.deepEqual(pointDateFormat([Date.UTC(1957, 2, 4)]), { dateStyle: "medium", timeZone: "UTC" });
  assert.equal(pointDateFormat([Date.UTC(1957, 2, 4, 9, 30)]).timeStyle, "short");
});

test("timePositions spaces points by time, not by index", () => {
  const xs = timePositions([Date.UTC(1950, 0, 1), Date.UTC(1951, 0, 1), Date.UTC(1960, 0, 1)], 116);
  assert.equal(xs[0], 8);
  assert.equal(xs[2], 108);
  assert.ok(Math.abs(xs[1]! - 18) < 0.05, `one year of ten lands a tenth of the way: ${xs[1]}`);
  assert.deepEqual(timePositions([5], 100), [50]);
});

test("valueAxis zero:false hugs the data for a scatter's axis", () => {
  assert.deepEqual(valueAxis([42, 58, 71], 4, { zero: false }).ticks, [40, 50, 60, 70, 80]);
  // The default still reaches zero.
  assert.equal(valueAxis([42, 71], 4).ticks[0], 0);
  // One value sits mid-axis rather than collapsing the scale.
  const one = valueAxis([50], 4, { zero: false });
  assert.ok(one.domain[0] < 50 && one.domain[1] > 50);
});

test("bins: nice edges, every value counted once, the maximum in the last bin", () => {
  const b = bins([3, 7, 12, 18, 19, 20, 41], 4);
  assert.deepEqual(b.map((x) => [x.x0, x.x1]), [[0, 10], [10, 20], [20, 30], [30, 40], [40, 50]].slice(0, b.length));
  assert.equal(b.reduce((n, x) => n + x.count, 0), 7);
  const exact = bins([0, 10, 20], 2);
  assert.equal(exact.at(-1)!.x1, 20);
  assert.equal(exact.reduce((n, x) => n + x.count, 0), 3);
  assert.deepEqual(bins([], 4), []);
  assert.deepEqual(bins([5, 5], 4).map((x) => x.count), [2]);
});

test("a key marker fills its box on its longer side and never leaves it", () => {
  // The legend and tooltip keys are 8px svgs that clip. markerPath(shape, 4, 4, 4)
  // put the triangle at -1…9 and the diamond at -1.2…9.2, so five of the eight
  // shapes lost their points.
  const extent = (d: string) => {
    const n = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
    const xs = n.map(([x]) => x), ys = n.map(([, y]) => y);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as const;
  };
  for (const shape of MARKER_SHAPES.filter((s) => s !== "circle")) {
    for (const inset of [0, 0.75]) {
      const [x0, y0, x1, y1] = extent(markerKeyPath(shape, 8, inset));
      assert.ok(x0 >= inset - 0.01 && y0 >= inset - 0.01 && x1 <= 8 - inset + 0.01 && y1 <= 8 - inset + 0.01, `${shape} at inset ${inset}: ${x0},${y0} … ${x1},${y1}`);
      assert.ok(Math.abs(Math.max(x1 - x0, y1 - y0) - (8 - 2 * inset)) <= 0.02, `${shape} does not fill its box`);
    }
  }
  assert.equal(markerKeyPath("circle", 8), "M0 4a4 4 0 1 0 8 0a4 4 0 1 0 -8 0Z");
  // The triangle keeps the end marker's proportions, centred in the box.
  assert.equal(markerKeyPath("triangle", 8), "M4 0.4L8 7.6L0 7.6Z");
});
