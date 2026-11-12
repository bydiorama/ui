import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FileText, Globe, Search, Sparks } from "griddy-icons";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { ChatProgress, type ChatProgressLane, type ChatProgressStep } from "./chat-progress.tsx";

/**
 * `Meta<typeof ChatProgress>` rather than `satisfies`, and `StoryObj<typeof
 * ChatProgress>` rather than `typeof meta`: the props are a DISCRIMINATED
 * UNION, and inferring a story's args from the meta's makes Storybook demand
 * the full union on every story — including the render-only ones.
 */
const meta: Meta<typeof ChatProgress> = {
  title: "UI/ChatProgress",
  component: ChatProgress,
  parameters: { layout: "padded" },
  args: { label: "Thinking through the brief…" },
};

export default meta;
type Story = StoryObj<typeof ChatProgress>;

/** The sheet's running chain (Thought chain, 3ZV1-0). */
const CHAIN: ChatProgressStep[] = [
  {
    id: "search",
    label: "Searched the library",
    status: "done",
    icon: <Search />,
    duration: "3 s",
    chips: [{ label: "grid systems 1961" }, { label: "Müller-Brockmann posters" }],
  },
  {
    id: "read",
    label: "Read 4 sources",
    status: "done",
    icon: <FileText />,
    duration: "9 s",
    chips: [
      { label: "moma.example", icon: <Globe /> },
      { label: "Brand guidelines — Grid", icon: <FileText /> },
      { label: "+2" },
    ],
  },
  {
    id: "compare",
    label: "Compared the two grids",
    status: "done",
    icon: <Sparks />,
    duration: "6 s",
    detail:
      "The 1961 poster grid is 4 × 4 on a doubled baseline; the brand grid is 12 columns. Three brand columns to one poster unit keeps both.",
  },
  {
    id: "draft",
    label: "Drafting three frames",
    status: "current",
    duration: "24 s",
    steps: [
      { id: "f1", label: "Frame 1 — title on the 4 × 4", status: "done", duration: "11 s" },
      { id: "f2", label: "Frame 2 — the grid, drawn", status: "current", duration: "13 s" },
      { id: "f3", label: "Frame 3 — the quote", status: "pending" },
    ],
  },
  { id: "safe", label: "Check safe areas", status: "pending" },
];

/** A step fails and the chain carries on (3ZZE-0). */
const FAILED_CHAIN: ChatProgressStep[] = [
  { id: "search", label: "Searched the library", status: "done", icon: <Search />, duration: "3 s" },
  {
    id: "open",
    label: "Could not open eyemagazine.example",
    status: "failed",
    detail: "Timed out after 10 s. Carried on with 3 of 4 sources.",
    retryLabel: "Retry",
    onRetryAction: fn(),
  },
  { id: "compare", label: "Compared the two grids", status: "done", icon: <Sparks />, duration: "6 s" },
];

const DONE_CHAIN: ChatProgressStep[] = CHAIN.map((step) => ({
  id: step.id,
  label: step.label,
  status: "done" as const,
  ...(step.icon ? { icon: step.icon } : {}),
  ...(step.duration ? { duration: step.duration } : {}),
}));

/** The sheet's running lanes (403F-0). */
const LANES: ChatProgressLane[] = [
  { id: "carousel", name: "Carousel", activity: "Reframing the scan to 4:5 — frame 2 of 3", status: "current", duration: "31 s" },
  { id: "copy", name: "Post copy", activity: "Draft ready — 84 words", status: "done", duration: "14 s" },
  {
    id: "alt",
    name: "Alt text",
    activity: "Describing frame 2 for Josef Müller-Brockmann's Beethoven poster, 1955, in the…",
    status: "current",
    duration: "22 s",
  },
  { id: "story", name: "Story cut", activity: "Waits for Carousel", status: "pending" },
];

/** A lane fails; a lane opens (405P-0). */
const LANES_OPENABLE: ChatProgressLane[] = [
  { id: "alt", name: "Alt text", activity: "Frame 2 could not be read", status: "failed", retryLabel: "Retry", onRetryAction: fn() },
  {
    id: "carousel",
    name: "Carousel",
    activity: "Frame 2 of 3",
    status: "current",
    duration: "31 s",
    steps: [
      { id: "styles", label: "Brand styles — palette and type ramp", status: "done", duration: "7 s" },
      { id: "reframe", label: "Reframing to 4:5 — 2 of 3", status: "current", duration: "24 s" },
      { id: "safe", label: "Check safe areas", status: "pending" },
    ],
  },
];

const THOUGHT = [
  "The brief asks for a carousel, but the reference is a single poster — so the first job is deciding what repeats.",
  "The 1961 grid is four by four with a doubled baseline; the brand grid is twelve columns. Three brand columns to one poster unit keeps both honest.",
  "Palette next: the scan is warm, so lift the red from the paper, not from the ink.",
];

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-lg">
    <span className="w-40 shrink-0 text-caption text-ink-primary">{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

/** One moving matrix: the live edge. */
export const Playground: Story = {};

/**
 * The sheet's sections in its own order — the live edge, reasoning, the
 * thought chain, parallel lanes — then the run forms that predate them.
 * Every specimen but the first is HELD: a sheet of specimens is not a turn,
 * and a page of moving matrices is the thing the one-live-edge rule forbids.
 */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[720px] flex-col gap-xl">
      <Row label="Waiting">
        <ChatProgress form="waiting" label="Waiting for a reply" />
      </Row>
      <Row label="Thinking">
        <ChatProgress label="Thinking through the brief…" isHeld />
      </Row>
      <Row label="Streaming">
        <ChatProgress form="streaming" label="Writing a reply" isHeld />
      </Row>
      <Row label="Reasoning — running">
        <ChatProgress label="Thinking" reasoning={THOUGHT} duration="8 s" isHeld />
      </Row>
      <Row label="Reasoning — folded">
        <ChatProgress label="Thinking" reasoning={THOUGHT} isComplete receiptText="Thought for 12 s" expandLabel="Show the reasoning" />
      </Row>
      <Row label="Reasoning — re-opened">
        <ChatProgress
          label="Thinking"
          reasoning={THOUGHT.slice(0, 2)}
          isComplete
          defaultIsOpen
          receiptText="Thought for 12 s"
          expandLabel="Hide the reasoning"
        />
      </Row>
      <Row label="Chain — running">
        <ChatProgress form="steps" label="Researching grid systems" duration="42 s" steps={CHAIN} isHeld />
      </Row>
      <Row label="Chain — a step failed">
        <ChatProgress
          form="steps"
          label="Researching grid systems"
          steps={FAILED_CHAIN}
          isComplete
          defaultIsOpen
          receiptText="Worked for 58 s · 3 steps · 1 failed"
          expandLabel="Hide what the agent did"
        />
      </Row>
      <Row label="Parallel — running">
        <ChatProgress form="parallel" label="Working on 4 things" meta="1 done" duration="31 s" lanes={LANES} isHeld />
      </Row>
      <Row label="Parallel — a lane fails, a lane opens">
        <ChatProgress form="parallel" label="Working on 2 things" duration="31 s" lanes={LANES_OPENABLE} isHeld />
      </Row>
      <Row label="Parallel — folded">
        <ChatProgress
          form="parallel"
          label="Working on 4 things"
          lanes={LANES.map((l) => ({ id: l.id, name: l.name, activity: l.activity, status: "done" as const }))}
          isComplete
          receiptText="Worked for 1 min 12 s · 4 in parallel"
          expandLabel="Show the four lanes"
        />
      </Row>
      <Row label="Presence — on the composer's edge">
        {/* Not the thread: the presence line rides the composer's top edge,
            inset to its text (40CC: ps-lg over a pill). */}
        <div className="flex max-w-[400px] flex-col gap-xs">
          <ChatProgress form="typing" who="Wim Crouwel" label="is typing" isHeld className="ps-lg" />
          <div className="h-8 rounded-full bg-field ring-hairline ring-edge-subtle ring-inset" />
        </div>
      </Row>
      <Row label="Presence — one line for everyone">
        <div className="flex max-w-[240px] flex-col gap-md">
          <ChatProgress form="typing" who="Josef Müller-Brockmann" label="is typing" isHeld />
          <ChatProgress form="typing" who="Josef and Wim" label="are typing" isHeld />
          <ChatProgress form="typing" who="3 people" label="are typing" isHeld />
        </div>
      </Row>
      <Row label="Activity">
        <ChatProgress
          form="activity"
          activities={[
            { verb: "Reading…", detail: "Grid Systems in Graphic Design — Josef Müller-Brockmann, 1961" },
            { verb: "Searching…", detail: "5 files included across 3 spaces" },
          ]}
        />
      </Row>
      <Row label="Measured">
        <ChatProgress form="measured" label="Generating slide 3 of 6" value={48} />
      </Row>
    </div>
  ),
};

/**
 * The edge cases: the wait gets long; the line drops, the user stops, the run
 * fails. Each ends the motion and says why.
 */
export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-xl">
      <Row label="wait under 5 s">
        <ChatProgress label="Thinking…" isHeld />
      </Row>
      <Row label="clock joins at 5 s">
        <ChatProgress label="Thinking…" duration="12 s" isHeld />
      </Row>
      <Row label="past 30 s, Stop">
        <ChatProgress label="Still working on it" duration="1 min 12 s" stopLabel="Stop" onStopAction={fn()} isHeld />
      </Row>
      <Row label="reconnecting">
        <ChatProgress form="waiting" label="Reconnecting — the answer so far is kept" isHeld />
      </Row>
      <Row label="stopped">
        <ChatProgress label="Thinking…" stoppedText="Stopped after 5 s" />
      </Row>
      <Row label="failed">
        <ChatProgress label="Thinking…" errorText="Could not finish thinking" retryLabel="Retry" onRetryAction={fn()} />
      </Row>
      <Row label="failed, no retry">
        <ChatProgress label="Thinking…" errorText="Stopped after 12 s — connection lost" />
      </Row>
      <Row label="chain stopped">
        <ChatProgress form="steps" label="Researching" steps={DONE_CHAIN.slice(0, 2)} stoppedText="You stopped after 12 s · 2 of 5 steps" />
      </Row>
      <Row label="chain done">
        <ChatProgress
          form="steps"
          label="Researching"
          steps={DONE_CHAIN}
          isComplete
          receiptText="Worked for 58 s · 5 steps"
          expandLabel="Show what the agent did"
        />
      </Row>
      <Row label="measured at 100">
        <ChatProgress form="measured" label="Generating slide 6 of 6" value={100} />
      </Row>
    </div>
  ),
};

/**
 * Theme zero beside a hostile brand seed. The cases that matter are the
 * matrix dots and the measured fill — `--ui-bg-accent-legible`, the role
 * floored at 3:1 — on the base ground and on a lane's elevated pill.
 */
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
  parameters: { controls: { disable: true } },
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));

    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex-1 rounded-lg bg-base p-xl">
        <p className="pb-md text-caption text-ink-muted">{title}</p>
        <div className="flex flex-col gap-lg">
          <ChatProgress label="Thinking through the brief…" isHeld />
          <ChatProgress form="steps" label="Researching grid systems" duration="42 s" steps={CHAIN} isHeld />
          <ChatProgress form="parallel" label="Working on 4 things" meta="1 done" duration="31 s" lanes={LANES} isHeld />
          <ChatProgress form="measured" label="Generating slide 3 of 6" value={48} />
          <ChatProgress label="Thinking…" errorText="Could not finish thinking" retryLabel="Retry" onRetryAction={fn()} />
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
