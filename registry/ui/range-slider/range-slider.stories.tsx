import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Input } from "@/ui/input/input.tsx";
import { RangeSlider, type RangeSliderValue } from "./range-slider.tsx";

const meta = {
  title: "UI/RangeSlider",
  component: RangeSlider,
  parameters: { layout: "padded" },
  args: {
    label: "Active years",
    startThumbLabel: "Earliest year",
    endThumbLabel: "Latest year",
    min: 1800,
    max: 2000,
    defaultValue: [1925, 1972],
    formatValue: String,
    onValueChange: fn(),
  },
} satisfies Meta<typeof RangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Slider's track ladder, all four sizes — the geometry is Slider's own table. */
export const Matrix: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl">
      {(["sm", "md", "lg", "xl"] as const).map((size) => (
        <RangeSlider
          key={size}
          label={`Active years (${size})`}
          startThumbLabel="Earliest year"
          endThumbLabel="Latest year"
          size={size}
          min={1800}
          max={2000}
          defaultValue={[1925, 1972]}
          formatValue={String}
          onValueChange={fn()}
        />
      ))}
    </div>
  ),
};

/** The sheet's states, in its order: rest, meeting, full range, disabled. */
export const States: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl">
      <RangeSlider label="Active years" startThumbLabel="Earliest year" endThumbLabel="Latest year" min={1800} max={2000} defaultValue={[1925, 1972]} formatValue={String} onValueChange={fn()} />
      <RangeSlider label="Thumbs meet" startThumbLabel="Earliest year" endThumbLabel="Latest year" min={1800} max={2000} defaultValue={[1950, 1958]} formatValue={String} onValueChange={fn()} />
      <RangeSlider label="Equal ends" startThumbLabel="Earliest year" endThumbLabel="Latest year" min={1800} max={2000} defaultValue={[1950, 1950]} formatValue={String} onValueChange={fn()} />
      <RangeSlider
        label="Full range"
        startThumbLabel="Earliest year"
        endThumbLabel="Latest year"
        min={1800}
        max={2000}
        defaultValue={[1800, 2000]}
        formatValue={(v) => (v === 1800 || v === 2000 ? "Any" : String(v))}
        onValueChange={fn()}
      />
      <RangeSlider label="Disabled" startThumbLabel="Earliest year" endThumbLabel="Latest year" min={1800} max={2000} defaultValue={[1925, 1972]} formatValue={String} isDisabled onValueChange={fn()} />
    </div>
  ),
};

/**
 * Composed with two Input sm fields, sharing one state both ways — the reason
 * `valueControl` takes an element. The sheet draws "From" / "To" prefixes
 * INSIDE the fields; Input has no text-prefix slot, so here the fields are
 * named by visually-hidden labels and the readout stays on. (RangeSlider's
 * knownGaps.)
 */
export const WithFields: Story = {
  render: function WithFieldsStory() {
    const [range, setRange] = useState<RangeSliderValue>([1925, 1972]);
    const set = (index: 0 | 1, raw: string) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      setRange(index === 0 ? [Math.min(n, range[1]), range[1]] : [range[0], Math.max(n, range[0])]);
    };
    return (
      <div className="w-96">
        <RangeSlider
          label="Active years"
          startThumbLabel="Earliest year"
          endThumbLabel="Latest year"
          min={1800}
          max={2000}
          value={range}
          onValueChange={setRange}
          formatValue={String}
          valueControl={
            <div className="flex items-center gap-sm pt-xs">
              <Input label="Earliest year" isLabelHidden size="sm" type="number" value={range[0]} onChange={(e) => set(0, e.target.value)} />
              <span aria-hidden="true" className="text-body-sm font-body text-ink-muted">–</span>
              <Input label="Latest year" isLabelHidden size="sm" type="number" value={range[1]} onChange={(e) => set(1, e.target.value)} />
            </div>
          }
        />
      </div>
    );
  },
};

/** Price: the locale's number format is right here, so no formatValue. */
export const Price: Story = {
  render: () => (
    <div className="w-96">
      <RangeSlider
        label="Price per seat"
        startThumbLabel="Minimum price"
        endThumbLabel="Maximum price"
        defaultValue={[12, 48]}
        formatValue={(v) => `€${v}`}
        minStepsBetweenValues={4}
        onValueChange={fn()}
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
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex flex-col gap-lg">
          <RangeSlider label="Active years" startThumbLabel="Earliest year" endThumbLabel="Latest year" min={1800} max={2000} defaultValue={[1925, 1972]} formatValue={String} onValueChange={fn()} />
          <RangeSlider label="Price per seat" startThumbLabel="Minimum price" endThumbLabel="Maximum price" size="sm" defaultValue={[12, 48]} formatValue={(v) => `€${v}`} onValueChange={fn()} />
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
