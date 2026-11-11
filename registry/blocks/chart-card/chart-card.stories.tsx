import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { Chart } from "@/ui/chart/chart.tsx";

import { ChartCard } from "./chart-card.tsx";

// Generic props: the looser Meta/StoryObj form, as Chart's stories use.
const meta: Meta<typeof ChartCard> = {
  title: "Blocks/ChartCard",
  component: ChartCard,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ChartCard>;

/** The sheet's card: total printed work by year, which sums to the figure. */
const PRINTED = [
  { year: 1957, printed: 200 },
  { year: 1961, printed: 320 },
  { year: 1964, printed: 370 },
  { year: 1967, printed: 400 },
  { year: 1972, printed: 540 },
  { year: 1975, printed: 540 },
];
const SERIES = [{ key: "printed", label: "Printed work" }] as const;

function SheetCard({ isLoading = false }: { isLoading?: boolean }) {
  return (
    <ChartCard
      style={{ maxWidth: 774 }}
      label="Printed work by year"
      description="Output more than doubled from 1957 and held at 540 from 1972."
      value="2,370"
      delta={{ change: 0.18, comparison: "vs 1951–1956" }}
      data={isLoading ? [] : PRINTED}
      x="year"
      xLabel="Year"
      series={[...SERIES]}
      isLoading={isLoading}
    />
  );
}

export const Playground: Story = { render: () => <SheetCard /> };

/** The sheet's card, then the same head over bars and over a falling cost. */
export const Matrix: Story = {
  render: () => (
    <div style={{ maxWidth: 1120 }} className="grid grid-cols-2 gap-xl">
      <SheetCard />
      <ChartCard
        size="sm"
        label="Printed work by year"
        description="Output peaked in 1972."
        value="540"
        delta={{ change: 0, comparison: "vs 1972" }}
        data={PRINTED}
        x="year"
        xLabel="Year"
        series={[...SERIES]}
      >
        <Chart.Bars />
      </ChartCard>
      <ChartCard
        size="sm"
        label="Ink cost by year"
        description="Ink cost rose every year."
        value="€3,410"
        delta={{ change: 0.09, comparison: "vs 1971", polarity: "down-is-good" }}
        data={PRINTED.map((r) => ({ year: r.year, cost: r.printed * 6 }))}
        x="year"
        xLabel="Year"
        series={[{ key: "cost", label: "Ink cost" }]}
      />
    </div>
  ),
};

/** Loading keeps the head: the figure is the caller's, so it shows as soon as they have it. */
export const States: Story = {
  render: () => (
    <div style={{ maxWidth: 1120 }} className="grid grid-cols-2 gap-xl">
      <SheetCard isLoading />
      <ChartCard
        size="sm"
        label="Printed work by year"
        description="Nothing printed yet."
        value="0"
        data={[] as typeof PRINTED}
        emptyText="No work in this range"
        x="year"
        xLabel="Year"
        series={[...SERIES]}
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

export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex flex-1 flex-col gap-lg bg-base p-lg">
        <p className="text-caption text-ink-muted">{title}</p>
        <SheetCard />
      </div>
    );
    return (
      <div style={{ maxWidth: 1600 }} className="flex gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
