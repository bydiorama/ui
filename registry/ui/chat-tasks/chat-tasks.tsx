"use client";

import { forwardRef, useLayoutEffect, useRef, type HTMLAttributes, type ReactElement } from "react";
import { Collapsible } from "@base-ui/react/collapsible";
import { CheckCircle, ChevronDown, Close, CloseCircle, ListBulleted, MinusCircle } from "griddy-icons";

import { useControllableState } from "@/hooks/use-controllable-state";
import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ChatWidget } from "@/ui/chat-widget";
import { StatusMatrix } from "@/ui/status-matrix";

/**
 * Where the plan stands as a whole.
 *
 * `proposed` is the plan waiting for a yes — nothing has a status yet, so the
 * glyph lane carries numbers and the card grows the approval footer. The other
 * three are the plan being worked: `running` while tasks are left, `complete`
 * once every task that still counts is done, `stopped` when the run ended
 * short. Only those three have a disclosure — a plan waiting for approval is
 * never folded away from the person who has to approve it.
 */
export type ChatTasksStatus = "proposed" | "running" | "complete" | "stopped";

/** Six row statuses — the sheet's Row states column, in its order. */
export type ChatTaskStatus = "done" | "current" | "pending" | "needsYou" | "failed" | "skipped";

/**
 * What each row status needs in WORDS, discriminated by `status`.
 *
 * Three statuses carry their meaning in a visible string, and each is required
 * where it applies: a needs-you row whose badge says nothing, a failed row with
 * no reason and a skipped row with no trailing note are the three shapes that
 * would draw a status with nobody saying what it is. A retry is a handler and a
 * name together — never one of the two, the same pair Chat Progress uses.
 */
type ChatTaskState =
  | { status: "done" }
  | {
      status: "current";
      /** What the agent is doing on it right now — the second line. */
      activity?: string;
    }
  | { status: "pending" }
  | {
      status: "needsYou";
      /** The warning badge's words — "Needs you". */
      needsYouLabel: string;
    }
  | {
      status: "failed";
      /** Why it failed, in one line. It REPLACES the label on the row. */
      reason: string;
      onRetryAction?: undefined;
      retryLabel?: undefined;
    }
  | {
      status: "failed";
      reason: string;
      onRetryAction: () => void;
      retryLabel: string;
    }
  | {
      status: "skipped";
      /** The trailing note — "Skipped", or "Skipped — you asked for feed only". */
      skippedLabel: string;
    };

/**
 * A task the agent added in a revision carries an info badge until the next
 * turn. Whether it is still "new" is the thread's fact, so the caller sets it;
 * the badge's words come with it.
 */
type ChatTaskNewness = { isNew?: false; newLabel?: undefined } | { isNew: true; newLabel: string };

export type ChatTask = {
  /** Stable across revisions: a plan is revised in place, and an index key would re-use the wrong row. */
  id: string;
  label: string;
} & ChatTaskState &
  ChatTaskNewness;

/** A task in a plan nobody has approved yet — it has no status to show. */
export interface ChatProposedTask {
  id: string;
  label: string;
}

/**
 * The words for the three statuses that carry none on screen.
 *
 * Done, current and pending are told apart by a glyph and an ink, and neither
 * reaches a screen reader (SC 1.3.1). Needs-you, failed and skipped already say
 * what they are in a badge, a reason or a trailing note.
 */
export interface ChatTaskStatusLabels {
  done: string;
  current: string;
  pending: string;
}

interface ChatTasksBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** The plan's name — "Grid systems carousel". Truncates in the header. */
  label: string;
  /**
   * The header's tabular count, already worded: "2 of 5", "5 of 5 · 3 min",
   * "Stopped at 2 of 5", "2 of 5 · revised", "5 steps · about 3 min". It counts
   * the tasks that still count — a skipped task drops out of the total.
   */
  count: string;
}

/** Changing a proposed plan is optional, but a handler and its name travel together. */
type ChatTasksChangeProps =
  | { onChangeAction?: undefined; changeLabel?: undefined }
  | { onChangeAction: () => void; changeLabel: string };

/**
 * Dropping a task from a proposed plan. The Close button is icon-only, so it
 * needs a name, and one name per ROW — eight buttons all called "Drop" are
 * indistinguishable in a screen reader's list of controls. A function rather
 * than a string because only the caller can word "Drop 'Cut a 9:16 Story'".
 */
type ChatTasksDropProps =
  | { onDropAction?: undefined; getDropLabel?: undefined }
  | { onDropAction: (task: ChatProposedTask) => void; getDropLabel: (task: ChatProposedTask) => string };

type ChatTasksProposedProps = {
  status: "proposed";
  tasks: ChatProposedTask[];
  /** The view's one filled action — "Run plan". */
  runLabel: string;
  onRunAction: () => void;
  /** The muted line at the footer's trailing edge — "Nothing runs until you say so". */
  footnote?: string;
  statusLabels?: undefined;
  isOpen?: undefined;
  defaultIsOpen?: undefined;
  onOpenChange?: undefined;
} & ChatTasksChangeProps &
  ChatTasksDropProps;

type ChatTasksLiveProps = {
  status: "running" | "complete" | "stopped";
  tasks: ChatTask[];
  statusLabels: ChatTaskStatusLabels;
  /** The disclosure, controlled. */
  isOpen?: boolean;
  /**
   * The disclosure, uncontrolled. Defaults to open, except a COMPLETE plan,
   * which mounts folded.
   */
  defaultIsOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  runLabel?: undefined;
  onRunAction?: undefined;
  footnote?: undefined;
  onChangeAction?: undefined;
  changeLabel?: undefined;
  onDropAction?: undefined;
  getDropLabel?: undefined;
};

export type ChatTasksProps = ChatTasksBaseProps & (ChatTasksProposedProps | ChatTasksLiveProps);

/**
 * The union, flattened for internal use — every field optional here, and the
 * PUBLIC type is what guarantees which are present for a status. The same
 * split ChatProgress makes.
 */
interface ResolvedTasks extends ChatTasksBaseProps {
  status: ChatTasksStatus;
  tasks: Array<ChatTask | ChatProposedTask>;
  statusLabels?: ChatTaskStatusLabels | undefined;
  runLabel?: string | undefined;
  onRunAction?: (() => void) | undefined;
  footnote?: string | undefined;
  onChangeAction?: (() => void) | undefined;
  changeLabel?: string | undefined;
  onDropAction?: ((task: ChatProposedTask) => void) | undefined;
  getDropLabel?: ((task: ChatProposedTask) => string) | undefined;
  isOpen?: boolean | undefined;
  defaultIsOpen?: boolean | undefined;
  onOpenChange?: ((isOpen: boolean) => void) | undefined;
}

/** One glyph lane, 16px, so every row's label starts on the same vertical. */
const LANE = "flex size-4 shrink-0 items-center justify-center";

/** A ring the size of the lane — the empty status. Pending's is quiet; needs-you's is the warning ink. */
function Ring({ tone }: { tone: "pending" | "needsYou" }) {
  return (
    <span
      aria-hidden="true"
      data-slot="chat-tasks-ring"
      className={cn(
        "size-4 shrink-0 rounded-full border-hairline",
        tone === "needsYou" ? "border-warning" : "border-edge-default",
      )}
    />
  );
}

/**
 * The current task's glyph, and the folded running header's: Working's KEY
 * FRAME, held. The plan never moves — the turn's live edge is elsewhere (the
 * progress log above it), and two moving matrices in one turn compete for the
 * same glance.
 */
function HeldWorking() {
  return <StatusMatrix status="working" size="md" isHeld />;
}

/** The row's glyph by status. Settled glyphs are griddy icons, at the lane's 16px. */
function TaskGlyph({ status }: { status: ChatTaskStatus }) {
  let glyph: ReactElement;
  switch (status) {
    case "done":
      glyph = <CheckCircle size={16} aria-hidden="true" className="size-4 shrink-0 text-success" />;
      break;
    case "current":
      glyph = <HeldWorking />;
      break;
    case "needsYou":
      glyph = <Ring tone="needsYou" />;
      break;
    case "failed":
      glyph = <CloseCircle size={16} aria-hidden="true" className="size-4 shrink-0 text-danger" />;
      break;
    case "skipped":
      glyph = <MinusCircle size={16} aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />;
      break;
    default:
      glyph = <Ring tone="pending" />;
  }
  return (
    <span data-slot="chat-tasks-glyph" data-glyph={status} className={LANE}>
      {glyph}
    </span>
  );
}

/**
 * The label's ink and weight by status. Ink follows the reader's interest
 * rather than the log's: what is still to do is text-secondary, what is done
 * recedes to text-muted, and the task being worked — or the one waiting on the
 * reader — steps up to text-primary. No strikethrough: the glyph says done.
 *
 * Needs-you is label-md rather than body-sm: the sheet draws it at 600, and
 * label-md is the role that IS 13px at 600 — the same size as the rows around
 * it, one weight up, with no type-role exception to declare.
 */
const LABEL = {
  done: "text-body-sm text-ink-muted",
  current: "text-body-sm text-ink-primary",
  pending: "text-body-sm text-ink-secondary",
  needsYou: "text-label-md text-ink-primary",
  // One line: a reason that wraps turns a status into a paragraph.
  failed: "truncate text-body-sm text-danger",
  skipped: "text-body-sm text-ink-muted",
} as const satisfies Record<ChatTaskStatus, string>;

function TaskRow({ task, statusLabels }: { task: ChatTask; statusLabels: ChatTaskStatusLabels }) {
  const activity = task.status === "current" ? task.activity : undefined;
  const hasRetry = task.status === "failed" && task.onRetryAction !== undefined;

  return (
    <li
      data-slot="chat-tasks-row"
      data-task-status={task.status}
      {...(task.isNew ? { "data-new": "" } : {})}
      {...(task.status === "current" ? { "aria-current": "step" as const } : {})}
      className={cn(
        // 32px minimum, px-md, flush — no fill, no divider. The py-xs is not
        // drawn: it changes nothing on a one-line row (4 + 17.55 + 4 < 32)
        // and keeps a label that wraps off the row's edges.
        "flex min-h-8 gap-sm px-md",
        // The current task's activity is a second line, so that row aligns to
        // its top and takes the sheet's py-sm; every other row centres.
        activity ? "items-start py-sm" : "items-center py-xs",
        // A Retry is a 24px ghost button that brings its own inline padding,
        // so the row gives back the difference on that side.
        hasRetry && "pe-xs",
      )}
    >
      <TaskGlyph status={task.status} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span data-slot="chat-tasks-label" className={cn("font-body", LABEL[task.status])}>
          {task.status === "done" || task.status === "current" || task.status === "pending" ? (
            <span className="sr-only">{statusLabels[task.status]} </span>
          ) : null}
          {task.status === "failed" ? (
            <>
              {/* The reason replaces the label on screen; a screen reader
                  still hears which task it was. */}
              <span className="sr-only">{task.label} </span>
              {task.reason}
            </>
          ) : (
            task.label
          )}
        </span>
        {activity ? (
          <span data-slot="chat-tasks-activity" className="font-body text-caption text-ink-muted">
            {activity}
          </span>
        ) : null}
      </span>
      {task.status === "needsYou" ? (
        <Badge variant="warning" size="sm">
          {task.needsYouLabel}
        </Badge>
      ) : null}
      {task.status === "skipped" ? (
        <span data-slot="chat-tasks-note" className="shrink-0 font-body text-caption text-ink-muted">
          {task.skippedLabel}
        </span>
      ) : null}
      {task.isNew ? (
        <Badge variant="info" size="sm">
          {task.newLabel}
        </Badge>
      ) : null}
      {task.status === "failed" && task.onRetryAction ? (
        <Button variant="ghost" size="sm" data-slot="chat-tasks-retry" onClick={task.onRetryAction}>
          {task.retryLabel}
        </Button>
      ) : null}
    </li>
  );
}

function ProposedRow({
  task,
  index,
  onDropAction,
  getDropLabel,
}: {
  task: ChatProposedTask;
  index: number;
  onDropAction?: ((task: ChatProposedTask) => void) | undefined;
  getDropLabel?: ((task: ChatProposedTask) => string) | undefined;
}) {
  const drop = onDropAction && getDropLabel ? { onDropAction, getDropLabel } : null;
  const isDroppable = drop !== null;
  return (
    <li
      data-slot="chat-tasks-row"
      data-task-status="proposed"
      className={cn(
        "flex min-h-8 items-center gap-sm px-md py-xs",
        // A row that can be dropped answers the pointer: bg-hover, one step up
        // from the card in both schemes, at the card's inner radius (16 outer
        // − 8 inset = 8, concentric). A row that cannot is not a target and
        // takes no hover at all.
        isDroppable &&
          cn("group/row rounded-md pe-xs transition-[background-color]", motionMicro, "hover:bg-hover"),
      )}
    >
      {/* The index is the glyph lane's content before anything has a status:
          caption 600, tabular, right-aligned in the same 16px. Hidden from
          assistive tech — the <ol> already gives each item its position. */}
      <span
        aria-hidden="true"
        data-slot="chat-tasks-index"
        className="w-4 shrink-0 text-end font-body text-caption text-ink-muted tabular-nums"
      >
        {index + 1}
      </span>
      <span data-slot="chat-tasks-label" className="min-w-0 flex-1 font-body text-body-sm text-ink-secondary">
        {task.label}
      </span>
      {drop ? (
        <span
          data-slot="chat-tasks-drop-lane"
          className={cn(
            "flex shrink-0",
            "transition-opacity", motionMicro,
            // Revealed on hover AND on focus — a control a keyboard can reach
            // and cannot see fails SC 2.4.7. Opacity rather than mounting, so
            // the tab order never changes under the user. A device with no
            // hover cannot reveal it, so there it is always shown.
            "opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100",
            "[@media(hover:none)]:opacity-100",
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label={drop.getDropLabel(task)}
            icon={<Close />}
            data-slot="chat-tasks-drop"
            onClick={() => drop.onDropAction(task)}
          />
        </span>
      ) : null}
    </li>
  );
}

/**
 * The plan the agent is working to — a list it writes, ticks off and revises
 * across turns.
 *
 * NOT Chat Progress. Progress is the log of one turn and folds to a receipt;
 * a task list is an OBJECT in the thread, with a title, that the reader can
 * read, approve and change — so it gets what the receiver's prose never does:
 * a container. The chat-widget card, reused rather than restyled (bg-elevated,
 * radius-lg, p-sm), with the sheet's gap-xs between header and rows.
 *
 * One list per thread is live, and a revision updates it IN PLACE rather than
 * re-posting it lower down: rows never reorder under the reader, a dropped
 * task stays where it stood as Skipped, and an added one says New. Both rules
 * are the caller's to keep — the component draws the list it is given.
 *
 * The plan never moves. The current task holds Working's key frame, because
 * the turn's live edge — the one StatusMatrix allowed to animate — is
 * elsewhere.
 */
export const ChatTasks = forwardRef<HTMLDivElement, ChatTasksProps>(function ChatTasks(props, ref) {
  const {
    status,
    label,
    count,
    // Pulled out of `rest` deliberately: each of these is the plan's own data
    // or a handler, and a stray `tasks={[…]}` reaching the div would be
    // serialised onto the DOM as an attribute.
    tasks,
    statusLabels,
    runLabel,
    onRunAction,
    footnote,
    onChangeAction,
    changeLabel,
    onDropAction,
    getDropLabel,
    isOpen,
    defaultIsOpen,
    onOpenChange,
    className,
    ...rest
  } = props as ResolvedTasks;

  const isProposed = status === "proposed";

  // CONVENTIONS §4: the shared hook, never a bespoke pair of states. Running
  // and stopped mount open; complete mounts folded, because it is done asking
  // for attention.
  const [open, setOpen] = useControllableState<boolean>({
    value: isOpen,
    defaultValue: defaultIsOpen ?? status !== "complete",
    onChange: onOpenChange,
  });

  // "Complete folds itself; the user can reopen it." A plan that FINISHES
  // while mounted asks to fold — uncontrolled it folds, controlled the parent
  // is told and decides. Only the transition does this: reopening a complete
  // plan stays open, and nothing else in the plan's life folds it. A layout
  // effect, so the finished plan never paints one frame open.
  const previous = useRef(status);
  useLayoutEffect(() => {
    if (previous.current !== status && status === "complete") setOpen(false);
    previous.current = status;
  }, [status, setOpen]);

  const isFolded = !isProposed && !open;
  const current = isProposed ? undefined : (tasks as ChatTask[]).find((task) => task.status === "current");
  // Folded and running, the title gives way to the current task. The plan's
  // own name stays in the trigger's accessible name.
  const isTitleSwapped = isFolded && status === "running" && current !== undefined;

  // Open — and always while proposed — the header glyph names the object: a
  // list. Folded, it becomes the list's STATUS, because the rows that would
  // have said it are gone.
  const headerGlyph =
    !isFolded ? (
      <ListBulleted size={16} aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
    ) : status === "running" ? (
      <HeldWorking />
    ) : status === "complete" ? (
      <CheckCircle size={16} aria-hidden="true" className="size-4 shrink-0 text-success" />
    ) : (
      <MinusCircle size={16} aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
    );

  const headerContent = (
    <>
      <span data-slot="chat-tasks-header-glyph" data-glyph={isFolded ? status : "list"} className={LANE}>
        {headerGlyph}
      </span>
      <span data-slot="chat-tasks-title" className="min-w-0 flex-1 truncate font-body text-label-md text-ink-primary">
        {isTitleSwapped ? (
          <>
            <span className="sr-only">{label} </span>
            {current.label}
          </>
        ) : (
          label
        )}
      </span>
      <span data-slot="chat-tasks-count" className="shrink-0 font-body text-caption text-ink-muted tabular-nums">
        {count}
      </span>
    </>
  );

  const HEADER = "flex h-8 w-full shrink-0 items-center gap-sm rounded-md px-md text-start";

  const surface = {
    "data-slot": "chat-tasks",
    "data-status": status,
    // The card is ChatWidget's own surface — bg-elevated, radius-lg, p-sm, no
    // border and no shadow. The sheet asks for gap-xs between header and rows
    // where the widget's payloads sit at gap-sm; that is the one thing changed.
    className: cn("gap-xs", className),
    ...rest,
  };

  if (isProposed) {
    return (
      <ChatWidget ref={ref} {...surface}>
        {/* No disclosure: a plan waiting for a yes is never folded away from
            the person who has to give it. */}
        <div data-slot="chat-tasks-header" className={HEADER}>
          {headerContent}
        </div>
        <ol data-slot="chat-tasks-list" className="flex flex-col">
          {(tasks as ChatProposedTask[]).map((task, index) => (
            <ProposedRow
              key={task.id}
              task={task}
              index={index}
              onDropAction={onDropAction}
              getDropLabel={getDropLabel}
            />
          ))}
        </ol>
        <div data-slot="chat-tasks-footer" className="flex items-center gap-sm px-sm pt-sm pb-xs">
          <Button variant="primary" size="md" data-slot="chat-tasks-run" onClick={onRunAction}>
            {runLabel}
          </Button>
          {onChangeAction && changeLabel ? (
            <Button variant="secondary" size="md" data-slot="chat-tasks-change" onClick={onChangeAction}>
              {changeLabel}
            </Button>
          ) : null}
          {footnote ? (
            <p data-slot="chat-tasks-footnote" className="min-w-0 flex-1 text-end font-body text-caption text-ink-muted">
              {footnote}
            </p>
          ) : null}
        </div>
      </ChatWidget>
    );
  }

  return (
    <Collapsible.Root
      ref={ref}
      open={open}
      onOpenChange={(next) => setOpen(next)}
      // Rendered AS the widget card, so the disclosure's root is the card
      // itself rather than a div nested inside it.
      render={<ChatWidget {...surface} />}
    >
      <Collapsible.Trigger
        data-slot="chat-tasks-header"
        className={cn(
          HEADER,
          // `group` so the chevron can read the TRIGGER's open state; a
          // data-variant on the chevron itself would read its own attributes.
          "group/header cursor-pointer",
          // Hover is bg-hover, one step up from the card in BOTH schemes
          // (the sheet's token map) — not bg-elevated, which is the card.
          "transition-[background-color]", motionMicro, "hover:bg-hover",
          "focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-edge-focus",
        )}
      >
        {headerContent}
        <ChevronDown
          size={12}
          aria-hidden="true"
          data-slot="chat-tasks-chevron"
          className={cn(
            "size-3 shrink-0 text-ink-muted",
            // `rotate`, not `transform`: v4 writes the standalone property.
            // Accordion's and Chat Progress's chevron, verbatim — down while
            // folded, up while open, which is also what the sheet draws.
            "transition-[rotate]", motionMicro,
            "group-data-[panel-open]/header:rotate-180",
          )}
        />
      </Collapsible.Trigger>
      <Collapsible.Panel data-slot="chat-tasks-panel">
        <ol data-slot="chat-tasks-list" className="flex flex-col">
          {(tasks as ChatTask[]).map((task) => (
            <TaskRow key={task.id} task={task} statusLabels={statusLabels!} />
          ))}
        </ol>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
});
