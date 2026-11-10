import test from "node:test";
import assert from "node:assert/strict";

import { MARKER_SHAPES, arcPath, bandPath, barPath, ratioOf, areaPath, columnPath, columns, extent, finite, formatNumber, groupedBars, labelIndices, linearScale, linePath, markerPath, pointPositions, round, seriesPoints, stackSeries, valueAxis } from "./viz.ts";

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
