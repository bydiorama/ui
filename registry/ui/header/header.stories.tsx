import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeft, ChevronDown, Grid } from "griddy-icons";


import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { chromeControl } from "@/lib/chrome-control";
import { Avatar } from "@/ui/avatar/avatar.tsx";
import { Menu } from "@/ui/menu/menu.tsx";
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
      <a href="#home" aria-label="Diorama home" className={chromeControl()}><Grid /></a>
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
      {/*
        A trigger with a panel behind it. The bare MenuButton that used to sit
        here is the anti-pattern this component's own `dont` list names — and
        it was in the story every other story renders.
      */}
      <Menu>
        <Menu.Trigger render={<Header.MenuButton label="Open brand sections" />} />
        <Menu.Panel side="bottom" align="end">
          <Menu.Item render={<a href="#profile" />}>Brand profile</Menu.Item>
          <Menu.Item render={<a href="#guidelines" />}>Brand guidelines</Menu.Item>
          <Menu.Item render={<a href="#templates" />}>Brand templates</Menu.Item>
          <Menu.Separator />
          <Menu.Item render={<a href="#team" />}>Team</Menu.Item>
        </Menu.Panel>
      </Menu>
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
        <a href="#home" aria-label="Diorama home" className={chromeControl()}><Grid /></a>
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
          <a href="#home" aria-label="Diorama home" className={chromeControl()}><Grid /></a>
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
              <a href="#home" aria-label="Diorama home" className={chromeControl()}><Grid /></a>
              <button type="button" aria-label="Back" className={chromeControl()}><ArrowLeft /></button>
            </Header.Start>
            <Header.Spacer />
            <Header.End>
              <Sheet.Trigger render={<Header.MenuButton label="Open primary navigation" />} />
            </Header.End>
          </Header>
        </section>
        {/*
          `side="right"`, because the button that opens it sits in Header.End.
          A drawer that flies in from the opposite edge to the control the user
          just pressed breaks the connection between the two — reported against
          this exact story, where the Sheet's `left` default fought a
          right-hand menu button. The rule is in both docs: the sheet opens
          from the edge its trigger sits on.
        */}
        <Sheet.Panel label="Primary navigation" side="right">
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

/**
 * The affix state, with something to scroll.
 *
 * A scroll container is not set dressing here — it is the story. `affix`
 * pins the bar and the bar decides for itself when it has been scrolled
 * under, so a demo on a page shorter than its own viewport shows a prop that
 * appears to do nothing. The rows below give it a page to float over, and the
 * dark ink in them is deliberately the extreme the affix ground is measured
 * against: `--ui-bg-affix-floor` is the fill over exactly this.
 *
 * Watch the CURRENT item ("Library"). It steps from muted to secondary as the
 * bar affixes, and that is a conformance step, not a flourish — muted
 * measures 3.66:1 on the affix ground in dark, and no alpha closes it.
 */
export const Affix: Story = {
  render: () => (
    <section className="h-96 overflow-y-auto">
      <Header affix>
        <Header.Start>
          <a href="#home" aria-label="Diorama home" className={chromeControl()}><Grid /></a>
        </Header.Start>
        <Header.Spacer />
        <Header.Nav label="Primary">
          <Header.Item href="#agent">Agent</Header.Item>
          <Header.Item href="#intelligence">Intelligence</Header.Item>
          <Header.Item href="#library" isCurrent>Library</Header.Item>
          <Header.Item href="#brand">Brand</Header.Item>
        </Header.Nav>
        <Header.Spacer />
        <Header.End>
          <Avatar name="Mira Vance" size="sm" />
        </Header.End>
      </Header>
      <div className="flex flex-col gap-md p-lg">
        <p className="text-body-sm text-ink-muted">Scroll — the bar takes its ground, its shadow and its hairline.</p>
        {[
          ["Josef Müller-Brockmann", "Grid systems", "1961"],
          ["Ottmar Mergenthaler", "Linotype", "1886"],
          ["Adrian Frutiger", "Univers", "1957"],
          ["Muriel Cooper", "Visible Language Workshop", "1975"],
          ["Wim Crouwel", "New Alphabet", "1967"],
          ["Massimo Vignelli", "Subway signage", "1972"],
          ["Cipe Pineles", "Editorial art direction", "1942"],
          ["Herbert Bayer", "Universal typeface", "1925"],
        ].map(([name, work, year]) => (
          <div key={name} className="flex items-center gap-md rounded-md bg-inverse p-md text-ink-inverse">
            <span className="w-64 shrink-0 text-body-md">{name}</span>
            <span className="flex-1 text-body-sm">{work}</span>
            <span className="text-body-sm tabular-nums">{year}</span>
          </div>
        ))}
      </div>
    </section>
  ),
};
