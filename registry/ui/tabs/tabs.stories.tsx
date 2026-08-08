import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Tabs } from "./tabs.tsx";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: { layout: "padded" },
  args: { children: null },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const Panels = () => (
  <>
    <Tabs.Panel value="links" className="text-body-sm text-ink-secondary">
      One link, shared with the client.
    </Tabs.Panel>
    <Tabs.Panel value="appearance" className="text-body-sm text-ink-secondary">
      Colours, type and spacing for this portal.
    </Tabs.Panel>
    <Tabs.Panel value="advanced" className="text-body-sm text-ink-secondary">
      Export defaults and template overrides.
    </Tabs.Panel>
  </>
);

/** Mirrors the sheet: three tabs, a count on the selected one. */
export const Playground: Story = {
  render: () => (
    <div className="w-[420px]">
      <Tabs defaultValue="links" onValueChange={fn()}>
        <Tabs.List>
          <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
          <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
          <Tabs.Tab value="advanced">Advanced settings</Tabs.Tab>
        </Tabs.List>
        <Panels />
      </Tabs>
    </div>
  ),
};

/**
 * The sheet's own four rows, in its own order — a visual diff is like-for-like
 * only if the layouts match. A variant reachable through the API and drawn in
 * no story is exactly how `outline` survived a release on Button.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex w-[420px] flex-col gap-xl">
      <Tabs defaultValue="links" onValueChange={fn()}>
        <Tabs.List>
          <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
          <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <Tabs defaultValue="links" onValueChange={fn()}>
        <Tabs.List>
          <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
          <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
          <Tabs.Tab value="advanced" isDisabled>Advanced settings</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <Tabs defaultValue="links" orientation="vertical" onValueChange={fn()}>
        <Tabs.List>
          <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
          <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
          <Tabs.Tab value="advanced" isDisabled>Advanced settings</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <Tabs defaultValue="links" variant="ghost" onValueChange={fn()}>
        <Tabs.List>
          <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
          <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
          <Tabs.Tab value="advanced">Advanced Settings</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex w-[420px] flex-col gap-xl">
      <Tabs defaultValue="a" onValueChange={fn()}>
        <Tabs.List>
          <Tabs.Tab value="a">Two tabs</Tabs.Tab>
          <Tabs.Tab value="b">Second</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a" className="text-body-sm text-ink-secondary">A</Tabs.Panel>
        <Tabs.Panel value="b" className="text-body-sm text-ink-secondary">B</Tabs.Panel>
      </Tabs>
      <Tabs defaultValue="a" onValueChange={fn()}>
        <Tabs.List>
          <Tabs.Tab value="a" count={12}>With a count</Tabs.Tab>
          <Tabs.Tab value="b" count={0}>Zero</Tabs.Tab>
          <Tabs.Tab value="c" isDisabled>Disabled</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a" className="text-body-sm text-ink-secondary">A</Tabs.Panel>
        <Tabs.Panel value="b" className="text-body-sm text-ink-secondary">B</Tabs.Panel>
        <Tabs.Panel value="c" className="text-body-sm text-ink-secondary">C</Tabs.Panel>
      </Tabs>
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [tab, setTab] = useState("links");
    return (
      <div className="flex w-[420px] flex-col gap-md">
        <Tabs value={tab} onValueChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
            <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
            <Tabs.Tab value="advanced">Advanced settings</Tabs.Tab>
          </Tabs.List>
          <Panels />
        </Tabs>
        <p className="text-caption text-ink-muted">{`Selected: ${tab}`}</p>
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
        <Tabs defaultValue="links" onValueChange={fn()}>
          <Tabs.List>
            <Tabs.Tab value="links" count={1}>Links</Tabs.Tab>
            <Tabs.Tab value="appearance">Appearance</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="links" className="text-body-sm text-ink-secondary">Links</Tabs.Panel>
          <Tabs.Panel value="appearance" className="text-body-sm text-ink-secondary">Appearance</Tabs.Panel>
        </Tabs>
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
