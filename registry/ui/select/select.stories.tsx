import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Input } from "@/ui/input/input.tsx";
import { Select, type SelectItem } from "./select.tsx";

const ITEMS: SelectItem[] = [
  { value: "concept", label: "Brand Concept" },
  { value: "development", label: "Brand Development" },
  { value: "guidelines", label: "Brand Guidelines" },
  { value: "strategy", label: "Brand Strategy", isDisabled: true },
  { value: "stationery", label: "Stationery" },
];

const meta = {
  title: "UI/Select",
  component: Select,
  parameters: { layout: "padded" },
  args: { label: "Services", items: ITEMS, onValueChange: fn() },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Mirrors the sheet: the closed field, and the field with a value chosen. */
export const Matrix: Story = {
  render: () => (
    <div className="grid w-full max-w-dialog-lg grid-cols-2 gap-2xl">
      {(["lg", "md", "sm"] as const).map((size) => (
        <div key={size} className="contents">
          <Select label={`Empty · ${size}`} size={size} items={ITEMS} onValueChange={fn()} />
          <Select
            label={`Chosen · ${size}`}
            size={size}
            items={ITEMS}
            defaultValue="guidelines"
            onValueChange={fn()}
          />
        </div>
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-2xl">
      <Select label="Empty" items={ITEMS} onValueChange={fn()} />
      <Select label="Chosen" items={ITEMS} defaultValue="guidelines" onValueChange={fn()} />
      <Select label="Disabled" items={ITEMS} isDisabled onValueChange={fn()} />
      <Select label="Invalid" items={ITEMS} errorText="Choose a service" onValueChange={fn()} />
      <Select
        label="With helper text"
        items={ITEMS}
        helperText="Pick the closest match — we will confirm the details later."
        onValueChange={fn()}
      />
      <Select label="Hidden label" items={ITEMS} isLabelHidden onValueChange={fn()} />
    </div>
  ),
};

/**
 * The claim that makes Select part of the system rather than beside it: its
 * trigger is Input's control surface. Drawn side by side so a reader can check
 * the same thing the browser test asserts.
 */
export const BesideInput: Story = {
  render: () => (
    <div className="flex w-full max-w-dialog-lg flex-col gap-2xl">
      {(["lg", "md", "sm"] as const).map((size) => (
        <div key={size} className="flex items-end gap-lg">
          <Input label={`Company · ${size}`} size={size} placeholder="Diorama" />
          <Select label={`Services · ${size}`} size={size} items={ITEMS} onValueChange={fn()} />
        </div>
      ))}
    </div>
  ),
};

/** Controlled: the value lives in the page, and `null` is a real state. */
export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState<string | null>("guidelines");
    return (
      <div className="flex w-96 flex-col gap-md">
        <Select label="Services" items={ITEMS} value={value} onValueChange={setValue} />
        <p className="text-caption text-ink-muted">{`value: ${value ?? "null"}`}</p>
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
        {/*
          The trigger is inside the themed subtree and re-skins. The PANEL is
          portalled to the body and does not, without `container` — the gap
          shared with Modal, Popover, Sheet and Drawer, recorded in the doc.
        */}
        <Select label="Services" items={ITEMS} defaultValue="guidelines" onValueChange={fn()} />
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
