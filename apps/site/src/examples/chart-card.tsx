import { ChartCard } from "@/components/blocks/chart-card";

const data = [
  { month: "Aug", projects: 12 },
  { month: "Sep", projects: 18 },
  { month: "Oct", projects: 15 },
  { month: "Nov", projects: 24 },
];
export function Example() {
  return (
    <ChartCard
      label="Completed projects"
      description="November had the most completed projects."
      value="24"
      delta={{ change: 0.6, comparison: "vs October" }}
      data={data}
      x="month"
      xLabel="Month"
      series={[{ key: "projects", label: "Projects" }]}
      size="sm"
      className="w-full"
    />
  );
}
