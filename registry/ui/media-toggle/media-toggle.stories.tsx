import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { MediaToggle } from "./media-toggle.tsx";

const meta = {
  title: "UI/MediaToggle",
  component: MediaToggle,
  parameters: { layout: "padded" },
  args: {
    pauseLabel: "Pause background video",
    playLabel: "Play background video",
    onPausedChange: fn(),
  },
} satisfies Meta<typeof MediaToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A stand-in frame: a story cannot ship a video file, and the control's
 * contract is the same over any media. Placement is the caller's —
 * bottom-end, inset space-lg.
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-52 w-92 overflow-clip rounded-lg bg-[linear-gradient(135deg,#C9BFB3,#8F8478_55%,#4A433D)]">
      <div className="absolute end-lg bottom-lg">{children}</div>
    </div>
  );
}

export const Playground: Story = {
  render: (args) => (
    <Frame>
      <MediaToggle {...args} />
    </Frame>
  ),
};

/** Playing (shows Pause) and paused (shows Play), at md and lg. */
export const Matrix: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-xl">
      <Frame><MediaToggle {...args} defaultIsPaused={false} /></Frame>
      <Frame><MediaToggle {...args} defaultIsPaused /></Frame>
      <Frame><MediaToggle {...args} defaultIsPaused={false} size="lg" /></Frame>
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

/** THE BRAND-THEME CASE — the media family must follow the brand's resolver too. */
export const BrandThemed: Story = {
  render: (args) => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    return (
      <div className="flex gap-xl">
        {[zero, brand].map((style, i) => (
          <div key={i} style={style as React.CSSProperties} className="rounded-lg bg-base p-xl">
            <p className="pb-md text-caption text-ink-muted">{i === 0 ? "theme zero" : "stress brand"}</p>
            <Frame><MediaToggle {...args} defaultIsPaused={false} /></Frame>
          </div>
        ))}
      </div>
    );
  },
};
