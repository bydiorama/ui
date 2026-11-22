import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { startShaders } from "@/lib/shader";
import { Button } from "@/ui/button/button.tsx";
import { Input } from "@/ui/input/input.tsx";

/** What an app does once, at its root. Stopped when the story unmounts. */
function Shaders({ children }: { children: ReactNode }) {
  useEffect(() => startShaders(), []);
  return <>{children}</>;
}

/**
 * The optional shader half of the effects layer (ADR 0022, 0025): the two
 * grounds, mesh and fold, and halo, drawn by `startShaders()` on one shared
 * WebGL2 context. Without the runtime, or without WebGL, a ground shows its
 * CSS floor and a component renders exactly as itself. The specimen that
 * puts glass on a ground is Effects/Specimen.
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

function Copy() {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-title-sm text-ink-primary">Nothing on this board yet</p>
      <p className="text-body-sm text-ink-muted">Drop images here or start from a template.</p>
    </div>
  );
}

/**
 * The two grounds in both schemes. The copy sits in the quiet zone — bottom
 * left by default — where the ground is exactly its base, so the muted line
 * keeps the contrast the token pair was audited at; outside it the light is
 * free to be bright. Both are dithered: a slow ramp never shows bands.
 */
export const Grounds: Story = {
  render: () => (
    <div className="grid gap-lg md:grid-cols-2">
      {(["mesh", "fold"] as const).flatMap((ground) =>
        (["light", "dark"] as const).map((scheme) => (
          <Panel key={`${ground}-${scheme}`} scheme={scheme}>
            <p className="text-caption text-ink-muted">
              fx("{ground}") · {scheme}
            </p>
            <div className={cn("flex aspect-[16/10] flex-col justify-end rounded-xl p-lg", fx(ground))}>
              <Copy />
            </div>
          </Panel>
        )),
      )}
    </div>
  ),
};

/**
 * Tuned by tokens, never by props: the fold's direction and rim, the quiet
 * zone moved to where centred copy sits, and the edge dissolving into the
 * page around it.
 */
export const Tuned: Story = {
  render: () => (
    <div className="grid gap-lg md:grid-cols-2">
      {(["light", "dark"] as const).map((scheme) => (
        <Panel key={scheme} scheme={scheme}>
          <div
            className={cn("flex aspect-[16/10] flex-col items-center justify-center rounded-xl p-lg text-center", fx("fold"))}
            style={
              {
                "--ui-fx-fold-angle": "-12deg",
                "--ui-fx-fold-sharpness": 120,
                "--ui-fx-ground-quiet": 0.5,
                "--ui-fx-ground-quiet-x": 0.5,
                "--ui-fx-ground-quiet-y": 0.5,
                "--ui-fx-ground-dissolve": 0.18,
              } as CSSProperties
            }
          >
            <Copy />
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
 * Theme zero beside a hostile brand (AGENTS.md). The ground's only palette
 * is the brand's base and accent, read where the ground sits; pale yellow
 * on white gives a quiet fold, and the copy keeps its contrast either way.
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
            <div className={cn("flex aspect-[16/10] flex-col justify-end rounded-xl p-lg", fx(i === 0 ? "mesh" : "fold"))}>
              <Copy />
            </div>
          </Panel>
        )),
      )}
    </div>
  ),
};
