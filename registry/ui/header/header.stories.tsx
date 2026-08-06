import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeft, ChevronDown, Grid, Menu } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Avatar } from "@/ui/avatar/avatar.tsx";
import { Button } from "@/ui/button/button.tsx";
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
      <Button variant="ghost" size="md" isIconOnly aria-label="Switch brand" icon={<Grid />} />
      <Button variant="ghost" size="md" isIconOnly aria-label="Back" icon={<ArrowLeft />} />
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
      <Button variant="ghost" size="md" isIconOnly aria-label="Open menu" icon={<Menu />} />
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
        <Button variant="ghost" size="md" isIconOnly aria-label="Switch brand" icon={<Grid />} />
        <Button variant="ghost" size="md" isIconOnly aria-label="Back" icon={<ArrowLeft />} />
      </Header.Start>
      <Header.Spacer />
      <Header.End>
        <Button variant="ghost" size="md" isIconOnly aria-label="Open menu" icon={<Menu />} />
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
          <Button variant="ghost" size="md" isIconOnly aria-label="Switch brand" icon={<Grid />} />
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
