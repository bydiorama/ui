import { useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { Input } from "@/ui/input/input.tsx";
import { SuccessCheck, useShake } from "./feedback.tsx";

const meta = {
  title: "UI/Feedback",
  component: SuccessCheck,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SuccessCheck>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The sheet's case: a code field. The right code is 1234; anything else shakes. */
function CodeForm({ onSubmit }: { onSubmit?: () => void }) {
  const { ref, shake } = useShake<HTMLInputElement>();
  const [code, setCode] = useState("48213");
  const [state, setState] = useState<"idle" | "wrong" | "right">("idle");
  return (
    <form
      className="flex w-72 flex-col items-start gap-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
        if (code === "1234") setState("right");
        else {
          setState("wrong");
          shake();
        }
      }}
    >
      <Input
        ref={ref}
        label="Verification code"
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setState("idle");
        }}
        {...(state === "wrong" ? { errorText: "That code is not right. Check the message and try again." } : {})}
      />
      <div className="flex items-center gap-md">
        <Button type="submit">Verify</Button>
        {state === "right" && (
          <span className="flex items-center gap-xs text-label-md text-ink-primary">
            <SuccessCheck /> Verified
          </span>
        )}
      </div>
    </form>
  );
}

export const Playground: Story = {
  render: () => <CodeForm onSubmit={fn()} />,
};

/** Both one-shots on demand, and the check at three sizes. */
export const Matrix: Story = {
  render: () => {
    function Checks() {
      const [run, setRun] = useState(0);
      return (
        <div className="flex items-center gap-md">
          <Button variant="secondary" onClick={() => setRun((r) => r + 1)}>
            Replay check
          </Button>
          <span key={run} className="flex items-center gap-md text-ink-primary">
            <SuccessCheck />
            <SuccessCheck className="size-5" />
            <SuccessCheck className="size-6 text-ink-primary" />
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start gap-xl">
        <CodeForm />
        <Checks />
      </div>
    );
  },
};

/** The three motion levels: Reduced fades the check in and does not shake; Off shows it at once. */
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-xl">
      {(["full", "reduced", "off"] as const).map((level) => (
        <section key={level} data-ui-motion={level} aria-label={`Motion ${level}`} className="flex flex-col gap-sm">
          <span className="text-label-sm text-ink-muted">{level}</span>
          <CodeForm />
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

/** Theme zero beside a hostile brand seed (AGENTS.md): the check takes the brand's success ink. */
export const BrandThemed: Story = {
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
            <span className="flex items-center gap-xs text-label-md text-ink-primary">
              <SuccessCheck /> Saved
            </span>
          </div>
        ))}
      </div>
    );
  },
};
