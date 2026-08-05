import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Banner } from "@/ui/banner/banner.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Switch } from "@/ui/switch/switch.tsx";
import { Card } from "./card.tsx";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: { layout: "padded" },
  args: { children: null },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mirrors the sheet: header with actions, fields, a banner, a footer. */
export const Matrix: Story = {
  render: () => (
    <div className="w-[420px]">
      <Card>
        <Card.Header
          actions={
            <>
              <Button variant="secondary" size="md">Edit</Button>
              {/* Icon-only takes the glyph in `icon`, not children — the
                  type enforces it so a nameless icon button cannot compile. */}
              <Button
                variant="ghost"
                size="md"
                isIconOnly
                aria-label="Delete section"
                icon={<TrashIcon />}
              />
            </>
          }
        >
          Section options
        </Card.Header>
        <Input label="Label" placeholder="Business cards" />
        <Input label="Description" placeholder="name@bydiorama.com" />
        <Switch defaultIsChecked onCheckedChange={fn()}>Show job title</Switch>
        <Banner>Exports use the template set in Brand profile.</Banner>
        <Card.Footer>
          <Button variant="secondary" size="md" onClick={fn()}>Cancel</Button>
          <Button size="md" onClick={fn()}>Create task</Button>
        </Card.Footer>
      </Card>
    </div>
  ),
};

export const Playground: Story = { ...Matrix };

export const States: Story = {
  render: () => (
    <div className="flex w-[420px] flex-col gap-xl">
      <Card>
        <Card.Header>Title only</Card.Header>
      </Card>
      <Card>
        <Card.Header actions={<Button variant="secondary" size="md">Edit</Button>}>
          A title long enough that it truncates rather than wrapping under the actions
        </Card.Header>
      </Card>
      <Card>
        <Card.Header headingLevel={2}>Heading level 2</Card.Header>
        <Banner variant="danger">Three teammates have this open right now.</Banner>
        <Card.Footer>
          <Button variant="secondary" size="md" onClick={fn()}>Cancel</Button>
          <Button variant="danger" size="md" onClick={fn()}>Delete</Button>
        </Card.Footer>
      </Card>
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
        <Card>
          <Card.Header actions={<Button variant="secondary" size="md">Edit</Button>}>
            Section options
          </Card.Header>
          <Input label="Label" placeholder="Business cards" />
          <Card.Footer>
            <Button variant="secondary" size="md" onClick={fn()}>Cancel</Button>
            <Button size="md" onClick={fn()}>Save</Button>
          </Card.Footer>
        </Card>
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

// Placeholder mark — real icons come from griddy-icons at the call site.
function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.5 9.5h7L12 4" />
    </svg>
  );
}
