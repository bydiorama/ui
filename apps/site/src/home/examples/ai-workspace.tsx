import { useLayoutEffect, useRef, useState } from "react";
import { Plus } from "griddy-icons";

import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { motionMicro } from "@/lib/motion";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { ChatComposer } from "@/ui/chat-composer";
import { ChatMessage } from "@/ui/chat-message";
import { ChatProgress } from "@/ui/chat-progress";
import { ChatTasks, type ChatTask } from "@/ui/chat-tasks";
import { Fade } from "@/ui/fade";
import { StatusMatrix, type StatusMatrixStatus } from "@/ui/status-matrix";

import { useAppearance } from "../../lib/use-appearance";
import { useExampleFx } from "./use-example-fx";

/*
 * AI workspace — an agent inbox (Paper: "Example — AI workspace").
 *
 * Three columns: the task inbox, the selected task's thread, and the change
 * set the agent is asking to merge. The side columns are fixed and step down
 * a little below an 1100px container so the thread keeps a readable measure
 * in the home page's 960px stage; the thread scrolls and opens at its latest
 * turn, as a chat does.
 */

type TaskState = "review" | "failed" | "running" | "merged" | "stopped";

interface Task {
  id: string;
  title: string;
  status: string;
  time: string;
  state: TaskState;
}

const GROUPS: { id: string; label: string; tasks: Task[] }[] = [
  {
    id: "needs-you",
    label: "Needs you",
    tasks: [
      { id: "csv", title: "Add CSV export to invoices", status: "Waiting for review", time: "2 min", state: "review" },
      { id: "vat", title: "Fix rounding in VAT totals", status: "Two tests failed", time: "14 min", state: "failed" },
    ],
  },
  {
    id: "running",
    label: "Running",
    tasks: [
      { id: "dates", title: "Migrate dates to DatePicker", status: "Editing 4 files", time: "1:42", state: "running" },
      { id: "tests", title: "Write tests for reminders", status: "Reading the scheduler", time: "0:18", state: "running" },
    ],
  },
  {
    id: "done",
    label: "Done today",
    tasks: [
      { id: "rename", title: "Rename customer to client", status: "Merged", time: "09:12", state: "merged" },
      { id: "ledger", title: "Empty state for the ledger", status: "Merged", time: "08:40", state: "merged" },
      { id: "denser", title: "Try a denser table", status: "Stopped by you", time: "08:05", state: "stopped" },
    ],
  },
];

const TASKS = GROUPS.flatMap((group) => group.tasks);

/** Each state's mark in the inbox: the library's status signal, held still. */
const MARKS: Record<TaskState, Exclude<StatusMatrixStatus, "progress">> = {
  review: "waiting",
  failed: "failed",
  running: "working",
  merged: "done",
  stopped: "stopped",
};

const STATUS_LABELS = { done: "Done", current: "In progress", pending: "To do" };

/** The plan each task's agent worked to, as ChatTasks draws it. */
const PLANS: Record<string, { status: "running" | "complete" | "stopped"; count: string; tasks: ChatTask[] }> = {
  csv: {
    status: "complete",
    count: "3 of 3 · 2 min 14 s",
    tasks: [
      { id: "read", label: "Read invoices/table.tsx and the filter store", status: "done" },
      { id: "export", label: "Add exportCsv with locale-aware dates", status: "done" },
      { id: "suite", label: "Run the suite: 18 passed", status: "done" },
    ],
  },
  vat: {
    status: "stopped",
    count: "Stopped at 2 of 3",
    tasks: [
      { id: "find", label: "Find where VAT totals are rounded", status: "done" },
      { id: "round", label: "Round per line, not per invoice", status: "done" },
      { id: "suite", label: "Run the suite", status: "failed", reason: "Two VAT tests failed on a 0.01 difference" },
    ],
  },
  dates: {
    status: "running",
    count: "2 of 4",
    tasks: [
      { id: "find", label: "Find every native date input", status: "done" },
      { id: "swap", label: "Swap them for DatePicker", status: "done" },
      { id: "edit", label: "Keep the filters' date ranges", status: "current", activity: "Editing 4 files" },
      { id: "suite", label: "Run the suite", status: "pending" },
    ],
  },
  tests: {
    status: "running",
    count: "1 of 3",
    tasks: [
      { id: "read", label: "Read the reminder scheduler", status: "current", activity: "Reading the scheduler" },
      { id: "cases", label: "Cover the overdue and paused cases", status: "pending" },
      { id: "suite", label: "Run the suite", status: "pending" },
    ],
  },
  rename: {
    status: "complete",
    count: "2 of 2",
    tasks: [
      { id: "rename", label: "Rename customer to client in 31 files", status: "done" },
      { id: "suite", label: "Run the suite: 64 passed", status: "done" },
    ],
  },
  ledger: {
    status: "complete",
    count: "2 of 2",
    tasks: [
      { id: "empty", label: "Add an empty state to the ledger", status: "done" },
      { id: "suite", label: "Run the suite: 12 passed", status: "done" },
    ],
  },
  denser: {
    status: "stopped",
    count: "Stopped at 1 of 3",
    tasks: [
      { id: "density", label: "Switch the table to compact density", status: "done" },
      { id: "columns", label: "Drop the owner column", status: "skipped", skippedLabel: "Skipped — you stopped the run" },
      { id: "suite", label: "Run the suite", status: "skipped", skippedLabel: "Skipped" },
    ],
  },
};

const FILES = [
  { path: "invoices/export-csv.ts", added: "+61", removed: null },
  { path: "invoices/table.tsx", added: "+9", removed: "−4" },
  { path: "invoices/export-csv.test.ts", added: "+16", removed: null },
] as const;

const DIFF: { kind: "context" | "added" | "removed"; text: string }[] = [
  { kind: "context", text: "  const rows = table.getVisibleRows()" },
  { kind: "added", text: "+ const fmt = dateFormat(locale)" },
  { kind: "added", text: "+ return toCsv(rows, {" },
  { kind: "added", text: "+   date: (d) => fmt.format(d)," },
  { kind: "added", text: "+   amount: (n) => n.toFixed(2)," },
  { kind: "added", text: "+ })" },
  { kind: "removed", text: "− return rows" },
];

const CHECKS = [
  { label: "Type check", result: "Passed" },
  { label: "Tests", result: "18 of 18" },
  { label: "Lint", result: "Passed" },
] as const;

export default function AiWorkspaceExample() {
  const { effects } = useAppearance();
  const hasEffects = effects === "on";

  const [selectedId, setSelectedId] = useState("csv");
  const [isMerged, setIsMerged] = useState(false);
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<Record<string, string[]>>({});

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  const selected = TASKS.find((task) => task.id === selectedId) ?? TASKS[0]!;
  const isCsv = selected.id === "csv";
  const replies = sent[selected.id] ?? [];

  // A thread opens at its latest turn, and follows a reply the person sends.
  useLayoutEffect(() => {
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [scroller, selectedId, replies.length, isMerged]);

  const send = (value: string) => {
    const text = value.trim();
    if (!text) return;
    setSent((current) => ({ ...current, [selected.id]: [...(current[selected.id] ?? []), text] }));
    setDraft("");
  };

  return (
    <div
      role="region"
      aria-label="AI workspace example"
      className="@container flex h-full w-full overflow-hidden bg-base font-body text-ink-primary"
    >
      {/* ── Inbox ─────────────────────────────────────────────────────── */}
      <div className="flex w-60 shrink-0 flex-col gap-lg overflow-hidden bg-elevated p-md border-e border-edge-subtle @min-[1100px]:w-66">
        <div className="flex h-8 shrink-0 items-center justify-between px-sm">
          <div className="flex min-w-0 items-center gap-sm">
            <span className="truncate text-label-md">invoices-app</span>
          </div>
          <Button variant="secondary" size="sm" isIconOnly aria-label="New task" icon={<Plus />} />
        </div>

        {GROUPS.map((group) => (
          <div key={group.id} role="group" aria-labelledby={`ai-workspace-${group.id}`} className="flex flex-col gap-0.5">
            <div className="flex justify-between px-sm py-xs text-label-sm text-ink-muted">
              <span id={`ai-workspace-${group.id}`}>{group.label}</span>
              <span className="tabular-nums" aria-label={`${group.tasks.length} tasks`}>
                {group.tasks.length}
              </span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.tasks.map((task) => {
                const isCurrent = task.id === selectedId;
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      aria-current={isCurrent ? "true" : undefined}
                      onClick={() => setSelectedId(task.id)}
                      className={cn(
                        "flex w-full cursor-pointer flex-col gap-0.5 rounded-md p-sm text-start",
                        "transition-[background-color]", motionMicro,
                        "focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-edge-focus",
                        isCurrent ? "bg-sunken" : "hover:bg-hover",
                      )}
                    >
                      <span className="truncate text-label-md text-ink-primary">{task.title}</span>
                      <span className="flex items-center justify-between gap-sm text-caption font-regular text-ink-muted">
                        <StatusMatrix
                          size="sm"
                          status={task.id === "csv" && isMerged ? "done" : MARKS[task.state]}
                          isHeld
                          className="shrink-0"
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate",
                            // The one effect on this screen: light travelling
                            // through the status of work that is still running.
                            hasEffects && task.state === "running" && fx("shimmer"),
                          )}
                        >
                          {task.id === "csv" && isMerged ? "Merged" : task.status}
                        </span>
                        <span className="shrink-0 tabular-nums">{task.time}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* ── Thread ────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between gap-md px-xl">
          <div className="flex min-w-0 items-center gap-sm">
            <p className="truncate text-label-md">{selected.title}</p>
            {isCsv ? (
              isMerged ? (
                <Badge variant="success">Merged</Badge>
              ) : (
                <Badge variant="warning">Needs review</Badge>
              )
            ) : null}
          </div>
          {isCsv ? (
            <p className="hidden shrink-0 text-caption font-regular text-ink-muted @min-[1100px]:block">
              export-csv · 3 files changed
            </p>
          ) : null}
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={setScroller}
            tabIndex={0}
            role="group"
            aria-label="Thread"
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-lg overflow-y-auto px-xl pt-sm pb-lg",
              "focus-visible:outline-focus focus-visible:-outline-offset-focus focus-visible:outline-edge-focus",
            )}
          >
            {isCsv ? (
              <CsvThread
                isMerged={isMerged}
                onApprove={() => setIsMerged(true)}
                onRequestChanges={() => composerRef.current?.focus()}
              />
            ) : (
              <TaskThread task={selected} />
            )}
            {replies.map((reply, index) => (
              <ChatMessage.Sender key={index} className="[--ui-chat-message-bubble-max-width:420px]">
                {reply}
              </ChatMessage.Sender>
            ))}
          </div>
          <Fade side="top" size="sm" ground="base" scrollContainer={scroller} />
          <Fade side="bottom" size="sm" ground="base" scrollContainer={scroller} />
        </div>

        <div className="shrink-0 px-xl pt-sm pb-lg">
          <ChatComposer
            ref={composerRef}
            label="Reply to the agent"
            placeholder="Reply to the agent…"
            sendLabel="Send"
            stopLabel="Stop"
            value={draft}
            onValueChange={setDraft}
            onSubmitAction={send}
            maxRows={3}
            startAction={
              <Button variant="ghost" size="md" shape="full" isIconOnly aria-label="Attach a file" icon={<Plus />} />
            }
          />
        </div>
      </div>

      {/* ── Changes ───────────────────────────────────────────────────── */}
      {isCsv ? <ChangesPanel /> : null}
    </div>
  );
}

function CsvThread({
  isMerged,
  onApprove,
  onRequestChanges,
}: {
  isMerged: boolean;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  const fxs = useExampleFx();
  return (
    <>
      <ChatMessage.Sender className="[--ui-chat-message-bubble-max-width:420px]">
        Add a CSV export to the invoices table. Respect the active filters, and use the client&apos;s locale for
        dates.
      </ChatMessage.Sender>

      <Plan id="csv" label="Add a CSV export" defaultIsOpen />

      <ChatMessage.Receiver className="max-w-[520px]">
        <div className="flex flex-col gap-sm">
          <p>
            The export is ready. It writes the rows you can see, in the order you sorted them, and names the file
            after the active filter.
          </p>
          <p>
            One decision is yours: amounts are exported as plain numbers, without the currency symbol, so
            spreadsheets can sum them.
          </p>
        </div>
      </ChatMessage.Receiver>

      <Card surface="outlined" className={cn("max-w-[520px] shrink-0 gap-md bg-surface p-lg", fxs.card)}>
        <div className="flex flex-col gap-0.5">
          <p className="text-label-md text-ink-primary">Merge 3 files into main?</p>
          <p className="text-body-sm text-ink-muted">Nothing is merged until you approve.</p>
        </div>
        {isMerged ? (
          <ChatProgress
            form="thinking"
            label="Merged"
            isComplete
            receiptText="Merged"
            expandLabel="Merged"
          />
        ) : (
          <div className="flex flex-wrap gap-sm">
            <Button variant="primary" className={fxs.primary} onClick={onApprove}>
              Approve and merge
            </Button>
            <Button variant="secondary" onClick={onRequestChanges}>
              Request changes
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}

/** A task's plan, drawn by the library's ChatTasks: done rows ticked, the
 *  current one with its activity, the rest pending (or failed, or skipped). */
function Plan({ id, label, defaultIsOpen = true }: { id: string; label: string; defaultIsOpen?: boolean }) {
  const plan = PLANS[id];
  if (!plan) return null;
  return (
    <ChatTasks
      status={plan.status}
      label={label}
      count={plan.count}
      tasks={plan.tasks}
      statusLabels={STATUS_LABELS}
      defaultIsOpen={defaultIsOpen}
    />
  );
}

/** Every other task: the request, and its plan as far as the run got. */
function TaskThread({ task }: { task: Task }) {
  return (
    <>
      <ChatMessage.Sender className="[--ui-chat-message-bubble-max-width:420px]">{task.title}</ChatMessage.Sender>
      <Plan id={task.id} label={task.status} />
    </>
  );
}

function ChangesPanel() {
  return (
    <div
      aria-label="Changes"
      role="group"
      className="flex w-68 shrink-0 flex-col gap-lg overflow-hidden bg-surface p-lg border-s border-edge-subtle @min-[1100px]:w-74"
    >
      <div className="flex h-6 shrink-0 items-center justify-between">
        <p className="text-label-md">Changes</p>
        <p className="flex gap-sm text-label-sm tabular-nums">
          <span className="text-success">+86</span>
          <span className="text-danger">−4</span>
        </p>
      </div>

      <ul className="flex flex-col gap-0.5">
        {FILES.map((file, index) => (
          <li
            key={file.path}
            className={cn(
              "flex h-8 shrink-0 items-center justify-between gap-sm rounded-md px-2.5",
              index === 0 && "bg-sunken",
            )}
          >
            <span className={cn("min-w-0 truncate text-body-sm", index === 0 ? "text-label-md" : "font-regular")}>
              {file.path}
            </span>
            <span className="shrink-0 text-caption font-regular tabular-nums">
              {file.removed ? (
                <span className="text-ink-muted">
                  {file.added} {file.removed}
                </span>
              ) : (
                <span className="text-success">{file.added}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div aria-label="Diff of invoices/export-csv.ts" role="group" className="flex shrink-0 flex-col overflow-clip rounded-md bg-elevated py-0">
        {DIFF.map((line, index) => (
          <p
            key={index}
            className={cn(
              "truncate px-2.5 text-caption leading-5 font-regular whitespace-pre tabular-nums",
              line.kind === "added" && "bg-success-subtle text-success",
              line.kind === "removed" && "bg-danger-subtle text-danger",
              line.kind === "context" && "text-ink-muted",
            )}
          >
            {line.text}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-sm">
        <p className="text-label-sm text-ink-muted">Checks</p>
        {CHECKS.map((check) => (
          <p key={check.label} className="flex justify-between gap-sm text-body-sm">
            <span className="font-regular text-ink-primary">{check.label}</span>
            <span className="text-label-md text-success tabular-nums">{check.result}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
