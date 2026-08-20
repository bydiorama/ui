/**
 * Compile-time contract tests. `tsc --noEmit` is the runner — a
 * `@ts-expect-error` that stops erroring fails the build.
 */

import { ChatProgress, type ChatProgressStep } from "./chat-progress.tsx";

const STEPS: ChatProgressStep[] = [{ id: "a", label: "Tone of voice", status: "done" }];

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

      {/* A step's status is one of three treatments, not free text. */}
      {/* @ts-expect-error unknown step status */}
      <ChatProgress form="steps" label="Gathering" steps={[{ id: "a", label: "b", status: "skipped" }]} />
    </>
  );
}
