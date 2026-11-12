/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { createRef } from "react";

import { ChatRunDock, ChatRunMark, type ChatRun } from "./chat-run-dock.tsx";

const RUNS: ChatRun[] = [
  { id: "cuts", name: "Rendering Story cuts", activity: "2 of 3", elapsed: "1:48", value: 2, max: 3 },
  { id: "kit", name: "Exporting brand kit", activity: "Packaging 248 files" },
];
const stop = (id: string) => void id;

export function Valid() {
  const dock = createRef<HTMLDivElement>();
  const mark = createRef<HTMLDivElement>();
  return (
    <>
      <ChatRunDock aria-label="Background runs" runs={RUNS} />
      <ChatRunDock aria-label="Background runs" runs={RUNS} isHeld onStopAction={stop} stopLabel={(run) => `Stop ${run.name}`} />
      <ChatRunDock aria-label="Background runs" runs={[]} ref={dock} className="mb-xs" data-testid="dock" />
      <ChatRunMark kind="started" label="Rendering Story cuts in the background" />
      <ChatRunMark kind="finished" label="Story cuts finished" detail="3 files" />
      <ChatRunMark kind="finished" label="Story cuts finished" actionLabel="Open" onAction={() => {}} />
      <ChatRunMark kind="failed" label="Export stopped" retryLabel="Retry" onRetryAction={() => {}} />
      <ChatRunMark kind="failed" label="Export stopped" />
      <ChatRunMark kind="stopped" label="You stopped Story cuts" ref={mark} className="mt-sm" />
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error the region must be named — an unnamed landmark is noise */
  const a = <ChatRunDock runs={RUNS} />;
  /* @ts-expect-error runs is required — a dock with nothing to show is not a dock */
  const b = <ChatRunDock aria-label="Background runs" />;
  /* @ts-expect-error a Stop with no name: every Stop needs one */
  const c = <ChatRunDock aria-label="Background runs" runs={RUNS} onStopAction={stop} />;
  /* @ts-expect-error a name with no handler names a button that does nothing */
  const d = <ChatRunDock aria-label="Background runs" runs={RUNS} stopLabel={(run) => run.name} />;
  /* @ts-expect-error the dock owns its role */
  const e = <ChatRunDock aria-label="Background runs" runs={RUNS} role="status" />;
  /* @ts-expect-error a run needs its activity — the row's middle lane is never empty */
  const f = <ChatRunDock aria-label="Background runs" runs={[{ id: "x", name: "X" }]} />;
  /* @ts-expect-error kind is required — a mark says which end of the run it is */
  const g = <ChatRunMark label="Story cuts" />;
  /* @ts-expect-error only a finished run has a result to act on */
  const h = <ChatRunMark kind="failed" label="Export stopped" actionLabel="Open" onAction={() => {}} />;
  /* @ts-expect-error only a failed run can be retried */
  const i = <ChatRunMark kind="finished" label="Story cuts finished" retryLabel="Retry" onRetryAction={() => {}} />;
  /* @ts-expect-error an action without its name */
  const j = <ChatRunMark kind="finished" label="Story cuts finished" onAction={() => {}} />;
  /* @ts-expect-error a retry without its handler */
  const k = <ChatRunMark kind="failed" label="Export stopped" retryLabel="Retry" />;
  /* @ts-expect-error a started mark carries no action */
  const l = <ChatRunMark kind="started" label="Rendering" actionLabel="Open" onAction={() => {}} />;
  /* @ts-expect-error "done" is StatusMatrix's word; a mark says finished */
  const m = <ChatRunMark kind="done" label="Story cuts" />;
  return [a, b, c, d, e, f, g, h, i, j, k, l, m];
}
