import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeft, ArrowRight, Close } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { Switch } from "@/ui/switch/switch.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Select, type SelectItem } from "@/ui/select/select.tsx";
import { chromeControl } from "@/lib/chrome-control";
import { Drawer } from "./drawer.tsx";

const meta = {
  title: "UI/Drawer",
  component: Drawer,
  parameters: { layout: "centered" },
  args: { children: null },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The two select fields the sheet draws, using the placeholder set's own
 *  disciplines rather than inventing a vocabulary for a demo. */
const OCCUPATIONS: SelectItem[] = [
  { value: "illustrator", label: "Illustrator" },
  { value: "typography", label: "Asymmetric typography" },
  { value: "grids", label: "Grid systems" },
  { value: "pictograms", label: "Munich pictograms" },
];

const VISIBILITY: SelectItem[] = [
  { value: "public", label: "Public" },
  { value: "team", label: "Team only" },
  { value: "private", label: "Private" },
];

/** The sheet's own content: a heading, four fields, a consent row, two stacked
 *  actions. Buttons are pill and full width, as drawn. */
const CompleteProfile = () => (
  <>
    <Drawer.Body>
      <Drawer.Title>Complete profile</Drawer.Title>
      <Input label="Full name" placeholder="Steve Ditko" />
      <Input label="Description" placeholder="steve@bydiorama.com" />
      {/* Real Selects, as the sheet draws them. They stood in as Inputs while
          Select did not exist; it does, so they no longer do. */}
      <Select label="Occupation" defaultValue="illustrator" items={OCCUPATIONS} />
      <Select label="Visibility" defaultValue="public" items={VISIBILITY} />
      <Switch defaultIsChecked>Show email</Switch>
    </Drawer.Body>
    <Drawer.Footer>
      <Button size="md" shape="full" isFullWidth>Save profile</Button>
      <Drawer.Close render={<Button variant="secondary" size="md" shape="full" isFullWidth>Cancel</Button>} />
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
            <Button variant="danger" size="md" shape="full" isFullWidth>Delete</Button>
            <Drawer.Close render={<Button variant="secondary" size="md" shape="full" isFullWidth>Cancel</Button>} />
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
            <Button size="md" shape="full" isFullWidth>Save</Button>
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
            <Drawer.Close render={<Button size="md" shape="full" isFullWidth>Done</Button>} />
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

/**
 * Two resting heights. Drag the handle, or tap it — the tap steps up and wraps
 * from the tallest back to the shortest, which is what keeps SC 2.5.7 whole
 * for someone who cannot drag.
 */
export const Detents: Story = {
  render: () => (
    <Drawer defaultIsOpen>
      <Drawer.Panel label="Complete profile" snapPoints={[0.5, 0.9]}>
        <div className="flex flex-col gap-lg p-lg">
          <Drawer.Title>Complete profile</Drawer.Title>
          <Input label="Full name" placeholder="Steve Ditko" />
          <Input label="Description" placeholder="steve@bydiorama.com" />
          <Input label="Occupation" placeholder="Illustrator" />
          <Input label="Location" placeholder="New York" />
        </div>
      </Drawer.Panel>
    </Drawer>
  ),
};

/**
 * The composition "Drawer Desktop" draws: the 48px chrome band above the
 * title, back and forward at the leading edge and a close at the trailing one.
 *
 * The band holds chromeControls, not Buttons — a 32px fill with no edge is
 * page chrome and fits none of the five button types (§7b). The drag handle is
 * still above it: it is the affordance for the gesture AND the single-pointer
 * alternative SC 2.5.7 requires, so the band adds to it rather than replacing
 * it. Whether the desktop form drops the handle is in `needsDesign`.
 */
export const WithChromeBand: Story = {
  render: () => (
    <Drawer>
      <Drawer.Trigger render={<Button variant="secondary">Complete profile</Button>} />
      <Drawer.Panel label="Complete profile">
        <Drawer.Header>
          <span className="flex items-center gap-sm">
            <button type="button" aria-label="Back" className={chromeControl()}><ArrowLeft /></button>
            <button type="button" aria-label="Forward" className={chromeControl()}><ArrowRight /></button>
          </span>
          <Drawer.Close render={<button type="button" aria-label="Close" className={chromeControl()}><Close /></button>} />
        </Drawer.Header>
        <CompleteProfile />
      </Drawer.Panel>
    </Drawer>
  ),
};
