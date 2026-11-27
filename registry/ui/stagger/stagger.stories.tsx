import { useState, type CSSProperties, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { Stagger } from "./stagger.tsx";

const meta = {
  title: "UI/Stagger",
  component: Stagger,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Stagger>;

export default meta;
type Story = StoryObj<typeof meta>;

const DESIGNERS = ["Josef Müller-Brockmann", "Jan Tschichold", "Wim Crouwel", "Karl Gerstner", "Armin Hofmann", "Emil Ruder", "Massimo Vignelli", "Adrian Frutiger"];

/** Remounts its group on demand, because a Stagger plays only on first appearance. */
function Replay({ children }: { children: (run: number) => ReactNode }) {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-md">
      <Button size="sm" variant="secondary" onClick={() => setRun((r) => r + 1)}>
        Replay
      </Button>
      <div key={run}>{children(run)}</div>
    </div>
  );
}

const Rows = ({ count = 8, kind }: { count?: number; kind?: "rise" | "fade" }) => (
  <ul className="flex w-80 flex-col divide-y divide-edge-subtle rounded-md border border-edge-subtle bg-surface">
    <Stagger kind={kind}>
      {DESIGNERS.slice(0, count).map((name) => (
        <li key={name} className="px-md py-sm text-label-md text-ink-primary">
          {name}
        </li>
      ))}
    </Stagger>
  </ul>
);

/** The sheet's case: eight rows, capped at the sixth. */
export const Playground: Story = {
  render: () => <Replay>{() => <Rows />}</Replay>,
};

/** Rise beside fade, and a short group beside a long one: the long one is no slower past the sixth item. */
export const Matrix: Story = {
  render: () => (
    <Replay>
      {() => (
        <div className="flex flex-wrap items-start gap-xl">
          <Rows count={3} />
          <Rows count={8} />
          <Rows count={8} kind="fade" />
        </div>
      )}
    </Replay>
  ),
};

/** The three motion levels, as regions: Reduced arrives together without rising; Off is instant. */
export const States: Story = {
  render: () => (
    <Replay>
      {() => (
        <div className="flex flex-wrap items-start gap-xl">
          {(["full", "reduced", "off"] as const).map((level) => (
            <section key={level} data-ui-motion={level} aria-label={`Motion ${level}`} className="flex flex-col gap-sm">
              <span className="text-label-sm text-ink-muted">{level}</span>
              <Rows count={5} />
            </section>
          ))}
        </div>
      )}
    </Replay>
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

/** Theme zero beside a hostile brand seed (AGENTS.md). Stagger paints nothing; the rows keep their own ink. */
export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    return (
      <Replay>
        {() => (
          <div className="flex flex-col gap-xl md:flex-row">
            {[
              { style: zero, title: "Theme zero" },
              { style: brand, title: "Stress brand (pale-yellow accent)" },
            ].map(({ style, title }) => (
              <div key={title} style={style as CSSProperties} className="flex flex-1 flex-col items-start gap-md rounded-lg bg-base p-xl">
                <p className="text-caption text-ink-muted">{title}</p>
                <Rows count={4} />
              </div>
            ))}
          </div>
        )}
      </Replay>
    );
  },
};
