import { useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { TextSwap } from "./text-swap.tsx";

const meta = {
  title: "UI/TextSwap",
  component: TextSwap,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TextSwap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A Button that cycles through `labels` on each press. */
function Cycling({ labels, variant = "primary", onPress }: { labels: string[]; variant?: "primary" | "secondary"; onPress?: () => void }) {
  const [index, setIndex] = useState(0);
  return (
    <Button
      variant={variant}
      onClick={() => {
        setIndex((i) => (i + 1) % labels.length);
        onPress?.();
      }}
    >
      <TextSwap>{labels[index]!}</TextSwap>
    </Button>
  );
}

/** The sheet's case: press to save, press again to edit. */
export const Playground: Story = {
  args: { children: "Save changes" },
  render: () => <Cycling labels={["Save changes", "Saved"]} onPress={fn()} />,
};

/**
 * The sheet's strips, live: a shrinking swap, a growing one, a sequence that
 * comes back on itself (Save → Saving… → Saved → Save), and a status line in
 * running text. Press quickly to see a swap retarget mid-flight.
 */
export const Matrix: Story = {
  args: { children: "Save changes" },
  render: () => (
    <div className="flex flex-col items-start gap-xl">
      <Cycling labels={["Save changes", "Saved"]} />
      <Cycling labels={["Saved", "Save changes"]} variant="secondary" />
      <Cycling labels={["Save", "Saving…", "Saved"]} />
      <StatusLine />
    </div>
  ),
};

function StatusLine() {
  const steps = ["Queued", "Uploading 3 of 12", "Processing", "Published"];
  const [step, setStep] = useState(0);
  return (
    <div className="flex items-center gap-md">
      <p className="text-body-md text-ink-secondary">
        Josef Müller-Brockmann — Grid systems: <TextSwap className="text-ink-primary">{steps[step]!}</TextSwap>
      </p>
      <Button variant="ghost" onClick={() => setStep((s) => (s + 1) % steps.length)}>
        Next step
      </Button>
    </div>
  );
}

/** The three motion levels, as regions: Reduced cross-fades without the rise; Off is instant. */
export const States: Story = {
  args: { children: "Save changes" },
  render: () => (
    <div className="flex flex-col items-start gap-xl">
      {(["full", "reduced", "off"] as const).map((level) => (
        <section key={level} data-ui-motion={level} className="flex items-center gap-md" aria-label={`Motion ${level}`}>
          <span className="w-24 text-label-sm text-ink-muted">{level}</span>
          <Cycling labels={["Save changes", "Saved"]} />
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
 * Theme zero beside a hostile brand seed (AGENTS.md). TextSwap paints no
 * colour — its words take the Button's ink — so what this checks is that the
 * swap keeps the host's own colours and the width eases the same on a brand
 * Button as on Diorama's.
 */
export const BrandThemed: Story = {
  args: { children: "Save changes" },
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
            <Cycling labels={["Save changes", "Saved"]} />
            <Cycling labels={["Follow", "Following"]} variant="secondary" />
          </div>
        ))}
      </div>
    );
  },
};
