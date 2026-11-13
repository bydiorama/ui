import { BarChart } from "@/ui/chart";
import type { CSSProperties } from "react";

const data = [
  { month: "Aug", projects: 12 },
  { month: "Sep", projects: 18 },
  { month: "Oct", projects: 15 },
  { month: "Nov", projects: 24 },
];
export function Example({ isThumbnail = false }: { isThumbnail?: boolean }) {
  const chart = (
    <BarChart
      label="Completed projects"
      description="Projects rose from August to November, with a dip in October."
      data={data}
      x="month"
      xLabel="Month"
      series={[{ key: "projects", label: "Projects" }]}
      size="sm"
      className={isThumbnail
        ? "w-full shrink-0 border-0 bg-transparent p-0 gap-0 [&_[data-slot=chart-head]]:hidden [&_[data-slot=chart-y-axis]]:hidden [&_[data-slot=chart-x-axis]]:hidden [&_[data-slot=chart-grid]]:hidden [&_[data-slot=chart-baseline]]:hidden [&_[data-slot=chart-plot-column]]:pt-0"
        : "w-full"}
    />
  );
  if (!isThumbnail) return chart;

  return (
    <div
      className="example-chart-thumbnail h-25 w-52 max-w-full"
      role="img"
      aria-label="Bar chart preview: projects rose from 12 to 24, with a dip in October."
      // One series can demonstrate the active brand. Keep the categorical
      // palette for the complete chart and scopes outside this preview.
      style={{ "--ui-data-cat-1-solid": "var(--ui-bg-accent-legible)" } as CSSProperties}
    >
      <div inert aria-hidden="true" className="flex h-full items-end overflow-hidden">
        {chart}
      </div>
    </div>
  );
}
