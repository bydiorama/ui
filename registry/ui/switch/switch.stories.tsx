import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Switch } from "./switch.tsx";

const meta = {
  title: "UI/Switch",
  component: Switch,
  parameters: { layout: "padded" },
  args: { children: "Show job title", onCheckedChange: fn() },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Mirrors the sheet: the off track above the on track. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-md">
      <Switch onCheckedChange={fn()}>Off</Switch>
      <Switch defaultIsChecked onCheckedChange={fn()}>On</Switch>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-md">
      <Switch onCheckedChange={fn()}>Off</Switch>
      <Switch defaultIsChecked onCheckedChange={fn()}>On</Switch>
      <Switch isDisabled onCheckedChange={fn()}>Disabled, off</Switch>
      <Switch isDisabled defaultIsChecked onCheckedChange={fn()}>Disabled, on</Switch>
      <Switch isLabelHidden onCheckedChange={fn()}>Label hidden but still announced</Switch>
    </div>
  ),
};

/** Takes effect immediately — that is what separates it from a Checkbox. */
export const Controlled: Story = {
  render: function ControlledStory() {
    const [on, setOn] = useState(false);
    return (
      <div className="flex flex-col gap-md">
        <Switch isChecked={on} onCheckedChange={setOn}>Show job title</Switch>
        <p className="text-caption text-ink-muted">{on ? "Job title is visible." : "Job title is hidden."}</p>
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
        <div className="flex flex-col gap-md">
          <Switch onCheckedChange={fn()}>Off</Switch>
          <Switch defaultIsChecked onCheckedChange={fn()}>On</Switch>
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
