import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ChevronDownSmall } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { chromeControl } from "@/lib/chrome-control";
import { Fade, type FadeGround, type FadeSide, type FadeSize } from "./fade.tsx";

const meta = {
  title: "UI/Fade",
  component: Fade,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Fade>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Placeholder copy long enough to overflow every frame it is put in. */
const COPY =
  "The New Typography rejected centred composition outright. Tschichold argued in 1928 that the page is a field of forces, not a pediment: asymmetry is what lets hierarchy carry meaning, because an axis that never varies can never emphasise. The essays collected here trace that argument from the Bauhaus circulars through the Penguin composition rules, and what the recantation of 1946 actually conceded.";

/**
 * The sheet's anatomy card: a document preview clipped mid-paragraph, the
 * band dissolving the cut, and the caller-composed action slot — the shipped
 * 32px chrome control — sitting past the solid end of the ramp. The container
 * is the caller's half of the contract; the component only paints.
 */
export const Playground: Story = {
  render: () => (
    <div className="relative h-54 w-140 max-w-full overflow-clip rounded-md border border-edge-subtle bg-base">
      <div className="flex flex-col gap-md p-xl">
        <p className="text-title-md text-ink-primary">
          Case study: Jan Tschichold — asymmetric typography
        </p>
        <p className="text-body-md text-ink-secondary">{COPY}</p>
      </div>
      <Fade ground="base" size="lg" />
      <button
        type="button"
        aria-label="Show more"
        onClick={fn()}
        className={chromeControl("absolute right-xl bottom-md")}
      >
        <ChevronDownSmall />
      </button>
    </div>
  ),
};

/**
 * The sheet's own axes, row for row: Sides (02), Depth (03), Grounds (04) —
 * laid out the way the sheet draws them so visual diffing is like-for-like.
 */
export const Matrix: Story = {
  render: () => {
    const SIDES: FadeSide[] = ["top", "bottom", "left", "right"];
    const SIZES: Array<{ size: FadeSize; label: string }> = [
      { size: "sm", label: "sm — 16px (space-lg)" },
      { size: "md", label: "md — 32px (space-2xl) · default" },
      { size: "lg", label: "lg — 64px (space-4xl)" },
    ];
    const GROUNDS: Array<{ ground: FadeGround; canvas: string }> = [
      { ground: "base", canvas: "bg-base" },
      { ground: "surface", canvas: "bg-surface" },
      { ground: "elevated", canvas: "bg-elevated" },
      { ground: "sunken", canvas: "bg-sunken" },
    ];
    const Card = ({ canvas, children }: { canvas?: string; children: React.ReactNode }) => (
      <div
        className={`relative h-36 w-60 shrink-0 overflow-clip rounded-md border border-edge-subtle ${canvas ?? "bg-base"}`}
      >
        <p className="p-lg text-body-sm text-ink-secondary">{COPY}</p>
        {children}
      </div>
    );
    return (
      <div className="flex flex-col gap-xl">
        <div className="flex flex-wrap gap-lg">
          {SIDES.map((side) => (
            <div key={side} className="flex flex-col gap-xs">
              <Card>
                <Fade side={side} ground="base" />
              </Card>
              <p className="text-caption text-ink-muted">side={side}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-lg">
          {SIZES.map(({ size, label }) => (
            <div key={size} className="flex flex-col gap-xs">
              <Card>
                <Fade size={size} ground="base" />
              </Card>
              <p className="text-caption text-ink-muted">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-lg">
          {GROUNDS.map(({ ground, canvas }) => (
            <div key={ground} className="flex flex-col gap-xs">
              <Card canvas={canvas}>
                <Fade ground={ground} />
              </Card>
              <p className="text-caption text-ink-muted">ground={ground}</p>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

/**
 * The two states the sheet draws (04, at-edge) plus the caller wiring the
 * component deliberately does not own: isVisible bound to overflow, hidden
 * the moment the box is scrolled flush to that edge. The band keeps its box
 * either way — toggling never reflows — and the change is opacity on the
 * motion tokens.
 */
export const States: Story = {
  render: () => {
    const ScrollBound = () => {
      const [atEnd, setAtEnd] = useState(false);
      return (
        <div className="relative overflow-clip rounded-md border border-edge-subtle bg-surface">
          {/* The scroll IS the fade's disclosure route, so it must be
              keyboard-reachable (SC 2.1.1; axe scrollable-region-focusable):
              role, name and tabIndex together, while it scrolls. */}
          <div
            role="region"
            aria-label="Case study preview"
            tabIndex={0}
            className="h-36 w-60 overflow-y-auto p-lg"
            onScroll={(event) => {
              const el = event.currentTarget;
              setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
            }}
          >
            <p className="text-body-sm text-ink-secondary">{COPY}</p>
          </div>
          <Fade isVisible={!atEnd} />
        </div>
      );
    };
    return (
      <div className="flex flex-wrap gap-lg">
        <div className="flex flex-col gap-xs">
          <div className="relative h-36 w-60 overflow-clip rounded-md border border-edge-subtle bg-surface">
            <p className="p-lg text-body-sm text-ink-secondary">{COPY}</p>
            <Fade />
          </div>
          <p className="text-caption text-ink-muted">visible — content continues</p>
        </div>
        <div className="flex flex-col gap-xs">
          <div className="relative h-36 w-60 overflow-clip rounded-md border border-edge-subtle bg-surface">
            <p className="p-lg text-body-sm text-ink-secondary">
              The letter S arrived where no wire ran — the entire proof. Scrolled flush to the
              end: nothing continues, so nothing fades.
            </p>
            <Fade isVisible={false} />
          </div>
          <p className="text-caption text-ink-muted">at the edge — fade hidden</p>
        </div>
        <div className="flex flex-col gap-xs">
          <ScrollBound />
          <p className="text-caption text-ink-muted">scroll-bound — the caller's wiring</p>
        </div>
      </div>
    );
  },
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
 * Theme zero beside a hostile brand seed (AGENTS.md).
 *
 * What matters for this component: both ends of the ramp are ONE derived bg
 * role at two alphas, so whatever a brand does to its surfaces, the fade
 * dissolves into exactly the ground it sits on — there is no second colour to
 * drift. A brand that breaks this has broken its own surface scale first.
 */
export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        {/* The text measure is FIXED (w-96 inside the clip) so the copy
            overflows the 96px clip at any panel width. The first version let
            the paragraph fill a flex-1 panel: on a wide viewport it wrapped
            into fewer lines than the clip held, nothing sat under the band,
            and the fade read as missing — a fade over empty ground is
            invisible by definition, which is the demo failing, not the
            component. */}
        <div className="relative max-w-fit overflow-clip rounded-lg bg-elevated">
          <div className="relative h-24 overflow-clip px-lg pt-lg">
            <p className="w-96 text-body-md text-ink-primary">{COPY}</p>
            <Fade ground="elevated" />
          </div>
          <button
            type="button"
            onClick={fn()}
            className="cursor-pointer px-lg pt-xs pb-md text-left text-body-sm text-ink-primary"
          >
            Show more
          </button>
        </div>
      </div>
    );
    return (
      <div className="flex gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
