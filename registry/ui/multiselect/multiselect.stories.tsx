import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Multiselect, type MultiselectItem } from "./multiselect.tsx";

const ITEMS: MultiselectItem[] = [
  { value: "concept", label: "Brand Concept", isDisabled: true },
  { value: "development", label: "Brand Development" },
  { value: "guidelines", label: "Brand Guidelines" },
  { value: "strategy", label: "Brand Strategy" },
  { value: "stationery", label: "Stationery" },
];

const meta = {
  title: "UI/Multiselect",
  component: Multiselect,
  parameters: { layout: "padded" },
  args: { label: "Services", items: ITEMS, onValueChange: fn() },
} satisfies Meta<typeof Multiselect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Mirrors the sheet: one selection, its chip beneath the trigger. */
export const Matrix: Story = {
  args: { defaultValue: ["guidelines"] },
};

export const States: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-2xl">
      <Multiselect label="Empty" items={ITEMS} onValueChange={fn()} />
      <Multiselect label="One selected" items={ITEMS} defaultValue={["guidelines"]} onValueChange={fn()} />
      <Multiselect
        label="Several selected"
        items={ITEMS}
        defaultValue={["guidelines", "strategy", "stationery"]}
        onValueChange={fn()}
      />
      <Multiselect label="Disabled" items={ITEMS} isDisabled onValueChange={fn()} />
      <Multiselect label="Hidden label" items={ITEMS} isLabelHidden onValueChange={fn()} />
    </div>
  ),
};

/** Controlled: the selection lives in the page, keyed by value. */
export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState<string[]>(["guidelines"]);
    return (
      <div className="flex max-w-sm flex-col gap-md">
        <Multiselect label="Services" items={ITEMS} value={value} onValueChange={setValue} />
        <p className="text-caption text-ink-muted">{`value: [${value.join(", ")}]`}</p>
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
        <Multiselect label="Services" items={ITEMS} defaultValue={["guidelines"]} onValueChange={fn()} />
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
