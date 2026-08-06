import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Calendar } from "./calendar.tsx";

const meta = {
  title: "UI/Calendar",
  component: Calendar,
  parameters: { layout: "padded" },
  args: { label: "Choose a date" },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/*
 * A FIXED month, not `new Date()`. A story that renders today's month makes a
 * visual baseline that fails tomorrow, and gives every reviewer a different
 * picture from the one the author looked at.
 */
const AUGUST = new Date(2026, 7, 1, 12);

export const Playground: Story = {
  render: () => <Calendar label="Choose a date" defaultMonth={AUGUST} defaultValue={new Date(2026, 7, 3, 12)} />,
};

export const Matrix: Story = {
  render: () => <Calendar label="Choose a date" defaultMonth={AUGUST} defaultValue={new Date(2026, 7, 3, 12)} />,
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState<Date | null>(new Date(2026, 7, 3, 12));
    return (
      <div className="flex flex-col gap-lg">
        <Calendar label="Choose a date" defaultMonth={AUGUST} value={value} onValueChange={setValue} />
        <p className="text-caption text-ink-muted">
          {value ? value.toDateString() : "Nothing selected — click the selected day again to clear it."}
        </p>
      </div>
    );
  },
};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-xl">
      <div className="flex flex-col gap-sm">
        <p className="text-caption text-ink-muted">Weekends unavailable</p>
        <Calendar
          label="Choose a weekday"
          defaultMonth={AUGUST}
          isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        />
      </div>
      <div className="flex flex-col gap-sm">
        <p className="text-caption text-ink-muted">Weeks starting Monday, and a leap February</p>
        <Calendar label="Choose a date" defaultMonth={new Date(2028, 1, 1, 12)} weekStartsOn={1} />
      </div>
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
        <Calendar
          label={`Choose a date — ${title}`}
          defaultMonth={AUGUST}
          defaultValue={new Date(2026, 7, 3, 12)}
        />
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
