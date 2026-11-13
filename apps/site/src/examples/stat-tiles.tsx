import { StatTiles } from "@/components/blocks/stat-tiles";

export function Example() {
  return (
    <StatTiles className="w-full">
      <StatTiles.Tile
        label="Projects"
        value="24"
        delta={{ change: 0.2, comparison: "vs last month" }}
      />
      <StatTiles.Tile
        label="In review"
        value="6"
        delta={{
          change: -0.25,
          comparison: "vs last month",
          polarity: "down-is-good",
        }}
      />
    </StatTiles>
  );
}
