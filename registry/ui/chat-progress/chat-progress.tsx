"use client";

import { forwardRef, useState, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { AlertTriangle, CheckCircle, ChevronDown, CloseCircle, MinusCircle } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { useControllableState } from "@/hooks/use-controllable-state";
import { Button } from "@/ui/button";
import { Fade } from "@/ui/fade";
import { Progress } from "@/ui/progress";
import { StatusMatrix, type StatusMatrixStatus } from "@/ui/status-matrix";

/**
 * The forms, lightest first.
 *
 * Three are a turn's LIVE EDGE — one status row with one Status matrix:
 * `waiting` (sent, nothing back yet), `thinking`, `streaming` (text is
 * arriving). The rest are a RUN: `activity` names a source, `steps` is a
 * thought chain, `parallel` is that chain forked into lanes, `measured` knows
 * its total. The agent picks the lightest one that tells the truth, and a
 * form never downgrades mid-run — the caller's rule to keep, because only the
 * caller knows what the run is doing. Precedence when more than one is true
 * is the caller's too: a run › thinking › streaming › waiting, and the loser
 * is not drawn at all.
 *
 * `typing` is not progress at all: it is PEOPLE's presence — "Wim is typing" —
 * in muted ink, and it lives on the composer's top edge, never in the thread,
 * so it never meets the agent's accent matrix and never competes for the
 * turn's live edge (sheet 3Z89 · 408R, "A teammate is typing").
 */
export type ChatProgressForm =
  | "typing"
  | "waiting"
  | "thinking"
  | "streaming"
  | "activity"
  | "steps"
  | "parallel"
  | "measured";

/** One named thing the agent is reading, searching or fetching. */
export interface ChatProgressActivity {
  /** The verb, at the head of the pill: "Reading…", "Searching…". */
  verb: string;
  /** What it is working on. Truncates with an ellipsis; it never wraps. */
  detail: string;
}

/**
 * `current` is the sheet's "running". The name is kept from the first
 * release — a step list written against it still means what it meant.
 */
export type ChatProgressStepStatus = "done" | "current" | "pending" | "failed";

/** A query or a source under a step — "grid systems 1961", "moma.example". */
export interface ChatProgressChip {
  label: string;
  /** A 12px kind glyph — Globe for a site, FileText for a document. */
  icon?: ReactElement;
}

/** A retry offer is a handler and a name together — never one of the two. */
type RetryPair =
  | { onRetryAction?: undefined; retryLabel?: undefined }
  | { onRetryAction: () => void; retryLabel: string };

/** What a node on the spine carries, whatever its depth. */
type ChatProgressNodeBase = {
  id: string;
  label: string;
  /**
   * Slot: the step's KIND glyph — Search, FileText, Sparks. It is what a
   * finished step shows: "kind glyph = done" on the sheet. A finished step
   * without one shows CheckCircle.
   */
  icon?: ReactElement;
  /** Elapsed time, already formatted — "3 s". Sits in the 40px clock lane. */
  duration?: string;
  /** The queries or sources the step touched, as chips under its label. */
  chips?: ChatProgressChip[];
  /**
   * Prose under the label: what the step concluded, or — for a failed one —
   * why it failed and what the run did instead.
   */
  detail?: string;
};

/**
 * A node: a step, or a branch under one. Retry belongs to a failed node only;
 * a handler on a node that has not failed would offer to redo work that
 * worked.
 */
export type ChatProgressNode = ChatProgressNodeBase &
  (
    | { status: Exclude<ChatProgressStepStatus, "failed">; onRetryAction?: undefined; retryLabel?: undefined }
    | ({ status: "failed" } & RetryPair)
  );

/**
 * A step on the chain. Its `steps` are BRANCHES: they leave the rail on a
 * tick rather than indenting a second time, and they go one level deep — the
 * sheet's lanes have a text edge for a branch and none for a branch's branch.
 */
export type ChatProgressStep = ChatProgressNode & { steps?: ChatProgressNode[] };

/** One lane of a parallel run. */
export type ChatProgressLane = {
  id: string;
  /** The lane's name. It never truncates. */
  name: string;
  /** What the lane is doing now. Always truncates to one line. */
  activity: string;
  duration?: string;
  /** The lane's own chain. A lane that has one opens to it, inside its pill. */
  steps?: ChatProgressStep[];
} & (
  | { status: Exclude<ChatProgressStepStatus, "failed">; onRetryAction?: undefined; retryLabel?: undefined }
  | ({ status: "failed" } & RetryPair)
);

interface ChatProgressBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Slot: replaces the thinking matrix. The concepts animate the product's
   * logo mark here, which is a product asset rather than a library one — so
   * the matrix is the default and the mark is passed in.
   */
  icon?: ReactElement;
  /**
   * Hold every matrix in this component on its key frame. One thing moves per
   * TURN, and when the live edge is elsewhere — a task card, a streaming line
   * under this run — this run holds. Which matrix is the live edge is a fact
   * about the whole turn, so the caller decides it.
   */
  isHeld?: boolean;
  /**
   * Elapsed time, already formatted. A status row shows it once the wait
   * passes 5 s; a run's root shows it throughout. The caller decides when,
   * because the caller owns the clock.
   */
  duration?: string;
  /**
   * The run failed. The status line becomes the failure line — the matrix
   * draws its Failed cross in place — and the log above is history.
   */
  errorText?: string;
  /**
   * The user stopped the run. A status row draws the matrix's Stopped square;
   * a run with a body folds to a receipt with MinusCircle.
   */
  stoppedText?: string;
}

/**
 * What each form needs, discriminated by `form`.
 *
 * A union rather than one flat prop bag: `steps` without steps and `measured`
 * without a value are the shapes that would render an empty box, and both
 * are compile errors here.
 */
type ChatProgressFormProps =
  | {
      form?: "thinking";
      /** The waiting line — "Thinking…", then "Still working on it". */
      label: string;
      /**
       * The thought itself, one string per paragraph. Turns the status row
       * into a disclosure on the spine: open and capped at five lines while it
       * runs, folded to its receipt when it is done.
       */
      reasoning?: string[];
    }
  | { form: "waiting" | "streaming"; label: string }
  | {
      form: "activity";
      /** One pill per named source. */
      activities: ChatProgressActivity[];
    }
  | {
      form: "steps";
      /** The run's name — "Researching grid systems". */
      label: string;
      steps: ChatProgressStep[];
    }
  | {
      form: "parallel";
      /** The run's name — "Working on 4 things". */
      label: string;
      /** The count after the name, in muted ink — "1 done". */
      meta?: string;
      lanes: ChatProgressLane[];
    }
  | {
      form: "measured";
      /** What is being measured — "Generating slide 3 of 6". */
      label: string;
      value: number;
      max?: number;
    };

/**
 * The receipt is the collapsed form, and it needs a line to show and a name
 * for the control that re-expands it. Both, or neither.
 */
type ChatProgressReceiptProps =
  | { isComplete?: false; receiptText?: undefined; expandLabel?: undefined }
  | { isComplete: true; receiptText: string; expandLabel: string };

/**
 * Stop, offered in a status row once a wait passes 30 s. A handler and a
 * name together.
 */
type ChatProgressStopProps =
  | { onStopAction?: undefined; stopLabel?: undefined }
  | { onStopAction: () => void; stopLabel: string };

/** Disclosure state, spelled the way §1 spells open/close everywhere. */
interface ChatProgressDisclosureProps {
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * The presence line. One line for everyone typing, never one per person: two
 * are named, three or more are counted — the caller's formatting, since the
 * words are the product's. `who` truncates and `label` never does, so the
 * longest name gives way before the verb (sheet 40E1).
 *
 * Presence has no run, so nothing a run has applies: no clock, no receipt, no
 * Stop or Retry, no failure, no disclosure, no icon. Each is refused here
 * rather than silently ignored.
 */
type ChatProgressTypingProps = Omit<ChatProgressBaseProps, "icon" | "duration" | "errorText" | "stoppedText"> & {
  form: "typing";
  /** Who is typing — "Josef Müller-Brockmann", "Josef and Wim", "3 people". Truncates first. */
  who: string;
  /** The verb after it — "is typing", "are typing". Never truncates. */
  label: string;
  icon?: undefined;
  duration?: undefined;
  errorText?: undefined;
  stoppedText?: undefined;
  isComplete?: undefined;
  receiptText?: undefined;
  expandLabel?: undefined;
  onRetryAction?: undefined;
  retryLabel?: undefined;
  onStopAction?: undefined;
  stopLabel?: undefined;
  isOpen?: undefined;
  defaultIsOpen?: undefined;
  onOpenChange?: undefined;
};

export type ChatProgressProps =
  | ChatProgressTypingProps
  | (ChatProgressBaseProps &
      ChatProgressFormProps &
      ChatProgressReceiptProps &
      RetryPair &
      ChatProgressStopProps &
      ChatProgressDisclosureProps & { who?: undefined });

/**
 * The union, flattened for internal use.
 *
 * Every field is optional here and the PUBLIC type is what guarantees which
 * are present for a given form — the same split Button makes between its
 * discriminated `isIconOnly` API and the one render path underneath.
 */
interface ResolvedProgress {
  form: ChatProgressForm;
  label?: string;
  who?: string;
  meta?: string;
  reasoning?: string[];
  activities?: ChatProgressActivity[];
  steps?: ChatProgressStep[];
  lanes?: ChatProgressLane[];
  value?: number;
  max?: number;
}

type RunStatus = "running" | "done" | "failed" | "stopped";

/**
 * What the agent shows between the question and the answer.
 *
 * ONE component with a form axis, not siblings — the receipt, the motion and
 * the collapse are shared, and separate components would drift apart on
 * precisely those. Every form is laid on the same lanes (node 16 · text edge
 * 24 · clock 40 · chevron 16), which is why reasoning, a chain and lanes nest
 * inside each other without a new indent.
 *
 * It lives inside the receiver block, at the thread's full width, above any
 * partial answer. Never a toast and never an overlay: progress belongs to the
 * turn that produced it.
 */
export const ChatProgress = forwardRef<HTMLDivElement, ChatProgressProps>(function ChatProgress(
  props,
  ref,
) {
  const {
    icon,
    isHeld = false,
    duration,
    errorText,
    stoppedText,
    isComplete = false,
    receiptText,
    expandLabel,
    onRetryAction,
    retryLabel,
    onStopAction,
    stopLabel,
    isOpen,
    defaultIsOpen,
    onOpenChange,
    className,
    // Pulled out of `rest` deliberately: every one of these is a form's own
    // data, and a stray `steps={[...]}` reaching the div would be serialised
    // onto the DOM as an attribute.
    form = "thinking",
    label,
    who,
    meta,
    reasoning,
    activities,
    steps,
    lanes,
    value,
    max,
    ...rest
    // Through `unknown`: the typing branch REFUSES the run's props (each is
    // `undefined` there), so the public union no longer overlaps the flat
    // internal shape. Every one of them reads as absent for a presence line.
  } = props as unknown as ChatProgressBaseProps &
    ChatProgressReceiptProps &
    RetryPair &
    ChatProgressStopProps &
    ChatProgressDisclosureProps &
    Partial<ResolvedProgress>;

  const status: RunStatus = errorText ? "failed" : stoppedText ? "stopped" : isComplete ? "done" : "running";

  // A form with something to fold. Everything else is one line and stays one.
  const hasBody =
    form === "steps" ||
    form === "parallel" ||
    (form === "thinking" && (reasoning?.length ?? 0) > 0) ||
    (status === "done" && (form === "activity" || form === "measured"));

  let content: ReactNode;

  if (form === "typing") {
    content = <PresenceRow who={who ?? ""} label={label ?? ""} isHeld={isHeld} />;
  } else if (status === "failed" || (status === "stopped" && !hasBody) || (!hasBody && isLiveEdge(form) && status === "running")) {
    // ONE status row, and the same element across every state it can reach:
    // a thinking row that fails or is stopped keeps its matrix, which then
    // draws its ending in place instead of a second mark replacing the first.
    const rowStatus: StatusMatrixStatus =
      status === "failed" ? "failed" : status === "stopped" ? "stopped" : (form as "waiting" | "thinking" | "streaming");
    content = (
      <StatusRow
        status={rowStatus}
        text={(status === "failed" ? errorText : status === "stopped" ? stoppedText : label) ?? ""}
        isHeld={isHeld}
        {...(icon && status === "running" && form === "thinking" ? { icon } : {})}
        {...(duration && status === "running" ? { duration } : {})}
        action={
          status === "failed" && onRetryAction && retryLabel ? (
            <Button variant="ghost" size="sm" data-slot="chat-progress-retry" onClick={onRetryAction} className="-my-xs">
              {retryLabel}
            </Button>
          ) : status === "running" && onStopAction && stopLabel ? (
            <Button variant="ghost" size="sm" data-slot="chat-progress-stop" onClick={onStopAction} className="-my-xs">
              {stopLabel}
            </Button>
          ) : null
        }
      />
    );
  } else if (!hasBody) {
    // activity and measured while they run, and a finished live-edge row:
    // nothing to fold, so no disclosure.
    content =
      status === "done" ? (
        <Receipt tone="done" text={receiptText ?? ""} />
      ) : (
        <FormBody form={form} activities={activities ?? []} label={label ?? ""} value={value ?? 0} {...(max !== undefined ? { max } : {})} />
      );
  } else {
    const tone: ReceiptTone =
      status === "stopped" ? "stopped" : hasFailure(steps, lanes) ? "warning" : "done";
    const live = !isHeld && status === "running";

    content = (
      <RunDisclosure
        // Keyed by phase, so the default is re-read when the run settles: a
        // running run is open, and the moment it finishes it folds to its
        // receipt — "the moment the first token lands" — unless the caller
        // pinned it. Nothing is lost by the remount: the running root and the
        // receipt are different glyphs on the same row.
        key={status === "running" ? "running" : "settled"}
        isOpen={isOpen}
        defaultIsOpen={defaultIsOpen ?? status === "running"}
        onOpenChange={onOpenChange}
      >
        {(open) => (
          <>
        {status === "running" ? (
          <RootRow
            form={form}
            label={label ?? ""}
            {...(meta ? { meta } : {})}
            {...(duration ? { duration } : {})}
            {...(icon && form === "thinking" ? { icon } : {})}
            // The root moves only when nothing below it is running in view:
            // the deepest running node is the live edge, and a folded run
            // keeps its moving matrix at the root.
            isRootLive={live && (!open || form !== "steps" || deepestRunning(steps) === null)}
            hasRail={open && form !== "thinking"}
          />
        ) : (
          <ReceiptTrigger
            tone={tone}
            text={(status === "stopped" ? stoppedText : receiptText) ?? ""}
            expandLabel={expandLabel ?? ""}
            // Reasoning and lanes draw their own rail from the root; a chain
            // hangs off the root's.
            hasRail={open && form === "steps"}
          />
        )}
        <Collapsible.Panel data-slot="chat-progress-body">
          {form === "thinking" ? (
            <ReasoningBody paragraphs={reasoning ?? []} isCapped={status === "running"} />
          ) : form === "parallel" ? (
            <Lanes lanes={lanes ?? []} />
          ) : form === "steps" ? (
            <Chain steps={steps ?? []} liveId={live && open ? deepestRunning(steps) : null} />
          ) : (
            <FormBody form={form} activities={activities ?? []} label={label ?? ""} value={value ?? 0} {...(max !== undefined ? { max } : {})} />
          )}
        </Collapsible.Panel>
          </>
        )}
      </RunDisclosure>
    );
  }

  return (
    <div
      ref={ref}
      data-slot="chat-progress"
      data-form={form}
      data-status={status}
      // Politely announced: a reader who asked a question and is waiting needs
      // to be told what is happening, and told again when it stops. Never
      // assertive — nothing here interrupts.
      role="status"
      className={cn("flex w-full flex-col gap-sm", className)}
      {...rest}
    >
      {content}
    </div>
  );
});

/** The run's one disclosure, on the shared controllable-state hook (§4). */
function RunDisclosure({
  isOpen,
  defaultIsOpen,
  onOpenChange,
  children,
}: {
  isOpen: boolean | undefined;
  defaultIsOpen: boolean;
  onOpenChange: ((isOpen: boolean) => void) | undefined;
  children: (open: boolean) => ReactNode;
}) {
  const [open, setOpen] = useControllableState({ value: isOpen, defaultValue: defaultIsOpen, onChange: onOpenChange });
  return (
    <Collapsible.Root open={open} onOpenChange={(next: boolean) => setOpen(next)} className="flex flex-col">
      {children(open)}
    </Collapsible.Root>
  );
}

function isLiveEdge(form: ChatProgressForm): form is "waiting" | "thinking" | "streaming" {
  return form === "waiting" || form === "thinking" || form === "streaming";
}

/** True when any node anywhere in the run failed — the receipt says so. */
function hasFailure(steps?: ChatProgressStep[], lanes?: ChatProgressLane[]): boolean {
  const inSteps = (list?: ChatProgressStep[]): boolean =>
    (list ?? []).some((s) => s.status === "failed" || (s.steps ?? []).some((b) => b.status === "failed"));
  return inSteps(steps) || (lanes ?? []).some((l) => l.status === "failed" || inSteps(l.steps));
}

/**
 * The id of the deepest running node: a running branch beats its running
 * parent. `null` when nothing below the root runs.
 */
function deepestRunning(steps?: ChatProgressStep[]): string | null {
  for (const step of steps ?? []) {
    if (step.status !== "current") continue;
    const branch = (step.steps ?? []).find((b) => b.status === "current");
    return branch ? branch.id : step.id;
  }
  return null;
}

/* ─── Shared lanes ────────────────────────────────────────────────────────── */

/** The 40px clock lane: caption, tabular, right-aligned. Empty keeps its width. */
function Clock({ children }: { children?: string | undefined }) {
  return (
    <span
      data-slot="chat-progress-clock"
      className="w-10 shrink-0 text-end font-body text-caption text-ink-muted tabular-nums"
    >
      {children}
    </span>
  );
}

/** The 16px chevron slot. Empty on every row but the root, so clocks align. */
function ChevronSlot({ children }: { children?: ReactNode }) {
  return <span data-slot="chat-progress-chevron" className="flex size-4 shrink-0 items-center justify-center">{children}</span>;
}

/**
 * The disclosure chevron. It rotates rather than swapping glyph, so the two
 * states are one object moving instead of two objects replacing each other.
 * Points down folded and up open — the sheet and Accordion now agree.
 */
function Chevron({ group }: { group: "summary" | "lane" }) {
  return (
    <ChevronDown
      size={12}
      aria-hidden="true"
      className={cn(
        "shrink-0 text-ink-muted",
        // `rotate`, not `transform`: v4 writes the standalone property, so a
        // transition naming `transform` would cover nothing and the chevron
        // would snap.
        "transition-[rotate]",
        motionMicro,
        group === "summary" ? "group-data-[panel-open]/summary:rotate-180" : "group-data-[panel-open]/lane:rotate-180",
      )}
    />
  );
}

/**
 * The node lane: a 16px column holding the glyph, and the rail below it. The
 * rail is 1px of border-default at x 8–9 — the glyph's centre line — and
 * stops 4px clear of the glyph above and the one below.
 */
function NodeLane({ glyph, rail }: { glyph: ReactNode; rail: "none" | "short" | "join" }) {
  return (
    <span
      aria-hidden="true"
      data-slot="chat-progress-node"
      className={cn("flex w-4 shrink-0 flex-col gap-xs", rail === "short" && "pb-xs")}
    >
      <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:shrink-0">{glyph}</span>
      {rail !== "none" ? (
        <span data-slot="chat-progress-rail" className="ms-2 min-h-1 w-px flex-1 bg-edge-default" />
      ) : null}
    </span>
  );
}

/** The pending node's empty ring — border-default at the sheet's 1.5px. */
function PendingRing() {
  return (
    <span
      data-slot="chat-progress-pending"
      className="size-[14px] shrink-0 rounded-full border-hairline border-edge-default"
    />
  );
}

/** A node's glyph by status: kind or check when done, matrix running, ring pending, cross failed. */
function NodeGlyph({ node, isLive }: { node: Pick<ChatProgressNodeBase, "icon"> & { status: ChatProgressStepStatus }; isLive: boolean }) {
  switch (node.status) {
    case "current":
      return <StatusMatrix status="working" size="sm" isHeld={!isLive} />;
    case "pending":
      return <PendingRing />;
    case "failed":
      return <CloseCircle size={14} aria-hidden="true" className="text-danger" />;
    default:
      return node.icon ? (
        <span data-slot="chat-progress-kind" className="flex text-ink-muted [&_svg]:size-[14px]">
          {node.icon}
        </span>
      ) : (
        <CheckCircle size={14} aria-hidden="true" className="text-success" />
      );
  }
}

/** A node's label ink: the running node steps forward; failure is danger; the rest recede. */
function labelInk(status: ChatProgressStepStatus): string {
  return status === "current"
    ? "font-medium text-ink-secondary"
    : status === "failed"
      ? "font-medium text-danger"
      : "text-ink-muted";
}

/* ─── Status row: the live edge ───────────────────────────────────────────── */

function StatusRow({
  status,
  text,
  isHeld,
  icon,
  duration,
  action,
}: {
  status: StatusMatrixStatus;
  text: string;
  isHeld: boolean;
  icon?: ReactElement;
  duration?: string;
  action: ReactNode;
}) {
  return (
    <div
      data-slot={status === "failed" ? "chat-progress-failure" : "chat-progress-thinking"}
      data-signal={status}
      // The slot is SIZED. A caller passing their product's mark here would
      // otherwise get griddy's 24px presentation attribute beside a 13px
      // line — the defect `icon-slot.browser.test.tsx` exists for.
      className="flex min-h-4 items-center gap-sm [&_svg]:size-4 [&_svg]:shrink-0"
    >
      {icon ?? <StatusMatrix status={status as Exclude<StatusMatrixStatus, "progress">} isHeld={isHeld} />}
      <span
        className={cn(
          "min-w-0 flex-1 font-body text-body-sm",
          status === "failed" ? "font-medium text-danger" : "text-ink-muted",
        )}
      >
        {text}
      </span>
      {duration ? (
        // A status row's clock can read "1 min 12 s", so it is the lane's
        // MINIMUM, not its width.
        <span
          data-slot="chat-progress-clock"
          className="min-w-10 shrink-0 text-end font-body text-caption text-ink-muted tabular-nums"
        >
          {duration}
        </span>
      ) : null}
      {action}
    </div>
  );
}

/**
 * People's presence (sheet 40CC / 40E5): the Typing matrix — muted ink, the
 * matrix's own choice for a person — then one caption line in which the name
 * gives way before the verb does.
 */
function PresenceRow({ who, label, isHeld }: { who: string; label: string; isHeld: boolean }) {
  return (
    <div data-slot="chat-progress-presence" data-signal="typing" className="flex min-h-4 items-center gap-sm">
      <StatusMatrix status="typing" isHeld={isHeld} />
      <span className="flex min-w-0 flex-1 font-body text-caption text-ink-muted">
        <span data-slot="chat-progress-presence-who" className="min-w-0 truncate">
          {who}
        </span>
        {/* The space belongs to the verb, so a truncated name keeps it. */}
        <span className="shrink-0 whitespace-pre">{` ${label}`}</span>
      </span>
    </div>
  );
}

/* ─── Root row and receipt ────────────────────────────────────────────────── */

type ReceiptTone = "done" | "warning" | "stopped";

function ReceiptGlyph({ tone }: { tone: ReceiptTone }) {
  return tone === "warning" ? (
    <AlertTriangle size={16} aria-hidden="true" className="text-warning" />
  ) : tone === "stopped" ? (
    <MinusCircle size={16} aria-hidden="true" className="text-ink-muted" />
  ) : (
    <CheckCircle size={16} aria-hidden="true" className="text-success" />
  );
}

const TRIGGER =
  "group/summary flex w-full min-w-0 cursor-pointer items-start gap-sm rounded-sm text-start " +
  "focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-edge-focus";

/** A finished run with nothing to unfold — one line, no control. */
function Receipt({ tone, text }: { tone: ReceiptTone; text: string }) {
  return (
    <div data-slot="chat-progress-receipt" className="flex items-center gap-sm">
      <ReceiptGlyph tone={tone} />
      <span className="min-w-0 flex-1 font-body text-body-sm text-ink-muted">{text}</span>
    </div>
  );
}

/**
 * The receipt: the run folded to its root. Hover takes the ink to secondary,
 * with no fill. The line says what HAPPENED; `expandLabel` says what the
 * control DOES, and both are in the name.
 */
function ReceiptTrigger({
  tone,
  text,
  expandLabel,
  hasRail,
}: {
  tone: ReceiptTone;
  text: string;
  expandLabel: string;
  hasRail: boolean;
}) {
  return (
    <div className="flex gap-sm">
      <NodeLane glyph={<ReceiptGlyph tone={tone} />} rail={hasRail ? "short" : "none"} />
      <div className={cn("min-w-0 flex-1", hasRail && "pb-md")}>
        <Collapsible.Trigger data-slot="chat-progress-summary" className={TRIGGER}>
          <span className="min-w-0 flex-1 font-body text-body-sm text-ink-muted transition-colors group-hover/summary:text-ink-secondary">
            {text}
          </span>
          <ChevronSlot>
            <Chevron group="summary" />
          </ChevronSlot>
          {/* The trigger's accessible name. The receipt line alone says what
              happened and not what the control does. */}
          <span className="sr-only">{expandLabel}</span>
        </Collapsible.Trigger>
      </div>
    </div>
  );
}

/** The running root: the run's own glyph, its name, its clock, its chevron. */
function RootRow({
  form,
  label,
  meta,
  duration,
  icon,
  isRootLive,
  hasRail,
}: {
  form: ChatProgressForm;
  label: string;
  meta?: string;
  duration?: string;
  icon?: ReactElement;
  isRootLive: boolean;
  hasRail: boolean;
}) {
  const glyph = icon ?? <StatusMatrix status={form === "thinking" ? "thinking" : "working"} isHeld={!isRootLive} />;
  return (
    // The root glyph is 16 — a caller's mark in the icon slot included.
    <div className="flex gap-sm [&_[data-slot=chat-progress-node]_svg]:size-4">
      <NodeLane glyph={glyph} rail={hasRail ? (form === "parallel" ? "none" : "short") : "none"} />
      <div className={cn("min-w-0 flex-1", hasRail && form === "steps" && "pb-md")}>
        <Collapsible.Trigger
          data-slot="chat-progress-summary"
          // The parallel root sits over the lanes' pills, so its clock lines
          // up with theirs: the pills' own 12px inset, repeated.
          className={cn(TRIGGER, form === "parallel" && "pe-md")}
        >
          <span className="min-w-0 flex-1 font-body text-label-md text-ink-secondary">
            {label}
            {meta ? <span className="font-regular text-ink-muted">{` · ${meta}`}</span> : null}
          </span>
          <Clock>{duration}</Clock>
          <ChevronSlot>
            <Chevron group="summary" />
          </ChevronSlot>
        </Collapsible.Trigger>
      </div>
    </div>
  );
}

/* ─── Reasoning ───────────────────────────────────────────────────────────── */

/**
 * The thought, hanging from the root at the 24px text edge with the rail at
 * its full height. While it runs it is capped at five lines and older thought
 * fades out under the root; done, it is the whole text.
 */
function ReasoningBody({ paragraphs, isCapped }: { paragraphs: string[]; isCapped: boolean }) {
  return (
    <div data-slot="chat-progress-reasoning" className="flex pt-xs">
      <span aria-hidden="true" className="ms-2 me-[15px] w-px shrink-0 bg-edge-default" />
      <div
        // Not announced as it streams: the run's own status line already says
        // "Thinking", and a polite region re-reading every sentence of thought
        // would drown it. The finished text is reachable by re-opening.
        aria-live="off"
        className={cn(
          // The box carries the paragraphs' role, so `lh` below is THEIR line.
          "relative flex min-w-0 flex-1 flex-col pt-xs font-body text-body-sm",
          // Five lines, plus the 4px above. In `lh`, not px: the sheet draws
          // 5 × 20, but the role's own leading is what the lines are, and a
          // cap in px would cut the sixth line through the middle the day the
          // role is retuned. New text arrives at the bottom, so the box is
          // anchored there and clips at the top.
          isCapped ? "h-[calc(5lh+var(--ui-space-xs))] justify-end overflow-clip" : "gap-sm",
        )}
      >
        {paragraphs.map((p, i) => (
          <p key={i} className="font-body text-body-sm text-ink-muted">
            {p}
          </p>
        ))}
        {isCapped ? <Fade side="top" size="sm" ground="base" /> : null}
      </div>
    </div>
  );
}

/* ─── Thought chain ───────────────────────────────────────────────────────── */

/** Chips and prose under a node's label. */
function NodeExtras({ node }: { node: ChatProgressNodeBase }) {
  return (
    <>
      {node.chips?.length ? (
        <span data-slot="chat-progress-chips" className="mt-1.5 flex flex-wrap gap-xs">
          {node.chips.map((chip) => (
            <span
              key={chip.label}
              data-slot="chat-progress-chip"
              className="flex items-center gap-xs rounded-sm bg-elevated px-1.5 py-0.5 [&_svg]:size-3 [&_svg]:shrink-0"
            >
              {chip.icon ? <span className="flex text-ink-muted">{chip.icon}</span> : null}
              <span className="font-body text-label-sm text-ink-muted">{chip.label}</span>
            </span>
          ))}
        </span>
      ) : null}
      {node.detail ? (
        // Prose stops short of both trailing lanes (40 + gap 8 + 16 = 64).
        <span data-slot="chat-progress-detail" className="mt-xs pe-16 font-body text-label-sm text-ink-muted">
          {node.detail}
        </span>
      ) : null}
    </>
  );
}

/** The label row's trailing lanes: the clock, or Retry across it when the node failed. */
function NodeTrailing({ node }: { node: ChatProgressNode }) {
  return (
    <>
      {node.status === "failed" && node.onRetryAction && node.retryLabel ? (
        <Button variant="ghost" size="sm" data-slot="chat-progress-retry" onClick={node.onRetryAction} className="-my-xs">
          {node.retryLabel}
        </Button>
      ) : (
        <Clock>{node.duration}</Clock>
      )}
      <ChevronSlot />
    </>
  );
}

function Chain({ steps, liveId }: { steps: ChatProgressStep[]; liveId: string | null }) {
  return (
    <ul data-slot="chat-progress-steps" className="flex flex-col">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const branches = step.steps ?? [];
        return (
          <li key={step.id} data-slot="chat-progress-step" data-step-status={step.status} className="flex flex-col">
            <div className="flex gap-sm">
              <NodeLane
                glyph={<NodeGlyph node={step} isLive={liveId === step.id} />}
                // A step with branches has no gap under its glyph's rail: its
                // rail IS the line its branches tick off.
                rail={isLast && branches.length === 0 ? "none" : branches.length > 0 ? "join" : "short"}
              />
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col",
                  isLast && branches.length === 0 ? "" : branches.length > 0 ? "pb-sm" : "pb-md",
                )}
              >
                <span className="flex items-start gap-sm">
                  <span data-slot="chat-progress-label" className={cn("min-w-0 flex-1 font-body text-body-sm", labelInk(step.status))}>
                    {step.label}
                  </span>
                  <NodeTrailing node={step} />
                </span>
                <NodeExtras node={step} />
              </div>
            </div>
            {branches.length ? (
              <ul data-slot="chat-progress-branches" className="flex flex-col">
                {branches.map((branch, j) => {
                  const isLastBranch = j === branches.length - 1;
                  return (
                    <li key={branch.id} data-slot="chat-progress-branch" data-step-status={branch.status} className="flex">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "ms-2 w-px shrink-0 bg-edge-default",
                          // The last branch: the rail runs on to the next
                          // node and stops 4px short of it — or, when nothing
                          // follows, ends at this branch's tick.
                          isLastBranch && (isLast ? "h-[9px]" : "mb-xs"),
                        )}
                      />
                      {/* The tick: leaves the rail at the first line's centre
                          and stops 4px short of the branch's glyph. */}
                      <span aria-hidden="true" className="me-xs mt-2 h-px w-[11px] shrink-0 bg-edge-default" />
                      <div
                        className={cn(
                          "flex min-w-0 flex-1 flex-col",
                          // space-sm under a branch, space-md under the last
                          // one before the next step, nothing when the chain
                          // ends here.
                          !isLastBranch ? "pb-sm" : !isLast ? "pb-md" : "",
                        )}
                      >
                        <span className="flex items-start gap-sm">
                          <span data-slot="chat-progress-glyph" aria-hidden="true" className="flex shrink-0">
                            <NodeGlyph node={branch} isLive={liveId === branch.id} />
                          </span>
                          <span data-slot="chat-progress-label" className={cn("min-w-0 flex-1 font-body text-body-sm", labelInk(branch.status))}>
                            {branch.label}
                          </span>
                          <NodeTrailing node={branch} />
                        </span>
                        <span className="flex flex-col ps-[22px]">
                          <NodeExtras node={branch} />
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/* ─── Parallel lanes ──────────────────────────────────────────────────────── */

const PILL = "rounded-md bg-elevated";

/**
 * A closed lane's row: the ACTIVITY PILL's own box — py-sm around one line —
 * because a lane is that pill with a status glyph and a clock. The sheet
 * fixes it at 32px; at the type roles' leading that would inset the text
 * 7.2px against the activity pill's 8, so the two would stop being one object.
 */
const LANE_ROW = "flex min-h-8 items-center gap-sm py-sm";

function LaneGlyph({ lane }: { lane: ChatProgressLane }) {
  return lane.status === "current" ? (
    // A running lane holds Working's key frame: only the root's matrix moves.
    <StatusMatrix status="working" size="sm" isHeld />
  ) : lane.status === "done" ? (
    <CheckCircle size={14} aria-hidden="true" className="shrink-0 text-success" />
  ) : lane.status === "failed" ? (
    <CloseCircle size={14} aria-hidden="true" className="shrink-0 text-danger" />
  ) : (
    <PendingRing />
  );
}

/** One lane: the activity pill — glyph · 104px name · activity · clock · chevron. */
function Lane({ lane }: { lane: ChatProgressLane }) {
  const [isOpen, setIsOpen] = useState(false);
  const canOpen = (lane.steps?.length ?? 0) > 0 && lane.status !== "failed";
  // The name lane: 104 in a pill, 102 in an open lane — where the glyph sits
  // in a 16px node lane instead of at 14, so the activity column still lines up.
  const name = (width: "w-[104px]" | "w-[102px]") => (
    <span
      data-slot="chat-progress-lane-name"
      className={cn(
        "shrink-0 text-start font-body text-label-md",
        width,
        lane.status === "pending" ? "text-ink-muted" : "text-ink-secondary",
      )}
    >
      {lane.name}
    </span>
  );
  const activity = (
    <span
      data-slot="chat-progress-lane-activity"
      className={cn(
        "min-w-0 flex-1 truncate text-start font-body text-body-sm",
        lane.status === "failed" ? "font-medium text-danger" : "text-ink-muted",
      )}
    >
      {lane.activity}
    </span>
  );

  if (lane.status === "failed") {
    return (
      <div data-slot="chat-progress-lane" data-lane-status="failed" className={cn(PILL, LANE_ROW, "ps-md pe-xs")}>
        <LaneGlyph lane={lane} />
        {name("w-[104px]")}
        {activity}
        {lane.onRetryAction && lane.retryLabel ? (
          <Button variant="ghost" size="sm" data-slot="chat-progress-retry" onClick={lane.onRetryAction} className="-my-xs">
            {lane.retryLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  if (!canOpen) {
    return (
      <div data-slot="chat-progress-lane" data-lane-status={lane.status} className={cn(PILL, LANE_ROW, "px-md")}>
        <LaneGlyph lane={lane} />
        {name("w-[104px]")}
        {activity}
        {lane.status === "pending" && !lane.duration ? null : (
          <>
            <Clock>{lane.duration}</Clock>
            <ChevronSlot />
          </>
        )}
      </div>
    );
  }

  // A lane with a chain of its own opens to it, inside its pill: its glyph
  // heads a spine of its own, on the same lanes one level in.
  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={(next: boolean) => setIsOpen(next)}
      data-slot="chat-progress-lane"
      data-lane-status={lane.status}
      className={cn(PILL, "flex flex-col", isOpen && "px-md py-sm")}
    >
      {isOpen ? (
        <div className="flex gap-sm">
          <NodeLane glyph={<LaneGlyph lane={lane} />} rail="short" />
          <div className="min-w-0 flex-1 pb-md">
            <Collapsible.Trigger className={cn(TRIGGER, "group/lane")}>
              {name("w-[102px]")}
              {activity}
              <Clock>{lane.duration}</Clock>
              <ChevronSlot>
                <Chevron group="lane" />
              </ChevronSlot>
            </Collapsible.Trigger>
          </div>
        </div>
      ) : (
        <Collapsible.Trigger className={cn(TRIGGER, LANE_ROW, "group/lane px-md")}>
          <LaneGlyph lane={lane} />
          {name("w-[104px]")}
          {activity}
          <Clock>{lane.duration}</Clock>
          <ChevronSlot>
            <Chevron group="lane" />
          </ChevronSlot>
        </Collapsible.Trigger>
      )}
      <Collapsible.Panel>
        <Chain steps={lane.steps ?? []} liveId={null} />
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

/**
 * The spine, forked: every lane is a branch joined by a tick, and the rail
 * ends at the last one because nothing follows — the drawing itself says "at
 * once", where a chain says "then". Lanes keep their order for the whole run.
 */
function Lanes({ lanes }: { lanes: ChatProgressLane[] }) {
  return (
    <div className="flex flex-col">
      {/* The stub from the root's glyph to the first lane: 4px clear, 4px of rail. */}
      <span aria-hidden="true" className="ms-2 mt-xs h-1 w-px bg-edge-default" />
      <ul data-slot="chat-progress-lanes" className="flex flex-col">
        {lanes.map((lane, i) => {
          const isLast = i === lanes.length - 1;
          return (
            <li key={lane.id} className="flex">
              <span aria-hidden="true" className={cn("ms-2 w-px shrink-0 bg-edge-default", isLast && "h-[17px]")} />
              {/* The tick meets the pill at its centre line, 16px down. */}
              <span aria-hidden="true" className="me-xs mt-4 h-px w-[11px] shrink-0 bg-edge-default" />
              <div className={cn("flex min-w-0 flex-1 flex-col", !isLast && "pb-xs")}>
                <Lane lane={lane} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── Activity and measured ───────────────────────────────────────────────── */

function FormBody(props: {
  form: ChatProgressForm;
  activities: ChatProgressActivity[];
  label: string;
  value: number;
  max?: number;
}) {
  if (props.form === "activity") {
    return (
      <div data-slot="chat-progress-activities" className="flex flex-col gap-sm">
        {props.activities.map((activity) => (
          <div
            key={`${activity.verb}-${activity.detail}`}
            data-slot="chat-progress-activity"
            // The same lift the sender bubble takes — bg-elevated, radius-md —
            // so a named source reads as a quoted object rather than as prose.
            className="flex items-center gap-sm rounded-md bg-elevated px-md py-sm"
          >
            <span
              data-slot="chat-progress-activity-verb"
              className="shrink-0 font-body text-label-md text-ink-secondary"
            >
              {activity.verb}
            </span>
            {/* Truncates; it never wraps. A source title that wraps turns a
                one-line status into a paragraph the reader has to parse. */}
            <span
              data-slot="chat-progress-activity-detail"
              className="min-w-0 flex-1 truncate font-body text-body-sm text-ink-muted"
            >
              {activity.detail}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // The Progress primitive, not a hand-rolled track: a bar drawn here would
  // have no role="progressbar", no aria-valuenow, and no reason to reach for
  // --ui-bg-accent-legible — which is the SC 1.4.11 failure that role exists
  // to prevent.
  return (
    <Progress
      data-slot="chat-progress-measured"
      size="sm"
      hasValueText
      label={props.label}
      value={props.value}
      {...(props.max !== undefined ? { max: props.max } : {})}
    />
  );
}
