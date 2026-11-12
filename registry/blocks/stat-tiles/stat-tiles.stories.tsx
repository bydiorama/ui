import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { Sparkline } from "@/ui/sparkline/sparkline.tsx";

import { StatTiles } from "./stat-tiles.tsx";

const meta: Meta<typeof StatTiles> = {
  title: "Blocks/StatTiles",
  component: StatTiles,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof StatTiles>;

/** The sheet's two specimen trends: rising, and falling. */
const RISING = [9, 12, 10.5, 15, 13.5, 18, 16.5, 21, 19, 23, 21.5, 25];
const FALLING = [...RISING].reverse();

/** The sheet's row: a good rise, a bad fall, a bad rise, and no change. */
function SheetRow() {
  return (
    <StatTiles aria-label="Printing this year" style={{ maxWidth: 1152 }}>
      <StatTiles.Tile
        label="Posters printed"
        value="1,284"
        delta={{ change: 0.12, comparison: "vs 1971" }}
        trend={<Sparkline size="sm" data={RISING} label="Posters printed, last 12 months" description="Rose through the year." />}
      />
      <StatTiles.Tile
        label="Books bound"
        value="862"
        delta={{ change: -0.04, comparison: "vs 1971" }}
        trend={<Sparkline size="sm" data={FALLING} label="Books bound, last 12 months" description="Fell through the year." />}
      />
      <StatTiles.Tile
        label="Ink cost"
        value="€3,410"
        delta={{ change: 0.09, comparison: "vs 1971", polarity: "down-is-good" }}
        trend={<Sparkline size="sm" data={RISING} label="Ink cost, last 12 months" description="Rose through the year." />}
      />
      <StatTiles.Tile label="Presses running" value="6" delta={{ change: 0, comparison: "vs 1971" }} />
    </StatTiles>
  );
}

export const Playground: Story = { render: () => <SheetRow /> };

/** Mirrors the sheet: the row, then each change line on its own. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      <SheetRow />
      <StatTiles style={{ maxWidth: 1152 }}>
        <StatTiles.Tile label="Up, up is good" value="120" delta={{ change: 0.2, comparison: "vs last year" }} />
        <StatTiles.Tile label="Down, up is good" value="80" delta={{ change: -0.2, comparison: "vs last year" }} />
        <StatTiles.Tile label="Up, down is good" value="120" delta={{ change: 0.2, comparison: "vs last year", polarity: "down-is-good" }} />
        <StatTiles.Tile label="Down, down is good" value="80" delta={{ change: -0.2, comparison: "vs last year", polarity: "down-is-good" }} />
      </StatTiles>
    </div>
  ),
};

/** The sheet's data states: loading, no value yet, no comparison. */
export const States: Story = {
  render: () => (
    <StatTiles style={{ maxWidth: 1152 }}>
      <StatTiles.Tile label="Posters printed" value={null} isLoading />
      <StatTiles.Tile label="Books bound" value={null} />
      <StatTiles.Tile label="Presses running" value="6" />
    </StatTiles>
  ),
};

/** The sheet's narrow row: a 720px panel wraps two by two with the
 *  sparklines beside the text; a 343px phone drops them under. */
export const NarrowRow: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      <div style={{ width: 720 }}>
        <SheetRow />
      </div>
      <div style={{ width: 343 }}>
        <SheetRow />
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
      <div style={style} className="flex flex-col gap-lg bg-base p-lg">
        <p className="text-caption text-ink-muted">{title}</p>
        <SheetRow />
      </div>
    );
    return (
      <div className="flex flex-col gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
