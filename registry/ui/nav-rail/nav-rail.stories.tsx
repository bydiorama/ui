import type { Meta, StoryObj } from "@storybook/react-vite";
import { Colors, ExpandSidebar, Home, Image, Layers, Search, Sparks, TextFont, UsersGroup } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { chromeControl } from "@/lib/chrome-control";
import { Avatar } from "@/ui/avatar/avatar.tsx";
import { Sidebar } from "@/ui/sidebar/sidebar.tsx";
import { NavRail } from "./nav-rail.tsx";

const meta = {
  title: "UI/NavRail",
  component: NavRail,
  parameters: { layout: "centered" },
  args: { label: "Primary", children: null },
} satisfies Meta<typeof NavRail>;

export default meta;
type Story = StoryObj<typeof meta>;

/*
 * Fragment hrefs, not paths: these are REAL links, so a path would navigate
 * Storybook away from the story demonstrating them.
 *
 * Every nav landmark on a page needs a DISTINCT name — two sharing one is an
 * axe `landmark-unique` violation, which is what the required `label` exists
 * to prevent and what caught Sidebar's own BrandThemed story.
 */
const Rail = ({ label = "Primary" }: { label?: string }) => (
  <NavRail label={label}>
    <NavRail.Slot>
      <button type="button" aria-label="Expand navigation" className={chromeControl()}>
        <ExpandSidebar />
      </button>
    </NavRail.Slot>
    <NavRail.Section label="Workspace">
      <NavRail.Item icon={<Home />} label="Overview" href="#overview" />
      <NavRail.Item icon={<Sparks />} label="Agent" href="#agent" />
      <NavRail.Item icon={<Search />} label="Search everything" />
    </NavRail.Section>
    <NavRail.Section label="Brand profile">
      <NavRail.Item icon={<Image />} label="Logos" href="#logos" />
      <NavRail.Item icon={<Colors />} label="Colours" href="#colours" isCurrent />
      <NavRail.Item icon={<TextFont />} label="Fonts" href="#fonts" />
      <NavRail.Item icon={<Layers />} label="Templates" href="#templates" />
    </NavRail.Section>
    <NavRail.Section label="Team">
      <NavRail.Item icon={<UsersGroup />} label="Members" href="#members" />
    </NavRail.Section>
    <NavRail.Spacer />
    <NavRail.Slot>
      <Avatar name="Josef Müller-Brockmann" size="sm" />
    </NavRail.Slot>
  </NavRail>
);

export const Playground: Story = { render: () => <Rail /> };

/**
 * The sheet's own layout: the rail, and the rail beside the Sidebar it is an
 * alternative to.
 *
 * They are drawn together because the relationship is the thing a reviewer has
 * to check — the row lane, the fill and the ink have to match across the two,
 * or swapping them in a layout jolts. Neither is a mode of the other (ADR
 * 0016).
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex items-start gap-xl">
      <Rail label="Primary — rail" />
      <Sidebar label="Primary — expanded" className="h-fit">
        <Sidebar.Item href="#overview" icon={<Home />}>Overview</Sidebar.Item>
        <Sidebar.Section label="Brand profile" isCollapsible>
          <Sidebar.Item href="#logos">Logos</Sidebar.Item>
          <Sidebar.Item href="#colours" isCurrent>Colours</Sidebar.Item>
          <Sidebar.Item href="#fonts">Fonts</Sidebar.Item>
        </Sidebar.Section>
      </Sidebar>
    </div>
  ),
};

/**
 * Rest, current and disabled side by side.
 *
 * Hover is not drawable in a static story, and it is the state that matters
 * most here: `--ui-nav-active-bg` is the family's ONLY fill, so a hovered row
 * and the current row paint the same square. The marker is what separates
 * them — see the doc's needsDesign entry for the token that would let the
 * rail ramp instead.
 */
export const States: Story = {
  render: () => (
    <div className="flex items-start gap-xl">
      <NavRail label="Rest only">
        <NavRail.Section label="Rows">
          <NavRail.Item icon={<Home />} label="Overview" href="#a" />
          <NavRail.Item icon={<Colors />} label="Colours" href="#b" />
        </NavRail.Section>
      </NavRail>
      <NavRail label="With a current row">
        <NavRail.Section label="Rows">
          <NavRail.Item icon={<Home />} label="Overview" href="#c" />
          <NavRail.Item icon={<Colors />} label="Colours" href="#d" isCurrent />
        </NavRail.Section>
      </NavRail>
      <NavRail label="With a disabled row">
        <NavRail.Section label="Rows">
          <NavRail.Item icon={<Home />} label="Overview" href="#e" />
          <NavRail.Item icon={<UsersGroup />} label="Members — upgrade required" href="#f" isDisabled />
        </NavRail.Section>
      </NavRail>
      <NavRail label="Actions, not links">
        <NavRail.Section label="Rows">
          <NavRail.Item icon={<Search />} label="Search everything" />
          <NavRail.Item icon={<Sparks />} label="Ask the agent" />
        </NavRail.Section>
      </NavRail>
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
      <div style={style} className="flex-1 bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <Rail label={`Primary — ${title}`} />
      </div>
    );
    return (
      <div className="flex flex-col gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
