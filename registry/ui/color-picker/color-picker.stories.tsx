import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { ColorPicker, type ColorSwatch } from "./color-picker.tsx";

const meta = {
  title: "UI/ColorPicker",
  component: ColorPicker,
  parameters: { layout: "padded" },
  args: { label: "Accent colour" },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/*
 * The sheet's palette, as DATA: fixed hexes with human names. Theme tokens
 * would re-skin under a brand scope, and a swatch is a colour the user chose,
 * not a role the theme owns.
 */
const PALETTE: readonly ColorSwatch[] = [
  { value: "#FFFFFF", label: "White" },
  { value: "#B7B0A9", label: "Stone" },
  { value: "#5F5A54", label: "Graphite" },
  { value: "#1D1B19", label: "Ink" },
  { value: "#9EDBF3", label: "Sky" },
  { value: "#1B6C84", label: "Brand blue" },
  { value: "#13505F", label: "Deep blue" },
  { value: "#0B2F38", label: "Night blue" },
  { value: "#F2C4A3", label: "Sand" },
  { value: "#CD7F48", label: "Copper" },
  { value: "#8A4A22", label: "Rust" },
  { value: "#C9C3F5", label: "Lilac" },
  { value: "#8C84D6", label: "Lavender" },
  { value: "#4F4794", label: "Indigo" },
  { value: "#2E7D4F", label: "Green" },
  { value: "#1E5A37", label: "Forest" },
  { value: "#D9534F", label: "Red" },
  { value: "#A9441F", label: "Brick" },
];

export const Playground: Story = {
  render: () => (
    <div className="min-h-[560px] max-w-80">
      <ColorPicker label="Accent colour" defaultValue="#1B6C84" swatches={PALETTE} swatchesLabel="Brand palette" helperText="Used for links and buttons." />
    </div>
  ),
};

/**
 * Mirrors the sheet's Sizes and Trigger states rows, closed — the panel is
 * portalled, so its states are proved in the contract suite and in `Open`.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex max-w-80 flex-col gap-lg">
      <ColorPicker label="lg" size="lg" defaultValue="#1B6C84" />
      <ColorPicker label="md" size="md" defaultValue="#1B6C84" />
      <ColorPicker label="sm" size="sm" defaultValue="#1B6C84" />
      <div className="flex items-center gap-lg">
        <ColorPicker label="Swatch lg" variant="swatch" size="lg" defaultValue="#1B6C84" />
        <ColorPicker label="Swatch md" variant="swatch" size="md" defaultValue="#1B6C84" />
        <ColorPicker label="Swatch sm" variant="swatch" size="sm" defaultValue="#1B6C84" />
      </div>
      <ColorPicker label="Empty" />
      <ColorPicker label="Invalid" defaultValue="#9EDBF3" errorText="Too light for text on white — needs 4.5:1." />
      <ColorPicker label="Disabled" defaultValue="#1B6C84" isDisabled />
      <ColorPicker label="With alpha" defaultValue="#1B6C8480" hasAlpha />
    </div>
  ),
};

/** The sheet's two configurations, open: the full editor, and palette only. */
export const Open: Story = {
  render: () => (
    <div className="flex min-h-[600px] flex-wrap gap-xl">
      <div className="w-80">
        <ColorPicker label="Default" defaultIsOpen defaultValue="#1B6C84" hasAlpha swatches={PALETTE} swatchesLabel="Brand palette" />
      </div>
      <div className="w-80">
        <ColorPicker label="Palette only" defaultIsOpen defaultValue="#1B6C84" swatches={PALETTE} swatchesLabel="Brand palette" isPaletteOnly />
      </div>
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState<string | null>("#1B6C84");
    return (
      <div className="flex min-h-[560px] max-w-80 flex-col gap-lg">
        <ColorPicker label="Accent colour" value={value} onValueChange={setValue} swatches={PALETTE.slice(0, 9)} />
        <div className="flex items-center gap-sm">
          <span className="size-6 rounded-sm ring ring-inset ring-edge-strong" style={{ backgroundColor: value ?? undefined }} />
          <p className="text-caption text-ink-muted tabular-nums">{value ?? "No colour"} — follows every move.</p>
        </div>
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
  render: function BrandThemedStory() {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    /*
     * `container` is the point: theme tokens are inherited custom properties,
     * so a panel portalled to <body> leaves the themed wrapper and paints
     * theme zero — visible only when the two panels are side by side.
     */
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => {
      const [host, setHost] = useState<HTMLDivElement | null>(null);
      return (
        <div ref={setHost} style={style} className="min-h-[600px] flex-1 rounded-lg bg-base p-xl">
          <p className="pb-md text-caption text-ink-muted">{title}</p>
          <ColorPicker
            label={`Accent colour — ${title}`}
            defaultIsOpen
            defaultValue="#1B6C84"
            swatches={PALETTE.slice(0, 9)}
            container={host}
          />
        </div>
      );
    };
    return (
      <div className="flex gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
