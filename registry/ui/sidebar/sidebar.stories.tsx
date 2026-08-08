import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeft, Close, Search } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Avatar } from "@/ui/avatar/avatar.tsx";
import { Badge } from "@/ui/badge/badge.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { Sidebar } from "./sidebar.tsx";

const meta = {
  title: "UI/Sidebar",
  component: Sidebar,
  parameters: { layout: "padded" },
  args: { label: "Primary", children: null },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mirrors the sheet's Nav Rail Level 2: sections with second-level rows. */
/*
 * Fragment hrefs, not paths: these are REAL links, so a path would navigate
 * Storybook away from the story it is demonstrating. Keeping them real is the
 * point of the component — a story must not fake the element to stay put.
 */
const Rail = ({ label = "Primary" }: { label?: string }) => (
  <Sidebar label={label}>
    <Sidebar.Section label="Brand" isCollapsible>
      <Sidebar.Item href="#brand-concept">Brand Concept</Sidebar.Item>
      <Sidebar.Item href="#brand-development">Brand Development</Sidebar.Item>
      <Sidebar.Item href="#brand-guidelines" isCurrent>Brand Guidelines</Sidebar.Item>
      <Sidebar.Item href="#brand-strategy">Brand Strategy</Sidebar.Item>
      <Sidebar.Item href="#brand-stationery">Stationery</Sidebar.Item>
    </Sidebar.Section>
    <Sidebar.Item href="#exports" trailing={<Badge>3</Badge>}>Exports</Sidebar.Item>
    <Sidebar.Item href="#templates">Templates</Sidebar.Item>
    <Sidebar.Section label="Most recent">
      <Sidebar.Item href="#settings-team">Team</Sidebar.Item>
      <Sidebar.Item href="#settings-billing">Billing</Sidebar.Item>
    </Sidebar.Section>
  </Sidebar>
);

export const Playground: Story = { render: () => <Rail /> };
export const Matrix: Story = { render: () => <Rail /> };

/**
 * The sheet's mobile composition, and the reason a row is a SLOT rather than a
 * link: the header band holds two controls, one row holds a search field and
 * the last holds a progress bar. None of those are navigation, and forcing
 * them through a link API would mean an <a> wrapping a form control.
 */
/**
 * The two layers the sheet draws: the navigation, and the profile screen the
 * profile row leads to. The second REPLACES the first — on the narrow screen
 * this rail lives on, a panel over a panel is two surfaces where the drawing
 * has one.
 */
export const TwoLayers: Story = {
  render: () => (
    <div className="h-[640px] w-nav">
      <Sidebar label="Primary" className="h-full">
        <Sidebar.Main>
          <Sidebar.Profile
            name="Jakub Otcenas"
            email="jakub@bydiorama.com"
            layer="profile"
            avatar={<Avatar name="Jakub Otcenas" size="sm" />}
          />
          <Sidebar.Item href="#agent">Agent</Sidebar.Item>
          <Sidebar.Section label="Create" isCollapsible>
            <Sidebar.Item href="#overview">Overview</Sidebar.Item>
            <Sidebar.Item href="#logos">Logos</Sidebar.Item>
            <Sidebar.Item href="#colors">Colors</Sidebar.Item>
          </Sidebar.Section>
          <Sidebar.Item href="#intelligence">Intelligence</Sidebar.Item>
          <Sidebar.Item href="#library">Library</Sidebar.Item>
          <Sidebar.Item href="#work">Work</Sidebar.Item>
        </Sidebar.Main>

        <Sidebar.Layer id="profile" title="Profile Settings" backLabel="Back to navigation">
          <Sidebar.Heading>Select brand</Sidebar.Heading>
          <Sidebar.Search label="Search brands" />
          <Sidebar.Item href="#diorama">Diorama</Sidebar.Item>
          <Sidebar.Item href="#prosight">Prosight</Sidebar.Item>
          <Sidebar.Item href="#ohpen" isCurrent>Ohpen</Sidebar.Item>
          <Sidebar.Item href="#gerulata">Gerulata</Sidebar.Item>
          <Sidebar.Item href="#barani">BARANI</Sidebar.Item>
          <Sidebar.Spacer />
          <Sidebar.Item href="#admin">Admin</Sidebar.Item>
          <Sidebar.Item href="#signout">Signout</Sidebar.Item>
        </Sidebar.Layer>
      </Sidebar>
    </div>
  ),
};

/** The rail's own controls: a search field, a slot holding a Button. */
export const SearchAndSlots: Story = {
  render: () => (
    <div className="h-[420px] w-nav">
      <Sidebar label="Primary" className="h-full">
        <Sidebar.Main>
          <Sidebar.Search label="Search the workspace" />
          <Sidebar.Heading>Most recent</Sidebar.Heading>
          <Sidebar.Item href="#a">What&apos;s our primary colour in CMYK</Sidebar.Item>
          <Sidebar.Item href="#b">Please create a LinkedIn carousel post</Sidebar.Item>
          <Sidebar.Spacer />
          <Sidebar.Slot>
            <Button size="md" isFullWidth>New chat</Button>
          </Sidebar.Slot>
        </Sidebar.Main>
      </Sidebar>
    </div>
  ),
};

export const Slots: Story = {
  render: () => (
    <div className="h-[36rem] w-fit">
      <Sidebar label="Brand workspace" className="h-full">
        <Sidebar.Group>
          <Button variant="ghost" size="sm" isIconOnly aria-label="Back" icon={<ArrowLeft />} />
          <Button variant="ghost" size="sm" isIconOnly aria-label="Close menu" icon={<Close />} />
        </Sidebar.Group>

        <Sidebar.Item>
          <Input label="Search" isLabelHidden size="sm" placeholder="Search" icon={<Search />} className="w-full" />
        </Sidebar.Item>

        <Sidebar.Section label="Brand" isCollapsible>
          <Sidebar.Item href="#guidelines" isCurrent>Brand Guidelines</Sidebar.Item>
          <Sidebar.Item href="#assets">Assets</Sidebar.Item>
        </Sidebar.Section>

        <Sidebar.Section label="Most recent">
          <Sidebar.Item href="#logo-refresh">Logo refresh</Sidebar.Item>
          <Sidebar.Item href="#q3-campaign">Q3 campaign</Sidebar.Item>
        </Sidebar.Section>

        <Sidebar.Spacer />

        <Sidebar.Item>
          <Progress label="Storage used" value={62} hasValueText size="sm" className="w-full" />
        </Sidebar.Item>
      </Sidebar>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex gap-xl">
      <Sidebar label="Nothing current">
        <Sidebar.Item href="#a">Resting</Sidebar.Item>
        <Sidebar.Item href="#b">Also resting</Sidebar.Item>
      </Sidebar>
      <Sidebar label="A section that is not a page">
        <Sidebar.Section label="Settings">
          <Sidebar.Item href="#settings-team" isCurrent>Team</Sidebar.Item>
        </Sidebar.Section>
      </Sidebar>
      <Sidebar label="Collapsed to start">
        <Sidebar.Section label="Brand" isCollapsible defaultIsOpen={false}>
          <Sidebar.Item href="#a">Hidden until opened</Sidebar.Item>
        </Sidebar.Section>
        <Sidebar.Item href="#b" trailing={<Badge>12</Badge>}>With a count</Sidebar.Item>
        <Sidebar.Item href="#c">A label long enough that it truncates rather than wrapping</Sidebar.Item>
        <Sidebar.Item href="#d" isDisabled>Unavailable</Sidebar.Item>
      </Sidebar>
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
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        {/*
          Distinct labels per panel: two <nav> landmarks sharing a name is an
          axe `landmark-unique` violation, and the a11y gate caught this story
          doing exactly what the `label` prop exists to prevent.
        */}
        <Rail label={`Primary — ${title}`} />
      </div>
    );
    return (
      <div className="flex gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
