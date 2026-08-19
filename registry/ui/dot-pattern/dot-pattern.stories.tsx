import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { DotPattern } from "./dot-pattern.tsx";

const meta = {
  title: "UI/DotPattern",
  component: DotPattern,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DotPattern>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The shipped composition: a caller-owned canvas (relative, bg-sunken,
 * clipped) with the grid behind a piece of content — the Creative Editor
 * stage in miniature. The container is the caller's half of the contract;
 * the component only paints dots.
 */
export const Playground: Story = {
  render: () => (
    <div className="relative h-60 overflow-clip rounded-md bg-sunken">
      <DotPattern />
      <div className="absolute top-1/2 left-1/2 h-40 w-64 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-base shadow-xl" />
    </div>
  ),
};

/**
 * The sheet's Geometry section, row for row: one axis at a time against the
 * default (gap 16, dot 2). gap is the pitch between dot centres; dotSize the
 * rendered diameter.
 */
export const Matrix: Story = {
  render: () => {
    const CASES: Array<{ label: string; gap?: number; dotSize?: number }> = [
      { label: "gap 8", gap: 8 },
      { label: "gap 16 · default" },
      { label: "gap 24", gap: 24 },
      { label: "dot 1", dotSize: 1 },
      { label: "dot 4", dotSize: 4 },
    ];
    return (
      <div className="flex max-w-(--ui-measure-prose) flex-col gap-lg">
        {CASES.map(({ label, gap, dotSize }) => (
          <div key={label} className="flex flex-col gap-xs">
            <p className="text-caption text-ink-muted">{label}</p>
            <div className="relative h-16 overflow-clip rounded-md bg-sunken">
              <DotPattern
                {...(gap === undefined ? {} : { gap })}
                {...(dotSize === undefined ? {} : { dotSize })}
              />
            </div>
          </div>
        ))}
      </div>
    );
  },
};

/**
 * The sheet's Colour section: the ink is a token through className, the
 * ground belongs to the container. border-subtle on bg-sunken is the shipped
 * default — deliberately near-invisible grain; border-default is the opt-in
 * when the grid must read at a glance.
 */
export const Colour: Story = {
  render: () => {
    const CASES: Array<{ label: string; canvas: string; pattern?: string }> = [
      { label: "text-edge-subtle on bg-sunken — default", canvas: "bg-sunken" },
      {
        label: "text-edge-default on bg-sunken — strong opt-in",
        canvas: "bg-sunken",
        pattern: "text-edge-default",
      },
      {
        label: "text-edge-subtle on bg-surface — any surface token behind",
        canvas: "border border-edge-subtle bg-surface",
      },
    ];
    return (
      <div className="flex flex-wrap gap-lg">
        {CASES.map(({ label, canvas, pattern }) => (
          <div key={label} className="flex w-80 flex-col gap-xs">
            <div className={`relative h-40 overflow-clip rounded-md ${canvas}`}>
              <DotPattern {...(pattern === undefined ? {} : { className: pattern })} />
            </div>
            <p className="text-caption text-ink-muted">{label}</p>
          </div>
        ))}
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
 * What matters for this component: both the dot ink (border-subtle) and the
 * canvas ground (bg-sunken) are derived roles, so a brand whose neutrals sit
 * close together can dissolve the grid entirely. That is allowed — the grid
 * is declared decorative — but it should be seen here rather than argued
 * about.
 */
export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="relative h-40 overflow-clip rounded-md bg-sunken">
          <DotPattern />
          <div className="absolute top-1/2 left-1/2 h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-base shadow-xl" />
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
