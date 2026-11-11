/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Chart } from "@/ui/chart/chart.tsx";

import { ChartCard } from "./chart-card.tsx";

const rows = [{ year: 1967, printed: 400 }];

export function Valid() {
  return (
    <>
      <ChartCard label="Work" description="Rose." value="400" delta={{ change: 0.18, comparison: "vs 1966" }} data={rows} x="year" xLabel="Year" series={[{ key: "printed", label: "Printed" }]} />
      <ChartCard label="Work" description="Rose." value="400" data={rows} x="year" xLabel="Year" series={[{ key: "printed", label: "Printed" }]} size="sm">
        <Chart.Bars />
      </ChartCard>
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error the card's head needs its figure */
  const a = <ChartCard label="Work" description="Rose." data={rows} x="year" xLabel="Year" series={[{ key: "printed", label: "Printed" }]} />;
  /* @ts-expect-error the description is still required: it is the accessible description */
  const b = <ChartCard label="Work" value="400" data={rows} x="year" xLabel="Year" series={[{ key: "printed", label: "Printed" }]} />;
  /* @ts-expect-error the head is the card's own; a second headline is not a prop */
  const c = <ChartCard label="Work" description="Rose." value="400" headline={<span />} data={rows} x="year" xLabel="Year" series={[{ key: "printed", label: "Printed" }]} />;
  /* @ts-expect-error a series reads a field the rows have */
  const d = <ChartCard label="Work" description="Rose." value="400" data={rows} x="year" xLabel="Year" series={[{ key: "posters", label: "Posters" }]} />;
  return [a, b, c, d];
}
