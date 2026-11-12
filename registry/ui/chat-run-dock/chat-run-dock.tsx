"use client";

import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
} from "react";
import { ArrowUpRight, CheckCircle, CloseCircle, MinusCircle, SquareRounded } from "griddy-icons";

import { cn } from "@/lib/cn";
import { Button } from "@/ui/button";
import { StatusMatrix } from "@/ui/status-matrix";

// ---------------------------------------------------------------- the dock

/** One background run, as its dock row draws it. */
export interface ChatRun {
  /** Stable across updates — the row, its matrix and its Stop are keyed by it. */
  id: string;
  /** What the run is — "Rendering Story cuts". label-md, never wraps. */
  name: string;
  /** What it is doing now — "2 of 3 · keeps going while you chat". Truncates to one line. */
  activity: string;
  /** Elapsed time, already formatted: "1:48". The lane keeps its width when absent. */
  elapsed?: string;
  /**
   * A measurement, when the run has one. Present: the row's matrix is a
   * Progress meter at `value / max`. Absent: Working — a run that cannot
   * say how far it is never pretends to (StatusMatrix's own rule).
   */
  value?: number;
  /** Default 100, as StatusMatrix and Progress read it. */
  max?: number;
}

interface ChatRunDockBaseProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role" | "aria-label" | "aria-labelledby"> {
  /** One row per run, in the order given. An empty list renders nothing. */
  runs: ChatRun[];
  /**
   * Hold every row's matrix on its key frame. Set it while the THREAD has a
   * live edge — something moving in the turn — and clear it once the thread
   * is idle, so the page has one moving thing at a time (Chat Progress sheet,
   * 01 Live edge, "Two regions, one motion"). Which matrix is the live edge
   * is a fact about the whole page, which the dock cannot see; the caller
   * decides. Even unheld, only the FIRST row moves and the rest hold their
   * key frame: one live matrix per region (Status matrix sheet, 42AW), so a
   * dock of three runs is still one moving thing.
   */
  isHeld?: boolean;
  /** The region's name — "Background runs". Required: a landmark nobody can tell apart is noise. */
  "aria-label": string;
}

/**
 * Stop is a handler and a name together. The name is per run, because three
 * buttons all called "Stop" in one region are three buttons nobody can tell
 * apart (SC 2.4.6) — `stopLabel` receives the run and returns "Stop
 * Rendering Story cuts".
 */
type ChatRunDockStopProps =
  | { onStopAction: (id: string) => void; stopLabel: (run: ChatRun) => string }
  | { onStopAction?: undefined; stopLabel?: undefined };

export type ChatRunDockProps = ChatRunDockBaseProps & ChatRunDockStopProps;

/**
 * The background-run dock: work that outlives its turn, shown above the
 * composer while the conversation carries on.
 *
 * Part of the composer's block, never a toast and never an overlay — it
 * scrolls nowhere. Inset `space-xl` on each side of the composer's pill so
 * it reads as tucked behind it; the caller's block puts `gap-xs` between the
 * two. One 32px row per run: matrix · name · activity · clock · Stop. When a
 * run ends its row goes and a `ChatRunMark` arrives in the thread instead.
 */
export const ChatRunDock = forwardRef<HTMLDivElement, ChatRunDockProps>(function ChatRunDock(props, ref) {
  const { runs, isHeld = false, onStopAction, stopLabel, className, ...rest } = props;

  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current!, []);

  // FOCUS IS NEVER LOST (CONVENTIONS §10). Stop ends the run, and the run's
  // row — the focused button with it — leaves when the caller drops it from
  // `runs`. That may be a render later or a network round-trip later, so the
  // index is remembered at the click and acted on when the row actually goes,
  // and only if focus really was lost (it is still on the body): a reader who
  // has moved on in the meantime is not pulled back.
  const stopped = useRef<{ id: string; index: number } | null>(null);
  useLayoutEffect(() => {
    const pending = stopped.current;
    if (!pending || runs.some((run) => run.id === pending.id)) return;
    stopped.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return;
    const stops = rootRef.current?.querySelectorAll<HTMLElement>('[data-slot="chat-run-dock-stop"]');
    if (stops?.length) stops[Math.min(pending.index, stops.length - 1)]!.focus();
  }, [runs]);

  if (runs.length === 0) return null;

  return (
    <div
      ref={rootRef}
      role="region"
      data-slot="chat-run-dock"
      {...(isHeld ? { "data-held": "" } : {})}
      className={cn(
        // Inset space-xl each side of the composer's pill (Chat Progress
        // sheet, 3ZIP-0, drawn as calc(100% - 48px)): the dock is narrower
        // than the pill it sits on, which is what makes it read as tucked
        // behind it rather than as a second card. Owned here, not at the call
        // site, so every composer block gets the same tuck.
        "mx-xl rounded-lg bg-elevated p-xs",
        className,
      )}
      {...rest}
    >
      <ul data-slot="chat-run-dock-list" className="flex flex-col">
        {runs.map((run, index) => {
          const isMeasured = run.value !== undefined;
          // One live matrix per region: the first run moves, the rest hold.
          const rowHeld = isHeld || index > 0;
          return (
            <li
              key={run.id}
              data-slot="chat-run-dock-row"
              data-measured={isMeasured ? "" : undefined}
              // 32px rows, ps-md / pe-xs: the trailing inset is the small one
              // because Stop is a 24px control with its own padding, and the
              // sheet lines its edge up 8px from the dock's (xs + xs).
              className="flex h-8 items-center gap-sm ps-md pe-xs"
            >
              {isMeasured ? (
                <StatusMatrix status="progress" value={run.value!} {...(run.max !== undefined ? { max: run.max } : {})} size="sm" isHeld={rowHeld} />
              ) : (
                <StatusMatrix status="working" size="sm" isHeld={rowHeld} />
              )}
              <span
                data-slot="chat-run-dock-name"
                // Natural width, so the activity takes what is left. It can
                // still shrink (and truncate) as a last resort: the activity's
                // flex-basis is 0, so a long name only gives way once the
                // activity has nothing left to give.
                className="min-w-0 truncate font-body text-label-md text-ink-secondary"
              >
                {run.name}
              </span>
              <span
                data-slot="chat-run-dock-activity"
                className="min-w-0 flex-1 truncate font-body text-body-sm text-ink-muted"
              >
                {run.activity}
              </span>
              <span
                data-slot="chat-run-dock-clock"
                // A fixed 40px lane, right-aligned, tabular — the parallel
                // lane's clock (Chat Progress sheet, 04 Parallel), so "1:48"
                // and "0:12" stack and a ticking clock never nudges the row.
                className="w-10 shrink-0 text-end font-body text-caption tabular-nums text-ink-muted"
              >
                {run.elapsed}
              </span>
              {onStopAction && stopLabel ? (
                <Button
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  aria-label={stopLabel(run)}
                  data-slot="chat-run-dock-stop"
                  // `SquareRounded`, not the `Stop` the sheet names: griddy's
                  // Stop hard-codes fill="black", so it cannot take the ink
                  // and check:licensing rejects it (CONVENTIONS §7). The
                  // regular weight is the drawn outline.
                  icon={<SquareRounded />}
                  onClick={() => {
                    stopped.current = { id: run.id, index };
                    onStopAction(run.id);
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
});

// ---------------------------------------------------------------- thread marks

/**
 * Where a background run left the thread. `started` at the turn that
 * launched it; one of the three endings at the point it ended.
 */
export type ChatRunMarkKind = "started" | "finished" | "failed" | "stopped";

interface ChatRunMarkBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * The line, in words that say the outcome — "Story cuts finished", "Brand
   * kit export stopped at 180 of 248 files". The glyph and its ink are never
   * the only channel (SC 1.4.1). Bold on a finished mark.
   */
  label: string;
  /** Follows the label after a middot — "3 files · 2 min 6 s". */
  detail?: string;
}

/** A result's action is a handler and its name together — "Open". */
type ChatRunMarkActionProps =
  | { actionLabel: string; onAction: () => void }
  | { actionLabel?: undefined; onAction?: undefined };

/** A retry is a handler and its name together — never one of the two. */
type ChatRunMarkRetryProps =
  | { retryLabel: string; onRetryAction: () => void }
  | { retryLabel?: undefined; onRetryAction?: undefined };

/**
 * What each kind may carry. Only a finished run has a result to act on, and
 * only a failed one can be retried — so `onAction` on a failed mark, or a
 * retry on a finished one, does not compile.
 */
type ChatRunMarkKindProps =
  | { kind: "started" | "stopped"; actionLabel?: undefined; onAction?: undefined; retryLabel?: undefined; onRetryAction?: undefined }
  | ({ kind: "finished"; retryLabel?: undefined; onRetryAction?: undefined } & ChatRunMarkActionProps)
  | ({ kind: "failed"; actionLabel?: undefined; onAction?: undefined } & ChatRunMarkRetryProps);

export type ChatRunMarkProps = ChatRunMarkBaseProps & ChatRunMarkKindProps;

/** Glyph and ink per kind. Literal class strings — Tailwind finds utilities by scanning source. */
const MARK = {
  started: { Glyph: ArrowUpRight, glyph: "text-ink-muted", line: "text-ink-muted" },
  finished: { Glyph: CheckCircle, glyph: "text-success", line: "text-ink-secondary" },
  failed: { Glyph: CloseCircle, glyph: "text-danger", line: "text-danger" },
  stopped: { Glyph: MinusCircle, glyph: "text-ink-muted", line: "text-ink-muted" },
} as const satisfies Record<ChatRunMarkKind, { Glyph: unknown; glyph: string; line: string }>;

/**
 * A background run's line in the thread: where it started, and how it ended.
 *
 * One line on the root's metrics — a 16px glyph, gap-sm, body-sm — so it sits
 * in the thread exactly where a turn's own status line would. Started is
 * muted; finished carries the result's action; failed is Chat Progress's
 * failure line with Retry; stopped is muted, because stopping was the
 * reader's act, not a result.
 */
export const ChatRunMark = forwardRef<HTMLDivElement, ChatRunMarkProps>(function ChatRunMark(props, ref) {
  const { kind, label, detail, actionLabel, onAction, retryLabel, onRetryAction, className, ...rest } = props;
  const { Glyph, glyph, line } = MARK[kind];

  return (
    <div
      ref={ref}
      data-slot="chat-run-mark"
      data-kind={kind}
      // min-h-8 on every kind (the sheet's minHeight 32): a mark with a 32px
      // action and one without keep the same rhythm down the thread.
      className={cn("flex min-h-8 items-center gap-sm", className)}
      {...rest}
    >
      <Glyph aria-hidden="true" data-slot="chat-run-mark-glyph" className={cn("size-4 shrink-0", glyph)} />
      <p data-slot="chat-run-mark-text" className={cn("min-w-0 flex-1 font-body text-body-sm", line)}>
        {/* font-bold: the system's ladder puts 600 at `bold` (semibold is
            550). The sheet draws the name at 600 (3ZJU-0). */}
        {kind === "finished" ? <span className="font-bold">{label}</span> : label}
        {detail ? ` · ${detail}` : null}
      </p>
      {kind === "finished" && onAction && actionLabel ? (
        <Button variant="secondary" size="md" data-slot="chat-run-mark-action" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
      {kind === "failed" && onRetryAction && retryLabel ? (
        <Button variant="ghost" size="sm" data-slot="chat-run-mark-retry" onClick={onRetryAction}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
});
