import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Meter } from "./meter.tsx";

// Discriminated-union props: the looser Meta/StoryObj form (add-component traps).
const meta: Meta<typeof Meter> = {
  title: "UI/Meter",
  component: Meter,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Meter>;

export const Playground: Story = {
  render: () => (
    <div className="w-80">
      <Meter label="Paper stock" value={68} />
    </div>
  ),
};

/** Mirrors the sheet's specimen: three states, then the ring beside a target. */
export const Matrix: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl rounded-md border border-edge-subtle bg-surface p-xl">
      <Meter label="Paper stock" value={68} />
      <Meter label="Ink reserve" value={84} status="warning" statusText="near limit" />
      <Meter label="Press hours" value={96} status="danger" statusText="over limit" />
      <div className="flex items-center gap-xl border-t border-edge-subtle pt-xl">
        <Meter label="Paper stock" value={68} shape="radial" />
        <Meter label="Sheets bound" value={62} target={75} targetText="Target 75%" className="flex-1" />
      </div>
    </div>
  ),
};

/** The sheet's data states, plus the ends of the range and a unit. */
export const States: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl rounded-md border border-edge-subtle bg-surface p-xl">
      <Meter label="Paper stock" value={0} isLoading />
      <Meter label="Paper stock" value={null} emptyText="No reading yet" />
      <Meter label="Empty" value={0} />
      <Meter label="Full" value={100} />
      <Meter label="Sheets" value={412} max={600} valueText="412 of 600 sheets" />
      <Meter label="Early target" value={30} target={20} targetText="Target 20%" />
      <div className="flex gap-xl">
        <Meter label="Ink" value={84} shape="radial" status="warning" statusText="near limit" />
        <Meter label="Press" value={100} shape="radial" status="danger" statusText="over limit" />
        <Meter label="Stock" value={null} emptyText="No reading" shape="radial" />
      </div>
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
          <Meter label="Paper stock" value={68} />
          <Meter label="Ink reserve" value={84} status="warning" statusText="near limit" />
          <Meter label="Sheets bound" value={62} target={75} targetText="Target 75%" />
          <Meter label="Paper stock" value={68} shape="radial" />
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
