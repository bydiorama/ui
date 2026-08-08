import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Inbox, Search, Filter } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Button } from "@/ui/button";
import { EmptyState } from "./empty-state.tsx";

const meta = {
  title: "UI/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
  args: { title: "No designers match this filter" },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The sheet's own block, verbatim: mark, sentence, reason, way out. */
export const Playground: Story = {
  args: {
    icon: <Inbox />,
    title: "No designers match this filter",
    description: "Clear the status filter to see all 24 records.",
    action: (
      <Button variant="secondary" size="md" shape="full" onClick={fn()}>
        Clear Filter
      </Button>
    ),
  },
};

const Well = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-sm">
    <span className="text-caption text-ink-muted">{label}</span>
    <div className="rounded-lg border border-edge-subtle bg-surface">{children}</div>
  </div>
);

/**
 * The sheet draws one composition. The other three are what the component is
 * for — and they are the ones that show which parts are optional.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      <Well label="the sheet's block — mark, title, description, action">
        <EmptyState
          icon={<Inbox />}
          title="No designers match this filter"
          description="Clear the status filter to see all 24 records."
          action={
            <Button variant="secondary" size="md" shape="full" onClick={fn()}>
              Clear Filter
            </Button>
          }
        />
      </Well>
      <Well label="no action — nothing for the reader to undo">
        <EmptyState
          icon={<Search />}
          title="No results for “bauhaus”"
          description="Check the spelling, or search for a discipline instead."
        />
      </Well>
      <Well label="no description — when the title is the whole story">
        <EmptyState icon={<Filter />} title="No filters applied" />
      </Well>
      <Well label="no mark — a quiet inline absence">
        <EmptyState
          title="Nothing archived yet"
          description="Archived records stay here for 90 days."
        />
      </Well>
    </div>
  ),
};

/**
 * A description long enough to wrap, which is the whole reason the leading is
 * `normal` here and not the sheet's `flat`. At 100% leading these two lines
 * touch.
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      <Well label="a description that wraps">
        <EmptyState
          icon={<Inbox />}
          title="No designers match this filter"
          description="You are filtering by Archived status and by a date range that ends before the first record was created. Clearing either one brings results back."
          action={
            <Button variant="secondary" size="md" shape="full" onClick={fn()}>
              Clear Filter
            </Button>
          }
        />
      </Well>
      <Well label="a narrow container — the block centres and the text balances">
        <div className="max-w-64">
          <EmptyState
            icon={<Search />}
            title="No results"
            description="Try a different discipline."
            action={
              <Button variant="secondary" size="md" shape="full" onClick={fn()}>
                Reset
              </Button>
            }
          />
        </div>
      </Well>
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
        <div className="rounded-lg border border-edge-subtle bg-surface">
          <EmptyState
            icon={<Inbox />}
            title="No designers match this filter"
            description="Clear the status filter to see all 24 records."
            action={
              <Button variant="secondary" size="md" shape="full" onClick={fn()}>
                Clear Filter
              </Button>
            }
          />
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
