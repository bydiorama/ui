import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Sparkline, type DataSeries } from "./sparkline.tsx";

/** The sheet's specimen series: twelve months, rising with a dip in each. */
const MONTHS = [28, 24, 26, 20, 22, 16, 18, 12, 15, 10, 12, 8].map((v) => 40 - v);
const DESCRIPTION = "Rose from 12 to 32 over twelve months, with a small dip every other month.";

const meta = {
  title: "UI/Sparkline",
  component: Sparkline,
  parameters: { layout: "padded" },
  args: { data: MONTHS, label: "Posters printed, last 12 months", description: DESCRIPTION },
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const Row = ({ name, children }: { name: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-lg">
    <span className="w-18 shrink-0 text-label-sm font-body text-ink-muted">{name}</span>
    {children}
  </div>
);

/** Mirrors the sheet's specimen: line, area, column, then the stat-tile size. */
export const Matrix: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl rounded-md border border-edge-subtle bg-surface p-xl">
      <Row name="Line"><Sparkline data={MONTHS} label="Line" description={DESCRIPTION} /></Row>
      <Row name="Area"><Sparkline data={MONTHS} label="Area" description={DESCRIPTION} variant="area" /></Row>
      <Row name="Column"><Sparkline data={MONTHS} label="Column" description={DESCRIPTION} variant="column" /></Row>
      <Row name="Small"><Sparkline data={MONTHS} label="Small" description={DESCRIPTION} size="sm" /></Row>
    </div>
  ),
};

/** Every slot, in order — the eight vivid marks on the card they are drawn on. */
export const Series: Story = {
  render: () => (
    <div className="grid w-fit grid-cols-2 gap-lg rounded-md border border-edge-subtle bg-surface p-xl">
      {([1, 2, 3, 4, 5, 6, 7, 8] as const satisfies readonly DataSeries[]).map((series) => (
        <Row key={series} name={`Slot ${series}`}>
          <Sparkline data={MONTHS} label={`Slot ${series}`} description={DESCRIPTION} series={series} variant="area" size="sm" />
        </Row>
      ))}
    </div>
  ),
};

/** The sheet's data states: loading, one point, and the edge cases data brings. */
export const States: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl rounded-md border border-edge-subtle bg-surface p-xl">
      <Row name="Loading"><Sparkline data={[]} label="Loading" description="Loading the last 12 months." isLoading /></Row>
      <Row name="One point"><Sparkline data={[42]} label="One point" description="One reading so far: 42." /></Row>
      <Row name="Flat"><Sparkline data={[5, 5, 5, 5]} label="Flat" description="Unchanged at 5." /></Row>
      <Row name="Gaps"><Sparkline data={[3, Number.NaN, 5, 4, 6]} label="Gaps" description="Rose from 3 to 6; one month missing." /></Row>
      <Row name="Negative"><Sparkline data={[3, -2, 4, -1, 2]} label="Negative" description="Swung between -2 and 4." variant="column" /></Row>
      <Row name="No marker"><Sparkline data={MONTHS} label="No marker" description={DESCRIPTION} hasEndMarker={false} /></Row>
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
      <div style={style} className="flex-1 rounded-lg bg-surface p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex flex-col gap-lg">
          <Sparkline data={MONTHS} label="Line" description={DESCRIPTION} />
          <Sparkline data={MONTHS} label="Area" description={DESCRIPTION} variant="area" series={2} />
          <Sparkline data={MONTHS} label="Column" description={DESCRIPTION} variant="column" series={3} />
        </div>
      </div>
    );
    return (
      <div className="flex gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
