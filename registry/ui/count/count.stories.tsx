import { useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { Count } from "./count.tsx";

const meta = {
  title: "UI/Count",
  component: Count,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Count>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A stat with buttons that move it up and down by a step. */
function Stepper({ start, step, label, onChange }: { start: number; step: number; label: string; onChange?: () => void }) {
  const [value, setValue] = useState(start);
  const move = (by: number) => {
    setValue((v) => v + by);
    onChange?.();
  };
  return (
    <div className="flex items-center gap-md">
      <div className="flex w-40 flex-col gap-3xs">
        <span className="text-caption text-ink-muted">{label}</span>
        <Count value={value} className="text-title-lg text-ink-primary" />
      </div>
      <Button variant="secondary" onClick={() => move(-step)}>
        −{step}
      </Button>
      <Button variant="secondary" onClick={() => move(step)}>
        +{step}
      </Button>
    </div>
  );
}

/** The sheet's case: 1,249 moving by one. Press quickly to see changes overlap. */
export const Playground: Story = {
  args: { value: 1249 },
  render: () => <Stepper start={1249} step={1} label="Orders this week" onChange={fn()} />,
};

/**
 * The cases the sheet names: a carry across places (999 → 1,000), a
 * shrinking value dropping in, a currency in another locale, and a percent.
 */
export const Matrix: Story = {
  args: { value: 1249 },
  render: () => {
    function Formatted() {
      const [value, setValue] = useState(1249.5);
      return (
        <div className="flex items-center gap-md">
          <Count value={value} locale="sk-SK" format={{ style: "currency", currency: "EUR" }} className="w-40 text-title-md text-ink-primary" />
          <Button variant="secondary" onClick={() => setValue((v) => Math.round((v + 37.25) * 100) / 100)}>
            Add item
          </Button>
        </div>
      );
    }
    function Percent() {
      const [value, setValue] = useState(0.42);
      return (
        <div className="flex items-center gap-md">
          <Count value={value} format={{ style: "percent" }} className="w-40 text-title-md text-ink-primary" />
          <Button variant="secondary" onClick={() => setValue((v) => (v >= 1 ? 0.42 : Math.min(1, v + 0.07)))}>
            Progress
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start gap-xl">
        <Stepper start={998} step={1} label="Across a place" />
        <Stepper start={52} step={7} label="Unread" />
        <Formatted />
        <Percent />
      </div>
    );
  },
};

/** The three motion levels, as regions: Reduced cross-fades each digit; Off is instant. */
export const States: Story = {
  args: { value: 1249 },
  render: () => (
    <div className="flex flex-col items-start gap-xl">
      {(["full", "reduced", "off"] as const).map((level) => (
        <section key={level} data-ui-motion={level} aria-label={`Motion ${level}`}>
          <Stepper start={1249} step={1} label={level} />
        </section>
      ))}
    </div>
  ),
};

const STRESS_BRAND: ThemeSeed = {
  colors: {
    bg: "#fffdf5",
    surface: "#ffffff",
    muted: "#f4ecd8",
    textPrimary: "#1a1400",
    textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)",
    accent: "#ffe066",
  },
};

/**
 * Theme zero beside a hostile brand seed (AGENTS.md). Count paints no colour
 * — its digits take the host's ink — so what this checks is that the change
 * keeps that ink, including on the brand's accent Button.
 */
export const BrandThemed: Story = {
  args: { value: 1249 },
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    function CartButton() {
      const [items, setItems] = useState(3);
      return (
        <Button onClick={() => setItems((n) => n + 1)}>
          Cart · <Count value={items} />
        </Button>
      );
    }
    return (
      <div className="flex flex-col gap-xl md:flex-row">
        {[
          { style: zero, title: "Theme zero" },
          { style: brand, title: "Stress brand (pale-yellow accent)" },
        ].map(({ style, title }) => (
          <div key={title} style={style as CSSProperties} className="flex flex-1 flex-col items-start gap-md rounded-lg bg-base p-xl">
            <p className="text-caption text-ink-muted">{title}</p>
            <Stepper start={1249} step={1} label="Orders this week" />
            <CartButton />
          </div>
        ))}
      </div>
    );
  },
};
