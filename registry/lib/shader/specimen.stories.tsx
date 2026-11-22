import type { Meta, StoryObj } from "@storybook/react-vite";
import { Colors, Home, Image, Layers, Sparks, TextFont } from "griddy-icons";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { startShaders } from "@/lib/shader";
import { GRADIENT_LOOKS, GRADIENT_PRESETS, type GradientLook } from "@/lib/shader-programs";
import { Badge } from "@/ui/badge/badge.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Card } from "@/ui/card/card.tsx";
import { NavRail } from "@/ui/nav-rail/nav-rail.tsx";

/**
 * A testing specimen for the gradient ground (ADR 0025) under glass
 * (ADR 0022): one small app window on a moving ground, with every glass tier
 * on it — the NavRail (frame), Cards, Badges and unfilled Buttons (surface)
 * — and the page's copy in the ground's quiet zone. The controls are the
 * gradient's own knobs: the look, and the shared parameters every look takes.
 *
 * What to look for, in both schemes and under the stress brand:
 *   - no bands in the slow ramps, no creases in the corners;
 *   - the copy on the exact base, readable at a glance (bottom left; in the
 *     sky, top left, for the horizons — rise and dawn);
 *   - glass that softens the folds behind it and keeps its own ink legible;
 *   - before the runtime draws (or without WebGL), the CSS floor: the base
 *     and a still light in the far corner, no gap.
 */
type Scheme = "light" | "dark";
type Brand = "theme zero" | "pale yellow";
interface SpecimenArgs {
  look: GradientLook;
  scheme: Scheme;
  brand: Brand;
  /** `auto` is the look's own; otherwise degrees. */
  angle: string;
  sharpness: number;
  scale: number;
  chroma: number;
  /** `auto` is the look's own. */
  intensity: string;
  quietZone: boolean;
  grain: boolean;
}

const DEFAULTS: SpecimenArgs = {
  look: "sweep",
  scheme: "dark",
  brand: "theme zero",
  angle: "auto",
  sharpness: 0.5,
  scale: 1,
  chroma: 1,
  intensity: "auto",
  quietZone: true,
  grain: false,
};

const meta = {
  title: "Effects/Specimen",
  parameters: { layout: "padded" },
  decorators: [(Story) => <Shaders>{Story()}</Shaders>],
  argTypes: {
    look: { control: "inline-radio", options: [...GRADIENT_LOOKS] },
    scheme: { control: "inline-radio", options: ["light", "dark"] },
    brand: { control: "inline-radio", options: ["theme zero", "pale yellow"] },
    angle: { control: "select", options: ["auto", "-40", "-28", "-12", "0", "12", "24", "40"] },
    sharpness: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    // The quiet zone follows the look; the toggle only turns it off.
    scale: { control: { type: "range", min: 0.5, max: 2, step: 0.05 } },
    chroma: { control: { type: "range", min: 0, max: 1.8, step: 0.05 } },
    intensity: { control: "select", options: ["auto", "0.4", "0.6", "0.8", "1"] },
    quietZone: { control: "boolean" },
    grain: { control: "boolean" },
  },
} satisfies Meta<SpecimenArgs>;

export default meta;
type Story = StoryObj<SpecimenArgs>;

/** What an app does once, at its root. Stopped when the story unmounts. */
function Shaders({ children }: { children: ReactNode }) {
  useEffect(() => startShaders(), []);
  return <>{children}</>;
}

/** Pale yellow: the brand on which ink is hardest to keep legible (AGENTS.md). */
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
const BRANDS: Record<Brand, CSSProperties> = {
  "theme zero": toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED })) as CSSProperties,
  "pale yellow": toStyleObject(resolveThemePair(PALE)) as CSSProperties,
};

/** The args as the gradient's tokens: a knob at its default is not set at all. */
function tokens(a: SpecimenArgs): CSSProperties {
  const t: Record<string, string | number> = { "--ui-fx-gradient-look": a.look };
  if (a.angle !== "auto") t["--ui-fx-gradient-angle"] = `${a.angle}deg`;
  if (a.sharpness !== 0.5) t["--ui-fx-gradient-sharpness"] = a.sharpness;
  if (a.scale !== 1) t["--ui-fx-gradient-scale"] = a.scale;
  if (a.chroma !== 1) t["--ui-fx-gradient-chroma"] = a.chroma;
  if (a.intensity !== "auto") t["--ui-fx-gradient-intensity"] = a.intensity;
  if (!a.quietZone) t["--ui-fx-gradient-quiet"] = 0;
  return t as CSSProperties;
}

function Window(args: SpecimenArgs) {
  const { look, scheme, brand, grain } = args;
  // A horizon's light is low in the frame, so its copy goes up, into the
  // sky: wherever the look's own quiet zone is (unless the controls move it).
  const copyOnTop = GRADIENT_PRESETS[look].quietY < 0.5;
  const copy = (
    <div className="flex max-w-[440px] flex-col gap-sm">
      <p className="text-title-lg text-ink-primary">Make it yours</p>
      <p className="text-body-md text-ink-muted">
        Start from a template, or drop your own images. Everything you add takes the brand's colours.
      </p>
      <div className="flex gap-sm pt-xs">
        <Button icon={<Sparks />}>Start a board</Button>
        <Button variant="secondary" className={fx("glass", "inner")}>
          Browse templates
        </Button>
      </div>
    </div>
  );
  return (
    <div style={{ ...BRANDS[brand], colorScheme: scheme }} className="text-ink-primary">
      <div
        className={cn(
          "relative isolate flex aspect-[16/10] min-h-[34rem] gap-lg overflow-clip rounded-2xl p-md",
          grain ? fx("gradient", "grain") : fx("gradient"),
        )}
        style={tokens(args)}
      >
        {/* Labelled per window: the Matrix puts eight on one page, and two
            navigation landmarks may not share a name. */}
        <NavRail label={`Workspace — ${brand}, ${look}, ${scheme}`} className={fx("glass")}>
          <NavRail.Section label="Brand">
            <NavRail.Item icon={<Home />} label="Overview" href="#overview" />
            <NavRail.Item icon={<Colors />} label="Colours" href="#colours" isCurrent />
            <NavRail.Item icon={<TextFont />} label="Fonts" href="#fonts" />
            <NavRail.Item icon={<Image />} label="Logos" href="#logos" />
            <NavRail.Item icon={<Layers />} label="Templates" href="#templates" />
          </NavRail.Section>
        </NavRail>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-lg p-md">
          {/* A div, not a <header>: a window inside a page is not its banner. */}
          <div className="flex items-center justify-between gap-md">
            <div className="flex items-center gap-sm">
              <Badge className={fx("glass", "edge")}>Specimen</Badge>
              <Badge variant="info" className={fx("glass", "edge")}>
                {look} · {scheme}
              </Badge>
            </div>
            <div className="flex items-center gap-sm">
              <Button variant="secondary" size="sm" className={fx("glass", "inner")}>
                Share
              </Button>
              <Button variant="secondary" size="sm" className={fx("glass", "inner", "specular")}>
                Export
              </Button>
            </div>
          </div>

          {copyOnTop && copy}
          <div className={cn("flex flex-1 justify-end gap-md", copyOnTop ? "items-end" : "items-start")}>
            <Card className={cn("w-72", fx("glass", "edge", "specular"))}>
              <Card.Header subtitle="Brand ground · live">Colour in motion</Card.Header>
              <Card.Body>
                <p className="text-body-sm text-ink-muted">
                  The light behind this pane is the brand's base and accent, and nothing else. Muted ink on glass clears 4.5:1
                  over anything that passes behind it.
                </p>
              </Card.Body>
              <Card.Footer>
                <Badge variant="success" size="sm" className={fx("glass")}>
                  Dithered
                </Badge>
                <Badge variant="neutral" size="sm" className={fx("glass")}>
                  OKLab
                </Badge>
              </Card.Footer>
            </Card>
            <Card className={cn("hidden w-56 xl:flex", fx("glass", "edge", "inner"))}>
              <Card.Header subtitle="Quiet zone">Copy stays on base</Card.Header>
              <Card.Body>
                <p className="text-body-sm text-ink-muted">Where the copy sits; each look has its own, and two tokens move it.</p>
              </Card.Body>
            </Card>
          </div>

          {/* The page's copy: in the quiet zone, on the exact base. */}
          {!copyOnTop && copy}
        </div>
      </div>
    </div>
  );
}

/** One window; every knob of the gradient is a control. */
export const Specimen: Story = {
  args: DEFAULTS,
  render: (args) => <Window {...args} />,
};

/** Every look in both schemes, under theme zero and the stress brand: the whole matrix at once. */
export const Matrix: Story = {
  render: () => (
    <div className="grid gap-xl 2xl:grid-cols-2">
      {(["theme zero", "pale yellow"] as const).flatMap((brand) =>
        GRADIENT_LOOKS.flatMap((look) =>
          (["light", "dark"] as const).map((scheme) => (
            <div key={`${brand}-${look}-${scheme}`} className="flex flex-col gap-xs">
              <p className="text-caption text-ink-muted">
                {brand} · {look} · {scheme}
              </p>
              <Window {...DEFAULTS} look={look} scheme={scheme} brand={brand} />
            </div>
          )),
        ),
      )}
    </div>
  ),
};
