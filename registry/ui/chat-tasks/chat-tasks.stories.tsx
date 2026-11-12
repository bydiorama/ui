import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import {
  resolveThemePair,
  toStyleObject,
  THEME_ZERO,
  ZERO_AUTHORED,
  type ThemeSeed,
} from "@bydiorama/tokens";

import { Button } from "@/ui/button/button.tsx";

import {
  ChatTasks,
  type ChatProposedTask,
  type ChatTask,
  type ChatTaskStatusLabels,
  type ChatTasksStatus,
} from "./chat-tasks.tsx";

/**
 * `Meta<typeof ChatTasks>` rather than `satisfies`, and `StoryObj<typeof
 * ChatTasks>` rather than `typeof meta` — the props are a DISCRIMINATED UNION,
 * and inferring a story's args from the meta's makes Storybook demand the
 * full union on every story, including the render-only ones.
 */
const meta: Meta<typeof ChatTasks> = {
  title: "UI/ChatTasks",
  component: ChatTasks,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ChatTasks>;

const LABELS: ChatTaskStatusLabels = { done: "Done:", current: "In progress:", pending: "To do:" };

/** The sheet's own plan — "Grid systems carousel", two done of five. */
const RUNNING: ChatTask[] = [
  { id: "scan", label: "Read the poster scan and the brand grid", status: "done" },
  { id: "frames", label: "Choose three frames and their order", status: "done" },
  { id: "draft", label: "Draft the frames on the 4 × 4 grid", status: "current", activity: "Reframing to 4:5 — frame 2 of 3" },
  { id: "copy", label: "Write the post copy and alt text", status: "pending" },
  { id: "story", label: "Cut a 9:16 Story version", status: "pending" },
];

const COMPLETE: ChatTask[] = RUNNING.map((task) => ({ id: task.id, label: task.label, status: "done" as const }));

const STOPPED: ChatTask[] = [
  { id: "scan", label: "Read the poster scan and the brand grid", status: "done" },
  { id: "frames", label: "Choose three frames and their order", status: "done" },
  { id: "draft", label: "Draft the frames on the 4 × 4 grid", status: "pending" },
  { id: "copy", label: "Write the post copy and alt text", status: "pending" },
  { id: "story", label: "Cut a 9:16 Story version", status: "pending" },
];

/** The sheet's Row states column: one row per status, in its order. */
const ROW_STATES: ChatTask[] = [
  { id: "done", label: "Done", status: "done" },
  { id: "current", label: "Current", status: "current" },
  { id: "pending", label: "Pending", status: "pending" },
  { id: "needs", label: "Pick a quote for frame 3", status: "needsYou", needsYouLabel: "Needs you" },
  { id: "failed", label: "Export the Story cut", status: "failed", reason: "Failed — the reason, in one line", retryLabel: "Retry", onRetryAction: fn() },
  { id: "skipped", label: "Skipped — dropped from the plan", status: "skipped", skippedLabel: "Skipped" },
];

/** Revised mid-run: one task added (New), one dropped where it stood (Skipped). */
const REVISED: ChatTask[] = [
  { id: "scan", label: "Read the poster scan and the brand grid", status: "done" },
  { id: "frames", label: "Choose three frames and their order", status: "done" },
  { id: "draft", label: "Draft the frames on the 4 × 4 grid", status: "current" },
  { id: "contrast", label: "Check contrast of the red on the paper tone", status: "pending", isNew: true, newLabel: "New" },
  { id: "copy", label: "Write the post copy and alt text", status: "pending" },
  { id: "story", label: "Cut a 9:16 Story version", status: "skipped", skippedLabel: "Skipped — you asked for feed only" },
];

const PROPOSED: ChatProposedTask[] = [
  { id: "scan", label: "Read the poster scan and the brand grid" },
  { id: "frames", label: "Choose three frames and their order" },
  { id: "draft", label: "Draft the frames on the 4 × 4 grid" },
  { id: "copy", label: "Write the post copy and alt text" },
  { id: "story", label: "Cut a 9:16 Story version" },
];

const dropLabel = (task: ChatProposedTask) => `Drop “${task.label}”`;

const Column = ({ title, note, children }: { title: string; note: string; children: React.ReactNode }) => (
  <div className="flex min-w-0 flex-1 flex-col gap-md">
    <div className="flex flex-col">
      <p className="text-label-sm text-ink-primary">{title}</p>
      <p className="text-caption text-ink-muted">{note}</p>
    </div>
    {children}
  </div>
);

export const Playground: Story = {
  render: () => (
    <div className="max-w-[640px]">
      <ChatTasks status="running" label="Grid systems carousel" count="2 of 5" tasks={RUNNING} statusLabels={LABELS} />
    </div>
  ),
};

/**
 * The sheet, in the sheet's own layout: Task list (running open · folded
 * running, complete, stopped · row states), then Approval and revision
 * (proposed · revised mid-run). The sheet's hover specimens are pointer
 * states and are not forced here — hover the header, or a proposed row, to
 * see them.
 */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[1152px] flex-col gap-2xl">
      <div className="flex gap-xl">
        <Column title="Running — open" note="The widget card, with gap-xs between header and rows.">
          <ChatTasks status="running" label="Grid systems carousel" count="2 of 5" tasks={RUNNING} statusLabels={LABELS} />
        </Column>
        <Column title="Folded — running, complete, stopped" note="The header's glyph becomes the list's status.">
          <div className="flex flex-col gap-sm">
            <ChatTasks
              status="running"
              label="Grid systems carousel"
              count="2 of 5"
              tasks={RUNNING}
              statusLabels={LABELS}
              defaultIsOpen={false}
            />
            <ChatTasks status="complete" label="Grid systems carousel" count="5 of 5 · 3 min" tasks={COMPLETE} statusLabels={LABELS} />
            <ChatTasks
              status="stopped"
              label="Grid systems carousel"
              count="Stopped at 2 of 5"
              tasks={STOPPED}
              statusLabels={LABELS}
              defaultIsOpen={false}
            />
          </div>
        </Column>
        <Column title="Row states" note="Six statuses. Needs-you asks for the user.">
          <ChatTasks status="running" label="Row states" count="1 of 6" tasks={ROW_STATES} statusLabels={LABELS} />
        </Column>
      </div>
      <div className="flex gap-xl">
        <Column title='Proposed — status="proposed"' note="Numbers in the glyph lane; hover a row to drop it.">
          <ChatTasks
            status="proposed"
            label="Grid systems carousel"
            count="5 steps · about 3 min"
            tasks={PROPOSED}
            runLabel="Run plan"
            onRunAction={fn()}
            changeLabel="Change it"
            onChangeAction={fn()}
            footnote="Nothing runs until you say so"
            onDropAction={fn()}
            getDropLabel={dropLabel}
          />
        </Column>
        <Column title="Revised mid-run" note="Added is New; dropped is Skipped where it stood.">
          <ChatTasks status="running" label="Grid systems carousel" count="2 of 5 · revised" tasks={REVISED} statusLabels={LABELS} />
        </Column>
      </div>
    </div>
  ),
};

/**
 * The plan's life in one card, updated IN PLACE — proposed, run, revised,
 * finished. Finishing folds it; reopen it from the header.
 */
function LifecycleDemo() {
  const [step, setStep] = useState(0);
  const stages: Array<{ status: Exclude<ChatTasksStatus, "proposed">; count: string; tasks: ChatTask[] }> = [
    { status: "running", count: "2 of 5", tasks: RUNNING },
    { status: "running", count: "2 of 5 · revised", tasks: REVISED },
    { status: "complete", count: "5 of 5 · 3 min", tasks: COMPLETE },
  ];
  const stage = stages[step - 1];
  return (
    <div className="flex max-w-[640px] flex-col gap-md">
      {stage ? (
        <ChatTasks status={stage.status} label="Grid systems carousel" count={stage.count} tasks={stage.tasks} statusLabels={LABELS} />
      ) : (
        <ChatTasks
          status="proposed"
          label="Grid systems carousel"
          count="5 steps · about 3 min"
          tasks={PROPOSED}
          runLabel="Run plan"
          onRunAction={() => setStep(1)}
          footnote="Nothing runs until you say so"
        />
      )}
      {step > 0 ? (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setStep((s) => (s % stages.length) + 1)}>
            Next turn
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export const Lifecycle: Story = {
  parameters: { controls: { disable: true } },
  render: () => <LifecycleDemo />,
};

export const States: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex max-w-[640px] flex-col gap-lg">
      <ChatTasks
        status="complete"
        label="Grid systems carousel"
        count="5 of 5 · 3 min"
        tasks={COMPLETE}
        statusLabels={LABELS}
        defaultIsOpen
      />
      <ChatTasks
        status="stopped"
        label="Grid systems carousel"
        count="Stopped at 2 of 5"
        tasks={[
          ...STOPPED.slice(0, 2),
          { id: "draft", label: "Draft the frames on the 4 × 4 grid", status: "failed", reason: "Couldn't draft frame 2 — the poster scan is too small" },
          ...STOPPED.slice(3),
        ]}
        statusLabels={LABELS}
      />
      <ChatTasks
        status="running"
        label="A plan whose name is long enough that the header has to truncate it before the count"
        count="1 of 3"
        tasks={[
          { id: "a", label: "Read every source in the brand library that references the 1961 grid, including the scans", status: "done" },
          { id: "b", label: "Pick a quote for frame 3", status: "needsYou", needsYouLabel: "Needs you" },
          { id: "c", label: "Cut a 9:16 Story version", status: "pending", isNew: true, newLabel: "New" },
        ]}
        statusLabels={LABELS}
      />
      <ChatTasks
        status="proposed"
        label="Without the optional parts"
        count="2 steps"
        tasks={PROPOSED.slice(0, 2)}
        runLabel="Run plan"
        onRunAction={fn()}
      />
    </div>
  ),
};

/**
 * Theme zero beside a hostile brand seed. The case that matters is the held
 * matrix on the current task: it is --ui-bg-accent-legible on the card, and a
 * pale-yellow accent is exactly what that role exists to survive. Run plan is
 * the accent fill.
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
          <ChatTasks status="running" label="Grid systems carousel" count="2 of 5 · revised" tasks={REVISED} statusLabels={LABELS} />
          <ChatTasks status="running" label="Row states" count="1 of 6" tasks={ROW_STATES} statusLabels={LABELS} />
          <ChatTasks
            status="proposed"
            label="Grid systems carousel"
            count="5 steps · about 3 min"
            tasks={PROPOSED}
            runLabel="Run plan"
            onRunAction={fn()}
            changeLabel="Change it"
            onChangeAction={fn()}
            footnote="Nothing runs until you say so"
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
