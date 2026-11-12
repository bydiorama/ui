import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import { ChatWidget } from "@/ui/chat-widget";

import {
  ChatTasks,
  type ChatProposedTask,
  type ChatTask,
  type ChatTaskStatusLabels,
  type ChatTasksProps,
} from "./chat-tasks.tsx";

/** Wait out any running transition before reading computed style. */
async function settled(element: Element) {
  await Promise.all(
    element
      .getAnimations({ subtree: true })
      .filter((a) => (a.effect?.getComputedTiming().iterations ?? 1) !== Infinity)
      .map((a) => a.finished.catch(() => undefined)),
  );
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/** Always themed: every colour assertion here reads a resolved token. */
function mount(ui: ReactElement, scheme: "light" | "dark" = "light") {
  container = document.createElement("div");
  Object.assign(
    container.style,
    toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }), scheme) as unknown as Record<string, string>,
    { colorScheme: scheme, width: "560px" },
  );
  container.className = "bg-base";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const c = container;
  const q = <T extends HTMLElement>(slot: string) => c.querySelector<T>(`[data-slot="${slot}"]`);
  const all = (slot: string) => Array.from(c.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`));
  return { container: c, q, all };
}

function rerender(ui: ReactElement) {
  act(() => {
    root!.render(ui);
  });
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

/** The ink a token resolves to, read the way the browser paints it. */
function tokenColor(token: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  container!.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

const rect = (el: Element) => el.getBoundingClientRect();
const matrices = (c: Element) => Array.from(c.querySelectorAll<SVGSVGElement>('[data-slot="status-matrix"]'));
const row = (c: Element, status: string) => c.querySelector<HTMLElement>(`[data-slot="chat-tasks-row"][data-task-status="${status}"]`)!;
const labelOf = (r: Element) => r.querySelector<HTMLElement>('[data-slot="chat-tasks-label"]')!;

const LABELS: ChatTaskStatusLabels = { done: "Done:", current: "In progress:", pending: "To do:" };

const RUNNING: ChatTask[] = [
  { id: "scan", label: "Read the poster scan", status: "done" },
  { id: "draft", label: "Draft the frames", status: "current", activity: "Reframing to 4:5 — frame 2 of 3" },
  { id: "copy", label: "Write the post copy", status: "pending" },
];

const COMPLETE: ChatTask[] = RUNNING.map((t) => ({ id: t.id, label: t.label, status: "done" as const }));

let retried = 0;
const ROWS: ChatTask[] = [
  { id: "done", label: "Done task", status: "done" },
  { id: "current", label: "Current task", status: "current" },
  { id: "pending", label: "Pending task", status: "pending", isNew: true, newLabel: "New" },
  { id: "needs", label: "Pick a quote", status: "needsYou", needsYouLabel: "Needs you" },
  {
    id: "failed",
    label: "Export the Story cut",
    status: "failed",
    reason: "Render timed out",
    retryLabel: "Retry",
    onRetryAction: () => (retried += 1),
  },
  { id: "skipped", label: "Cut a Story", status: "skipped", skippedLabel: "Skipped — feed only" },
];

const PROPOSED: ChatProposedTask[] = [
  { id: "scan", label: "Read the poster scan" },
  { id: "draft", label: "Draft the frames" },
  { id: "copy", label: "Write the post copy" },
];

const live = (props: Partial<Extract<ChatTasksProps, { status: "running" | "complete" | "stopped" }>> = {}) => (
  <ChatTasks status="running" label="Grid systems carousel" count="1 of 3" tasks={RUNNING} statusLabels={LABELS} {...props} />
);

describe("ChatTasks — the card", () => {
  test("the card IS ChatWidget's surface: same fill, radius and inset, with the sheet's gap-xs (3ZRW-0)", () => {
    const { q } = mount(
      <div className="flex flex-col gap-md">
        {live()}
        <ChatWidget data-testid="reference">
          <p>Reference</p>
        </ChatWidget>
      </div>,
    );
    const card = q("chat-tasks")!;
    const reference = container!.querySelector<HTMLElement>('[data-testid="reference"]')!;
    const a = getComputedStyle(card);
    const b = getComputedStyle(reference);

    expect(a.backgroundColor).toBe(b.backgroundColor);
    expect(a.backgroundColor).toBe(tokenColor("--ui-bg-elevated"));
    expect(a.borderTopLeftRadius).toBe(b.borderTopLeftRadius);
    expect(a.paddingTop).toBe(b.paddingTop);
    expect(a.paddingInlineStart).toBe(b.paddingInlineStart);
    expect(a.paddingTop).toBe("8px");
    // The one change: gap-xs between header and rows, not the widget's gap-sm.
    expect(a.rowGap).toBe("4px");
    expect(b.rowGap).toBe("8px");
    // No border and no shadow — the fill alone separates it.
    expect(a.borderTopWidth).toBe("0px");
    expect(a.boxShadow).toBe("none");
  });

  test("header 32px, px-md, gap-sm; every row at least 32px (3ZRX-0, 3ZS5-0)", () => {
    const { q, all } = mount(live({ tasks: ROWS }));
    const header = q("chat-tasks-header")!;
    const style = getComputedStyle(header);

    expect(rect(header).height).toBe(32);
    expect(style.paddingInlineStart).toBe("12px");
    expect(style.columnGap).toBe("8px");
    expect(style.borderTopLeftRadius).toBe("8px");

    const rows = all("chat-tasks-row");
    expect(rows).toHaveLength(6);
    for (const r of rows) {
      expect(rect(r).height).toBeGreaterThanOrEqual(32);
      expect(getComputedStyle(r).paddingInlineStart).toBe("12px");
      expect(getComputedStyle(r).columnGap).toBe("8px");
    }
  });

  test("every glyph sits in one 16px lane, so labels start on one vertical", () => {
    const { all } = mount(live({ tasks: ROWS }));
    const lanes = all("chat-tasks-glyph");
    const labels = all("chat-tasks-label");

    for (const lane of lanes) {
      expect(rect(lane).width).toBe(16);
      expect(rect(lane).height).toBe(16);
    }
    const starts = new Set(labels.map((l) => Math.round(rect(l).left)));
    expect(starts.size).toBe(1);
  });

  test("the header's type: title label-md 13/600 primary and truncating; count caption muted, tabular", () => {
    const { q } = mount(live());
    const title = getComputedStyle(q("chat-tasks-title")!);
    const count = getComputedStyle(q("chat-tasks-count")!);

    expect(title.fontSize).toBe("13px");
    expect(title.fontWeight).toBe("600");
    expect(title.color).toBe(tokenColor("--ui-text-primary"));
    expect(title.textOverflow).toBe("ellipsis");
    expect(title.whiteSpace).toBe("nowrap");

    expect(count.fontSize).toBe("12px");
    expect(count.color).toBe(tokenColor("--ui-text-muted"));
    expect(count.fontVariantNumeric).toContain("tabular-nums");
  });
});

describe("ChatTasks — the disclosure", () => {
  test("the header is a real button that names the plan and reports its state", () => {
    const { q } = mount(live());
    const trigger = q<HTMLButtonElement>("chat-tasks-header")!;

    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.textContent).toContain("Grid systems carousel");
    expect(trigger.textContent).toContain("1 of 3");
    expect(trigger.getAttribute("aria-controls")).toBe(q("chat-tasks-panel")!.id);
  });

  test("Tab reaches the header; Enter and Space both toggle it", async () => {
    const { q } = mount(live());
    const trigger = q<HTMLButtonElement>("chat-tasks-header")!;

    await userEvent.tab();
    expect(document.activeElement).toBe(trigger);

    await userEvent.keyboard("{Enter}");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(q("chat-tasks-list")).toBeNull();

    await userEvent.keyboard(" ");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(q("chat-tasks-list")).not.toBeNull();
  });

  test("keyboard focus draws a real outline on the header", async () => {
    const { q } = mount(live());
    const trigger = q<HTMLButtonElement>("chat-tasks-header")!;

    await userEvent.tab();
    expect(trigger.matches(":focus-visible")).toBe(true);
    const style = getComputedStyle(trigger);
    expect(style.outlineStyle).toBe("solid");
    expect(parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(style.outlineColor).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("the chevron is 12px, up while open and down while folded", async () => {
    const { q } = mount(live());
    const chevron = q("chat-tasks-chevron")!;

    expect(rect(chevron).width).toBe(12);
    await settled(chevron);
    expect(getComputedStyle(chevron).rotate).toBe("180deg");

    await userEvent.click(q<HTMLButtonElement>("chat-tasks-header")!);
    await settled(chevron);
    expect(getComputedStyle(chevron).rotate).toBe("none");
  });

  test("running and stopped mount open; complete mounts folded", () => {
    const running = mount(live());
    expect(running.q("chat-tasks-list")).not.toBeNull();
    unmount();

    const stopped = mount(live({ status: "stopped", count: "Stopped at 1 of 3" }));
    expect(stopped.q("chat-tasks-list")).not.toBeNull();
    unmount();

    const complete = mount(live({ status: "complete", count: "3 of 3 · 3 min", tasks: COMPLETE }));
    expect(complete.q("chat-tasks-list")).toBeNull();
    expect(complete.q("chat-tasks-header")!.getAttribute("aria-expanded")).toBe("false");
  });

  test("a plan that completes WHILE MOUNTED folds itself, and the user can reopen it", async () => {
    const { q } = mount(live());
    expect(q("chat-tasks-list")).not.toBeNull();

    rerender(live({ status: "complete", count: "3 of 3 · 3 min", tasks: COMPLETE }));
    expect(q("chat-tasks-list")).toBeNull();

    await userEvent.click(q<HTMLButtonElement>("chat-tasks-header")!);
    expect(q("chat-tasks-list")).not.toBeNull();

    // Re-rendering the same finished plan does not fold it again.
    rerender(live({ status: "complete", count: "3 of 3 · 3 min", tasks: COMPLETE }));
    expect(q("chat-tasks-list")).not.toBeNull();
  });

  test("controlled, the disclosure reports and does not move on its own", async () => {
    const seen: boolean[] = [];
    const { q } = mount(live({ isOpen: true, onOpenChange: (open) => seen.push(open) }));

    await userEvent.click(q<HTMLButtonElement>("chat-tasks-header")!);
    expect(seen).toEqual([false]);
    expect(q("chat-tasks-list")).not.toBeNull();

    // Completing asks the parent to fold; the parent decides.
    rerender(live({ status: "complete", tasks: COMPLETE, isOpen: true, onOpenChange: (open) => seen.push(open) }));
    expect(seen).toEqual([false, false]);
    expect(q("chat-tasks-list")).not.toBeNull();
  });
});

describe("ChatTasks — folded", () => {
  test("open, the header glyph is the list; folded, it becomes the list's status (3ZSV-0, 3ZT4-0, 3ZTC-0)", () => {
    const glyph = () => container!.querySelector<HTMLElement>('[data-slot="chat-tasks-header-glyph"]')!;

    mount(live());
    expect(glyph().dataset.glyph).toBe("list");
    expect(matrices(glyph())).toHaveLength(0);
    unmount();

    mount(live({ defaultIsOpen: false }));
    expect(glyph().dataset.glyph).toBe("running");
    const [m] = matrices(glyph());
    expect(m).toBeDefined();
    expect(m!.dataset.status).toBe("working");
    expect(m!.hasAttribute("data-held")).toBe(true);
    unmount();

    mount(live({ status: "complete", count: "3 of 3", tasks: COMPLETE }));
    expect(glyph().dataset.glyph).toBe("complete");
    expect(getComputedStyle(glyph().querySelector("svg")!).color).toBe(tokenColor("--ui-intent-success-fg"));
    unmount();

    mount(live({ status: "stopped", count: "Stopped at 1 of 3", defaultIsOpen: false }));
    expect(glyph().dataset.glyph).toBe("stopped");
    expect(getComputedStyle(glyph().querySelector("svg")!).color).toBe(tokenColor("--ui-text-muted"));
  });

  test("folded mid-run, the title gives way to the current task; the plan's name stays in the button's name", () => {
    const { q } = mount(live({ defaultIsOpen: false }));
    const title = q("chat-tasks-title")!;
    const visible = Array.from(title.childNodes)
      .filter((n) => !(n instanceof HTMLElement && n.classList.contains("sr-only")))
      .map((n) => n.textContent)
      .join("");

    expect(visible).toBe("Draft the frames");
    expect(q("chat-tasks-header")!.textContent).toContain("Grid systems carousel");
  });

  test("folded but complete or stopped, the title stays the plan's name", () => {
    const { q } = mount(live({ status: "stopped", tasks: RUNNING, defaultIsOpen: false }));
    expect(q("chat-tasks-title")!.textContent).toBe("Grid systems carousel");
  });
});

describe("ChatTasks — row states", () => {
  test("six statuses are six glyphs", () => {
    const { all } = mount(live({ tasks: ROWS }));
    expect(all("chat-tasks-glyph").map((g) => g.dataset.glyph)).toEqual([
      "done",
      "current",
      "pending",
      "needsYou",
      "failed",
      "skipped",
    ]);
  });

  test("the current task holds Working's key frame — the plan never moves", () => {
    const { container: c } = mount(live({ tasks: ROWS }));
    const current = row(c, "current");
    const all = matrices(c);

    expect(all).toHaveLength(1);
    const m = all[0]!;
    expect(current.contains(m)).toBe(true);
    expect(m.dataset.status).toBe("working");
    expect(m.hasAttribute("data-held")).toBe(true);
    expect(m.getAttribute("aria-hidden")).toBe("true");
    expect(rect(m).width).toBe(16);
    expect(current.getAttribute("aria-current")).toBe("step");
  });

  test("glyph inks: done success, failed danger, skipped muted; rings are 1.5px border-default or warning (3ZSL-0, 3ZUB-0)", () => {
    const { container: c } = mount(live({ tasks: ROWS }));
    const svgColor = (status: string) => getComputedStyle(row(c, status).querySelector("svg")!).color;
    const ring = (status: string) => getComputedStyle(row(c, status).querySelector('[data-slot="chat-tasks-ring"]')!);

    expect(svgColor("done")).toBe(tokenColor("--ui-intent-success-fg"));
    expect(svgColor("failed")).toBe(tokenColor("--ui-intent-danger-fg"));
    expect(svgColor("skipped")).toBe(tokenColor("--ui-text-muted"));

    // The library's hairline, as Chromium USES it — at DPR 1 it snaps the
    // declared 1.5px to 1px, so compare against a probe rather than a literal.
    const probe = document.createElement("span");
    probe.className = "border-hairline border-solid";
    c.appendChild(probe);
    const hairline = getComputedStyle(probe).borderTopWidth;
    probe.remove();
    expect(parseFloat(hairline)).toBeGreaterThan(0);
    expect(ring("pending").borderTopWidth).toBe(hairline);
    expect(ring("needsYou").borderTopWidth).toBe(hairline);
    expect(ring("pending").borderTopStyle).toBe("solid");
    expect(ring("pending").borderTopColor).toBe(tokenColor("--ui-border-default"));
    expect(ring("needsYou").borderTopColor).toBe(tokenColor("--ui-intent-warning-fg"));
    expect(ring("needsYou").borderTopColor).not.toBe(ring("pending").borderTopColor);
  });

  test("label ink follows interest: done recedes, pending is secondary, current and needs-you are primary", () => {
    const { container: c } = mount(live({ tasks: ROWS }));
    const ink = (status: string) => getComputedStyle(labelOf(row(c, status))).color;

    expect(ink("done")).toBe(tokenColor("--ui-text-muted"));
    expect(ink("pending")).toBe(tokenColor("--ui-text-secondary"));
    expect(ink("current")).toBe(tokenColor("--ui-text-primary"));
    expect(ink("needsYou")).toBe(tokenColor("--ui-text-primary"));
    expect(ink("failed")).toBe(tokenColor("--ui-intent-danger-fg"));
    expect(ink("skipped")).toBe(tokenColor("--ui-text-muted"));

    // Three inks, not one painted three ways.
    expect(new Set([ink("done"), ink("pending"), ink("current")]).size).toBe(3);
  });

  test("label type: 13px throughout; needs-you one weight up; no strikethrough on done", () => {
    const { container: c } = mount(live({ tasks: ROWS }));
    const style = (status: string) => getComputedStyle(labelOf(row(c, status)));

    for (const s of ["done", "current", "pending", "needsYou", "failed", "skipped"]) {
      expect(style(s).fontSize).toBe("13px");
    }
    expect(Number(style("needsYou").fontWeight)).toBeGreaterThan(Number(style("pending").fontWeight));
    expect(style("done").textDecorationLine).toBe("none");
  });

  test("the current task's activity is a caption under its label, and that row aligns to its top", () => {
    const { container: c } = mount(live());
    const current = row(c, "current");
    const activity = current.querySelector<HTMLElement>('[data-slot="chat-tasks-activity"]')!;

    expect(activity.textContent).toBe("Reframing to 4:5 — frame 2 of 3");
    expect(getComputedStyle(activity).fontSize).toBe("12px");
    expect(getComputedStyle(activity).color).toBe(tokenColor("--ui-text-muted"));
    expect(rect(activity).top).toBeGreaterThan(rect(labelOf(current)).top);
    expect(getComputedStyle(current).alignItems).toBe("flex-start");
    expect(getComputedStyle(current).paddingTop).toBe("8px");
  });

  test("done, current and pending carry their status in words for a screen reader", () => {
    const { container: c } = mount(live());
    const sr = (status: string) => labelOf(row(c, status)).querySelector(".sr-only")!.textContent!.trim();

    expect(sr("done")).toBe("Done:");
    expect(sr("current")).toBe("In progress:");
    expect(sr("pending")).toBe("To do:");
  });

  test("needs-you is a warning Badge; New is an info Badge (3ZUD-0, 40GP-0)", () => {
    const { container: c } = mount(live({ tasks: ROWS }));
    const needs = row(c, "needsYou").querySelector<HTMLElement>('[data-slot="badge"]')!;
    const fresh = row(c, "pending").querySelector<HTMLElement>('[data-slot="badge"]')!;

    expect(needs.dataset.variant).toBe("warning");
    expect(needs.textContent).toBe("Needs you");
    expect(fresh.dataset.variant).toBe("info");
    expect(fresh.textContent).toBe("New");
    expect(row(c, "pending").hasAttribute("data-new")).toBe(true);
    expect(getComputedStyle(needs).backgroundColor).not.toBe(getComputedStyle(fresh).backgroundColor);
  });

  test("failed: the reason in danger on one line, the task named for a screen reader, a real Retry (3ZUF-0)", async () => {
    retried = 0;
    const { container: c } = mount(live({ tasks: ROWS }));
    const failed = row(c, "failed");
    const label = labelOf(failed);

    expect(label.textContent).toContain("Render timed out");
    expect(label.querySelector(".sr-only")!.textContent).toContain("Export the Story cut");
    expect(getComputedStyle(label).whiteSpace).toBe("nowrap");
    expect(getComputedStyle(failed).paddingInlineEnd).toBe("4px");

    const retry = failed.querySelector<HTMLButtonElement>('[data-slot="chat-tasks-retry"]')!;
    expect(retry.tagName).toBe("BUTTON");
    expect(retry.textContent).toBe("Retry");
    expect(rect(retry).height).toBe(24);
    await userEvent.click(retry);
    expect(retried).toBe(1);
  });

  test("a failed task with no retry handler draws no button", () => {
    const { container: c } = mount(
      live({ tasks: [{ id: "f", label: "Export", status: "failed", reason: "Timed out" }] }),
    );
    expect(c.querySelector('[data-slot="chat-tasks-retry"]')).toBeNull();
  });

  test("skipped keeps its place and says why in a trailing caption (3ZUP-0)", () => {
    const { container: c, all } = mount(live({ tasks: ROWS }));
    const note = row(c, "skipped").querySelector<HTMLElement>('[data-slot="chat-tasks-note"]')!;

    expect(all("chat-tasks-row").at(-1)!.dataset.taskStatus).toBe("skipped");
    expect(note.textContent).toBe("Skipped — feed only");
    expect(getComputedStyle(note).fontSize).toBe("12px");
    expect(getComputedStyle(note).color).toBe(tokenColor("--ui-text-muted"));
  });

  test("the tasks are a real ordered list, so a screen reader is given the count", () => {
    const { q, all } = mount(live({ tasks: ROWS }));
    expect(q("chat-tasks-list")!.tagName).toBe("OL");
    for (const r of all("chat-tasks-row")) expect(r.tagName).toBe("LI");
  });

  test("dark scheme: the inks still differ and the card is still elevated", () => {
    const { container: c, q } = mount(live({ tasks: ROWS }), "dark");
    const ink = (status: string) => getComputedStyle(labelOf(row(c, status))).color;

    expect(new Set([ink("done"), ink("pending"), ink("current")]).size).toBe(3);
    expect(getComputedStyle(q("chat-tasks")!).backgroundColor).toBe(tokenColor("--ui-bg-elevated"));
    expect(getComputedStyle(q("chat-tasks")!).backgroundColor).not.toBe(getComputedStyle(c).backgroundColor);
  });
});

describe("ChatTasks — proposed", () => {
  const proposed = (extra: Partial<Extract<ChatTasksProps, { status: "proposed" }>> = {}) => (
    <ChatTasks
      status="proposed"
      label="Grid systems carousel"
      count="3 steps · about 3 min"
      tasks={PROPOSED}
      runLabel="Run plan"
      onRunAction={() => {}}
      {...extra}
    />
  );

  test("no disclosure: the header is not a button and the rows are always shown (40F1-0)", () => {
    const { q, container: c } = mount(proposed());
    const header = q("chat-tasks-header")!;

    expect(header.tagName).toBe("DIV");
    expect(c.querySelector("[aria-expanded]")).toBeNull();
    expect(q("chat-tasks-chevron")).toBeNull();
    expect(header.querySelector<HTMLElement>('[data-slot="chat-tasks-header-glyph"]')!.dataset.glyph).toBe("list");
    expect(q("chat-tasks-list")).not.toBeNull();
    expect(matrices(c)).toHaveLength(0);
  });

  test("numbers in the glyph lane: caption, tabular, right-aligned, hidden from assistive tech (40F9-0)", () => {
    const { all } = mount(proposed());
    const indices = all("chat-tasks-index");

    expect(indices.map((i) => i.textContent)).toEqual(["1", "2", "3"]);
    for (const i of indices) {
      const s = getComputedStyle(i);
      expect(rect(i).width).toBe(16);
      expect(s.fontSize).toBe("12px");
      expect(s.textAlign).toBe("end");
      expect(s.fontVariantNumeric).toContain("tabular-nums");
      expect(i.getAttribute("aria-hidden")).toBe("true");
    }
  });

  test("the footer: Run as primary, Change it as secondary, the footnote muted at the end (40FQ-0)", async () => {
    let ran = 0;
    let changed = 0;
    const { q } = mount(
      proposed({
        onRunAction: () => (ran += 1),
        changeLabel: "Change it",
        onChangeAction: () => (changed += 1),
        footnote: "Nothing runs until you say so",
      }),
    );
    const footer = getComputedStyle(q("chat-tasks-footer")!);
    const run = q<HTMLButtonElement>("chat-tasks-run")!;
    const change = q<HTMLButtonElement>("chat-tasks-change")!;
    const note = q("chat-tasks-footnote")!;

    expect(footer.paddingInlineStart).toBe("8px");
    expect(footer.paddingTop).toBe("8px");
    expect(footer.paddingBottom).toBe("4px");
    expect(run.textContent).toBe("Run plan");
    expect(getComputedStyle(run).backgroundColor).not.toBe(getComputedStyle(change).backgroundColor);
    expect(getComputedStyle(note).textAlign).toBe("end");
    expect(getComputedStyle(note).color).toBe(tokenColor("--ui-text-muted"));

    await userEvent.click(run);
    await userEvent.click(change);
    expect(ran).toBe(1);
    expect(changed).toBe(1);
  });

  test("without the optional parts, only Run is drawn", () => {
    const { q, all } = mount(proposed());
    expect(q("chat-tasks-run")).not.toBeNull();
    expect(q("chat-tasks-change")).toBeNull();
    expect(q("chat-tasks-footnote")).toBeNull();
    expect(all("chat-tasks-drop")).toHaveLength(0);
  });

  test("each row's drop button is named for its task and drops that task (40FE-0)", async () => {
    const dropped: string[] = [];
    const { all } = mount(
      proposed({ onDropAction: (task) => dropped.push(task.id), getDropLabel: (task) => `Drop ${task.label}` }),
    );
    const drops = all("chat-tasks-drop") as HTMLButtonElement[];

    expect(drops.map((d) => d.getAttribute("aria-label"))).toEqual([
      "Drop Read the poster scan",
      "Drop Draft the frames",
      "Drop Write the post copy",
    ]);
    expect(rect(drops[0]!).height).toBe(24);
    await userEvent.click(drops[1]!);
    expect(dropped).toEqual(["draft"]);
  });

  test("the drop button is hidden at rest but shown when a keyboard reaches it", async () => {
    const { all } = mount(proposed({ onDropAction: () => {}, getDropLabel: (task) => `Drop ${task.label}` }));
    const lane = all("chat-tasks-drop-lane")[0]!;
    const drop = all("chat-tasks-drop")[0] as HTMLButtonElement;

    await settled(lane);
    expect(getComputedStyle(lane).opacity).toBe("0");

    act(() => drop.focus());
    await settled(lane);
    expect(getComputedStyle(lane).opacity).toBe("1");
  });
});

describe("ChatTasks — forwarding", () => {
  test("ref, className and native props land on the outermost node, which is the card", () => {
    const ref = createRef<HTMLDivElement>();
    const { q, container: c } = mount(
      <ChatTasks
        ref={ref}
        className="mt-lg"
        id="plan-4"
        status="running"
        label="Grid"
        count="1 of 3"
        tasks={RUNNING}
        statusLabels={LABELS}
      />,
    );
    const rootEl = q<HTMLElement>("chat-tasks")!;

    expect(c.firstElementChild).toBe(rootEl);
    expect(ref.current).toBe(rootEl);
    expect(rootEl.id).toBe("plan-4");
    expect(getComputedStyle(rootEl).marginTop).toBe("16px");
    expect(rootEl.dataset.status).toBe("running");
  });

  test("the proposed card forwards the same way", () => {
    const ref = createRef<HTMLDivElement>();
    const { q } = mount(
      <ChatTasks
        ref={ref}
        id="plan-5"
        status="proposed"
        label="Grid"
        count="3 steps"
        tasks={PROPOSED}
        runLabel="Run plan"
        onRunAction={() => {}}
      />,
    );
    expect(ref.current).toBe(q("chat-tasks"));
    expect(ref.current!.id).toBe("plan-5");
    expect(ref.current!.dataset.status).toBe("proposed");
  });

  test("the plan's own data never reaches the DOM as an attribute", () => {
    const { q } = mount(live({ tasks: ROWS }));
    const rootEl = q<HTMLElement>("chat-tasks")!;

    for (const attr of ["tasks", "label", "count", "statuslabels", "isopen", "defaultisopen", "runlabel", "footnote"]) {
      expect(rootEl.getAttribute(attr)).toBeNull();
    }
  });
});
