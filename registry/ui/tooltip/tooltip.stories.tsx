import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Copy, InfoCircle, Trash } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Button } from "../button/button.tsx";
import { Tooltip } from "./tooltip.tsx";

const meta = {
  title: "UI/Tooltip",
  component: Tooltip,
  parameters: { layout: "centered" },
  args: {
    onOpenChange: fn(),
    children: [
      <Tooltip.Trigger
        key="trigger"
        render={
          <Button isIconOnly aria-label="Duplicate to a brand" icon={<Copy />} />
        }
      />,
      <Tooltip.Content key="content">Duplicate to a brand</Tooltip.Content>,
    ],
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tab to it, or rest the pointer on it for 600ms. */
export const Playground: Story = {};

/**
 * Mirrors the sheet's Placement section. Every one is open on focus, so this
 * page is also the fastest way to see all four sides at once: Tab through it.
 */
export const Matrix: Story = {
  render: () => (
    <Tooltip.Provider>
      <div className="flex items-center gap-4xl p-4xl">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <Tooltip key={side}>
            <Tooltip.Trigger
              render={
                <Button variant="ghost" isIconOnly aria-label={`Placed ${side}`} icon={<InfoCircle />} />
              }
            />
            <Tooltip.Content side={side}>{side}</Tooltip.Content>
          </Tooltip>
        ))}
      </div>
    </Tooltip.Provider>
  ),
};

/**
 * What the component can be put into from props. Hover intent and the skip
 * window are timing rather than state — the browser test drives those.
 */
export const States: Story = {
  render: () => (
    <Tooltip.Provider>
      <div className="flex flex-col items-start gap-2xl p-2xl">
        <Tooltip defaultIsOpen>
          <Tooltip.Trigger
            render={
              <Button variant="secondary" isIconOnly aria-label="Open on mount" icon={<InfoCircle />} />
            }
          />
          <Tooltip.Content>Open on mount</Tooltip.Content>
        </Tooltip>

        <Tooltip isDisabled>
          <Tooltip.Trigger
            render={
              <Button variant="secondary" isIconOnly aria-label="Tooltip disabled" icon={<InfoCircle />} />
            }
          />
          <Tooltip.Content>You will never see this</Tooltip.Content>
        </Tooltip>

        <Tooltip>
          <Tooltip.Trigger
            render={
              <Button variant="secondary" isIconOnly aria-label="Delete" icon={<Trash />} />
            }
          />
          <Tooltip.Content>
            Removes the file from every brand this workspace owns. It cannot be undone.
          </Tooltip.Content>
        </Tooltip>

        <Tooltip>
          <Tooltip.Trigger render={<Button variant="secondary">A wider trigger</Button>} />
          <Tooltip.Content align="start">Aligned to the start edge</Tooltip.Content>
        </Tooltip>
      </div>
    </Tooltip.Provider>
  ),
};

/**
 * The case the sheet gets wrong. A disabled control receives no pointer events
 * and is out of the tab order, so the tooltip on the left never opens; the
 * explanation has to hang off a wrapper the caller owns, as on the right.
 */
export const DisabledTrigger: Story = {
  render: () => (
    <Tooltip.Provider>
      <div className="flex items-center gap-2xl p-2xl">
        <Tooltip>
          <Tooltip.Trigger
            render={
              <Button isIconOnly isDisabled aria-label="Delete" icon={<Trash />} />
            }
          />
          <Tooltip.Content>Never opens — the control swallows the events</Tooltip.Content>
        </Tooltip>

        <Tooltip>
          <Tooltip.Trigger
            render={
              /*
                A focusable wrapper the caller owns. It is the only way to
                explain a disabled control: `disabled` suppresses the pointer
                events AND removes the element from the tab order, so both
                paths to the tooltip are closed on the control itself.
              */
              <span tabIndex={0} className="inline-flex">
                <Button isIconOnly isDisabled aria-label="Delete" icon={<Trash />} />
              </span>
            }
          />
          <Tooltip.Content>Read-only in this brand</Tooltip.Content>
        </Tooltip>
      </div>
    </Tooltip.Provider>
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
 * The chip is portalled, so it needs `container` to stay inside a brand scope.
 *
 * This story is the only place a reader sees that, and it only works if the
 * chip is INSIDE the themed subtree — a BrandThemed story that portals to the
 * body renders theme zero and looks like proof. Each panel captures its own
 * element and hands it to Tooltip.Content.
 */
export const BrandThemed: Story = {
  render: function BrandThemedStory() {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));

    function Panel({ style, title }: { style: React.CSSProperties; title: string }) {
      const [scope, setScope] = useState<HTMLDivElement | null>(null);
      return (
        <div ref={setScope} style={style} className="flex-1 rounded-lg bg-base p-xl">
          <p className="pb-md text-caption text-ink-muted">{title}</p>
          <Tooltip defaultIsOpen>
            <Tooltip.Trigger
              render={<Button isIconOnly aria-label="Duplicate to a brand" icon={<Copy />} />}
            />
            <Tooltip.Content container={scope} side="bottom">
              Duplicate to a brand
            </Tooltip.Content>
          </Tooltip>
        </div>
      );
    }

    return (
      <div className="flex gap-lg p-2xl" style={{ minHeight: 220 }}>
        <Panel style={zero} title="Theme zero" />
        <Panel style={brand} title="Stress brand — pale yellow accent" />
      </div>
    );
  },
};
