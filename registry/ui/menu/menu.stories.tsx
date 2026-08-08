import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ChevronDown, Settings, Users } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Menu } from "./menu.tsx";
import { Button } from "@/ui/button/button.tsx";

const meta = {
  title: "UI/Menu",
  component: Menu,
  parameters: { layout: "padded" },
  args: { children: null },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

const Trigger = () => <Menu.Trigger render={<Button variant="secondary" iconEnd={<ChevronDown />}>Open menu</Button>} />;

export const Playground: Story = {
  render: () => (
    <Menu>
      <Trigger />
      <Menu.Panel>
        <Menu.Item onSelect={fn()}>Profile</Menu.Item>
        <Menu.Item onSelect={fn()}>Brand panel</Menu.Item>
        <Menu.Separator />
        <Menu.Item icon={<Users />} onSelect={fn()}>Members</Menu.Item>
        <Menu.Item icon={<Settings />} onSelect={fn()}>Admin settings</Menu.Item>
      </Menu.Panel>
    </Menu>
  ),
};

/**
 * CLOSED, like every story here except `Open`.
 *
 * A docs page renders every story at once, so a `defaultIsOpen` anywhere means
 * menus fly open the moment the page loads — reported, and right. The panel
 * still needs to be SEEN by something: the visual matrix opens it (that case
 * is not a story) and the contract suite asserts it. One story opens itself,
 * and its name says so.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex min-h-[420px] items-start gap-2xl">
      <Menu>
        <Trigger />
        <Menu.Panel>
          <Menu.Item onSelect={fn()}>Profile</Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={fn()}>Brand panel</Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={fn()}>Members</Menu.Item>
          <Menu.Sub>
            <Menu.SubTrigger>Admin settings</Menu.SubTrigger>
            <Menu.Panel side="right" align="start">
              <Menu.Item onSelect={fn()}>Roles</Menu.Item>
              <Menu.Item onSelect={fn()}>Billing</Menu.Item>
            </Menu.Panel>
          </Menu.Sub>
          <Menu.Sub>
            <Menu.SubTrigger>Team settings</Menu.SubTrigger>
            <Menu.Panel side="right" align="start">
              <Menu.Item onSelect={fn()}>Invitations</Menu.Item>
            </Menu.Panel>
          </Menu.Sub>
        </Menu.Panel>
      </Menu>
    </div>
  ),
};

/** The one story that opens itself, so the panel is visible in the docs. */
export const Open: Story = {
  render: () => (
    <div className="min-h-[380px]">
      <Menu defaultIsOpen>
        <Trigger />
        <Menu.Panel>
          <Menu.Item onSelect={fn()}>Profile</Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={fn()}>Brand panel</Menu.Item>
          <Menu.Item isDisabled>Members</Menu.Item>
        </Menu.Panel>
      </Menu>
    </div>
  ),
};

export const WithGroupsAndStates: Story = {
  render: () => (
    <div className="min-h-[420px]">
      <Menu>
        <Trigger />
        <Menu.Panel>
          <Menu.Group label="Brand profile">
            <Menu.Item onSelect={fn()}>Overview</Menu.Item>
            <Menu.Item onSelect={fn()}>Logos</Menu.Item>
            <Menu.Item onSelect={fn()}>Colours</Menu.Item>
          </Menu.Group>
          <Menu.Separator />
          <Menu.Group label="Team">
            <Menu.Item onSelect={fn()} trailing={<span className="text-label-sm text-ink-muted">⌘K</span>}>
              Invite someone
            </Menu.Item>
            <Menu.Item isDisabled>Transfer ownership</Menu.Item>
          </Menu.Group>
        </Menu.Panel>
      </Menu>
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledStory() {
    const [isOpen, setIsOpen] = useState(false);
    const [chosen, setChosen] = useState("nothing yet");
    return (
      <div className="flex min-h-[320px] flex-col gap-md">
        <Menu isOpen={isOpen} onOpenChange={setIsOpen}>
          <Trigger />
          <Menu.Panel>
            {["Profile", "Brand panel", "Members"].map((label) => (
              <Menu.Item key={label} onSelect={() => setChosen(label)}>
                {label}
              </Menu.Item>
            ))}
          </Menu.Panel>
        </Menu>
        <p className="text-caption text-ink-muted">{`Open: ${isOpen} — chose: ${chosen}`}</p>
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
     * `container` is the point of this story. Theme tokens are inherited
     * custom properties, so a panel portalled to <body> leaves the themed
     * wrapper and paints theme zero — visible only side by side.
     */
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => {
      const [host, setHost] = useState<HTMLDivElement | null>(null);
      return (
        <div ref={setHost} style={style} className="min-h-[380px] flex-1 rounded-lg bg-base p-xl">
          <p className="pb-md text-caption text-ink-muted">{title}</p>
          <Menu defaultIsOpen>
            <Trigger />
            <Menu.Panel container={host}>
              <Menu.Item onSelect={fn()}>Profile</Menu.Item>
              <Menu.Separator />
              <Menu.Item onSelect={fn()}>Brand panel</Menu.Item>
              <Menu.Item isDisabled>Members</Menu.Item>
            </Menu.Panel>
          </Menu>
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
