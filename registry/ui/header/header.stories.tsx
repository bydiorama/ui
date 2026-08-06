import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeft, ChevronDown, Grid } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { chromeControl } from "@/lib/chrome-control";
import { Avatar } from "@/ui/avatar/avatar.tsx";
import { Sheet } from "@/ui/sheet/sheet.tsx";
import { Sidebar } from "@/ui/sidebar/sidebar.tsx";
import { Header } from "./header.tsx";

const meta = {
  title: "UI/Header",
  component: Header,
  parameters: { layout: "fullscreen" },
  args: { children: null },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

/*
 * Fragment hrefs, not paths: these are REAL links, so a path would navigate
 * Storybook away from the story demonstrating them.
 */
const Desktop = ({ label = "Primary" }: { label?: string }) => (
  <Header>
    <Header.Start>
      <button type="button" aria-label="Switch brand" className={chromeControl()}><Grid /></button>
      <button type="button" aria-label="Back" className={chromeControl()}><ArrowLeft /></button>
    </Header.Start>
    <Header.Spacer />
    <Header.Nav label={label}>
      <Header.Item href="#agent">Agent</Header.Item>
      <Header.Item trailing={<ChevronDown />}>Create</Header.Item>
      <Header.Item href="#intelligence">Intelligence</Header.Item>
      <Header.Item href="#library" isCurrent>Library</Header.Item>
      <Header.Item trailing={<ChevronDown />}>Work</Header.Item>
      <Header.Item href="#brand">Brand</Header.Item>
    </Header.Nav>
    <Header.Spacer />
    <Header.End>
      <Header.MenuButton label="Open primary navigation" />
      <Avatar name="Mira Vance" size="sm" />
    </Header.End>
  </Header>
);

/** The sheet's mobile bar: leading controls, a spacer, a menu toggle. The nav
 *  row is simply not rendered — which one shows is a layout decision. */
const Mobile = () => (
  <div className="w-80">
    <Header className="px-md">
      <Header.Start>
        <button type="button" aria-label="Switch brand" className={chromeControl()}><Grid /></button>
        <button type="button" aria-label="Back" className={chromeControl()}><ArrowLeft /></button>
      </Header.Start>
      <Header.Spacer />
      <Header.End>
        <Header.MenuButton label="Open primary navigation" />
      </Header.End>
    </Header>
  </div>
);

export const Playground: Story = { render: () => <Desktop /> };

/*
 * Each demo is wrapped in a <section>. A <header> maps to the BANNER landmark
 * only when it is not a descendant of article/aside/main/nav/section — and a
 * document may have exactly one banner, so two bare Headers on one page is an
 * axe `landmark-no-duplicate-banner` violation. The wrapper is what a real
 * page does anyway: one banner at the top, and any other Header is chrome
 * inside a section.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      <section><Desktop /></section>
      <section><Mobile /></section>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      <section>
      <Header>
        <Header.Start>
          <button type="button" aria-label="Switch brand" className={chromeControl()}><Grid /></button>
        </Header.Start>
        <Header.Spacer />
        <Header.Nav label="Nothing current">
          <Header.Item href="#a">Agent</Header.Item>
          <Header.Item href="#b">Library</Header.Item>
        </Header.Nav>
        <Header.Spacer />
        <Header.End>
          <Avatar name="Mira Vance" size="sm" />
        </Header.End>
      </Header>
      </section>
      <section>
      <Header>
        <Header.Nav label="Buttons, not links">
          <Header.Item trailing={<ChevronDown />}>Create</Header.Item>
          <Header.Item trailing={<ChevronDown />}>Work</Header.Item>
        </Header.Nav>
      </Header>
      </section>
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
        {/* Distinct nav names per panel: two landmarks sharing one name is an
            axe `landmark-unique` violation. */}
        <section><Desktop label={`Primary — ${title}`} /></section>
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

/**
 * What the navigation collapses INTO.
 *
 * There is no rail. Below the breakpoint the Sidebar is not narrowed, it is
 * removed, and Header.MenuButton is what remains of it — opening the same
 * Sidebar inside a Sheet. The two are one decision, which is why they belong
 * in one story: a bar with a menu button and no panel behind it is the most
 * common way this pattern ships broken.
 *
 * `Sheet.Trigger render={…}` wires aria-expanded and aria-controls onto the
 * button from the Sheet, so the disclosure state has exactly one source.
 */
export const CollapsesToMenuButton: Story = {
  render: () => (
    <div className="w-80">
      <Sheet>
        <section>
          <Header className="px-md">
            <Header.Start>
              <button type="button" aria-label="Switch brand" className={chromeControl()}><Grid /></button>
              <button type="button" aria-label="Back" className={chromeControl()}><ArrowLeft /></button>
            </Header.Start>
            <Header.Spacer />
            <Header.End>
              <Sheet.Trigger render={<Header.MenuButton label="Open primary navigation" />} />
            </Header.End>
          </Header>
        </section>
        <Sheet.Panel label="Primary navigation">
          <Sidebar label="Primary" className="h-full w-full rounded-none">
            <Sidebar.Section label="Brand" isCollapsible>
              <Sidebar.Item href="#guidelines" isCurrent>Brand Guidelines</Sidebar.Item>
              <Sidebar.Item href="#assets">Assets</Sidebar.Item>
            </Sidebar.Section>
            <Sidebar.Item href="#exports">Exports</Sidebar.Item>
          </Sidebar>
        </Sheet.Panel>
      </Sheet>
    </div>
  ),
};
