import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Badge } from "@/ui/badge/badge.tsx";
import { Switch } from "@/ui/switch/switch.tsx";
import { CardSorting } from "./card-sorting.tsx";

const meta = {
  title: "UI/CardSorting",
  component: CardSorting,
  parameters: { layout: "padded" },
  args: { label: "Brand assets", children: null },
} satisfies Meta<typeof CardSorting>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The sheet's own rows: a title, a visibility Badge and a Switch. */
const ASSETS = [
  { id: "guidelines", label: "Brand guidelines", visibility: "Public", on: false },
  { id: "cards", label: "Business cards", visibility: "Team only", on: true },
  { id: "signatures", label: "Email signatures", visibility: "Team only", on: true },
  { id: "test", label: "Dokument test", visibility: "Team only", on: true },
] as const;

const Row = ({ asset }: { asset: (typeof ASSETS)[number] }) => (
  <>
    <span className="flex min-w-0 flex-col items-start gap-xs">
      <span className="truncate text-body-lg font-body font-bold leading-normal tracking-tight">
        {asset.label}
      </span>
      <Badge variant={asset.visibility === "Public" ? "success" : "unselected"}>
        {asset.visibility}
      </Badge>
    </span>
    {/* A real Switch with its own accessible name — the row's label names the
        row, not this control, so it carries its own. */}
    <Switch defaultIsChecked={asset.on} isLabelHidden>
      {`Publish ${asset.label}`}
    </Switch>
  </>
);

const List = ({ label = "Brand assets" }: { label?: string }) => (
  <CardSorting label={label} className="w-full max-w-nav">
    {ASSETS.map((asset) => (
      <CardSorting.Item key={asset.id} id={asset.id} label={asset.label}>
        <Row asset={asset} />
      </CardSorting.Item>
    ))}
  </CardSorting>
);

export const Playground: Story = { render: () => <List /> };
export const Matrix: Story = { render: () => <List /> };

/**
 * The order is the component's value, so it can be lifted out. Every path —
 * drag, keyboard, click-to-place — reports through the one callback.
 */
export const Controlled: Story = {
  render: function ControlledStory() {
    const [order, setOrder] = useState<string[]>(ASSETS.map((a) => a.id));
    return (
      <div className="flex flex-col gap-lg">
        <CardSorting label="Brand assets" order={order} onOrderChange={setOrder} className="w-full max-w-nav">
          {ASSETS.map((asset) => (
            <CardSorting.Item key={asset.id} id={asset.id} label={asset.label}>
              <Row asset={asset} />
            </CardSorting.Item>
          ))}
        </CardSorting>
        <p className="text-caption text-ink-muted">Order: {order.join(" → ")}</p>
      </div>
    );
  },
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-col gap-sm">
        <p className="text-caption text-ink-muted">
          One row. There is nowhere to move it, and the arrows say so by doing nothing.
        </p>
        <CardSorting label="A single asset" className="w-full max-w-nav">
          <CardSorting.Item id="only" label="Brand guidelines">
            <Row asset={ASSETS[0]} />
          </CardSorting.Item>
        </CardSorting>
      </div>
      <div className="flex flex-col gap-sm">
        <p className="text-caption text-ink-muted">
          Long titles truncate rather than wrapping the card into two lines.
        </p>
        <CardSorting label="Long names" className="w-full max-w-nav">
          <CardSorting.Item id="long" label="A brand guideline with a very long name indeed">
            <span className="truncate text-body-lg font-body font-bold leading-normal tracking-tight">
              A brand guideline with a very long name indeed
            </span>
            <Badge variant="unselected">Team only</Badge>
          </CardSorting.Item>
          <CardSorting.Item id="short" label="Short">
            <span className="truncate text-body-lg font-body font-bold leading-normal tracking-tight">Short</span>
            <Badge variant="success">Public</Badge>
          </CardSorting.Item>
        </CardSorting>
      </div>
    </div>
  ),
};

const STRESS_BRAND: ThemeSeed = {
  colors: {
    bg: "#fffdf5", surface: "#ffffff", muted: "#f4ecd8",
    textPrimary: "#1a1400", textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)", accent: "#ffe066",
  },
};

export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        {/* Distinct names per panel: two lists sharing one accessible name is
            indistinguishable to a screen reader, and axe says so. */}
        <List label={`Brand assets — ${title}`} />
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
