import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { cn } from "@/lib/cn";
import { EFFECTS, fx, sweep, type FxName } from "@/lib/fx";
import { Badge } from "@/ui/badge/badge.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Card } from "@/ui/card/card.tsx";
import { Checkbox } from "@/ui/checkbox/checkbox.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { Slider } from "@/ui/slider/slider.tsx";
import { Switch } from "@/ui/switch/switch.tsx";

/**
 * The CSS half of the effects layer (ADR 0022): materials and light applied
 * as a class on a component's root. Every specimen is a shipped component
 * with nothing but `className={fx(…)}` added.
 */
const meta = {
  title: "Effects/Materials",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED })) as CSSProperties;

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
const pale = toStyleObject(resolveThemePair(PALE)) as CSSProperties;

/**
 * Something busy to put glass over: brand-coloured shapes and a line of
 * display text, so the blur has edges to soften. Glass over a flat page is
 * just a tint.
 */
function Backdrop({ children, scheme, theme = zero }: { children: ReactNode; scheme: "light" | "dark"; theme?: CSSProperties }) {
  return (
    <div
      style={{ ...theme, colorScheme: scheme }}
      className="relative isolate flex min-h-96 flex-col justify-end gap-lg overflow-clip rounded-xl bg-base p-lg text-ink-primary"
    >
      {/* The shapes and the line of type sit where the glass will be, so
          the blur has edges to soften and the tint something to hold off. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <p className="absolute top-6 right-8 left-8 text-display-md text-ink-secondary">Grid systems in graphic design</p>
        <div className="absolute top-24 -left-6 size-56 rounded-full bg-(image:--ui-gradient-brand)" />
        <div className="absolute right-4 bottom-6 size-48 rounded-full bg-(image:--ui-gradient-accent)" />
        <div className="absolute bottom-24 left-1/3 size-20 rounded-full bg-accent" />
        <p className="absolute right-8 bottom-10 left-8 text-display-md text-ink-primary">Müller-Brockmann</p>
      </div>
      {children}
    </div>
  );
}

function GlassCard({ effects }: { effects: FxName[] }) {
  return (
    <Card className={fx(...effects)}>
      <Card.Header subtitle="Grid systems · 1961">Josef Müller-Brockmann</Card.Header>
      <Card.Body>
        <p className="text-body-sm text-ink-muted">
          Muted text on glass clears 4.5:1 over anything that passes behind it: the resolver derives the tint per brand.
        </p>
      </Card.Body>
    </Card>
  );
}

const RECIPES: Array<{ label: string; effects: FxName[] }> = [
  { label: "glass", effects: ["glass"] },
  { label: "+ edge", effects: ["glass", "edge"] },
  { label: "+ inner", effects: ["glass", "inner"] },
  { label: "+ specular", effects: ["glass", "specular"] },
  { label: "all, with grain", effects: ["glass", "edge", "inner", "specular", "grain"] },
];

/**
 * Glass and its three modifiers, one recipe per column, in both schemes.
 * The light under text is faint in dark on purpose: white light costs light
 * ink its contrast, and the resolver's dark floor counts it.
 */
export const Glass: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      {(["light", "dark"] as const).map((scheme) => (
        <div key={scheme} className="grid gap-lg md:grid-cols-2 xl:grid-cols-3">
          {RECIPES.map(({ label, effects }) => (
            <div key={label} className="flex flex-col gap-xs">
              <p className="text-caption text-ink-muted">
                {scheme} · {label}
              </p>
              <Backdrop scheme={scheme}>
                <div className="flex gap-sm">
                  <Button variant="secondary" className={fx(...effects.filter((e) => e !== "edge"))}>
                    Templates
                  </Button>
                  <Badge className={fx(...effects)}>Draft</Badge>
                </div>
                <GlassCard effects={effects} />
              </Backdrop>
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};

/**
 * Every CSS effect on every component it lists — the matrix the browser
 * test walks. A component missing from a row is one the effect does not
 * apply to, and `check:fx` keeps EFFECTS honest about that.
 */
export const OnComponents: Story = {
  render: () => {
    const specimens: Record<string, (effects: FxName[]) => ReactNode> = {
      button: (e) => (
        <Button variant={e.includes("glass") || e.includes("inner") || e.includes("specular") ? "secondary" : "primary"} className={fx(...e)}>
          Publish
        </Button>
      ),
      card: (e) => <GlassCard effects={e} />,
      badge: (e) => <Badge className={fx(...e)}>Draft</Badge>,
      switch: (e) => (
        <Switch defaultIsChecked className={fx(...e)}>
          Sync
        </Switch>
      ),
      checkbox: (e) => (
        <Checkbox defaultIsChecked className={fx(...e)}>
          Agree
        </Checkbox>
      ),
      slider: (e) => <Slider label="Grain amount" defaultValue={64} className={fx(...e)} />,
      progress: (e) => <Progress label="Uploading" value={64} className={fx(...e)} />,
      text: (e) => <p className={cn("text-body-md", fx(...e))}>Generating your board…</p>,
    };
    const rows = (Object.keys(EFFECTS) as FxName[]).filter((n) => EFFECTS[n].kind === "css" && !["edge", "inner", "specular"].includes(n));
    return (
      <Backdrop scheme="light">
        <div className="flex flex-col gap-lg">
          {rows.map((name) => (
            <div key={name} className="flex flex-col gap-sm rounded-lg bg-surface p-md">
              <p className="text-label-md text-ink-primary">{name}</p>
              <p className="text-caption text-ink-muted">{EFFECTS[name].job}</p>
              <div className="flex flex-wrap items-center gap-md">
                {EFFECTS[name].on.map((target) => (
                  <div key={target} className="min-w-40">
                    {specimens[target]?.([name])}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Backdrop>
    );
  },
};

/** Sheen's one pass of light, on demand — the moment a value is reached. Never on hover. */
export const Sweep: Story = {
  render: () => (
    <div className="flex items-center gap-md">
      <Button
        className={fx("sheen")}
        onClick={(event) => sweep(event.currentTarget)}
      >
        Save board
      </Button>
      <p className="text-body-sm text-ink-muted">Press to play the sweep. Under reduced motion nothing plays.</p>
    </div>
  ),
};

/**
 * Theme zero beside a hostile brand (AGENTS.md). Glass's tint is derived per
 * brand: pale yellow's inks need a different alpha than theme zero's, and
 * the resolver finds it — nothing here is tuned per brand.
 */
export const BrandThemed: Story = {
  render: () => (
    <div className="grid gap-lg md:grid-cols-2">
      {[
        { label: "theme zero", theme: zero },
        { label: "stress brand — pale yellow accent", theme: pale },
      ].map(({ label, theme }) =>
        (["light", "dark"] as const).map((scheme) => (
          <div key={`${label}-${scheme}`} className="flex flex-col gap-xs">
            <p className="text-caption text-ink-muted">
              {label} · {scheme}
            </p>
            <Backdrop scheme={scheme} theme={theme}>
              <div className="flex flex-wrap items-center gap-sm">
                <Button className={fx("sheen", "grain")}>Publish</Button>
                <Switch defaultIsChecked className={fx("glow")}>
                  Sync
                </Switch>
                <p className={cn("text-body-sm", fx("shimmer"))}>Generating…</p>
              </div>
              <GlassCard effects={["glass", "edge", "inner", "specular", "grain"]} />
            </Backdrop>
          </div>
        )),
      )}
    </div>
  ),
};
