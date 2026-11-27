import { useState, type CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";
import { Presence, type PresenceKind } from "./presence.tsx";

const meta = {
  title: "UI/Presence",
  component: Presence,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Presence>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The sheet's placeholder rows — longest name first, so a lane break shows. */
const PEOPLE = [
  { id: "mb", name: "Josef Müller-Brockmann", field: "Grid systems", year: 1961 },
  { id: "jt", name: "Jan Tschichold", field: "Asymmetric typography", year: 1928 },
  { id: "wc", name: "Wim Crouwel", field: "New Alphabet", year: 1967 },
  { id: "af", name: "Adrian Frutiger", field: "Univers", year: 1957 },
  { id: "oa", name: "Otl Aicher", field: "Munich pictograms", year: 1972 },
] as const;

type Person = (typeof PEOPLE)[number];

/**
 * A list a person edits: Add brings the next designer in, Done shows the
 * finished state FIRST and then removes the row — the sheet's second rule,
 * which belongs to the caller, not to Presence.
 */
function People({ kind, onChange }: { kind: PresenceKind; onChange?: (ids: string[]) => void }) {
  const [rows, setRows] = useState<Person[]>(PEOPLE.slice(0, 3));
  const [done, setDone] = useState<string[]>([]);
  const next = PEOPLE.find((p) => !rows.some((r) => r.id === p.id));

  const update = (change: (rows: Person[]) => Person[]) => {
    setRows((current) => {
      const nextRows = change(current);
      onChange?.(nextRows.map((r) => r.id));
      return nextRows;
    });
  };
  const finish = (id: string) => {
    setDone((d) => [...d, id]);
    // The change lands, then the row goes. A story's pause, not a token: the
    // label has nothing to animate, the reader just needs to see it.
    window.setTimeout(() => update((current) => current.filter((r) => r.id !== id)), 600);
  };

  return (
    <div className="flex w-full max-w-160 flex-col gap-md">
      <ul className="flex flex-col rounded-md border border-edge-subtle bg-surface" aria-label="Designers">
        <Presence kind={kind}>
          {rows.map((person) => (
            <li key={person.id} className="flex items-center gap-md border-b border-edge-subtle px-md py-sm last:border-b-0">
              <span className="w-60 shrink-0 text-label-md text-ink-primary">{person.name}</span>
              <span className="min-w-0 flex-1 text-label-sm text-ink-muted">{person.field}</span>
              <span className="w-12 shrink-0 text-right text-label-sm text-ink-muted tabular-nums">{person.year}</span>
              <Button size="sm" variant="secondary" isDisabled={done.includes(person.id)} onClick={() => finish(person.id)}>
                {done.includes(person.id) ? "Finished" : "Done"}
              </Button>
            </li>
          ))}
        </Presence>
      </ul>
      <div>
        <Button size="sm" isDisabled={!next} onClick={() => next && update((current) => [...current, next])}>
          {next ? `Add ${next.name}` : "Everyone is here"}
        </Button>
      </div>
    </div>
  );
}

/** One list, kind switchable from the controls. */
export const Playground: Story = {
  args: { kind: "collapse" },
  render: (args) => <People kind={args.kind ?? "fade"} onChange={fn()} />,
};

/**
 * The sheet's three kinds side by side. Add a row in each to compare: fade
 * appears in place, rise lands from 4px below, collapse opens its space
 * first so the rows below glide.
 */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-col gap-2xl">
      {(["fade", "rise", "collapse"] as const).map((kind) => (
        <section key={kind} className="flex flex-col gap-sm" aria-label={kind}>
          <h3 className="text-label-sm text-ink-primary">{kind}</h3>
          <People kind={kind} />
        </section>
      ))}
    </div>
  ),
};

/**
 * The states a reader can catch: present rows, and the three motion levels
 * applied to a region. In the Reduced region rise is a plain fade; in Off
 * everything is instant, and a removed row still leaves through its 1ms exit.
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-2xl">
      {(["full", "reduced", "off"] as const).map((level) => (
        <section key={level} data-ui-motion={level} className="flex flex-col gap-sm" aria-label={`Motion ${level}`}>
          <h3 className="text-label-sm text-ink-primary">Motion: {level}</h3>
          <People kind="rise" />
        </section>
      ))}
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

/**
 * Theme zero beside a hostile brand seed (AGENTS.md). Presence paints
 * nothing, so a brand cannot break it; what this checks is that the items —
 * the caller's own rows — keep their brand while they move, because the
 * classes Presence adds touch only opacity, translate and height.
 */
export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    return (
      <div className="flex flex-col gap-xl md:flex-row">
        {[
          { style: zero, title: "Theme zero" },
          { style: brand, title: "Stress brand (pale-yellow accent)" },
        ].map(({ style, title }) => (
          <div key={title} style={style as CSSProperties} className="flex-1 rounded-lg bg-base p-xl">
            <p className="pb-md text-caption text-ink-muted">{title}</p>
            <People kind="collapse" />
          </div>
        ))}
      </div>
    );
  },
};
