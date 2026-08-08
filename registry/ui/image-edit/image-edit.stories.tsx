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
import { ImageEdit } from "./image-edit.tsx";

/** A gradient as a data URI — no network, and a real <img>. */
const IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 64" preserveAspectRatio="none">
      <defs><linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="#a5aaf6"/><stop offset="0.5" stop-color="#e0a473"/>
        <stop offset="1" stop-color="#5b5ca8"/>
      </linearGradient></defs>
      <rect width="96" height="64" fill="url(#g)"/>
    </svg>`,
  );

const meta = {
  title: "UI/ImageEdit",
  component: ImageEdit,
  parameters: { layout: "padded" },
  args: { src: IMAGE, alt: "Abstract gradient" },
} satisfies Meta<typeof ImageEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The panel, as a caller assembles it.
 *
 * Not a real Modal here: two of these on one page would be two dialogs, and
 * the story project runs every story through axe. The panel's surface, title
 * and footer are what Modal supplies, so they are stood in for.
 */
const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex w-104 flex-col gap-lg rounded-lg bg-surface p-lg shadow-sm">
    <p className="text-title-md font-display font-medium leading-normal tracking-tight text-ink-primary">
      {title}
    </p>
    {children}
    <div className="flex items-center justify-between gap-md">
      <Button variant="outline" size="sm" onClick={fn()}>Cancel</Button>
      <Button size="sm" onClick={fn()}>Apply</Button>
    </div>
  </div>
);

export const Playground: Story = {
  render: (args) => (
    <Panel title="Adjust image">
      <ImageEdit {...args} />
    </Panel>
  ),
};

/** The sheet's four rows, in its order. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-xl">
      <Panel title="Adjust image">
        <ImageEdit src={IMAGE} alt="Abstract gradient" defaultZoom={128} />
      </Panel>
      <Panel title="Adjust image">
        <ImageEdit src={IMAGE} alt="Abstract gradient" defaultZoom={128} hasRotation />
      </Panel>
      <Panel title="Adjust avatar">
        <ImageEdit src={IMAGE} alt="Abstract gradient" shape="circle" defaultZoom={128} />
      </Panel>
    </div>
  ),
};

/**
 * The cases the sheet does not draw: the extremes of each range, and a
 * rotation already applied.
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-xl">
      <Panel title="Zoomed out — fit">
        <ImageEdit src={IMAGE} alt="Abstract gradient" defaultZoom={100} hasRotation />
      </Panel>
      <Panel title="Zoomed in — 300%">
        <ImageEdit src={IMAGE} alt="Abstract gradient" defaultZoom={300} hasRotation defaultRotation={-12} />
      </Panel>
    </div>
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

/**
 * Theme zero beside a hostile brand seed (AGENTS.md).
 *
 * This is the case the media family exists for. The stage must stay a neutral
 * dark under the pale-yellow seed — painted with `--ui-bg-emphasis`, which is
 * what the sheet draws, it would be #ffe066 and the picture would be judged
 * against bright yellow.
 */
export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Themed = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <ImageEdit src={IMAGE} alt="Abstract gradient" defaultZoom={128} hasRotation />
      </div>
    );
    return (
      <div className="flex gap-xl">
        <Themed style={zero as React.CSSProperties} title="theme zero" />
        <Themed style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
