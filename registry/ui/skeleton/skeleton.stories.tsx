import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Skeleton } from "./skeleton.tsx";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The bare component. No className at all, which is the case a
 * className-sized placeholder usually gets wrong: with no default height this
 * would be a 0px box and read as a component that failed to render.
 */
export const Playground: Story = {
  render: () => (
    <div className="max-w-(--ui-measure-prose)">
      <Skeleton />
    </div>
  ),
};

/**
 * The matrix. NOT a mirror of a Paper sheet — there is no sheet (see the doc's
 * needsDesign) — so it is organised by the thing the component is actually
 * varied on, which is the box it is asked to be. Each cell is one className.
 */
export const Matrix: Story = {
  render: () => {
    const CASES: Array<{ label: string; className: string }> = [
      { label: "default — h-4 w-full", className: "" },
      { label: "line — h-4 w-2/5", className: "h-4 w-2/5" },
      { label: "heading — h-8 w-48", className: "h-8 w-48" },
      { label: "table bar — h-2.5 w-3/5", className: "h-2.5 w-3/5" },
      { label: "avatar — size-10 rounded-full", className: "size-10 rounded-full" },
      { label: "media — h-32 w-full rounded-md", className: "h-32 w-full rounded-md" },
    ];
    return (
      <div className="flex max-w-(--ui-measure-prose) flex-col gap-lg">
        {CASES.map(({ label, className }) => (
          <div key={label} className="flex flex-col gap-xs">
            <p className="text-caption text-ink-muted">{label}</p>
            <Skeleton {...(className ? { className } : {})} />
          </div>
        ))}
      </div>
    );
  },
};

/**
 * What the component is for: a shape, composed at the call site.
 *
 * The left column is the loading half and the right is the content it stands
 * in for, at the same sizes. Side by side is the only way to see the thing
 * that actually matters about a skeleton — whether the layout moves when the
 * data arrives.
 */
export const States: Story = {
  render: () => {
    const Row = ({ isLoading }: { isLoading: boolean }) => (
      <div aria-busy={isLoading} className="flex flex-1 items-center gap-md">
        {isLoading ? (
          <Skeleton className="size-10 shrink-0 rounded-full" />
        ) : (
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-subtle text-caption text-ink-primary">
            JO
          </div>
        )}
        <div className="flex flex-1 flex-col gap-xs">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-4/5" />
            </>
          ) : (
            <>
              <p className="text-body-sm font-medium text-ink-primary">Jakub Otčenáš</p>
              <p className="text-body-sm text-ink-secondary">Design systems, Diorama</p>
            </>
          )}
        </div>
      </div>
    );
    return (
      <div className="flex max-w-(--ui-measure-prose) flex-col gap-xl">
        <div className="flex flex-col gap-xs">
          <p className="text-caption text-ink-muted">loading — aria-busy on the region</p>
          <Row isLoading />
        </div>
        <div className="flex flex-col gap-xs">
          <p className="text-caption text-ink-muted">loaded — the same boxes, filled</p>
          <Row isLoading={false} />
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
 * The one that matters for this component: the bar is `--ui-bg-sunken`, a
 * derived surface, and a brand whose page and surfaces sit close together
 * gives a placeholder that is nearly invisible. That is the question the doc
 * raises in needsDesign, and this story is where it can be seen rather than
 * argued about.
 */
export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex items-center gap-md">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-xs">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-4/5" />
          </div>
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
