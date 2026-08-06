import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { Switch } from "@/ui/switch/switch.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Drawer } from "./drawer.tsx";

const meta = {
  title: "UI/Drawer",
  component: Drawer,
  parameters: { layout: "centered" },
  args: { children: null },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The sheet's own content: a heading, four fields, a consent row, two stacked
 *  actions. Buttons are pill and full width, as drawn. */
const CompleteProfile = () => (
  <>
    <Drawer.Body>
      <Drawer.Title>Complete profile</Drawer.Title>
      <Input label="Full name" placeholder="Steve Ditko" />
      <Input label="Description" placeholder="steve@bydiorama.com" />
      {/* The sheet draws Occupation and Visibility as selects. There is no
          Select in this system yet — Multiselect is the nearest thing and it
          is the wrong shape for one value — so they are Inputs here, and the
          gap is recorded in the doc. */}
      <Input label="Occupation" defaultValue="Illustrator" />
      <Input label="Visibility" defaultValue="Public" />
      <Switch defaultIsChecked>Show email</Switch>
    </Drawer.Body>
    <Drawer.Footer>
      <Button size="md" shape="pill" isFullWidth>Save profile</Button>
      <Drawer.Close render={<Button variant="secondary" size="md" shape="pill" isFullWidth>Cancel</Button>} />
    </Drawer.Footer>
  </>
);

/*
 * Every story opens on INTERACTION, never on mount. An overlay already open at
 * page load covers the docs page it is meant to illustrate, and a `fixed` panel
 * inside a docs cell resolves against the transformed preview rather than the
 * viewport — so the demo would be the wrong size as well as in the way.
 */
export const Playground: Story = {
  render: () => (
    <Drawer>
      <Drawer.Trigger render={<Button>Complete profile</Button>} />
      <Drawer.Panel label="Complete profile">
        <CompleteProfile />
      </Drawer.Panel>
    </Drawer>
  ),
};

export const Matrix: Story = {
  render: () => (
    <Drawer>
      <Drawer.Trigger render={<Button>Complete profile</Button>} />
      <Drawer.Panel label="Complete profile">
        <CompleteProfile />
      </Drawer.Panel>
    </Drawer>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex gap-lg">
      <Drawer>
        <Drawer.Trigger render={<Button variant="secondary">Short content</Button>} />
        <Drawer.Panel label="Delete export">
          <Drawer.Body>
            <Drawer.Title>Delete this export?</Drawer.Title>
          </Drawer.Body>
          <Drawer.Footer>
            <Button variant="danger" size="md" shape="pill" isFullWidth>Delete</Button>
            <Drawer.Close render={<Button variant="secondary" size="md" shape="pill" isFullWidth>Cancel</Button>} />
          </Drawer.Footer>
        </Drawer.Panel>
      </Drawer>

      <Drawer>
        <Drawer.Trigger render={<Button variant="secondary">Overflowing content</Button>} />
        <Drawer.Panel label="Every field">
          <Drawer.Body>
            <Drawer.Title>A body long enough to hit the cap and scroll</Drawer.Title>
            {Array.from({ length: 12 }, (_, i) => (
              <Input key={i} label={`Field ${i + 1}`} placeholder="Value" />
            ))}
          </Drawer.Body>
          <Drawer.Footer>
            <Button size="md" shape="pill" isFullWidth>Save</Button>
          </Drawer.Footer>
        </Drawer.Panel>
      </Drawer>

      <Drawer isDismissable={false}>
        <Drawer.Trigger render={<Button variant="secondary">Escape does nothing</Button>} />
        <Drawer.Panel label="Undismissable" handleLabel="Close without saving">
          <Drawer.Body>
            <Drawer.Title>Escape and the scrim are off</Drawer.Title>
          </Drawer.Body>
          <Drawer.Footer>
            {/* The handle still drags — that is deliberate, and documented. */}
            <Drawer.Close render={<Button size="md" shape="pill" isFullWidth>Done</Button>} />
          </Drawer.Footer>
        </Drawer.Panel>
      </Drawer>
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
      `container` is what makes the panel re-skin. Theme tokens are inherited
      custom properties, so a panel portalled to document.body leaves the themed
      subtree. Held in state rather than a ref: `.current` is null on the first
      render and mutating it does not re-render, so the Portal would read null
      exactly once — on the render that matters.
    */
    const Scope = ({ style, title }: { style: React.CSSProperties; title: string }) => {
      const [scope, setScope] = useState<HTMLDivElement | null>(null);
      return (
        <div ref={setScope} style={style} className="flex-1 rounded-lg bg-base p-xl">
          <p className="pb-md text-caption text-ink-muted">{title}</p>
          <Drawer>
            <Drawer.Trigger render={<Button variant="secondary">Open</Button>} />
            <Drawer.Panel label={`Complete profile — ${title}`} container={scope}>
              <CompleteProfile />
            </Drawer.Panel>
          </Drawer>
        </div>
      );
    };
    return (
      <div className="flex gap-xl">
        <Scope style={zero as React.CSSProperties} title="theme zero" />
        <Scope style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
