import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Copy, Trash } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { ContextMenu } from "./context-menu.tsx";
import { Menu } from "@/ui/menu/menu.tsx";

const meta = {
  title: "UI/ContextMenu",
  component: ContextMenu,
  parameters: { layout: "padded" },
  args: { children: null },
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The region is a real tab stop, not a bare div.
 *
 * A context menu that only opens on right-click is unreachable without a
 * pointer, so the region has to be focusable for Shift+F10 to have anything
 * to act on — see the a11y note in the doc.
 */
const Region = ({ children }: { children?: React.ReactNode }) => (
  <ContextMenu.Trigger
    tabIndex={0}
    role="group"
    aria-label="Brand asset — right-click or press Shift+F10 for actions"
    className="flex h-40 w-full max-w-96 items-center justify-center rounded-lg bg-elevated text-body-md text-ink-muted focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2"
  >
    {children ?? "Right-click here"}
  </ContextMenu.Trigger>
);

const Rows = () => (
  <>
    <Menu.Item icon={<Copy />} onSelect={fn()}>Duplicate</Menu.Item>
    <Menu.Item onSelect={fn()}>Rename</Menu.Item>
    <Menu.Separator />
    <Menu.Item icon={<Trash />} onSelect={fn()}>Delete</Menu.Item>
  </>
);

export const Playground: Story = {
  render: () => (
    <ContextMenu>
      <Region />
      <ContextMenu.Panel>
        <Rows />
      </ContextMenu.Panel>
    </ContextMenu>
  ),
  /*
   * Opened by the story rather than by `defaultIsOpen`.
   *
   * Closing every story fixed menus flying open on page load, and quietly cost
   * something: axe runs per story, so a panel no story ever renders is a panel
   * axe never inspects. A `play` that dispatches a real `contextmenu` gets the
   * coverage back AND places the panel at a pointer position, which is the
   * thing `defaultIsOpen` could not do — a context menu is anchored to the
   * cursor, so opening one without one lands it over its own trigger.
   */
  play: async ({ canvasElement }) => {
    const region = canvasElement.querySelector<HTMLElement>('[data-slot="context-menu-trigger"]');
    if (!region) return;
    const { x, y } = region.getBoundingClientRect();
    region.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x + 24, clientY: y + 24, button: 2 }),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
  },
};

/**
 * CLOSED — and here that is not just tidiness.
 *
 * A context menu is anchored to the POINTER. Opened with `defaultIsOpen` there
 * is no pointer to anchor to, so the panel lands wherever the positioner
 * defaults and overlaps its own trigger region, which is what the reported
 * screenshot showed. Right-click the region to see it placed properly.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex min-h-[420px] flex-col gap-xl">
      <ContextMenu>
        <Region>With separators</Region>
        <ContextMenu.Panel>
          <Menu.Item onSelect={fn()}>Profile</Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={fn()}>Brand panel</Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={fn()}>Members</Menu.Item>
          <Menu.Item isDisabled>Admin settings</Menu.Item>
        </ContextMenu.Panel>
      </ContextMenu>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex min-h-[420px] flex-col gap-xl">
      <ContextMenu>
        <Region>Groups and a disabled row</Region>
        <ContextMenu.Panel>
          <Menu.Group label="This asset">
            <Menu.Item onSelect={fn()}>Duplicate</Menu.Item>
            <Menu.Item onSelect={fn()}>Rename</Menu.Item>
          </Menu.Group>
          <Menu.Separator />
          <Menu.Group label="Danger">
            <Menu.Item isDisabled>Delete (locked)</Menu.Item>
          </Menu.Group>
        </ContextMenu.Panel>
      </ContextMenu>
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
  render: function BrandThemedStory() {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => {
      const [host, setHost] = useState<HTMLDivElement | null>(null);
      return (
        <div ref={setHost} style={style} className="min-h-[380px] flex-1 rounded-lg bg-base p-xl">
          <p className="pb-md text-caption text-ink-muted">{title}</p>
          <ContextMenu>
            <Region>{title}</Region>
            <ContextMenu.Panel container={host}>
              <Rows />
            </ContextMenu.Panel>
          </ContextMenu>
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
