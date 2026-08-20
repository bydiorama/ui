import { useState } from "react";
import type { ReactNode } from "react";
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

/**
 * Tab to it, or rest the pointer on it for 600ms. `defaultIsOpen` in the
 * controls above pins it open without touching the trigger — which is the only
 * state on this component a control can reach, because the rest is timing.
 */
export const Playground: Story = {};

/*
  WHY EVERY PINNED-OPEN STORY BELOW USES `isOpen` AND NOT `defaultIsOpen`.

  Deliberately NOT a doc block: this is a note to whoever edits the file,
  not copy for the docs page.

  Base UI's delay group keeps exactly ONE UNCONTROLLED tooltip open. When a
  second opens, the group calls `onOpenChange(false)` on whichever was open
  before — and its `currentIdRef` lives on the context's module-level DEFAULT
  object, so this happens with or without a `Tooltip.Provider`, and across the
  stories that share the autodocs page.

  The consequence is that N `defaultIsOpen` roots render ONE chip and N-1 empty
  gaps. That is the same defect `matrix.visual.test.tsx` sidesteps by shooting a
  single tooltip, and it is what made this page look broken: every story here is
  a comparison, and a comparison missing every arm but one is not one.

  A CONTROLLED tooltip is not the group's to close — `TooltipRoot` hands `open`
  straight to the behaviour layer, so the group's `onOpenChange(false)` has
  nothing to act on. That is what lets a showcase hold more than one chip on
  screen at once.

  It is a SHOWCASE device, not a recommendation. An app WANTS the singleton —
  two tooltips at once is two answers to a question nobody asked twice — which
  is why nothing in the doc suggests pinning, and why `Playground` is left
  hover-driven: one story on this page has to show what a consumer actually gets.
*/

/**
 * All four sides at once — and the fastest way to see that a chip never covers
 * the control it explains.
 *
 * Pinned open rather than hover-only: four triggers that each need a 600ms
 * dwell is a placement sheet that shows no placement.
 */
export const Matrix: Story = {
  render: () => (
    <Tooltip.Provider>
      {/*
        FIXED-WIDTH SLOTS, not `gap` alone. A chip is anchored to its trigger
        and takes no layout space, so on a plain flex row the `right` chip
        reaches into the next trigger's gap and the four cases read as one
        crowded clump. A slot wider than the widest chip is what keeps each
        case in its own column. `py-4xl` is the same reservation vertically,
        for `top` and `bottom`.
      */}
      <div className="flex items-center px-lg py-4xl">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <div key={side} className="flex w-48 justify-center">
            <Tooltip isOpen>
              <Tooltip.Trigger
                render={
                  <Button variant="ghost" isIconOnly aria-label={`Placed ${side}`} icon={<InfoCircle />} />
                }
              />
              <Tooltip.Content side={side}>{side}</Tooltip.Content>
            </Tooltip>
          </div>
        ))}
      </div>
    </Tooltip.Provider>
  ),
};

/**
 * What the component can be put into from props. Hover intent and the skip
 * window are timing rather than state — the browser test drives those.
 *
 * Only `isDisabled` renders nothing, and that is the point of it: it is pinned
 * open here like the rest and stays shut anyway, which is the whole claim the
 * prop makes.
 */
export const States: Story = {
  render: function StatesStory() {
    /* Caption UNDER the trigger, so the chip above it lands in clean space. */
    function Case({ label, children }: { label: string; children: ReactNode }) {
      return (
        <div className="flex flex-col items-start gap-xs">
          {children}
          <p className="text-caption text-ink-muted">{label}</p>
        </div>
      );
    }

    return (
      <Tooltip.Provider>
        <div className="flex flex-col items-start gap-4xl p-4xl">
          <Case label="isOpen — the caller owns it">
            <Tooltip isOpen>
              <Tooltip.Trigger
                render={
                  <Button variant="secondary" isIconOnly aria-label="Pinned open" icon={<InfoCircle />} />
                }
              />
              <Tooltip.Content>Pinned open</Tooltip.Content>
            </Tooltip>
          </Case>

          <Case label="isDisabled — asked to open, and still shut">
            {/*
              `isOpen` AND `isDisabled` together on purpose. Base UI resolves
              this as `open = !disabled && open`, so disabled wins — which is a
              far stronger demonstration than simply not opening it, because a
              tooltip nobody asked to open proves nothing.
            */}
            <Tooltip isDisabled isOpen>
              <Tooltip.Trigger
                render={
                  <Button variant="secondary" isIconOnly aria-label="Tooltip disabled" icon={<InfoCircle />} />
                }
              />
              <Tooltip.Content>You will never see this</Tooltip.Content>
            </Tooltip>
          </Case>

          <Case label="Long copy — wraps at the 256px measure">
            <Tooltip isOpen>
              <Tooltip.Trigger
                render={<Button variant="secondary" isIconOnly aria-label="Delete" icon={<Trash />} />}
              />
              <Tooltip.Content>
                Removes the file from every brand this workspace owns. It cannot be undone.
              </Tooltip.Content>
            </Tooltip>
          </Case>

          <Case label="align=&quot;start&quot; — pinned to the trigger's left edge">
            <Tooltip isOpen>
              <Tooltip.Trigger render={<Button variant="secondary">A wider trigger</Button>} />
              <Tooltip.Content align="start">Aligned to the start edge</Tooltip.Content>
            </Tooltip>
          </Case>
        </div>
      </Tooltip.Provider>
    );
  },
};

/**
 * The case the sheet gets wrong. A disabled control receives no pointer events
 * and is out of the tab order, so the tooltip on the left never opens; the
 * explanation has to hang off a wrapper the caller owns, as on the right.
 */
export const DisabledTrigger: Story = {
  render: () => (
    <Tooltip.Provider>
      <div className="flex items-start gap-4xl p-4xl">
        <div className="flex flex-col items-center gap-xs">
          {/*
            The ONLY tooltip on this page deliberately left closed. Pinning it
            with `isOpen` would render a chip over a control that can never
            produce one, which is the opposite of what the story says.
          */}
          <Tooltip>
            <Tooltip.Trigger
              render={
                <Button isIconOnly isDisabled aria-label="Delete" icon={<Trash />} />
              }
            />
            <Tooltip.Content>Never opens — the control swallows the events</Tooltip.Content>
          </Tooltip>
          <p className="text-caption text-ink-muted">Bare disabled control — hover it, nothing</p>
        </div>

        <div className="flex flex-col items-center gap-xs">
          <Tooltip isOpen>
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
          <p className="text-caption text-ink-muted">Wrapped in a focusable span — it opens</p>
        </div>
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
 *
 * Both panels are pinned open, which is the only way a SIDE-BY-SIDE says
 * anything: on `defaultIsOpen` the delay group closed the left one and the
 * comparison photographed a single brand chip beside an empty panel.
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
          <Tooltip isOpen>
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
