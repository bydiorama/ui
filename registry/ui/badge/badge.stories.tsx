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

const VARIANTS = ["selected", "unselected", "neutral", "success", "danger", "warning"] as const;
const LABELS = {
  selected: "Selected",
  unselected: "Unselected",
  // Categorical data with no intent — the commonest badge in an admin table.
  neutral: "Consulting",
  success: "Ready",
  danger: "Failed",
  warning: "Warning",
};

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
          ["sm · full", "sm", "full"],
          ["sm · soft", "sm", "soft"],
          ["md · full", "md", "full"],
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
        <Badge variant="selected" shape="soft" iconEnd={<Check />}>Active tag</Badge>
        <Badge
          variant="unselected"
          shape="soft"
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

/**
 * Where the neutral variant actually lives: an admin table's category columns.
 *
 * The composition matters, not the swatch. A badge in a table sits on a
 * `bg-surface` row inside a `bg-elevated` mat — one step further from the page
 * than the panels every other story mounts on — and `neutral`'s `bg-sunken`
 * fill measures 1.188:1 against that row in light but only 1.098:1 in dark,
 * where the tinted status variants sit at 1.201 and 1.629. Drawn side by side
 * in both schemes so the difference is a thing you look at rather than a
 * number in a doc. See the doc's needsDesign.
 */
export const InATableRow: Story = {
  render: () => {
    const ROWS = [
      { name: "ssleek", industry: "Technology", type: "Startup", state: "Ready" },
      { name: "Everkind", industry: "Consulting", type: "Scale-up", state: "Failed" },
      { name: "nurossi", industry: "Manufacturing", type: "Enterprise", state: "Warning" },
    ] as const;
    const STATE = { Ready: "success", Failed: "danger", Warning: "warning" } as const;
    const Table = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      // `bg-base` on the themed wrapper, not just the tokens: a scheme-pinned
      // subtree with no ground of its own puts dark ink on the story's white
      // page, which is a contrast failure the story invents rather than one
      // the component has.
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="rounded-lg border border-edge-subtle bg-elevated p-xs">
          {ROWS.map((row, i) => (
            <div
              key={row.name}
              className={`flex items-center gap-md bg-surface px-md py-sm text-label-sm text-ink-primary ${
                i < ROWS.length - 1 ? "border-b border-b-elevated" : ""
              }`}
            >
              <span className="w-24 shrink-0 font-medium">{row.name}</span>
              <Badge variant="neutral">{row.industry}</Badge>
              <Badge variant="neutral">{row.type}</Badge>
              <span className="flex-1" />
              <Badge variant={STATE[row.state]}>{row.state}</Badge>
            </div>
          ))}
        </div>
      </div>
    );
    const pair = resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED });
    return (
      <div className="flex gap-xl">
        <Table style={{ ...toStyleObject(pair, "light"), colorScheme: "light" } as React.CSSProperties} title="light" />
        <Table style={{ ...toStyleObject(pair, "dark"), colorScheme: "dark" } as React.CSSProperties} title="dark" />
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
