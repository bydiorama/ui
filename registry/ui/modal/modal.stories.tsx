import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Banner } from "@/ui/banner/banner.tsx";
import { Modal } from "./modal.tsx";

const meta = {
  title: "UI/Modal",
  component: Modal,
  parameters: { layout: "centered" },
  // `children` is the compound tree, not a label; every story supplies it
  // through `render`.
  args: { children: null },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The sheet's own composition: title, two fields, Cancel / Create task. */
const NewTask = () => (
  <>
    <Modal.Title>New task</Modal.Title>
    <div className="flex flex-col gap-md">
      <Input label="Task title" isLabelHidden placeholder="Task title" />
      <Input label="Assignee" isLabelHidden placeholder="Assignee" />
    </div>
    <Modal.Footer>
      <Modal.Close render={<Button variant="secondary" size="md">Cancel</Button>} />
      <Button size="md" onClick={fn()}>
        Create task
      </Button>
    </Modal.Footer>
  </>
);

export const Playground: Story = {
  render: () => (
    <Modal onOpenChange={fn()}>
      <Modal.Trigger render={<Button>New task</Button>} />
      <Modal.Surface>
        <NewTask />
      </Modal.Surface>
    </Modal>
  ),
};

/**
 * Every overlay story opens on INTERACTION, never on mount. The cost is that
 * axe only sees the closed state here; the open surface's semantics — role,
 * labelling, focus trap, focus restoration — are covered by the contract
 * browser tests instead.
 */
export const Matrix: Story = {
  render: () => (
    <Modal onOpenChange={fn()}>
      <Modal.Trigger render={<Button>New task</Button>} />
      <Modal.Surface>
        <NewTask />
      </Modal.Surface>
    </Modal>
  ),
};

/** A destructive confirmation: dismissal is deliberate, not incidental. */
export const Destructive: Story = {
  render: () => (
    <Modal isDismissable={false} onOpenChange={fn()}>
      <Modal.Trigger render={<Button variant="danger">Delete project</Button>} />
      <Modal.Surface>
        <Modal.Title>Delete this project?</Modal.Title>
        <Modal.Description>
          Every brief, export and template in it goes too. This cannot be undone.
        </Modal.Description>
        <Banner variant="danger">Three teammates have this project open right now.</Banner>
        <Modal.Footer>
          <Modal.Close render={<Button variant="secondary" size="md">Cancel</Button>} />
          <Modal.Close render={<Button variant="danger" size="md">Delete project</Button>} />
        </Modal.Footer>
      </Modal.Surface>
    </Modal>
  ),
};

/** Long content scrolls inside the surface, not the page behind it. */
export const Scrolling: Story = {
  render: () => (
    <Modal onOpenChange={fn()}>
      <Modal.Trigger render={<Button>Open</Button>} />
      <Modal.Surface size="lg">
        <Modal.Title>Export settings</Modal.Title>
        <div className="flex flex-col gap-md">
          {Array.from({ length: 12 }, (_, i) => (
            <Input key={i} label={`Field ${i + 1}`} placeholder={`Value ${i + 1}`} />
          ))}
        </div>
        <Modal.Footer>
          <Modal.Close render={<Button variant="secondary" size="md">Cancel</Button>} />
          <Button size="md" onClick={fn()}>
            Save
          </Button>
        </Modal.Footer>
      </Modal.Surface>
    </Modal>
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

export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <Modal onOpenChange={fn()}>
          <Modal.Trigger render={<Button>New task</Button>} />
          <Modal.Surface>
            <NewTask />
          </Modal.Surface>
        </Modal>
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
