/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { StatDelta, StatFigure, StatTiles } from "./stat-tiles.tsx";

export function Valid() {
  return (
    <StatTiles aria-label="Printing" className="max-w-5xl">
      <StatTiles.Tile label="Posters printed" value="1,284" delta={{ change: 0.12, comparison: "vs 1971" }} trend={<svg />} />
      <StatTiles.Tile label="Ink cost" value="€3,410" delta={{ change: 0.09, comparison: "vs 1971", polarity: "down-is-good", format: { style: "percent" } }} />
      <StatTiles.Tile label="Books bound" value={null} emptyText="Not counted" />
      <StatTiles.Tile label="Presses" value={null} isLoading />
    </StatTiles>
  );
}

export function Invalid() {
  /* @ts-expect-error a tile says what it measures */
  const a = <StatTiles.Tile value="6" />;
  /* @ts-expect-error the value is formatted by the caller; null means no reading, a number is neither */
  const b = <StatTiles.Tile label="Presses" value={6} />;
  /* @ts-expect-error a change with no baseline cannot be read */
  const c = <StatDelta change={0.1} />;
  /* @ts-expect-error polarity is one of two words, not a boolean */
  const d = <StatDelta change={0.1} comparison="vs 1971" polarity />;
  /* @ts-expect-error format is Intl options, never a format string */
  const e = <StatDelta change={0.1} comparison="vs 1971" format="0%" />;
  /* @ts-expect-error a figure always has its value */
  const f = <StatFigure />;
  return [a, b, c, d, e, f];
}
