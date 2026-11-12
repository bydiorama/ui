import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { AreaChart, BarChart, Chart, Histogram, LineChart, ScatterPlot } from "./chart.tsx";

// Generic, discriminated props: the looser Meta/StoryObj form (add-component traps).
const meta: Meta<typeof BarChart> = {
  title: "UI/Chart",
  component: BarChart,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof BarChart>;

/** The anatomy sheet's specimen: printed work by year. */
const PRINTED = [
  { year: 1957, posters: 120, books: 80 },
  { year: 1961, posters: 180, books: 140 },
  { year: 1964, posters: 240, books: 130 },
  { year: 1967, posters: 210, books: 190 },
  { year: 1972, posters: 320, books: 220 },
  { year: 1975, posters: 280, books: 260 },
];

/** The Bar and Line sheets' three series, 1967–1972. */
const STUDIOS = [
  { year: 1967, posters: 140, books: 105, signage: 70 },
  { year: 1968, posters: 172, books: 120, signage: 58 },
  { year: 1969, posters: 150, books: 160, signage: 180 },
  { year: 1970, posters: 225, books: 140, signage: 120 },
  { year: 1971, posters: 250, books: 185, signage: 92 },
  { year: 1972, posters: 310, books: 205, signage: 60 },
];

/** The Bar sheet's horizontal specimen, longest name first. */
const RANKED = [
  { name: "Josef Müller-Brockmann", posters: 342 },
  { name: "Massimo Vignelli", posters: 270 },
  { name: "Adrian Frutiger", posters: 198 },
  { name: "Otl Aicher", posters: 135 },
];

const TWO = [
  { key: "posters", label: "Posters" },
  { key: "books", label: "Books" },
] as const;
const THREE = [...TWO, { key: "signage", label: "Signage" }] as const;

export const Playground: Story = {
  render: () => (
    <BarChart
      style={{ maxWidth: 774 }}
      label="Printed work by year"
      description="Posters led books in every year and peaked in 1972."
      data={PRINTED}
      x="year"
      xLabel="Year"
      series={[...TWO]}
    />
  ),
};

/** Mirrors the Bar and Line sheets: vertical, horizontal, grouped, stacked; lines, rule, stacked area. */
export const Matrix: Story = {
  render: () => (
    <div style={{ maxWidth: 1120 }} className="grid grid-cols-2 gap-xl">
      <BarChart size="sm" label="Vertical" description="Posters peaked in 1972." data={STUDIOS} x="year" xLabel="Year" series={[TWO[0]]} />
      <BarChart
        orientation="horizontal"
        label="Horizontal"
        description="Müller-Brockmann made the most."
        data={RANKED}
        x="name"
        xLabel="Designer"
        series={[{ key: "posters", label: "Posters" }]}
      />
      <BarChart size="sm" label="Grouped" description="Signage overtook both in 1969." data={STUDIOS} x="year" xLabel="Year" series={[...THREE]} />
      <BarChart size="sm" isStacked label="Stacked" description="Output rose to 575 pieces in 1972." data={STUDIOS} x="year" xLabel="Year" series={[...THREE]} />
      <LineChart size="sm" label="End labels and marker shapes" description="Signage fell as posters rose." data={STUDIOS} x="year" xLabel="Year" series={[...THREE]} />
      <Chart size="sm" label="Target" description="Posters approached the 340 target." data={STUDIOS} x="year" xLabel="Year" series={[TWO[0]]}>
        <Chart.Lines />
        <Chart.Rule value={340} label="Target 340" />
      </Chart>
      <AreaChart size="sm" isStacked label="Stacked area" description="All three grew together until 1969." data={STUDIOS} x="year" xLabel="Year" series={[...THREE]} />
    </div>
  ),
};

/** The anatomy sheet's data states: loading, empty, and negative values. */
export const States: Story = {
  render: () => (
    <div style={{ maxWidth: 1120 }} className="grid grid-cols-2 gap-xl">
      <BarChart size="sm" isLoading label="Loading" description="Printed work by year." data={[]} x="year" xLabel="Year" series={[...TWO]} />
      <BarChart size="sm" label="Empty" description="Printed work by year." emptyText="No work in this range" data={[] as typeof PRINTED} x="year" xLabel="Year" series={[...TWO]} />
      <BarChart
        size="sm"
        label="Change on last year"
        description="Books fell in 1964 and 1967."
        data={[
          { year: 1961, change: 60 },
          { year: 1964, change: -10 },
          { year: 1967, change: -40 },
          { year: 1972, change: 90 },
        ]}
        x="year"
        xLabel="Year"
        series={[{ key: "change", label: "Change" }]}
      />
      <LineChart
        size="sm"
        label="A missing year"
        description="1969 was not counted."
        data={[
          { year: 1967, posters: 140 },
          { year: 1968, posters: 172 },
          { year: 1969, posters: null },
          { year: 1970, posters: 225 },
          { year: 1971, posters: 250 },
        ]}
        x="year"
        xLabel="Year"
        series={[{ key: "posters", label: "Posters" }]}
      />
    </div>
  ),
};

const STRESS_BRAND: ThemeSeed = {
  colors: {
    bg: "#fffdf5", surface: "#ffffff", muted: "#f4ecd8",
    textPrimary: "#1a1400", textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)", accent: "#ffe066",
  },
};

/** Uneven years on a time axis, and a point a click or Enter selects. */
export const TimeAndSelect: Story = {
  render: () => {
    const rows = [1951, 1953, 1955, 1959, 1961, 1967].map((y, i) => ({ when: new Date(Date.UTC(y, 0, 1)), n: [210, 260, 240, 330, 390, 470][i]! }));
    return (
      <AreaChart
        xScale="time"
        wash="fade"
        label="Posters printed"
        description="Output rose in every gap after 1955."
        data={rows}
        x="when"
        xLabel="Year"
        series={[{ key: "n", label: "Posters" }]}
        onSelect={fn()}
      />
    );
  },
};

/** Placeholder brands for the scatter: designers, as the harness asks. */
const MARKET = [
  { name: "Müller-Brockmann", share: 31, growth: 12, searches: 9100 },
  { name: "Vignelli", share: 24, growth: 7, searches: 6400 },
  { name: "Frutiger", share: 18, growth: -4, searches: 3800 },
  { name: "Aicher", share: 12, growth: 15, searches: 2600 },
  { name: "Crouwel", share: 9, growth: 2, searches: 1400 },
  { name: "Tschichold", share: 6, growth: -9, searches: 700 },
];

/** The P1 additions and the stand-in screen's gaps: an event rule, a 100%
 *  stack, a scatter quartered by two rules, and bubbles. */
export const Extensions: Story = {
  render: () => (
    <div style={{ maxWidth: 774 }} className="flex flex-col gap-xl">
      <Chart size="sm" label="Posters printed" description="Output climbed after the 1967 repositioning." data={PRINTED} x="year" xLabel="Year" series={[TWO[0]]}>
        <Chart.Lines />
        <Chart.Rule at="1967" label="Repositioned" />
      </Chart>
      <BarChart
        size="sm"
        label="Share of printed work"
        description="Books gained on posters every year."
        data={PRINTED}
        x="year"
        xLabel="Year"
        series={[...TWO]}
        isStacked={{ isPercent: true }}
      />
      <Chart
        xScale="linear"
        xFormat={{ style: "unit", unit: "percent" }}
        label="Market map"
        description="Two of the three largest studios are still growing."
        data={MARKET}
        x="share"
        xLabel="Share"
        format={{ style: "unit", unit: "percent", signDisplay: "exceptZero" }}
        series={[{ key: "growth", label: "Growth" }]}
      >
        <Chart.Dots />
        <Chart.Rule value={0} label="No growth" />
        <Chart.Rule at={15} label="Leaders" />
      </Chart>
      <ScatterPlot
        xFormat={{ style: "unit", unit: "percent" }}
        label="Share against growth, sized by searches"
        description="The largest studio is searched for most, and growing."
        data={MARKET}
        x="share"
        xLabel="Share"
        series={[{ key: "growth", label: "Growth" }]}
        areaKey="searches"
        areaLabel="Searches"
      />
      <Histogram
        size="sm"
        label="Poster widths"
        description="Most posters are 40–80 cm wide."
        values={[32, 41, 44, 48, 52, 55, 57, 58, 61, 63, 64, 66, 70, 72, 77, 84, 91, 118]}
        binCount={8}
        xLabel="Width (cm)"
        countLabel="Posters"
      />
    </div>
  ),
};

export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex flex-1 flex-col gap-lg bg-base p-lg">
        <p className="text-caption text-ink-muted">{title}</p>
        <BarChart size="sm" label="Grouped" description="Signage overtook both in 1969." data={STUDIOS} x="year" xLabel="Year" series={[...THREE]} />
        <LineChart size="sm" label="Lines" description="Signage fell as posters rose." data={STUDIOS} x="year" xLabel="Year" series={[...THREE]} />
        <ScatterPlot size="sm" label="Scatter" description="Larger studios grew faster." data={MARKET} x="share" xLabel="Share" series={[{ key: "growth", label: "Growth" }]} areaKey="searches" areaLabel="Searches" />
      </div>
    );
    return (
      <div style={{ maxWidth: 1120 }} className="flex gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
