import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useEffect, useRef, useState } from "react";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Button } from "../button/button.tsx";
import { Toast, useToast, type ToastOptions } from "./toast.tsx";

const meta = {
  title: "UI/Toast",
  component: Toast.Viewport,
  parameters: { layout: "padded" },
  // Every story below composes its own Provider + Viewport; these args exist
  // because the Viewport's two accessible names are REQUIRED props.
  args: { label: "Notifications", dismissLabel: "Dismiss" },
} satisfies Meta<typeof Toast.Viewport>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fires the given toasts once, on mount. */
function DemoToasts({ toasts }: { toasts: ToastOptions[] }) {
  const manager = useToast();
  const added = useRef(false);
  useEffect(() => {
    if (added.current) return;
    added.current = true;
    for (const toast of toasts) manager.add(toast);
  }, [manager, toasts]);
  return null;
}

/**
 * A contained stage: the viewport is portalled INTO the panel (`container`)
 * and switched from fixed to absolute, so several stories can sit side by
 * side without fighting over the real viewport corner. `timeout: 0` keeps
 * the specimens on screen for visual baselines.
 */
function Stage({
  label,
  toasts,
  height = "h-44",
}: {
  /** Unique per stage — several identically-named landmarks on one page fail axe (landmark-unique). */
  label: string;
  toasts: ToastOptions[];
  height?: string;
}) {
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setStage}
      className={`relative ${height} overflow-hidden rounded-md border border-edge-subtle bg-surface`}
    >
      <Toast.Provider timeout={0}>
        <DemoToasts toasts={toasts} />
        {stage ? (
          <Toast.Viewport label={label} dismissLabel="Dismiss" container={stage} className="absolute" />
        ) : null}
      </Toast.Provider>
    </div>
  );
}

/** The real thing: fixed bottom-right, fired from a button. */
export const Playground: Story = {
  render: () => {
    function Fire() {
      const manager = useToast();
      const count = useRef(0);
      return (
        <Button
          variant="secondary"
          onClick={() => {
            count.current += 1;
            manager.add({
              title: `Brand kit exported (${count.current})`,
              description: "Grid systems — Josef Müller-Brockmann, 1961",
              type: "success",
              action: { label: "Undo", onClick: fn() },
            });
          }}
        >
          Create toast
        </Button>
      );
    }
    return (
      <Toast.Provider>
        <Fire />
        <Toast.Viewport label="Notifications" dismissLabel="Dismiss" />
      </Toast.Provider>
    );
  },
};

/** Mirrors the sheet's Types section, one stage per row. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-lg">
      <Stage label="Default toast" toasts={[{ title: "Draft saved", description: "New Alphabet — Wim Crouwel, 1967" }]} />
      <Stage label="Info toast" toasts={[{ type: "info", title: "Editing in another window", description: "Univers — Adrian Frutiger, 1957" }]} />
      <Stage label="Success toast" toasts={[{ type: "success", title: "Brand kit exported", description: "Grid systems — Josef Müller-Brockmann, 1961" }]} />
      <Stage label="Warning toast" toasts={[{ type: "warning", title: "Storage almost full", description: "Munich pictograms — Otl Aicher, 1972" }]} />
      <Stage label="Danger toast" toasts={[{ type: "danger", title: "Export failed", description: "Movable type — Johannes Gutenberg, 1440" }]} />
      <Stage label="Loading toast" toasts={[{ type: "loading", title: "Exporting brand kit…", description: "Subway signage — Massimo Vignelli, 1972" }]} />
    </div>
  ),
};

/**
 * The anatomy in its fullest form (action + close), and the collapsed stack —
 * hover it to see the expansion the sheet's Stacking section draws.
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-lg">
      <Stage
        label="Toast with action"
        toasts={[
          {
            type: "success",
            title: "Brand kit exported",
            description: "Grid systems — Josef Müller-Brockmann, 1961",
            action: { label: "Undo", onClick: fn() },
          },
        ]}
      />
      <Stage
        label="Toast stack"
        height="h-64"
        toasts={[
          { title: "Draft saved", description: "New Alphabet — Wim Crouwel, 1967" },
          { type: "danger", title: "Export failed", description: "Movable type — Johannes Gutenberg, 1440" },
          { type: "success", title: "Brand kit exported", description: "Grid systems — Josef Müller-Brockmann, 1961" },
        ]}
      />
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
        <Stage
          label={`Notifications — ${title}`}
          toasts={[
            {
              type: "success",
              title: "Brand kit exported",
              description: "Grid systems — Josef Müller-Brockmann, 1961",
              action: { label: "Undo", onClick: fn() },
            },
          ]}
        />
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
