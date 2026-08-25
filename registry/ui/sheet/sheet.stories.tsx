import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeft, Close, Menu } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { Checkbox } from "@/ui/checkbox/checkbox.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Sidebar } from "@/ui/sidebar/sidebar.tsx";
import { Sheet } from "./sheet.tsx";

const meta = {
  title: "UI/Sheet",
  component: Sheet,
  parameters: { layout: "centered" },
  args: { children: null },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Disciplines, from the placeholder set — longest first, so a lane breaks where it shows. */
const DISCIPLINES = ["Asymmetric typography", "Grid systems", "New Alphabet", "Univers"];
const MORE_DISCIPLINES = [
  "Munich pictograms", "Subway signage", "Programme design", "Visible Language Workshop",
  "Editorial art direction", "Universal typeface", "Movable type", "Frequency hopping",
];

/**
 * The drawer as the design composes it: a Sidebar filling the panel, its own
 * header band holding the back and close controls. `w-full rounded-none` on
 * the rail because the panel already provides both — the rail's w-nav and
 * rounded-lg are for a docked rail on a wide screen.
 */
const Nav = () => (
  <Sidebar label="Brand workspace" className="h-full w-full rounded-none">
    <Sidebar.Group>
      <Button variant="ghost" size="sm" isIconOnly aria-label="Back" icon={<ArrowLeft />} />
      <Sheet.Close render={<Button variant="ghost" size="sm" isIconOnly aria-label="Close menu" icon={<Close />} />} />
    </Sidebar.Group>
    <Sidebar.Section label="Brand" isCollapsible>
      <Sidebar.Item href="#guidelines" isCurrent>Brand Guidelines</Sidebar.Item>
      <Sidebar.Item href="#assets">Assets</Sidebar.Item>
      <Sidebar.Item href="#templates">Templates</Sidebar.Item>
    </Sidebar.Section>
    <Sidebar.Section label="Most recent">
      <Sidebar.Item href="#logo-refresh">Logo refresh</Sidebar.Item>
      <Sidebar.Item href="#q3-campaign">Q3 campaign</Sidebar.Item>
    </Sidebar.Section>
  </Sidebar>
);

/*
 * Every story opens on INTERACTION, never on mount. An overlay that is already
 * open when the page loads covers the docs page it is meant to illustrate, and
 * a `fixed` panel in a docs cell resolves against the transformed preview
 * rather than the viewport — so the demo would also be the wrong size.
 */
export const Playground: Story = {
  render: () => (
    <Sheet>
      <Sheet.Trigger render={<Button isIconOnly aria-label="Open menu" icon={<Menu />} />} />
      <Sheet.Panel label="Primary navigation">
        <Nav />
      </Sheet.Panel>
    </Sheet>
  ),
};

export const Matrix: Story = {
  render: () => (
    <div className="flex gap-lg">
      <Sheet>
        <Sheet.Trigger render={<Button variant="secondary">From the left</Button>} />
        <Sheet.Panel label="Primary navigation">
          <Nav />
        </Sheet.Panel>
      </Sheet>
      <Sheet>
        <Sheet.Trigger render={<Button variant="secondary">From the right</Button>} />
        <Sheet.Panel label="Account" side="right">
          <Nav />
        </Sheet.Panel>
      </Sheet>
    </div>
  ),
};

/**
 * The three width caps, drawn with the composition each exists for — the
 * sheet's own axis. `sm` is the default and is the geometry Sheet has always
 * shipped, so nothing that already renders moved when the axis was added.
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex gap-lg">
      <Sheet>
        <Sheet.Trigger render={<Button variant="secondary">sm · 272 · navigation</Button>} />
        <Sheet.Panel label="Primary navigation">
          <Nav />
        </Sheet.Panel>
      </Sheet>
      <Sheet>
        <Sheet.Trigger render={<Button variant="secondary">md · 416 · filters</Button>} />
        <Sheet.Panel label="Filters" side="right" size="md">
          <Sheet.Header className="justify-end">
            <Sheet.Close render={<Button variant="ghost" size="sm" isIconOnly aria-label="Close filters" icon={<Close />} />} />
          </Sheet.Header>
          <Sheet.Body>
            <Sheet.Title>Filters</Sheet.Title>
            {DISCIPLINES.map((d) => (
              <Checkbox key={d} defaultIsChecked={d === "Grid systems"}>{d}</Checkbox>
            ))}
          </Sheet.Body>
          <Sheet.Footer>
            <Button>Show 24 results</Button>
            <Button variant="secondary">Clear all</Button>
          </Sheet.Footer>
        </Sheet.Panel>
      </Sheet>
      <Sheet>
        <Sheet.Trigger render={<Button variant="secondary">lg · 640 · a record</Button>} />
        <Sheet.Panel label="Josef Müller-Brockmann" side="right" size="lg">
          <Sheet.Header>
            <Button variant="ghost" size="sm" isIconOnly aria-label="Back" icon={<ArrowLeft />} />
            <Sheet.Close render={<Button variant="ghost" size="sm" isIconOnly aria-label="Close" icon={<Close />} />} />
          </Sheet.Header>
          <Sheet.Body>
            <Sheet.Title>Josef Müller-Brockmann</Sheet.Title>
            <div className="flex gap-md">
              <Input label="Discipline" defaultValue="Grid systems" className="flex-1" />
              <Input label="Year" defaultValue="1961" className="w-40" />
            </div>
            <Input label="Email" placeholder="josef@diorama.example" />
          </Sheet.Body>
          <Sheet.Footer>
            <Button>Save changes</Button>
            <Button variant="secondary">Discard</Button>
          </Sheet.Footer>
        </Sheet.Panel>
      </Sheet>
    </div>
  ),
};

/**
 * The state a static specimen usually skips. The body is the only region that
 * scrolls; the band and the action row hold their positions and each gains a
 * hairline once there is content behind it. Scroll the panel to see both.
 */
export const Scrolled: Story = {
  render: () => (
    <Sheet>
      <Sheet.Trigger render={<Button variant="secondary">Open a long panel</Button>} />
      <Sheet.Panel label="Filters" side="right" size="md">
        <Sheet.Header className="justify-end">
          <Sheet.Close render={<Button variant="ghost" size="sm" isIconOnly aria-label="Close filters" icon={<Close />} />} />
        </Sheet.Header>
        <Sheet.Body>
          <Sheet.Title>Filters</Sheet.Title>
          {[...DISCIPLINES, ...MORE_DISCIPLINES].map((d) => (
            <Checkbox key={d}>{d}</Checkbox>
          ))}
        </Sheet.Body>
        <Sheet.Footer>
          <Button>Show 24 results</Button>
          <Button variant="secondary">Clear all</Button>
        </Sheet.Footer>
      </Sheet.Panel>
    </Sheet>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex gap-lg">
      <Sheet>
        <Sheet.Trigger render={<Button variant="secondary">Dismissable</Button>} />
        <Sheet.Panel label="Dismissable navigation">
          <Nav />
        </Sheet.Panel>
      </Sheet>
      <Sheet isDismissable={false}>
        <Sheet.Trigger render={<Button variant="secondary">Escape does nothing</Button>} />
        <Sheet.Panel label="Undismissable navigation">
          <Sidebar label="Undismissable" className="h-full w-full rounded-none">
            <Sidebar.Group>
              <Sheet.Close render={<Button variant="secondary" size="sm">Done</Button>} />
            </Sidebar.Group>
            <Sidebar.Item href="#a">Only the button closes this</Sidebar.Item>
          </Sidebar>
        </Sheet.Panel>
      </Sheet>
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

    /*
      `container` is the whole point of this story. Theme tokens are inherited
      custom properties, so a panel portalled to document.body leaves the
      themed subtree and paints theme zero — a drawer that stays Diorama-blue
      inside a client's yellow portal. Handing the panel its own themed
      wrapper puts it back in the inheritance chain.

      The ref is held in state, not a plain ref: a ref's `.current` is null on
      the first render and mutating it does not re-render, so the Portal would
      read null and fall back to the body exactly once — on the render that
      matters.
    */
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => {
      const [scope, setScope] = useState<HTMLDivElement | null>(null);
      return (
        <div ref={setScope} style={style} className="flex-1 rounded-lg bg-base p-xl">
          <p className="pb-md text-caption text-ink-muted">{title}</p>
          <Sheet>
            <Sheet.Trigger render={<Button variant="secondary">Open</Button>} />
            <Sheet.Panel label={`Navigation — ${title}`} container={scope}>
              <Nav />
            </Sheet.Panel>
          </Sheet>
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
