import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Checkbox } from "./checkbox.tsx";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  parameters: { layout: "padded" },
  // Every story gets an observable response. A control that visibly does
  // nothing reads as broken and produces false bug reports — which is exactly
  // how "Enter doesn't work" on Button arose.
  args: { children: "Select all", onCheckedChange: fn() },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Mirrors the sheet's own layout: a mixed parent over three nested children. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-sm">
      <Checkbox isIndeterminate onCheckedChange={fn()}>
        Select all
      </Checkbox>
      {/*
        26px = the 18px box + the 8px gap, so a child's label starts under the
        parent's label. It is a composition value, not a token — see the
        CheckboxGroup gap in the doc.
      */}
      <div className="flex flex-col gap-sm" style={{ paddingLeft: 26 }}>
        <Checkbox defaultIsChecked onCheckedChange={fn()}>
          Brief A
        </Checkbox>
        <Checkbox onCheckedChange={fn()}>Brief B</Checkbox>
        <Checkbox onCheckedChange={fn()}>Brief C</Checkbox>
      </div>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-sm">
      <Checkbox onCheckedChange={fn()}>Unchecked</Checkbox>
      <Checkbox defaultIsChecked onCheckedChange={fn()}>
        Checked
      </Checkbox>
      <Checkbox isIndeterminate onCheckedChange={fn()}>
        Mixed
      </Checkbox>
      <Checkbox isDisabled onCheckedChange={fn()}>
        Disabled
      </Checkbox>
      <Checkbox isDisabled defaultIsChecked onCheckedChange={fn()}>
        Disabled and checked
      </Checkbox>
      <Checkbox onCheckedChange={fn()}>
        A label long enough to wrap onto a second line, so the box stays aligned
        to the first line rather than floating in the middle of the paragraph
      </Checkbox>
    </div>
  ),
};

/**
 * The parent derives `mixed` from its children — the component never guesses.
 * This is the pattern the `isIndeterminate` prop exists for.
 */
export const SelectAll: Story = {
  render: function SelectAllStory() {
    const [items, setItems] = useState([true, false, false]);
    const checkedCount = items.filter(Boolean).length;

    return (
      <div className="flex flex-col gap-sm">
        <Checkbox
          isChecked={checkedCount === items.length}
          isIndeterminate={checkedCount > 0 && checkedCount < items.length}
          onCheckedChange={(next) => setItems(items.map(() => next))}
        >
          Select all
        </Checkbox>
        <div className="flex flex-col gap-sm" style={{ paddingLeft: 26 }}>
          {items.map((isChecked, i) => (
            <Checkbox
              key={i}
              isChecked={isChecked}
              onCheckedChange={(next) =>
                setItems(items.map((v, j) => (i === j ? next : v)))
              }
            >
              {`Brief ${String.fromCharCode(65 + i)}`}
            </Checkbox>
          ))}
        </div>
      </div>
    );
  },
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

export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex flex-col gap-sm">
          <Checkbox defaultIsChecked onCheckedChange={fn()}>
            Checked
          </Checkbox>
          <Checkbox isIndeterminate onCheckedChange={fn()}>
            Mixed
          </Checkbox>
          <Checkbox onCheckedChange={fn()}>Unchecked</Checkbox>
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
