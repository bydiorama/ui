import { Sparkline } from "@/ui/sparkline";
import { StatTiles } from "@/components/blocks/stat-tiles";

// The same August–November readings shown in the full Chart example.
const projects = [12, 18, 15, 24];

export function Example() {
  return (
    <dl className="w-full rounded-md border border-edge-subtle bg-surface">
      <StatTiles.Tile
        label="Completed projects"
        value="24"
        delta={{ change: 0.6, comparison: "vs October" }}
        trend={<Sparkline size="sm" data={projects} label="Completed projects, August to November" description="Rose from 12 in August to 24 in November, with a dip in October." />}
      />
    </dl>
  );
}
