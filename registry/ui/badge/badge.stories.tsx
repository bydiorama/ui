import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Badge } from "./badge.tsx";

const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: { layout: "padded" },
  args: { children: "Selected" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS = ["selected", "unselected", "success", "danger"] as const;
const LABELS = { selected: "Selected", unselected: "Unselected", success: "Ready", danger: "Failed" };

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-lg py-sm">
    <span className="w-40 shrink-0 text-caption text-ink-muted">{label}</span>
    <div className="flex flex-wrap items-center gap-md">{children}</div>
  </div>
);

export const Playground: Story = {};

/** Mirrors the sheet's own layout: size × shape across every variant. */
export const Matrix: Story = {
  render: () => (
    <div>
      {(
        [
          ["sm · pill", "sm", "pill"],
          ["sm · rounded", "sm", "rounded"],
          ["md · pill", "md", "pill"],
        ] as const
      ).map(([label, size, shape]) => (
        <Row key={label} label={label}>
          {VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant} size={size} shape={shape}>
              {LABELS[variant]}
            </Badge>
          ))}
        </Row>
      ))}
    </div>
  ),
};

/**
 * The trailing slot. A decorative mark is aria-hidden; anything actionable is
 * a real button carrying its own accessible name — the badge itself stays a
 * label, so removal never becomes a click handler on a span.
 */
export const WithTrailingSlot: Story = {
  render: () => (
    <div>
      <Row label="decorative mark">
        <Badge variant="selected" iconEnd={<ArrowUpRight />}>Selected</Badge>
        <Badge variant="unselected" iconEnd={<ArrowUpRight />}>Unselected</Badge>
      </Row>
      <Row label="md">
        <Badge variant="selected" size="md" iconEnd={<ArrowUpRight />}>Selected</Badge>
        <Badge variant="unselected" size="md" iconEnd={<ArrowUpRight />}>Unselected</Badge>
      </Row>
      <Row label="actionable (real button)">
        <Badge variant="selected" shape="rounded" iconEnd={<Check />}>Active tag</Badge>
        <Badge
          variant="unselected"
          shape="rounded"
          iconEnd={
            <button
              type="button"
              aria-label="Remove Tag"
              onClick={fn()}
              className="flex cursor-pointer items-center justify-center rounded-sm text-ink-muted hover:text-ink-secondary"
            >
              <Close />
            </button>
          }
        >
          Tag
        </Badge>
      </Row>
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

export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex flex-wrap items-center gap-md">
          {VARIANTS.map((v) => (
            <Badge key={v} variant={v}>{LABELS[v]}</Badge>
          ))}
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

// Placeholder marks — real icons come from griddy-icons at the call site.
function ArrowUpRight() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4 8 8 4M8 4H4.5M8 4v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Check() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="m2.5 6 2.5 2.5L9.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Close() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="m3 3 6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
