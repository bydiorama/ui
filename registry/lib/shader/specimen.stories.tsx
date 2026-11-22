import type { Meta, StoryObj } from "@storybook/react-vite";
import { Colors, Home, Image, Layers, Sparks, TextFont } from "griddy-icons";
import { useEffect, type CSSProperties, type ReactNode } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { startShaders } from "@/lib/shader";
import { Badge } from "@/ui/badge/badge.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Card } from "@/ui/card/card.tsx";
import { NavRail } from "@/ui/nav-rail/nav-rail.tsx";

/**
 * A testing specimen for the grounds (ADR 0025) under glass (ADR 0022): one
 * small app window on a moving ground, with every glass tier on it — the
 * NavRail (frame), Cards, Badges and unfilled Buttons (surface) — and the
 * page's copy in the ground's quiet zone.
 *
 * What to look for, in both schemes and under the stress brand:
 *   - no bands in the slow ramps, no creases in the corners;
 *   - the copy bottom left on the exact base, readable at a glance;
 *   - glass that softens the folds behind it and keeps its own ink legible;
 *   - before the runtime draws (or without WebGL), the CSS floor: the base
 *     and a still light in the far corner, no gap.
 */
type Ground = "fold" | "mesh";
type Scheme = "light" | "dark";
type Brand = "theme zero" | "pale yellow";
interface SpecimenArgs {
  ground: Ground;
  scheme: Scheme;
  brand: Brand;
  grain: boolean;
}

const meta = {
  title: "Effects/Specimen",
  parameters: { layout: "padded" },
  decorators: [(Story) => <Shaders>{Story()}</Shaders>],
  argTypes: {
    ground: { control: "inline-radio", options: ["fold", "mesh"] },
    scheme: { control: "inline-radio", options: ["light", "dark"] },
    brand: { control: "inline-radio", options: ["theme zero", "pale yellow"] },
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

function Window({ ground, scheme, brand, grain = false }: { ground: Ground; scheme: Scheme; brand: Brand; grain?: boolean }) {
  return (
    <div style={{ ...BRANDS[brand], colorScheme: scheme }} className="text-ink-primary">
      <div
        className={cn(
          "relative isolate flex aspect-[16/10] min-h-[34rem] gap-lg overflow-clip rounded-2xl p-md",
          grain ? fx(ground, "grain") : fx(ground),
        )}
      >
        {/* Labelled per window: the Matrix puts eight on one page, and two
            navigation landmarks may not share a name. */}
        <NavRail label={`Workspace — ${brand}, ${ground}, ${scheme}`} className={fx("glass")}>
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
                fx("{ground}") · {scheme}
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

          <div className="flex flex-1 items-start justify-end gap-md">
            <Card className={cn("w-72", fx("glass", "edge", "specular"))}>
              <Card.Header subtitle="Brand ground · live">Colour in motion</Card.Header>
              <Card.Body>
                <p className="text-body-sm text-ink-muted">
                  The folds behind this pane are the brand's base and accent, and nothing else. Muted ink on glass clears 4.5:1
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
                <p className="text-body-sm text-ink-muted">Bottom left by default; move it with two tokens.</p>
              </Card.Body>
            </Card>
          </div>

          {/* The page's copy: in the quiet zone, on the exact base. */}
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
        </div>
      </div>
    </div>
  );
}

/** One window; switch the ground, the scheme, the brand and grain from the controls. */
export const Specimen: Story = {
  args: { ground: "fold", scheme: "dark", brand: "theme zero", grain: false },
  render: (args) => <Window {...args} />,
};

/** Both grounds in both schemes, under theme zero and the stress brand: the whole matrix at once. */
export const Matrix: Story = {
  render: () => (
    <div className="grid gap-xl 2xl:grid-cols-2">
      {(["theme zero", "pale yellow"] as const).flatMap((brand) =>
        (["fold", "mesh"] as const).flatMap((ground) =>
          (["light", "dark"] as const).map((scheme) => (
            <div key={`${brand}-${ground}-${scheme}`} className="flex flex-col gap-xs">
              <p className="text-caption text-ink-muted">
                {brand} · {ground} · {scheme}
              </p>
              <Window ground={ground} scheme={scheme} brand={brand} />
            </div>
          )),
        ),
      )}
    </div>
  ),
};
