import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { InfoCircle } from "griddy-icons";

import { Banner } from "@/ui/banner/banner.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Popover } from "./popover.tsx";

const meta = {
  title: "UI/Popover",
  component: Popover,
  parameters: { layout: "centered" },
  // `children` is required on the component — it is the compound tree, not a
  // label — so every story supplies it through `render`. This satisfies the
  // args type without pretending a meaningful default exists.
  args: { children: null },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The sheet's own composition: a title over a Banner.
 *
 * The well in the panel is not a bespoke box — it is the Banner component,
 * which is why Banner exists. As a BOXED child it sits flush at the panel's
 * own p-lg; only bare text takes the inset, which Title and Description apply.
 * Its radius-md against the panel's radius-xl and p-lg is concentric: 8+16=24.
 */
const SheetContent = () => (
  <>
    <Popover.Title>Popover contents</Popover.Title>
    <Banner icon={<InfoCircle size={18} aria-hidden="true" />}>Exports use the template set in Brand profile.</Banner>
  </>
);

export const Playground: Story = {
  render: () => (
    <Popover onOpenChange={fn()}>
      <Popover.Trigger render={<Button>Open popover</Button>} />
      <Popover.Panel>
        <SheetContent />
      </Popover.Panel>
    </Popover>
  ),
};

/**
 * Open on mount, so the panel is actually rendered when axe runs — a closed
 * popover exercises nothing.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex min-h-96 items-center justify-center">
      <Popover defaultIsOpen onOpenChange={fn()}>
        <Popover.Trigger render={<Button>Open popover</Button>} />
        <Popover.Panel>
          <SheetContent />
        </Popover.Panel>
      </Popover>
    </div>
  ),
};

export const Placement: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-xl">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Popover key={side} onOpenChange={fn()}>
          <Popover.Trigger render={<Button variant="secondary">{side}</Button>} />
          <Popover.Panel side={side}>
            <Popover.Title>{`Placed ${side}`}</Popover.Title>
            <Popover.Description>Flips automatically when it would collide.</Popover.Description>
          </Popover.Panel>
        </Popover>
      ))}
    </div>
  ),
};

/** Modal: focus is trapped, for a panel that contains its own controls. */
export const WithActions: Story = {
  render: () => (
    <Popover isModal onOpenChange={fn()}>
      <Popover.Trigger render={<Button>Delete section</Button>} />
      <Popover.Panel>
        <Popover.Title>Delete this section?</Popover.Title>
        <Popover.Description>This cannot be undone.</Popover.Description>
        {/*
          The actions row takes NO inset — unlike the title and description,
          the sheet sits it flush at the panel padding, because a button has
          its own edge the way a boxed child does.
        */}
        <div className="flex items-center justify-end gap-md">
          <Popover.Close render={<Button variant="secondary" size="md">Cancel</Button>} />
          <Popover.Close render={<Button variant="danger" size="md">Delete</Button>} />
        </div>
      </Popover.Panel>
    </Popover>
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

export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <Popover defaultIsOpen onOpenChange={fn()}>
          <Popover.Trigger render={<Button>Open popover</Button>} />
          <Popover.Panel>
            <SheetContent />
          </Popover.Panel>
        </Popover>
      </div>
    );
    return (
      <div className="flex min-h-96 gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};

