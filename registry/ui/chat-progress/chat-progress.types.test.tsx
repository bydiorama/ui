/**
 * Compile-time contract tests. `tsc --noEmit` is the runner — a
 * `@ts-expect-error` that stops erroring fails the build.
 */

import { ChatProgress, type ChatProgressLane, type ChatProgressStep } from "./chat-progress.tsx";

const STEPS: ChatProgressStep[] = [{ id: "a", label: "Tone of voice", status: "done" }];
const LANES: ChatProgressLane[] = [{ id: "c", name: "Carousel", activity: "Reframing", status: "current" }];

export function Valid() {
  return (
    <>
      <ChatProgress label="Thinking…" />
      <ChatProgress form="thinking" label="Thinking…" />
      <ChatProgress form="activity" activities={[{ verb: "Reading…", detail: "A book" }]} />
      <ChatProgress form="steps" label="Gathering" steps={STEPS} />
      <ChatProgress form="steps" label="Gathering" duration="12 s" steps={STEPS} />
      <ChatProgress form="measured" label="Generating" value={48} />
      <ChatProgress form="measured" label="Generating" value={3} max={6} />
      <ChatProgress
        form="steps"
        label="Gathering"
        steps={STEPS}
        isComplete
        receiptText="Worked for 26 s"
        expandLabel="Show what the agent did"
      />
      <ChatProgress label="Thinking…" errorText="Stopped" retryLabel="Retry" onRetryAction={() => {}} />
      <ChatProgress label="Thinking…" isOpen onOpenChange={(open) => open} />
      <ChatProgress label="Thinking…" defaultIsOpen={false} />
      <ChatProgress form="waiting" label="Waiting" />
      <ChatProgress form="streaming" label="Writing a reply" />
      <ChatProgress label="Thinking" reasoning={["The brief asks for a carousel."]} duration="8 s" />
      <ChatProgress label="Still working on it" duration="1 min 12 s" stopLabel="Stop" onStopAction={() => {}} />
      <ChatProgress label="Thinking…" stoppedText="Stopped after 5 s" />
      <ChatProgress label="Thinking…" isHeld />
      <ChatProgress form="parallel" label="Working on 4 things" meta="1 done" lanes={LANES} />
      <ChatProgress
        form="steps"
        label="Researching"
        steps={[
          { id: "s", label: "Searched", status: "done", duration: "3 s", chips: [{ label: "grid systems 1961" }] },
          { id: "f", label: "Could not open", status: "failed", detail: "Timed out", retryLabel: "Retry", onRetryAction: () => {} },
          { id: "d", label: "Drafting", status: "current", steps: [{ id: "f1", label: "Frame 1", status: "done" }] },
        ]}
      />
      {/* Native div props reach the outermost node. */}
      <ChatProgress label="Thinking…" id="run-4" className="mt-lg" />
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* A step list with no steps renders an empty box, which reads as the
          agent having stopped. The union refuses it. */}
      {/* @ts-expect-error steps is required for the steps form */}
      <ChatProgress form="steps" label="Gathering" />

      {/* Same for a bar with no value. */}
      {/* @ts-expect-error value is required for the measured form */}
      <ChatProgress form="measured" label="Generating" />

      {/* @ts-expect-error activities is required for the activity form */}
      <ChatProgress form="activity" />

      {/* Every form but activity needs a line to show. */}
      {/* @ts-expect-error label is required */}
      <ChatProgress />

      {/*
        NOTE, and it is the finding rather than a gap: a form's data CAN cross
        to another form without erroring. TypeScript's excess-property check
        runs against the whole union, so `steps` on a `measured` element is
        "a property some member has" and is waved through —
        `<ChatProgress form="measured" label="x" value={1} steps={STEPS} />`
        compiles. What the discriminant does buy is the REQUIRED direction,
        which is the one that renders an empty box, and every case above tests
        it. Discovered by writing the opposite assertion here and watching the
        directive report as unused.
      */}
      {/* @ts-expect-error activities do not belong to the thinking form when they replace its label */}
      <ChatProgress form="thinking" activities={[{ verb: "Reading…", detail: "A book" }]} />

      {/* A receipt with no line to show, and no name for the control that
          brings the log back. */}
      {/* @ts-expect-error receiptText and expandLabel travel with isComplete */}
      <ChatProgress label="Thinking…" isComplete />

      {/* @ts-expect-error expandLabel is required too */}
      <ChatProgress label="Thinking…" isComplete receiptText="Worked for 26 s" />

      {/* A retry handler with no label announces as "button". */}
      {/* @ts-expect-error retryLabel travels with onRetryAction */}
      <ChatProgress label="Thinking…" errorText="Stopped" onRetryAction={() => {}} />

      {/* The form axis is closed — a fifth form is a design decision, not a
          string. */}
      {/* @ts-expect-error unknown form */}
      <ChatProgress form="spinner" label="Thinking…" />

      {/* A parallel run with no lanes is an empty fork. */}
      {/* @ts-expect-error lanes is required for the parallel form */}
      <ChatProgress form="parallel" label="Working" />

      {/* Retry on a step that did not fail offers to redo work that worked. */}
      {/* @ts-expect-error retry belongs to a failed node only */}
      <ChatProgress form="steps" label="R" steps={[{ id: "a", label: "b", status: "done", retryLabel: "Retry", onRetryAction: () => {} }]} />

      {/* @ts-expect-error a failed node's retry handler travels with its label */}
      <ChatProgress form="steps" label="R" steps={[{ id: "a", label: "b", status: "failed", onRetryAction: () => {} }]} />

      {/* Branches go one level deep: a branch has no text edge for a branch of its own. */}
      {/* @ts-expect-error a branch cannot carry branches */}
      <ChatProgress form="steps" label="R" steps={[{ id: "a", label: "b", status: "current", steps: [{ id: "c", label: "d", status: "current", steps: [] }] }]} />

      {/* @ts-expect-error a Stop handler with no name announces as "button" */}
      <ChatProgress label="Thinking…" onStopAction={() => {}} />

      {/* @ts-expect-error reasoning belongs to the thinking form */}
      <ChatProgress form="streaming" label="Writing" reasoning={["x"]} />

      {/* Presence: who truncates, the verb does not. */}
      <ChatProgress form="typing" who="Josef and Wim" label="are typing" />
      <ChatProgress form="typing" who="Wim Crouwel" label="is typing" isHeld />

      {/* @ts-expect-error the typing form needs who, or the line is a bare verb */}
      <ChatProgress form="typing" label="is typing" />

      {/* Presence has no run: nothing a run has applies to it. */}
      {/* @ts-expect-error a presence line has no clock */}
      <ChatProgress form="typing" who="Wim" label="is typing" duration="3 s" />

      {/* @ts-expect-error a presence line cannot fail */}
      <ChatProgress form="typing" who="Wim" label="is typing" errorText="Lost" />

      {/* @ts-expect-error a person typing cannot be stopped */}
      <ChatProgress form="typing" who="Wim" label="is typing" onStopAction={() => {}} stopLabel="Stop" />

      {/* @ts-expect-error a presence line has no receipt */}
      <ChatProgress form="typing" who="Wim" label="is typing" isComplete receiptText="Typed" expandLabel="Show" />

      {/* @ts-expect-error who belongs to the typing form */}
      <ChatProgress form="waiting" who="Wim" label="Waiting" />

      {/* A step's status is one of four treatments, not free text. */}
      {/* @ts-expect-error unknown step status */}
      <ChatProgress form="steps" label="Gathering" steps={[{ id: "a", label: "b", status: "skipped" }]} />
    </>
  );
}
