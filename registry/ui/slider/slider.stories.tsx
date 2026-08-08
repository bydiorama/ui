import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Select } from "@/ui/select/select.tsx";
import { Slider } from "./slider.tsx";

const meta = {
  title: "UI/Slider",
  component: Slider,
  parameters: { layout: "padded" },
  args: { label: "Logo size", defaultValue: 62, onValueChange: fn() },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Mirrors the sheet: every size, with and without the label row. */
export const Matrix: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl">
      {(["sm", "md", "lg", "xl"] as const).map((size) => (
        <div key={size} className="flex flex-col gap-sm">
          <Slider label={`Logo size (${size})`} defaultValue={62} size={size} hasValueText onValueChange={fn()} />
          <Slider label="Logo size" defaultValue={62} size={size} isLabelHidden onValueChange={fn()} />
        </div>
      ))}
    </div>
  ),
};

/**
 * The sheet's last three sections. The steppers and the value control are the
 * reason `xl` exists: everything in the row is 32px, so the track squares off
 * to match rather than sitting in it as a pill.
 *
 * Controlled on purpose — see the doc's knownGaps. The steppers read the
 * value they are given, so an uncontrolled slider would step once from its
 * default and then have nothing to step from.
 */
export const WithControls: Story = {
  render: function WithControlsStory() {
    const [value, setValue] = useState(62);
    return (
      <div className="flex w-96 flex-col gap-xl">
        <Slider
          label="Logo size"
          size="xl"
          value={value}
          onValueChange={setValue}
          valueControl={<ValueSelect value={value} onValueChange={setValue} />}
        />
        <Slider
          label="Logo size"
          size="xl"
          value={value}
          onValueChange={setValue}
          hasSteppers
          decrementLabel="Smaller logo"
          incrementLabel="Larger logo"
          valueControl={<ValueSelect value={value} onValueChange={setValue} />}
        />
        <Slider
          label="Logo size"
          size="xl"
          value={value}
          onValueChange={setValue}
          hasSteppers
          decrementLabel="Smaller logo"
          incrementLabel="Larger logo"
        />
      </div>
    );
  },
};

/**
 * The value control the sheet draws: a real Select, composed into the slot.
 *
 * This is the point of `valueControl` taking an element (§3). The options are
 * the caller's data — here a preset ladder of logo sizes — and a Slider that
 * owned an `items` prop would be two components in one. It shares the
 * slider's state in both directions, which is the whole reason the two sit in
 * one row.
 */
const PRESETS = ["25", "50", "62", "75", "100"].map((v) => ({ value: v, label: v }));

const ValueSelect = ({
  value,
  onValueChange,
}: {
  value: number;
  onValueChange: (next: number) => void;
}) => (
  <Select
    label="Logo size"
    isLabelHidden
    size="sm"
    items={PRESETS}
    value={String(value)}
    onValueChange={(next) => next !== null && onValueChange(Number(next))}
    className="w-24 shrink-0"
  />
);

export const States: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl">
      <Slider label="Minimum" defaultValue={0} hasValueText onValueChange={fn()} />
      <Slider label="Maximum" defaultValue={100} hasValueText onValueChange={fn()} />
      <Slider label="Stepped by 2, 0–10" defaultValue={4} min={0} max={10} step={2} hasValueText onValueChange={fn()} />
      <Slider label="Disabled" defaultValue={62} isDisabled hasValueText onValueChange={fn()} />
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [size, setSize] = useState(62);
    return (
      <div className="flex w-96 flex-col gap-md">
        <Slider label="Logo size" value={size} onValueChange={setSize} hasValueText />
        <p className="text-caption text-ink-muted">{`Rendering the logo at ${size}px.`}</p>
      </div>
    );
  },
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
          <Slider label="Logo size" defaultValue={62} hasValueText onValueChange={fn()} />
          <Slider label="Logo size" defaultValue={62} size="sm" isLabelHidden onValueChange={fn()} />
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
