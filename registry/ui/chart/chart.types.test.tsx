/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { BarChart, Chart, LineChart } from "./chart.tsx";

const rows = [{ year: 1967, posters: 140, books: 105 }];

export function Valid() {
  return (
    <>
      <BarChart label="Work" description="Rose." data={rows} x="year" xLabel="Year" series={[{ key: "posters", label: "Posters" }]} />
      <LineChart
        label="Work"
        description="Rose."
        data={rows}
        x="year"
        xLabel="Year"
        series={[{ key: "posters", label: "Posters", slot: 3 }, { key: "books", label: "Books" }]}
        size="sm"
        isStacked
        format={{ notation: "compact" }}
        locale="en-GB"
        className="max-w-xl"
      />
      <Chart label="Work" description="Rose." data={rows} x="year" xLabel="Year" series={[{ key: "posters", label: "Posters" }]}>
        <Chart.Bars />
        <Chart.Rule value={200} label="Target 200" />
      </Chart>
      <BarChart orientation="horizontal" label="Work" description="Rose." data={rows} x="year" xLabel="Year" series={[{ key: "posters", label: "Posters" }]} />
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error description is required — the takeaway is the point of the chart */
  const a = <BarChart label="Work" data={rows} x="year" xLabel="Year" series={[{ key: "posters", label: "Posters" }]} />;
  /* @ts-expect-error a series reads a field the rows have */
  const b = <BarChart label="Work" description="Rose." data={rows} x="year" xLabel="Year" series={[{ key: "prints", label: "Prints" }]} />;
  /* @ts-expect-error the x axis is a field the rows have */
  const c = <BarChart label="Work" description="Rose." data={rows} x="month" xLabel="Month" series={[{ key: "posters", label: "Posters" }]} />;
  /* @ts-expect-error there are eight slots, never a ninth */
  const d = <BarChart label="Work" description="Rose." data={rows} x="year" xLabel="Year" series={[{ key: "posters", label: "Posters", slot: 9 }]} />;
  /* @ts-expect-error a rule needs its words */
  const e = <Chart.Rule value={200} />;
  /* @ts-expect-error format is Intl options, never a d3-format string (ADR 0023 §1) */
  const f = <BarChart label="Work" description="Rose." data={rows} x="year" xLabel="Year" series={[{ key: "posters", label: "Posters" }]} format=",.0f" />;
  /* @ts-expect-error the table's first column needs a header */
  const g = <BarChart label="Work" description="Rose." data={rows} x="year" series={[{ key: "posters", label: "Posters" }]} />;
  /* @ts-expect-error horizontal bars take exactly one series — grouped rows are not designed */
  const h = <BarChart orientation="horizontal" label="Work" description="Rose." data={rows} x="year" xLabel="Year" series={[{ key: "posters", label: "Posters" }, { key: "books", label: "Books" }]} />;
  /* @ts-expect-error horizontal bars never stack */
  const i = <BarChart orientation="horizontal" isStacked label="Work" description="Rose." data={rows} x="year" xLabel="Year" series={[{ key: "posters", label: "Posters" }]} />;
  return [a, b, c, d, e, f, g, h, i];
}
