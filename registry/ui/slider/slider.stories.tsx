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

/**
 * A value that means nothing as a number. `getAriaValueText` is what a screen
 * reader announces in its place — "Mostly formal", not "70". Nothing visible
 * changes; inspect the thumb's input for `aria-valuetext`.
 */
const formality = (v: number) =>
  v >= 80 ? "Formal" : v >= 60 ? "Mostly formal" : v > 40 ? "Balanced" : v > 20 ? "Mostly casual" : "Casual";

export const AnnouncedValue: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl">
      <Slider label="Formality, casual to formal" defaultValue={70} getAriaValueText={formality} onValueChange={fn()} />
      <Slider
        label="Upload limit"
        defaultValue={24}
        hasValueText
        formatValue={(v) => `${v} MB`}
        getAriaValueText={(v) => `${v} megabytes`}
        onValueChange={fn()}
      />
    </div>
  ),
};

/**
 * Inline — Paper, "Slider variants · 05". The label and value live inside the
 * bar; one row per property, stacked 4 apart, so a panel of five settings
 * costs five field heights. The Halftone group is the sheet's own specimen.
 */
export const Inline: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-md">
      <p className="text-label-md font-body text-ink-primary">Halftone</p>
      <div className="flex flex-col gap-xs">
        <Slider label="Dot size" variant="inline" defaultValue={12} max={48} formatValue={(v) => `${v} px`} onValueChange={fn()} />
        <Slider label="Spacing" variant="inline" defaultValue={28} formatValue={(v) => `${v} px`} onValueChange={fn()} />
        <Slider label="Screen angle" variant="inline" defaultValue={45} max={90} formatValue={(v) => `${v}°`} onValueChange={fn()} />
        <Slider label="Contrast" variant="inline" defaultValue={40} formatValue={(v) => (v / 100).toFixed(2)} onValueChange={fn()} />
        <Slider label="Edge softness" variant="inline" defaultValue={80} formatValue={(v) => (v / 100).toFixed(2)} onValueChange={fn()} />
      </div>
    </div>
  ),
};

/** The inline sizes and the states the sheet draws for them, in its order. */
export const InlineStates: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-lg">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Slider key={size} label={`Dot size (${size})`} variant="inline" size={size} defaultValue={12} max={48} formatValue={(v) => `${v} px`} onValueChange={fn()} />
      ))}
      <Slider label="Minimum" variant="inline" defaultValue={0} max={48} formatValue={(v) => `${v} px`} onValueChange={fn()} />
      <Slider label="Maximum" variant="inline" defaultValue={48} max={48} formatValue={(v) => `${v} px`} onValueChange={fn()} />
      <Slider label="Disabled" variant="inline" defaultValue={12} max={48} isDisabled formatValue={(v) => `${v} px`} onValueChange={fn()} />
      <div className="w-60">
        <Slider label="Left-to-right taper of the halftone band" variant="inline" defaultValue={62} formatValue={(v) => (v / 100).toFixed(2)} onValueChange={fn()} />
      </div>
    </div>
  ),
};

const humour = (v: number) =>
  v >= 80 ? "Playful" : v >= 60 ? "Mostly playful" : v > 40 ? "Balanced" : v > 20 ? "Mostly serious" : "Serious";
const energy = (v: number) =>
  v >= 80 ? "Enthusiastic" : v >= 60 ? "Mostly enthusiastic" : v > 40 ? "Balanced" : v > 20 ? "Mostly calm" : "Calm";
const vocabulary = (v: number) =>
  v >= 80 ? "Ornate" : v >= 60 ? "Mostly ornate" : v > 40 ? "Balanced" : v > 20 ? "Mostly plain" : "Plain";

/**
 * Balance — Paper, "Slider variants · 06": the brand-voice sliders of #25.
 * The fill grows from the origin toward the thumb, the leaning pole lifts to
 * the primary ink, and the descriptor is both shown and announced.
 */
export const Balance: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl">
      <p className="text-label-md font-body text-ink-primary">Brand voice</p>
      <Slider label="Formality" origin={50} startLabel="Casual" endLabel="Formal" defaultValue={70} hasValueText formatValue={formality} onValueChange={fn()} />
      <Slider label="Humour" origin={50} startLabel="Serious" endLabel="Playful" defaultValue={30} hasValueText formatValue={humour} onValueChange={fn()} />
      <Slider label="Energy" origin={50} startLabel="Calm" endLabel="Enthusiastic" defaultValue={50} hasValueText formatValue={energy} onValueChange={fn()} />
      <Slider label="Vocabulary" origin={50} startLabel="Plain" endLabel="Ornate" defaultValue={10} hasValueText formatValue={vocabulary} onValueChange={fn()} />
    </div>
  ),
};

/** Balance at every track size, disabled, and composed with the inline bar. */
export const BalanceStates: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-xl">
      {(["sm", "lg"] as const).map((size) => (
        <Slider key={size} label={`Formality (${size})`} size={size} origin={50} startLabel="Casual" endLabel="Formal" defaultValue={70} hasValueText formatValue={formality} onValueChange={fn()} />
      ))}
      <Slider label="Disabled" origin={50} startLabel="Casual" endLabel="Formal" defaultValue={70} hasValueText formatValue={formality} isDisabled onValueChange={fn()} />
      <Slider
        label="Temperature"
        variant="inline"
        min={-50}
        max={50}
        origin={0}
        defaultValue={-12}
        formatValue={(v) => (v < 0 ? `−${Math.abs(v)}` : String(v))}
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
          <Slider label="Logo size" defaultValue={62} hasValueText onValueChange={fn()} />
          <Slider label="Logo size" defaultValue={62} size="sm" isLabelHidden onValueChange={fn()} />
          <Slider label="Dot size" variant="inline" defaultValue={12} max={48} formatValue={(v) => `${v} px`} onValueChange={fn()} />
          <Slider label="Formality" origin={50} startLabel="Casual" endLabel="Formal" defaultValue={70} hasValueText formatValue={formality} onValueChange={fn()} />
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
