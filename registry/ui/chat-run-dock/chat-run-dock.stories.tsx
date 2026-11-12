import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ArrowUp, Plus } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";

import { ChatRunDock, ChatRunMark, type ChatRun } from "./chat-run-dock.tsx";

// Discriminated-union props: the looser Meta/StoryObj form (add-component traps).
const meta: Meta<typeof ChatRunDock> = {
  title: "UI/ChatRunDock",
  component: ChatRunDock,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ChatRunDock>;

/** The sheet's two runs (Chat Progress, 05 Background). */
const RUNS: ChatRun[] = [
  { id: "cuts", name: "Rendering Story cuts", activity: "2 of 3 · keeps going while you chat", elapsed: "1:48", value: 66 },
  { id: "kit", name: "Exporting brand kit", activity: "Packaging 248 files", elapsed: "0:12" },
];

const stopLabel = (run: ChatRun) => `Stop ${run.name}`;

/**
 * A stand-in for the composer's pill, so the dock's inset reads against
 * something. Not ChatComposer: this story is about the dock, and the pill is
 * only its ground.
 */
function ComposerPill() {
  return (
    <div className="flex items-center gap-sm rounded-full bg-field p-md ring-hairline ring-edge-subtle ring-inset">
      <Button variant="ghost" size="md" shape="full" isIconOnly aria-label="Attach" icon={<Plus />} />
      <span className="flex-1 font-body text-body-md text-ink-placeholder">Ask for changes, or start something new…</span>
      <Button variant="primary" size="md" shape="full" isIconOnly aria-label="Send" icon={<ArrowUp />} />
    </div>
  );
}

/** The composer's block, as the sheet draws it: the dock, gap-xs, the pill. */
function Block({ runs, isHeld = false, onStopAction, label = "Background runs" }: { runs: ChatRun[]; isHeld?: boolean; onStopAction: (id: string) => void; label?: string }) {
  return (
    <div className="flex w-[530px] max-w-full flex-col gap-xs">
      <ChatRunDock aria-label={label} runs={runs} isHeld={isHeld} onStopAction={onStopAction} stopLabel={stopLabel} />
      <ComposerPill />
    </div>
  );
}

function Marks() {
  return (
    <div className="flex w-[530px] max-w-full flex-col gap-md">
      <ChatRunMark kind="started" label="Rendering Story cuts in the background" />
      <ChatRunMark kind="finished" label="Story cuts finished" detail="3 files · 2 min 6 s" actionLabel="Open" onAction={fn()} />
      <ChatRunMark kind="failed" label="Brand kit export stopped at 180 of 248 files" retryLabel="Retry" onRetryAction={fn()} />
      <ChatRunMark kind="stopped" label="You stopped Story cuts after 48 s" detail="1 of 3 kept" />
    </div>
  );
}

export const Playground: Story = {
  render: () => <Block runs={RUNS} onStopAction={fn()} />,
};

/** Mirrors the sheet's 05 Background specimens: the dock over the composer, and the four thread marks. */
export const Matrix: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-xl">
      <div className="rounded-md bg-base px-lg py-xl ring ring-edge-subtle">
        <Block runs={RUNS} isHeld onStopAction={fn()} />
      </div>
      <div className="rounded-md bg-base p-lg ring ring-edge-subtle">
        <Marks />
      </div>
    </div>
  ),
};

/** A run's life: the row ticks while the thread is idle, holds while it is live, and ends as a mark in the thread. */
export const States: Story = {
  render: function StatesStory() {
    const [runs, setRuns] = useState(RUNS);
    const [isHeld, setIsHeld] = useState(false);
    const [ended, setEnded] = useState<string[]>([]);
    return (
      <div className="flex flex-col gap-xl">
        <div className="flex flex-col gap-md rounded-md bg-base p-lg">
          <ChatRunMark kind="started" label="Rendering Story cuts in the background" />
          {ended.map((name) => (
            <ChatRunMark key={name} kind="stopped" label={`You stopped ${name}`} />
          ))}
        </div>
        <Block
          runs={runs}
          isHeld={isHeld}
          onStopAction={(id) => {
            const run = runs.find((r) => r.id === id);
            setRuns((rs) => rs.filter((r) => r.id !== id));
            if (run) setEnded((e) => [...e, run.name]);
          }}
        />
        <div className="flex gap-sm">
          <Button variant="secondary" size="sm" onClick={() => setIsHeld((h) => !h)}>
            {isHeld ? "Thread idle — let the dock tick" : "Thread live — hold the dock"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setRuns(RUNS); setEnded([]); }}>
            Reset
          </Button>
        </div>
        <div className="flex flex-col gap-sm">
          <p className="font-body text-caption text-ink-muted">One run, unmeasured, no clock yet</p>
          <Block label="Background runs — research" runs={[{ id: "research", name: "Researching competitors", activity: "Reading 14 sources — the longest one first" }]} onStopAction={fn()} />
        </div>
      </div>
    );
  },
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
      <div style={style} className="flex flex-1 flex-col gap-lg rounded-lg bg-base p-xl">
        <p className="text-caption text-ink-muted">{title}</p>
        <Block label={`Background runs — ${title}`} runs={RUNS} isHeld onStopAction={fn()} />
        <Marks />
      </div>
    );
    return (
      <div className="flex flex-wrap gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
