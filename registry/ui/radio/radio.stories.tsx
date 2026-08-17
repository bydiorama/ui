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

import { Radio, RadioGroup } from "./radio.tsx";

const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  parameters: { layout: "padded" },
  // Every story gets an observable response. A control that visibly does
  // nothing reads as broken and produces false bug reports.
  //
  // `children` lives in args rather than in each story's render, because
  // RadioGroup requires it — a story that only sets `render` would then be
  // missing a required prop and every one of them would need a stub.
  args: {
    label: "Reviewer",
    defaultValue: "brockmann",
    onValueChange: fn(),
    children: [
      <Radio key="brockmann" value="brockmann">
        Josef Müller-Brockmann
      </Radio>,
      <Radio key="tschichold" value="tschichold">
        Jan Tschichold
      </Radio>,
      <Radio key="crouwel" value="crouwel">
        Wim Crouwel
      </Radio>,
    ],
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Mirrors the sheet's Anatomy section: a plain group beside a described one. */
export const Matrix: Story = {
  render: () => (
    <div className="flex gap-2xl">
      <RadioGroup label="Reviewer" defaultValue="brockmann" onValueChange={fn()} className="w-90">
        <Radio value="brockmann">Josef Müller-Brockmann</Radio>
        <Radio value="tschichold">Jan Tschichold</Radio>
        <Radio value="crouwel">Wim Crouwel</Radio>
      </RadioGroup>

      <RadioGroup label="Delivery" defaultValue="grid" onValueChange={fn()} className="flex-1">
        <Radio value="grid" description="Typeset to the twelve-column module. Reflows on any breakpoint.">
          Grid systems, 1961
        </Radio>
        <Radio value="alphabet" description="Fixed to the cathode-ray grid. One weight, no diagonals.">
          New Alphabet, 1967
        </Radio>
      </RadioGroup>
    </div>
  ),
};

/**
 * The sheet's States matrix, in order. Hover and focus are not renderable as
 * static stories — the browser test drives them — so what is here is every
 * state a caller can put the component into from props.
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-2xl">
      <RadioGroup label="Unselected and selected" defaultValue="b" onValueChange={fn()}>
        <Radio value="a">Unselected</Radio>
        <Radio value="b">Selected</Radio>
      </RadioGroup>

      <RadioGroup label="Disabled group" defaultValue="b" isDisabled onValueChange={fn()}>
        <Radio value="a">Disabled, unselected</Radio>
        <Radio value="b">Disabled, selected</Radio>
      </RadioGroup>

      <RadioGroup label="One option disabled" defaultValue="a" onValueChange={fn()}>
        <Radio value="a">Available</Radio>
        <Radio value="b" isDisabled>
          Unavailable in this brand
        </Radio>
      </RadioGroup>

      <RadioGroup
        label="Licence"
        errorText="Choose a licence before the font can be bundled."
        onValueChange={fn()}
      >
        <Radio value="ofl">Open Font Licence</Radio>
        <Radio value="proprietary">Proprietary</Radio>
      </RadioGroup>

      <RadioGroup label="Status" orientation="horizontal" defaultValue="active" onValueChange={fn()}>
        <Radio value="active">Active</Radio>
        <Radio value="pending">Pending</Radio>
        <Radio value="archived">Archived</Radio>
      </RadioGroup>

      <RadioGroup label="Wrapping labels" defaultValue="long" onValueChange={fn()} className="max-w-96">
        <Radio value="long">
          A label long enough to wrap onto a second line, so the circle centres against the
          paragraph rather than sitting on its first line — the gap this component records
        </Radio>
        <Radio
          value="described"
          description="With a description the row aligns to the top instead, and the circle lands on the label's first line."
        >
          A label long enough to wrap onto a second line, with a description under it
        </Radio>
      </RadioGroup>
    </div>
  ),
};

/** Controlled: the caller owns the value and can refuse a change. */
export const Controlled: Story = {
  render: function ControlledStory() {
    const [value, setValue] = useState("tschichold");
    return (
      <div className="flex flex-col gap-md">
        <RadioGroup
          label="Reviewer"
          value={value}
          onValueChange={setValue}
          helperText="The reviewer is notified when the brief is submitted."
        >
          <Radio value="brockmann">Josef Müller-Brockmann</Radio>
          <Radio value="tschichold">Jan Tschichold</Radio>
          <Radio value="crouwel">Wim Crouwel</Radio>
        </RadioGroup>
        <p className="text-caption text-ink-muted">Chosen: {value}</p>
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
        <RadioGroup label="Reviewer" defaultValue="brockmann" onValueChange={fn()}>
          <Radio value="brockmann">Josef Müller-Brockmann</Radio>
          <Radio value="tschichold">Jan Tschichold</Radio>
          <Radio value="crouwel" isDisabled>
            Wim Crouwel
          </Radio>
        </RadioGroup>
      </div>
    );
    return (
      <div className="flex gap-lg">
        <Panel style={zero} title="Theme zero" />
        <Panel style={brand} title="Stress brand — pale yellow accent" />
      </div>
    );
  },
};
