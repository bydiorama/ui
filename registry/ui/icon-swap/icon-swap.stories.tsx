import { useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Check, Copy, Notification, NotificationOff, PauseCircle, PlayCircle } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { TextSwap } from "@/ui/text-swap/text-swap.tsx";
import { IconSwap } from "./icon-swap.tsx";

const meta = {
  title: "UI/IconSwap",
  component: IconSwap,
  parameters: { layout: "padded" },
} satisfies Meta<typeof IconSwap>;

export default meta;
type Story = StoryObj<typeof meta>;

const COPY = { copy: <Copy />, check: <Check /> };

/** An icon-only Button that copies, then returns to Copy on the next press. */
function CopyButton({ variant = "primary", onPress }: { variant?: "primary" | "secondary" | "ghost"; onPress?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={variant}
      isIconOnly
      aria-label={copied ? "Copied" : "Copy link"}
      icon={<IconSwap icons={COPY} show={copied ? "check" : "copy"} />}
      onClick={() => {
        setCopied((c) => !c);
        onPress?.();
      }}
    />
  );
}

/** The sheet's case: press to copy, press again to return. */
export const Playground: Story = {
  args: { icons: COPY, show: "copy" },
  render: () => <CopyButton onPress={fn()} />,
};

/**
 * The swap in the hosts it lives in: icon-only Buttons in each variant, a
 * play/pause toggle, a mute toggle, and an icon with a TextSwap label —
 * the two components' timings match, so they move as one.
 */
export const Matrix: Story = {
  args: { icons: COPY, show: "copy" },
  render: () => {
    function Playing() {
      const [playing, setPlaying] = useState(false);
      return (
        <Button
          variant="secondary"
          icon={<IconSwap icons={{ play: <PlayCircle />, pause: <PauseCircle /> }} show={playing ? "pause" : "play"} />}
          onClick={() => setPlaying((p) => !p)}
        >
          <TextSwap>{playing ? "Pause" : "Play preview"}</TextSwap>
        </Button>
      );
    }
    function Muted() {
      const [muted, setMuted] = useState(false);
      return (
        <Button
          variant="ghost"
          isIconOnly
          aria-label="Mute notifications"
          aria-pressed={muted}
          icon={<IconSwap icons={{ on: <Notification />, off: <NotificationOff /> }} show={muted ? "off" : "on"} />}
          onClick={() => setMuted((m) => !m)}
        />
      );
    }
    return (
      <div className="flex flex-col items-start gap-xl">
        <div className="flex gap-md">
          <CopyButton />
          <CopyButton variant="secondary" />
          <CopyButton variant="ghost" />
        </div>
        <Playing />
        <Muted />
      </div>
    );
  },
};

/** The three motion levels, as regions: Reduced cross-fades without the scale; Off is instant. */
export const States: Story = {
  args: { icons: COPY, show: "copy" },
  render: () => (
    <div className="flex flex-col items-start gap-xl">
      {(["full", "reduced", "off"] as const).map((level) => (
        <section key={level} data-ui-motion={level} className="flex items-center gap-md" aria-label={`Motion ${level}`}>
          <span className="w-24 text-label-sm text-ink-muted">{level}</span>
          <CopyButton />
        </section>
      ))}
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
 * Theme zero beside a hostile brand seed (AGENTS.md). IconSwap paints no
 * colour — its glyphs are currentColor — so what this checks is that the swap
 * keeps the host's ink on a pale-yellow accent as on Diorama's.
 */
export const BrandThemed: Story = {
  args: { icons: COPY, show: "copy" },
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    return (
      <div className="flex flex-col gap-xl md:flex-row">
        {[
          { style: zero, title: "Theme zero" },
          { style: brand, title: "Stress brand (pale-yellow accent)" },
        ].map(({ style, title }) => (
          <div key={title} style={style as CSSProperties} className="flex flex-1 flex-col items-start gap-md rounded-lg bg-base p-xl">
            <p className="text-caption text-ink-muted">{title}</p>
            <div className="flex gap-md">
              <CopyButton />
              <CopyButton variant="secondary" />
            </div>
          </div>
        ))}
      </div>
    );
  },
};
