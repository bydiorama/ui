/**
 * Compile-time contract tests. `tsc --noEmit` is the runner — a
 * `@ts-expect-error` that stops erroring fails the build.
 */

import { ChatTasks, type ChatProposedTask, type ChatTask, type ChatTaskStatusLabels } from "./chat-tasks.tsx";

const LABELS: ChatTaskStatusLabels = { done: "Done", current: "In progress", pending: "To do" };

const TASKS: ChatTask[] = [
  { id: "a", label: "Read the poster scan", status: "done" },
  { id: "b", label: "Draft the frames", status: "current", activity: "Reframing to 4:5" },
  { id: "c", label: "Draft the frames", status: "current" },
  { id: "d", label: "Write the copy", status: "pending" },
  { id: "e", label: "Pick a quote", status: "needsYou", needsYouLabel: "Needs you" },
  { id: "f", label: "Export", status: "failed", reason: "Render timed out" },
  { id: "g", label: "Export", status: "failed", reason: "Render timed out", retryLabel: "Retry", onRetryAction: () => {} },
  { id: "h", label: "Cut a Story", status: "skipped", skippedLabel: "Skipped" },
  { id: "i", label: "Check contrast", status: "pending", isNew: true, newLabel: "New" },
];

const PROPOSED: ChatProposedTask[] = [{ id: "a", label: "Read the poster scan" }];

export function Valid() {
  return (
    <>
      <ChatTasks status="running" label="Grid systems carousel" count="2 of 5" tasks={TASKS} statusLabels={LABELS} />
      <ChatTasks status="complete" label="Grid" count="5 of 5 · 3 min" tasks={TASKS} statusLabels={LABELS} />
      <ChatTasks status="stopped" label="Grid" count="Stopped at 2 of 5" tasks={TASKS} statusLabels={LABELS} />
      <ChatTasks
        status="running"
        label="Grid"
        count="2 of 5"
        tasks={TASKS}
        statusLabels={LABELS}
        isOpen
        onOpenChange={(isOpen) => isOpen}
      />
      <ChatTasks status="running" label="Grid" count="2 of 5" tasks={TASKS} statusLabels={LABELS} defaultIsOpen={false} />
      <ChatTasks status="proposed" label="Grid" count="5 steps" tasks={PROPOSED} runLabel="Run plan" onRunAction={() => {}} />
      <ChatTasks
        status="proposed"
        label="Grid"
        count="5 steps · about 3 min"
        tasks={PROPOSED}
        runLabel="Run plan"
        onRunAction={() => {}}
        changeLabel="Change it"
        onChangeAction={() => {}}
        footnote="Nothing runs until you say so"
        onDropAction={(task) => task.id}
        getDropLabel={(task) => `Drop ${task.label}`}
      />
      {/* Native div props reach the outermost node. */}
      <ChatTasks status="running" label="Grid" count="2 of 5" tasks={TASKS} statusLabels={LABELS} id="plan" className="mt-lg" />
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* A failed row with no reason draws a red cross with nobody saying why. */}
      {/* @ts-expect-error reason is required for a failed task */}
      <ChatTasks status="running" label="Grid" count="1 of 1" statusLabels={LABELS} tasks={[{ id: "a", label: "Export", status: "failed" }]} />

      {/* A retry handler with no name announces as "button". */}
      <ChatTasks
        status="running"
        label="Grid"
        count="1 of 1"
        statusLabels={LABELS}
        // @ts-expect-error retryLabel travels with onRetryAction
        tasks={[{ id: "a", label: "Export", status: "failed", reason: "Timed out", onRetryAction: () => {} }]}
      />

      {/* And a name with no handler is a button that does nothing. */}
      <ChatTasks
        status="running"
        label="Grid"
        count="1 of 1"
        statusLabels={LABELS}
        // @ts-expect-error onRetryAction travels with retryLabel
        tasks={[{ id: "a", label: "Export", status: "failed", reason: "Timed out", retryLabel: "Retry" }]}
      />

      {/* @ts-expect-error a needs-you badge needs its words */}
      <ChatTasks status="running" label="Grid" count="1 of 1" statusLabels={LABELS} tasks={[{ id: "a", label: "Pick", status: "needsYou" }]} />

      {/* @ts-expect-error a skipped row needs its trailing note */}
      <ChatTasks status="running" label="Grid" count="1 of 1" statusLabels={LABELS} tasks={[{ id: "a", label: "Cut", status: "skipped" }]} />

      {/* A New badge with no words. */}
      <ChatTasks
        status="running"
        label="Grid"
        count="1 of 1"
        statusLabels={LABELS}
        // @ts-expect-error newLabel travels with isNew
        tasks={[{ id: "a", label: "Check", status: "pending", isNew: true }]}
      />

      {/* The row statuses are six treatments, not free text. */}
      {/* @ts-expect-error unknown task status */}
      <ChatTasks status="running" label="Grid" count="1 of 1" statusLabels={LABELS} tasks={[{ id: "a", label: "x", status: "blocked" }]} />

      {/* Done, current and pending say what they are by glyph and ink only —
          the words for a screen reader are required, not optional. */}
      {/* @ts-expect-error statusLabels is required once the plan runs */}
      <ChatTasks status="running" label="Grid" count="2 of 5" tasks={TASKS} />

      {/* A proposed plan with no way to approve it. */}
      {/* @ts-expect-error runLabel and onRunAction are required while proposed */}
      <ChatTasks status="proposed" label="Grid" count="5 steps" tasks={PROPOSED} />

      {/* @ts-expect-error onRunAction is required too */}
      <ChatTasks status="proposed" label="Grid" count="5 steps" tasks={PROPOSED} runLabel="Run plan" />

      {/* Change it is optional, but never half of it. */}
      {/* @ts-expect-error changeLabel travels with onChangeAction */}
      <ChatTasks status="proposed" label="Grid" count="5 steps" tasks={PROPOSED} runLabel="Run plan" onRunAction={() => {}} onChangeAction={() => {}} />

      {/* An icon-only Close with no name per row. */}
      {/* @ts-expect-error getDropLabel travels with onDropAction */}
      <ChatTasks status="proposed" label="Grid" count="5 steps" tasks={PROPOSED} runLabel="Run plan" onRunAction={() => {}} onDropAction={() => {}} />

      {/* A proposed task has no status yet — nothing has run. */}
      <ChatTasks
        status="proposed"
        label="Grid"
        count="5 steps"
        runLabel="Run plan"
        onRunAction={() => {}}
        // @ts-expect-error proposed tasks carry no status
        tasks={[{ id: "a", label: "Read", status: "done" }]}
      />

      {/* A plan waiting for a yes is never folded away from whoever gives it. */}
      {/* @ts-expect-error a proposed plan has no disclosure */}
      <ChatTasks status="proposed" label="Grid" count="5 steps" tasks={PROPOSED} runLabel="Run" onRunAction={() => {}} isOpen={false} />

      {/* status is behavioural, so it is required (CONVENTIONS §2). */}
      {/* @ts-expect-error status is required */}
      <ChatTasks label="Grid" count="2 of 5" tasks={TASKS} statusLabels={LABELS} />

      {/* @ts-expect-error unknown list status */}
      <ChatTasks status="paused" label="Grid" count="2 of 5" tasks={TASKS} statusLabels={LABELS} />

      {/* @ts-expect-error the header count is required */}
      <ChatTasks status="running" label="Grid" tasks={TASKS} statusLabels={LABELS} />
    </>
  );
}
