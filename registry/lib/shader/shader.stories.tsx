import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { startShaders } from "@/lib/shader";
import { GRADIENT_LOOKS, GRADIENT_PRESETS, type GradientLook } from "@/lib/shader-programs";
import { Button } from "@/ui/button/button.tsx";
import { Input } from "@/ui/input/input.tsx";

/** What an app does once, at its root. Stopped when the story unmounts. */
function Shaders({ children }: { children: ReactNode }) {
  useEffect(() => startShaders(), []);
  return <>{children}</>;
}

/**
 * The optional shader half of the effects layer (ADR 0022, 0025): the
 * gradient — one parametric ground in five looks — and halo, drawn by
 * `startShaders()` on one shared WebGL2 context. Without the runtime, or without WebGL, a ground shows its
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

/** A ground in one look, with any knob set inline — tokens, never props. */
function Ground({ look, tune, children }: { look: GradientLook; tune?: Record<string, string | number>; children?: ReactNode }) {
  const style = { "--ui-fx-gradient-look": look, ...tune } as CSSProperties;
  const top = GRADIENT_PRESETS[look].quietY < 0.5 && !tune?.["--ui-fx-gradient-quiet-y"];
  return (
    <div className={cn("flex aspect-[16/10] flex-col rounded-xl p-lg", top ? "justify-start" : "justify-end", fx("gradient"))} style={style}>
      {children ?? <Copy />}
    </div>
  );
}

/**
 * One effect, five looks, in both schemes. The look is a token
 * (`--ui-fx-gradient-look`); every knob left at `auto` takes the look's own
 * preset — the horizons (rise, dawn) move their quiet zone, and so their
 * copy, into the sky. The
 * copy sits on the exact base there, so the muted line keeps the contrast
 * the token pair was audited at. All are dithered: no bands.
 */
export const Looks: Story = {
  render: () => (
    <div className="grid gap-lg md:grid-cols-2">
      {GRADIENT_LOOKS.flatMap((look) =>
        (["light", "dark"] as const).map((scheme) => (
          <Panel key={`${look}-${scheme}`} scheme={scheme}>
            <p className="text-caption text-ink-muted">
              --ui-fx-gradient-look: {look} · {scheme}
            </p>
            <Ground look={look} />
          </Panel>
        )),
      )}
    </div>
  ),
};

/**
 * The shared knobs, each on its own. Any look takes any of them: angle,
 * sharpness, scale, chroma, intensity, the quiet zone and the edge.
 */
export const Parameters: Story = {
  render: () => {
    const rows: Array<[string, GradientLook, Record<string, string | number>]> = [
      ["sweep · angle 12deg", "sweep", { "--ui-fx-gradient-angle": "12deg" }],
      ["sweep · sharpness 0.9", "sweep", { "--ui-fx-gradient-sharpness": 0.9 }],
      ["fold · scale 1.6", "fold", { "--ui-fx-gradient-scale": 1.6 }],
      ["fold · sharpness 0.15", "fold", { "--ui-fx-gradient-sharpness": 0.15 }],
      ["wash · chroma 1.5", "wash", { "--ui-fx-gradient-chroma": 1.5 }],
      ["wash · intensity 0.5", "wash", { "--ui-fx-gradient-intensity": 0.5 }],
      ["dawn · sharpness 0.85", "dawn", { "--ui-fx-gradient-sharpness": 0.85 }],
      [
        "rise · centred copy, dissolving edge",
        "rise",
        {
          "--ui-fx-gradient-quiet": 0.5,
          "--ui-fx-gradient-quiet-x": 0.5,
          "--ui-fx-gradient-quiet-y": 0.3,
          "--ui-fx-gradient-dissolve": 0.18,
        },
      ],
      ["sweep · no quiet zone (copy belongs on glass)", "sweep", { "--ui-fx-gradient-quiet": 0 }],
    ];
    return (
      <Panel scheme="dark">
        <div className="grid gap-lg md:grid-cols-2">
          {rows.map(([label, look, tune]) => (
            <div key={label} className="flex flex-col gap-xs">
              <p className="text-caption text-ink-muted">{label}</p>
              <Ground look={look} tune={tune}>
                <span />
              </Ground>
            </div>
          ))}
        </div>
      </Panel>
    );
  },
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
 * Theme zero beside a hostile brand (AGENTS.md). The gradient's only palette
 * is the brand's base and accent, read where the ground sits. Darker tones
 * turn their hue away from yellow-green, so pale yellow's shadows go amber,
 * not olive; the copy keeps its contrast either way.
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
            <Ground look={i === 0 ? "wash" : "sweep"} />
          </Panel>
        )),
      )}
    </div>
  ),
};
