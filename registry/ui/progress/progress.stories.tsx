import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Progress } from "./progress.tsx";

const meta = {
  title: "UI/Progress",
  component: Progress,
  parameters: { layout: "padded" },
  args: { label: "Usage", value: 62 },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Mirrors the sheet: each size with and without the label row. */
export const Matrix: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl">
      <Progress label="Usage" value={62} hasValueText />
      <Progress label="Usage" value={62} isLabelHidden />
      <Progress label="Usage" value={62} size="sm" hasValueText />
      <Progress label="Usage" value={62} size="sm" isLabelHidden />
    </div>
  ),
};

/**
 * The sheet's brand spectrum. `solid` stays the default because the fill is a
 * meaningful graphic that must clear 3:1, which a three-stop sweep cannot
 * guarantee across its whole length.
 */
export const Gradient: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl">
      <Progress label="Usage" value={62} variant="gradient" hasValueText />
      <Progress label="Usage" value={62} variant="gradient" size="sm" isLabelHidden />
      <Progress label="Complete" value={100} variant="gradient" isLabelHidden />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl">
      <Progress label="Empty" value={0} hasValueText />
      <Progress label="Part way" value={38} hasValueText />
      <Progress label="Complete" value={100} hasValueText />
      <Progress label="Counted, not percentage" value={3} max={4} hasValueText />
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
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex flex-col gap-lg">
          <Progress label="Usage" value={62} hasValueText />
          <Progress label="Usage" value={62} size="sm" isLabelHidden />
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
