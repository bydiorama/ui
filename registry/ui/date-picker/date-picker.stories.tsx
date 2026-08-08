import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { DatePicker } from "./date-picker.tsx";

const meta = {
  title: "UI/DatePicker",
  component: DatePicker,
  parameters: { layout: "padded" },
  args: { label: "Deadline" },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/*
 * FIXED dates, never `new Date()`. A story that renders today makes a visual
 * baseline that fails tomorrow and gives every reviewer a different picture
 * from the one the author looked at — which is what `today` is a prop for.
 */
const AUGUST = new Date(2026, 7, 1, 12);
const THIRD = new Date(2026, 7, 3, 12);
const TODAY = new Date(2026, 7, 2, 12);

export const Playground: Story = {
  render: () => (
    <DatePicker
      label="Deadline"
      defaultValue={THIRD}
      defaultMonth={AUGUST}
      today={TODAY}
      helperText="You can change this later."
    />
  ),
};

/**
 * Mirrors the sheet's own three rows, so a visual diff is like-for-like:
 * the closed field, the field with the day grid open, and the field with a
 * select open. The panels are portalled, so the open cases are proved in the
 * contract suite rather than here.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-lg">
      <DatePicker label="Deadline" defaultValue={THIRD} defaultMonth={AUGUST} today={TODAY} />
      <DatePicker label="Empty" defaultMonth={AUGUST} today={TODAY} helperText="Pick any weekday." />
      <DatePicker label="With error" defaultMonth={AUGUST} today={TODAY} errorText="A deadline is required." />
      <DatePicker label="Disabled" defaultValue={THIRD} defaultMonth={AUGUST} today={TODAY} isDisabled />
      <DatePicker label="Hidden label" isLabelHidden defaultMonth={AUGUST} today={TODAY} />
    </div>
  ),
};

export const Open: Story = {
  render: () => (
    <div className="min-h-[520px]">
      <DatePicker label="Deadline" defaultIsOpen defaultValue={THIRD} defaultMonth={AUGUST} today={TODAY} />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-xl">
      <div className="flex flex-col gap-sm">
        <p className="text-caption text-ink-muted">Weekends unavailable</p>
        <DatePicker
          label="Delivery date"
          defaultMonth={AUGUST}
          today={TODAY}
          isDateDisabled={(date) => date.getDay() === 0 || date.getDay() === 6}
        />
      </div>
      <div className="flex flex-col gap-sm">
        <p className="text-caption text-ink-muted">Weeks starting Monday, and a custom format</p>
        <DatePicker
          label="Renewal"
          defaultMonth={AUGUST}
          today={TODAY}
          defaultValue={THIRD}
          weekStartsOn={1}
          formatValue={(date) => date.toISOString().slice(0, 10)}
        />
      </div>
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState<Date | null>(THIRD);
    return (
      <div className="flex flex-col gap-lg">
        <DatePicker
          label="Deadline"
          defaultMonth={AUGUST}
          today={TODAY}
          value={value}
          onValueChange={setValue}
        />
        <p className="text-caption text-ink-muted">
          {value ? value.toDateString() : "Cleared — the panel deliberately stays open so another date can be picked."}
        </p>
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
     * `container` is the point of this story, not decoration. Theme tokens are
     * inherited custom properties, so a panel portalled to <body> leaves the
     * themed wrapper and paints theme zero — visible only when the two panels
     * are side by side.
     */
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => {
      const [host, setHost] = useState<HTMLDivElement | null>(null);
      return (
        <div ref={setHost} style={style} className="min-h-[520px] flex-1 rounded-lg bg-base p-xl">
          <p className="pb-md text-caption text-ink-muted">{title}</p>
          <DatePicker
            label={`Deadline — ${title}`}
            defaultIsOpen
            defaultValue={THIRD}
            defaultMonth={AUGUST}
            today={TODAY}
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
