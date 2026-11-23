import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { fx } from "@/lib/fx";
import { motionMicro } from "@/lib/motion";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { ChatComposer } from "@/ui/chat-composer";
import { ChatMessage } from "@/ui/chat-message";
import { Fade } from "@/ui/fade";
import { StatusMatrix, type StatusMatrixStatus } from "@/ui/status-matrix";

import { useAppearance } from "../../lib/use-appearance";

/*
 * Docs editor — a help-centre page with an assistant beside it (Paper:
 * "Example — Docs editor").
 *
 * The page tree, the page being edited with the assistant's rewrite set
 * beside the selected paragraph, and the assistant's thread. The rewrite is
 * live: Replace swaps the paragraph, Insert below adds it, Discard drops it,
 * and the "Tighten" task brings the suggestion back.
 */

const SECTIONS = [
  { id: "getting-started", label: "Getting started", pages: ["Introduction", "Create a workspace", "Invite your team"] },
  { id: "invoices", label: "Invoices", pages: ["Send an invoice", "Payment reminders", "Export to CSV", "VAT and currencies"] },
  { id: "reference", label: "Reference", pages: ["API", "Webhooks"] },
] as const;

const DRAFT_PAGE = "Payment reminders";

const ORIGINAL =
  "By default a reminder is sent 3 days before the due date, on the due date, and 7 days after. You can change each step, or turn one off, in Settings under Reminders.";
const SUGGESTION =
  "Reminders go out 3 days before the due date, on the day, and 7 days after. Change or switch off any step in Settings → Reminders.";

const TASKS: { id: string; label: string; status: string; matrix: Exclude<StatusMatrixStatus, "progress"> }[] = [
  { id: "tighten", label: "Tighten “Set a schedule”", status: "Suggestion ready", matrix: "done" },
  { id: "links", label: "Check links to Settings", status: "Checking 4 links", matrix: "working" },
  { id: "screenshot", label: "Add a screenshot of the schedule", status: "Needs your approval", matrix: "waiting" },
];

const PROMPTS = ["Shorten the page", "Write a summary", "Check the tone"] as const;

const FORMATS = [
  { id: "bold", label: "B", name: "Bold" },
  { id: "italic", label: "I", name: "Italic" },
  { id: "underline", label: "U", name: "Underline" },
] as const;

type Suggestion = "open" | "replaced" | "inserted" | "discarded";

export default function DocsEditorExample() {
  const { effects } = useAppearance();
  const hasEffects = effects === "on";

  const [page, setPage] = useState<string>(DRAFT_PAGE);
  const [formats, setFormats] = useState<Record<string, boolean>>({ bold: true });
  const [suggestion, setSuggestion] = useState<Suggestion>("open");
  const [selectedTask, setSelectedTask] = useState("tighten");
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);

  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [pageScroller, setPageScroller] = useState<HTMLDivElement | null>(null);
  const [threadScroller, setThreadScroller] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (threadScroller && sent.length) threadScroller.scrollTop = threadScroller.scrollHeight;
  }, [threadScroller, sent.length]);

  const send = (value: string) => {
    const text = value.trim();
    if (!text) return;
    setSent((current) => [...current, text]);
    setDraft("");
  };

  const paragraph = suggestion === "replaced" ? SUGGESTION : ORIGINAL;

  return (
    <div
      role="region"
      aria-label="Docs editor example"
      className="@container flex h-full w-full overflow-hidden bg-base font-body text-ink-primary"
    >
      {/* ── Pages ─────────────────────────────────────────────────────── */}
      <nav
        aria-label="Docs pages"
        className="flex w-50 shrink-0 flex-col gap-lg overflow-hidden border-e border-edge-subtle bg-elevated p-md @min-[1100px]:w-54"
      >
        <p className="flex h-8 shrink-0 items-center px-sm text-label-md">Financial Docs</p>
        {SECTIONS.map((section) => (
          <div key={section.id} className="flex flex-col gap-0.5">
            <p id={`docs-editor-${section.id}`} className="px-sm py-xs text-label-sm text-ink-muted">
              {section.label}
            </p>
            <ul aria-labelledby={`docs-editor-${section.id}`} className="flex flex-col gap-0.5">
              {section.pages.map((name) => {
                const isCurrent = name === page;
                return (
                  <li key={name}>
                    <button
                      type="button"
                      aria-current={isCurrent ? "page" : undefined}
                      onClick={() => setPage(name)}
                      className={cn(
                        "flex h-7 w-full cursor-pointer items-center justify-between gap-sm rounded-md px-sm text-start",
                        "transition-[background-color]", motionMicro,
                        "focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-edge-focus",
                        isCurrent ? "bg-sunken" : "hover:bg-hover",
                      )}
                    >
                      <span
                        className={cn(
                          "min-w-0 truncate",
                          isCurrent ? "text-label-md text-ink-primary" : "text-body-sm font-regular text-ink-secondary",
                        )}
                      >
                        {name}
                      </span>
                      {name === DRAFT_PAGE ? <span className="shrink-0 text-label-sm text-warning">Draft</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Editor ────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-13 shrink-0 items-center justify-between gap-md px-lg">
          <div role="toolbar" aria-label="Formatting" className="flex min-w-0 items-center gap-0.5">
            <Button variant="secondary" size="sm" className="me-0.5 text-ink-primary">
              Heading 2
            </Button>
            {FORMATS.map((format) => (
              <Button
                key={format.id}
                variant="ghost"
                size="sm"
                aria-label={format.name}
                aria-pressed={formats[format.id] ?? false}
                onClick={() => setFormats((current) => ({ ...current, [format.id]: !current[format.id] }))}
                className={cn(
                  "w-7 justify-center px-0",
                  format.id === "italic" && "italic",
                  format.id === "underline" && "underline",
                  formats[format.id] ? "bg-sunken text-ink-primary" : "text-ink-muted",
                )}
              >
                {format.label}
              </Button>
            ))}
            {["Link", "List", "Code"].map((label) => (
              <Button key={label} variant="ghost" size="sm" className="text-ink-muted">
                {label}
              </Button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-md">
            <p className="hidden text-caption font-regular text-ink-muted @min-[1100px]:block">Saved 2 min ago</p>
            <Button variant="primary" size="sm">
              Publish
            </Button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={setPageScroller}
            tabIndex={0}
            role="group"
            aria-label={`${page} page`}
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-md overflow-y-auto px-2xl pt-xl pb-2xl @min-[1100px]:px-14 @min-[1100px]:pt-7",
              "focus-visible:outline-focus focus-visible:-outline-offset-focus focus-visible:outline-edge-focus",
            )}
          >
            <p className="text-label-sm text-ink-muted">Invoices</p>
            <p className="text-display-md text-ink-primary">Payment reminders</p>
            <p className="text-body-lg font-regular text-ink-secondary">
              Reminders chase unpaid invoices for you. You choose when they go out and what they say; the client
              always gets a link to pay.
            </p>
            <p className="pt-sm text-title-md text-ink-primary">Set a schedule</p>
            <p
              aria-label="Selected paragraph"
              className="rounded-md border-hairline border-edge-focus bg-accent/20 px-2.5 py-1.5 text-body-lg font-regular text-ink-primary"
            >
              {paragraph}
            </p>
            {suggestion === "inserted" ? (
              <p className="text-body-lg font-regular text-ink-secondary">{SUGGESTION}</p>
            ) : null}
            {suggestion === "open" ? (
              <Card className="shrink-0 gap-sm bg-surface p-md">
                <div className="flex items-center gap-sm">
                  <StatusMatrix status="done" size="sm" />
                  <p className="text-label-sm text-ink-muted">Suggested rewrite</p>
                </div>
                <p className="text-body-md text-ink-primary">{SUGGESTION}</p>
                <div className="flex flex-wrap items-center gap-sm">
                  <Button variant="secondary" size="sm" className="text-ink-primary" onClick={() => setSuggestion("replaced")}>
                    Replace
                  </Button>
                  <Button variant="secondary" size="sm" className="text-ink-primary" onClick={() => setSuggestion("inserted")}>
                    Insert below
                  </Button>
                  <Button variant="ghost" size="sm" className="text-ink-muted" onClick={() => setSuggestion("discarded")}>
                    Discard
                  </Button>
                </div>
              </Card>
            ) : null}
            <p className="pt-sm text-title-md text-ink-primary">Write the message</p>
            <p className="text-body-lg font-regular text-ink-secondary">
              Each step has its own message. Keep the first one short and friendly; most late payments are an
              oversight.
            </p>
          </div>
          <Fade side="bottom" size="md" ground="base" scrollContainer={pageScroller} />
        </div>
      </div>

      {/* ── Assistant ─────────────────────────────────────────────────── */}
      <div
        role="group"
        aria-label="Assistant"
        className="flex w-70 shrink-0 flex-col gap-lg overflow-hidden border-s border-edge-subtle bg-surface p-lg @min-[1100px]:w-80"
      >
        <div className="flex h-6 shrink-0 items-center justify-between gap-sm">
          <p className="shrink-0 text-label-md">Assistant</p>
          <p className="min-w-0 truncate text-caption font-regular text-ink-muted">Reads this page and the style guide</p>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={setThreadScroller}
            tabIndex={0}
            role="group"
            aria-label="Assistant thread"
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-lg overflow-y-auto",
              "focus-visible:outline-focus focus-visible:-outline-offset-focus focus-visible:outline-edge-focus",
            )}
          >
            <ChatMessage.Sender className="[--ui-chat-message-bubble-max-width:250px]">
              Tighten the selected paragraph. Keep the three timings.
            </ChatMessage.Sender>
            <ChatMessage.Receiver>
              <div className="flex flex-col gap-sm">
                <p>
                  Done. I cut it from 34 words to 25 and kept all three timings. The suggestion is beside the
                  paragraph.
                </p>
                <p>Two more things on this page:</p>
              </div>
            </ChatMessage.Receiver>
            <ul aria-label="Assistant tasks" className="flex shrink-0 flex-col gap-0.5">
              {TASKS.map((task) => {
                const isSelected = task.id === selectedTask;
                return (
                  <li key={task.id}>
                    <button
                      type="button"
                      aria-current={isSelected ? "true" : undefined}
                      onClick={() => {
                        setSelectedTask(task.id);
                        // The finished task leads back to its suggestion.
                        if (task.id === "tighten") setSuggestion("open");
                      }}
                      className={cn(
                        "flex w-full cursor-pointer gap-2.5 rounded-md px-2.5 py-sm text-start",
                        "transition-[background-color]", motionMicro,
                        "focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-edge-focus",
                        isSelected ? "bg-elevated" : "hover:bg-elevated",
                      )}
                    >
                      {/* Held on its key frame: the turn's live edge is not
                          here, and a marketing page keeps no clock running. */}
                      <StatusMatrix status={task.matrix} isHeld className="mt-px shrink-0" />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-label-md text-ink-primary">{task.label}</span>
                        <span
                          className={cn(
                            "text-body-sm font-regular text-ink-muted",
                            // The one effect on this screen: light through the
                            // status of the task still running.
                            hasEffects && task.matrix === "working" && fx("shimmer"),
                          )}
                        >
                          {task.status}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {sent.map((message, index) => (
              <ChatMessage.Sender key={index} className="[--ui-chat-message-bubble-max-width:250px]">
                {message}
              </ChatMessage.Sender>
            ))}
          </div>
          <Fade side="bottom" size="sm" ground="surface" scrollContainer={threadScroller} />
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          {PROMPTS.map((prompt) => (
            <Button
              key={prompt}
              variant="secondary"
              size="sm"
              shape="full"
              className="text-ink-primary"
              onClick={() => {
                setDraft(prompt);
                composerRef.current?.focus();
              }}
            >
              {prompt}
            </Button>
          ))}
        </div>

        <ChatComposer
          ref={composerRef}
          className="shrink-0"
          label="Ask about this page"
          placeholder="Ask about this page…"
          sendLabel="Send"
          stopLabel="Stop"
          value={draft}
          onValueChange={setDraft}
          onSubmitAction={send}
          maxRows={3}
        />
      </div>
    </div>
  );
}
