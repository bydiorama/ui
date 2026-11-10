import test from "node:test";
import assert from "node:assert/strict";

import { areaPath, columnPath, columns, extent, finite, formatNumber, linearScale, linePath, round, seriesPoints } from "./viz.ts";

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
