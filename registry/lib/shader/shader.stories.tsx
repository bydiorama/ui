import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { startShaders } from "@/lib/shader";
import { Button } from "@/ui/button/button.tsx";
import { Checkbox } from "@/ui/checkbox/checkbox.tsx";
import { Input } from "@/ui/input/input.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { Slider } from "@/ui/slider/slider.tsx";
import { Switch } from "@/ui/switch/switch.tsx";

/** What an app does once, at its root. Stopped when the story unmounts. */
function Shaders({ children }: { children: ReactNode }) {
  useEffect(() => startShaders(), []);
  return <>{children}</>;
}

/**
 * The optional shader half of the effects layer (ADR 0022): aurora and
 * halo, drawn by `startShaders()` on one shared WebGL2 context. Each
 * specimen is a shipped component with `className={fx(…)}` added; without
 * the runtime, or without WebGL, each renders exactly as the component.
 */
const meta = {
  title: "Effects/Shaders",
  parameters: { layout: "padded" },
  decorators: [(Story) => <Shaders>{Story()}</Shaders>],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED })) as CSSProperties;
const PALE: ThemeSeed = {
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
const pale = toStyleObject(resolveThemePair(PALE)) as CSSProperties;

function Panel({ scheme, theme = zero, children }: { scheme: "light" | "dark"; theme?: CSSProperties; children: ReactNode }) {
  return (
    <div style={{ ...theme, colorScheme: scheme }} className="flex flex-col gap-lg rounded-xl bg-base p-lg text-ink-primary">
      {children}
    </div>
  );
}

/**
 * Aurora on every component it lists. The shader keeps each part's ink at
 * its floor per pixel: the Button's label at 4.5:1, the Switch track and the
 * Progress fill at 3:1. The Slider's fill is drawn on a canvas inserted right
 * after it, so the thumb stays on top.
 */
export const Aurora: Story = {
  render: () => (
    <div className="grid gap-lg md:grid-cols-2">
      {(["light", "dark"] as const).map((scheme) => (
        <Panel key={scheme} scheme={scheme}>
          <div className="flex flex-wrap items-center gap-md">
            <Button className={fx("aurora")}>Publish board</Button>
            <Switch defaultIsChecked className={fx("aurora")}>
              Sync
            </Switch>
            <Checkbox defaultIsChecked className={fx("aurora")}>
              Agree
            </Checkbox>
          </div>
          <Slider label="Grain amount" defaultValue={64} hasValueText className={fx("aurora")} />
          <Progress label="Uploading" value={64} className={fx("aurora", "grain")} />
        </Panel>
      ))}
    </div>
  ),
};

/**
 * A ground: an unslotted surface carrying aurora dissolves toward its edges
 * into the page, and guards the WEAKEST ink placed on it — muted body text.
 */
export const Ground: Story = {
  render: () => (
    <div className="grid gap-lg md:grid-cols-2">
      {(["light", "dark"] as const).map((scheme) => (
        <Panel key={scheme} scheme={scheme}>
          <div className={cn("flex min-h-64 flex-col justify-end gap-xs rounded-xl p-lg", fx("aurora"))}>
            <p className="text-title-sm text-ink-primary">Nothing on this board yet</p>
            <p className="text-body-sm text-ink-muted">Drop images here or start from a template.</p>
          </div>
        </Panel>
      ))}
    </div>
  ),
};

/**
 * Halo: light travelling round a surface that works (a busy Button) or
 * listens (focus within a field). No crisp ring — the focus indicator stays
 * the focus indicator. One lap per --ui-duration-loop.
 */
export const Halo: Story = {
  render: () => (
    <div className="grid gap-lg md:grid-cols-2">
      {(["light", "dark"] as const).map((scheme) => (
        <Panel key={scheme} scheme={scheme}>
          <div className="flex flex-wrap items-center gap-md p-md">
            <Button className={fx("halo")} isBusy>
              Publishing
            </Button>
            <Button variant="secondary" className={fx("halo")}>
              Idle
            </Button>
          </div>
          <div className="p-md">
            <Input label="Ask about the brand" className={fx("halo")} placeholder="Focus me" />
          </div>
        </Panel>
      ))}
    </div>
  ),
};

/**
 * Theme zero beside a hostile brand (AGENTS.md). Every colour the shaders
 * draw is a token read where the part sits; pale yellow's on-accent ink is
 * dark, and the guard holds the label against it instead.
 */
export const BrandThemed: Story = {
  render: () => (
    <div className="grid gap-lg md:grid-cols-2">
      {[zero, pale].map((theme, i) =>
        (["light", "dark"] as const).map((scheme) => (
          <Panel key={`${i}-${scheme}`} scheme={scheme} theme={theme}>
            <p className="text-caption text-ink-muted">
              {i === 0 ? "theme zero" : "stress brand — pale yellow accent"} · {scheme}
            </p>
            <div className="flex flex-wrap items-center gap-md">
              <Button className={fx("aurora")}>Publish board</Button>
              <Switch defaultIsChecked className={fx("aurora")}>
                Sync
              </Switch>
            </div>
            <Progress label="Uploading" value={40} className={fx("aurora")} />
          </Panel>
        )),
      )}
    </div>
  ),
};
