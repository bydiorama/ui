import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";
import { FileText, Search, Sparks } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED } from "@bydiorama/tokens";

import { ChatProgress, type ChatProgressLane, type ChatProgressStep } from "./chat-progress.tsx";

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

function mount(ui: ReactElement, scheme?: "light" | "dark") {
  container = document.createElement("div");
  if (scheme) {
    Object.assign(
      container.style,
      toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }), scheme) as unknown as Record<string, string>,
      { colorScheme: scheme },
    );
    container.className = "bg-base";
  }
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
const moving = (c: Element) => matrices(c).filter((m) => !m.hasAttribute("data-held"));

const STEPS: ChatProgressStep[] = [
  { id: "tone", label: "Tone of voice", status: "done" },
  { id: "images", label: "Collecting images", status: "current" },
  { id: "moodboard", label: "Compose moodboard", status: "pending" },
];

/** The sheet's running chain (3ZV1-0): kinds, durations, chips, prose, a branch. */
const CHAIN: ChatProgressStep[] = [
  {
    id: "search",
    label: "Searched the library",
    status: "done",
    icon: <Search />,
    duration: "3 s",
    chips: [{ label: "grid systems 1961" }, { label: "Müller-Brockmann posters" }],
  },
  { id: "read", label: "Read 4 sources", status: "done", icon: <FileText />, duration: "9 s" },
  {
    id: "compare",
    label: "Compared the two grids",
    status: "done",
    icon: <Sparks />,
    duration: "6 s",
    detail: "The 1961 poster grid is 4 × 4 on a doubled baseline; the brand grid is 12 columns.",
  },
  {
    id: "draft",
    label: "Drafting three frames",
    status: "current",
    duration: "24 s",
    steps: [
      { id: "f1", label: "Frame 1 — title on the 4 × 4", status: "done", duration: "11 s" },
      { id: "f2", label: "Frame 2 — the grid, drawn", status: "current", duration: "13 s" },
      { id: "f3", label: "Frame 3 — the quote", status: "pending" },
    ],
  },
  { id: "safe", label: "Check safe areas", status: "pending" },
];

/** The sheet's running lanes (403F-0). */
const LANES: ChatProgressLane[] = [
  { id: "carousel", name: "Carousel", activity: "Reframing the scan to 4:5 — frame 2 of 3", status: "current", duration: "31 s" },
  { id: "copy", name: "Post copy", activity: "Draft ready — 84 words", status: "done", duration: "14 s" },
  {
    id: "alt",
    name: "Alt text",
    activity: "Describing frame 2 for Josef Müller-Brockmann's Beethoven poster, 1955, in the series",
    status: "current",
    duration: "22 s",
  },
  { id: "story", name: "Story cut", activity: "Waits for Carousel", status: "pending" },
];

describe("ChatProgress — the live edge", () => {
  test.each(["waiting", "thinking", "streaming"] as const)(
    "%s is one status row with one moving matrix drawing its own signal",
    (form) => {
      const { q, container: c } = mount(
        form === "thinking" ? <ChatProgress label="Writing a reply" /> : <ChatProgress form={form} label="Writing a reply" />,
      );

      expect(q("chat-progress-thinking")!.textContent).toBe("Writing a reply");
      expect(matrices(c)).toHaveLength(1);
      expect(matrices(c)[0]!.dataset.status).toBe(form);
      expect(moving(c)).toHaveLength(1);
      // The lightest forms have no disclosure: there is nothing folded.
      expect(c.querySelector("button")).toBeNull();
      expect(q("chat-progress")!.dataset.form).toBe(form);
    },
  );

  test("the matrix is 16px beside the 13px line", () => {
    const { container: c } = mount(<ChatProgress label="Thinking…" />);
    const m = rect(matrices(c)[0]!);
    expect([m.width, m.height]).toEqual([16, 16]);
  });

  test("the icon slot replaces the matrix rather than joining it", () => {
    const { q, container: c } = mount(<ChatProgress label="Thinking…" icon={<span data-slot="probe-mark" />} />);

    expect(q("probe-mark")).not.toBeNull();
    expect(matrices(c)).toHaveLength(0);
  });

  test("isHeld holds the matrix on its key frame — the live edge is elsewhere", () => {
    const { container: c } = mount(<ChatProgress label="Thinking…" isHeld />);
    expect(matrices(c)).toHaveLength(1);
    expect(moving(c)).toHaveLength(0);
  });

  test("failing hands over IN PLACE: the same matrix draws Failed, no second mark", async () => {
    const { container: c, q } = mount(<ChatProgress label="Thinking…" />, "light");
    const before = matrices(c)[0]!;

    rerender(<ChatProgress label="Thinking…" errorText="Could not finish thinking" retryLabel="Retry" onRetryAction={() => {}} />);

    const after = matrices(c);
    expect(after).toHaveLength(1);
    // Identity, not a lookalike: the element that was thinking is the element
    // that fails, which is what lets the cross draw on from the old figure.
    expect(after[0]).toBe(before);
    expect(after[0]!.dataset.status).toBe("failed");
    expect(q("chat-progress")!.dataset.status).toBe("failed");
    const line = q("chat-progress-failure")!.querySelector("span")!;
    await settled(line);
    expect(getComputedStyle(line).color).toBe(tokenColor("--ui-intent-danger-fg"));
  });

  test("stopping draws the Stopped square in the same row", () => {
    const { container: c } = mount(<ChatProgress label="Thinking…" />);
    const before = matrices(c)[0]!;
    rerender(<ChatProgress label="Thinking…" stoppedText="Stopped after 5 s" />);

    expect(matrices(c)[0]).toBe(before);
    expect(before.dataset.status).toBe("stopped");
    expect(c.textContent).toContain("Stopped after 5 s");
  });

  test("a long wait shows its clock and offers Stop", async () => {
    let stopped = 0;
    const { q } = mount(
      <ChatProgress label="Still working on it" duration="1 min 12 s" stopLabel="Stop" onStopAction={() => (stopped += 1)} />,
    );

    expect(q("chat-progress-clock")!.textContent).toBe("1 min 12 s");
    const stop = q<HTMLButtonElement>("chat-progress-stop")!;
    expect(stop.tagName).toBe("BUTTON");
    expect(stop.textContent).toBe("Stop");
    await userEvent.click(stop);
    expect(stopped).toBe(1);
  });

  test("the clock is tabular, so a ticking duration does not jitter its row", () => {
    const { q } = mount(<ChatProgress label="Thinking…" duration="12 s" />);
    expect(getComputedStyle(q("chat-progress-clock")!).fontVariantNumeric).toBe("tabular-nums");
  });
});

describe("ChatProgress — presence (typing)", () => {
  test("people typing take the Typing matrix in MUTED ink, beside a caption line (40CC, 40E5)", async () => {
    const { q, container } = mount(<ChatProgress form="typing" who="Wim Crouwel" label="is typing" isHeld />, "light");
    const matrix = container.querySelector<SVGElement>('[data-slot="status-matrix"]')!;
    expect(matrix.getAttribute("data-status")).toBe("typing");
    const box = matrix.getBoundingClientRect();
    expect([box.width, box.height]).toEqual([16, 16]);
    // The dots' ink is the muted text role — a person, never the agent's accent.
    const probe = document.createElement("span");
    probe.className = "text-ink-muted";
    container.appendChild(probe);
    const dot = matrix.querySelector<SVGElement>('[data-slot="status-matrix-dot"]')!;
    await settled(matrix);
    const ink = getComputedStyle(dot).fill;
    expect(ink).toBe(getComputedStyle(probe).color);
    const accent = document.createElement("span");
    accent.style.color = "var(--ui-bg-accent-legible)";
    container.appendChild(accent);
    expect(ink).not.toBe(getComputedStyle(accent).color);

    const line = q("chat-progress-presence-who")!.parentElement!;
    const s = getComputedStyle(line);
    expect(s.fontSize).toBe("12px");
    expect(s.color).toBe(getComputedStyle(probe).color);
    expect(line.textContent).toBe("Wim Crouwel is typing");
    // gap-sm between the matrix and the line (40CC: gap space-sm).
    expect(line.getBoundingClientRect().left - box.right).toBe(8);
  });

  test("the longest name truncates before the verb does (40E1)", () => {
    const { q, container } = mount(
      <div style={{ width: 140 }}>
        <ChatProgress form="typing" who="Josef Müller-Brockmann and Wim Crouwel" label="are typing" />
      </div>,
    );
    const who = q("chat-progress-presence-who")!;
    const verb = who.nextElementSibling as HTMLElement;
    expect(who.scrollWidth).toBeGreaterThan(who.clientWidth);
    expect(getComputedStyle(who).textOverflow).toBe("ellipsis");
    // The verb is whole: its box holds its text.
    expect(verb.scrollWidth).toBeLessThanOrEqual(verb.clientWidth + 0.5);
    expect(verb.textContent).toBe(" are typing");
    // And nothing escapes the row.
    const row = q("chat-progress-presence")!;
    expect(verb.getBoundingClientRect().right).toBeLessThanOrEqual(row.getBoundingClientRect().right + 0.5);
    expect(container.querySelector('[data-slot="chat-progress-presence"]')).not.toBeNull();
  });

  test("presence is not a run: no status row, no clock, no disclosure", () => {
    const { q, container } = mount(<ChatProgress form="typing" who="Ana" label="is typing" />);
    expect(q("chat-progress-thinking")).toBeNull();
    expect(q("chat-progress-clock")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    const root = q("chat-progress")!;
    expect(root.dataset.form).toBe("typing");
    expect(root.getAttribute("role")).toBe("status");
  });

  test("it moves unless held, like every live matrix", () => {
    const { container } = mount(<ChatProgress form="typing" who="Ana" label="is typing" />);
    expect(container.querySelector('[data-slot="status-matrix"]')!.hasAttribute("data-held")).toBe(false);
    rerender(<ChatProgress form="typing" who="Ana" label="is typing" isHeld />);
    expect(container.querySelector('[data-slot="status-matrix"]')!.hasAttribute("data-held")).toBe(true);
  });
});

describe("ChatProgress — the thought chain", () => {
  test("the four statuses are four different glyphs", () => {
    const failing: ChatProgressStep[] = [...STEPS, { id: "x", label: "Could not open", status: "failed" }];
    const { all } = mount(<ChatProgress form="steps" label="Gathering" steps={failing} />, "light");
    const [done, current, pending, failed] = all("chat-progress-step");

    expect(done!.dataset.stepStatus).toBe("done");
    // Asserted by which element is present, not by a colour: the colour is
    // the second channel, never the first.
    expect(done!.querySelector('[data-slot="status-matrix"]')).toBeNull();
    expect(current!.querySelector<SVGSVGElement>('[data-slot="status-matrix"]')!.dataset.status).toBe("working");
    expect(pending!.querySelector('[data-slot="chat-progress-pending"]')).not.toBeNull();
    expect(failed!.querySelector('[data-slot="status-matrix"]')).toBeNull();
    expect(failed!.querySelector('[data-slot="chat-progress-pending"]')).toBeNull();
  });

  test("a finished step shows its KIND glyph in muted ink; without one, the check", () => {
    const { all } = mount(
      <ChatProgress
        form="steps"
        label="Researching"
        steps={[
          { id: "a", label: "Searched", status: "done", icon: <Search /> },
          { id: "b", label: "Read", status: "done" },
        ]}
      />,
      "light",
    );
    const [withKind, without] = all("chat-progress-step");

    const kind = withKind!.querySelector<HTMLElement>('[data-slot="chat-progress-kind"]')!;
    expect(getComputedStyle(kind).color).toBe(tokenColor("--ui-text-muted"));
    const kindSvg = rect(kind.querySelector("svg")!);
    expect([kindSvg.width, kindSvg.height]).toEqual([14, 14]);
    expect(without!.querySelector('[data-slot="chat-progress-kind"]')).toBeNull();
  });

  test("the lanes: node 16 · text edge 24 · clock 40 · chevron 16 (3ZV1-0, 3ZYN-0)", () => {
    const { q, all } = mount(
      <div style={{ width: "530px" }}>
        <ChatProgress form="steps" label="Researching grid systems" duration="42 s" steps={CHAIN} />
      </div>,
    );
    const rootBox = rect(q("chat-progress")!);
    const step = all("chat-progress-step")[0]!;
    const label = step.querySelector<HTMLElement>('[data-slot="chat-progress-label"]')!;
    const clock = step.querySelector<HTMLElement>('[data-slot="chat-progress-clock"]')!;

    // 3ZVP-0: "Searched the library" starts at the 24px text edge.
    expect(rect(label).left - rootBox.left).toBe(24);
    // 3ZVQ-0: the clock lane is 40, and 3ZVR-0's 16px chevron slot follows
    // it, so every clock ends 16 + 8 short of the run's trailing edge.
    expect(rect(clock).width).toBe(40);
    expect(rootBox.right - rect(clock).right).toBe(24);
    // The root's clock (3ZVC-0) sits in the same lane.
    const rootClock = q("chat-progress-summary")!.querySelector<HTMLElement>('[data-slot="chat-progress-clock"]')!;
    expect(rect(rootClock).right).toBe(rect(clock).right);
  });

  test("the rail is 1px of border-default on the glyph's centre line, 4px clear of each glyph (3ZV7-0)", async () => {
    const { all, q } = mount(<ChatProgress form="steps" label="Researching" steps={CHAIN} />, "light");
    const rootBox = rect(q("chat-progress")!);
    const first = all("chat-progress-step")[0]!;
    const rail = first.querySelector<HTMLElement>('[data-slot="chat-progress-rail"]')!;
    const glyph = first.querySelector<HTMLElement>('[data-slot="chat-progress-node"] > span')!;
    const next = all("chat-progress-step")[1]!.querySelector<HTMLElement>('[data-slot="chat-progress-node"] > span')!;
    await settled(rail);

    expect(rect(rail).width).toBe(1);
    expect(rect(rail).left - rootBox.left).toBe(8);
    expect(getComputedStyle(rail).backgroundColor).toBe(tokenColor("--ui-border-default"));
    expect(rect(rail).top - rect(glyph).bottom).toBe(4);
    expect(rect(next).top - rect(rail).bottom).toBe(4);
  });

  test("a nested step is a branch on a tick, its label at 46 — not a second indent (3ZXE-0)", () => {
    const { all, q } = mount(<ChatProgress form="steps" label="Researching" steps={CHAIN} />);
    const rootBox = rect(q("chat-progress")!);
    const branches = all("chat-progress-branch");
    expect(branches).toHaveLength(3);

    const label = branches[0]!.querySelector<HTMLElement>('[data-slot="chat-progress-label"]')!;
    expect(rect(label).left - rootBox.left).toBe(46);
    // The tick leaves the rail at the first line's centre (8px down) and
    // stops 4px short of the branch's 14px glyph at 24.
    const tick = branches[0]!.children[1] as HTMLElement;
    expect(rect(tick).top - rect(branches[0]!).top).toBe(8);
    expect(rect(tick).width).toBe(11);
  });

  test("only the deepest running node moves; its parent and the root hold Working", () => {
    const { container: c, all } = mount(<ChatProgress form="steps" label="Researching" steps={CHAIN} />);

    expect(moving(c)).toHaveLength(1);
    const f2 = all("chat-progress-branch")[1]!;
    expect(moving(c)[0]!.closest('[data-slot="chat-progress-branch"]')).toBe(f2);
    // Root and "Drafting three frames" are held on Working's key frame.
    expect(matrices(c).filter((m) => m.dataset.status === "working")).toHaveLength(3);
  });

  test("folded mid-run, the root keeps the moving matrix", async () => {
    const { container: c, q } = mount(<ChatProgress form="steps" label="Researching" steps={CHAIN} />);
    await userEvent.click(q<HTMLButtonElement>("chat-progress-summary")!);

    expect(q("chat-progress-steps")).toBeNull();
    expect(moving(c)).toHaveLength(1);
    expect(moving(c)[0]!.closest('[data-slot="chat-progress-summary"]')).toBeNull();
    expect(moving(c)[0]!.closest('[data-slot="chat-progress-node"]')).not.toBeNull();
  });

  test("with no running step, the root is the live edge", () => {
    const { container: c } = mount(
      <ChatProgress form="steps" label="Researching" steps={[{ id: "a", label: "Search", status: "done" }]} />,
    );
    expect(moving(c)).toHaveLength(1);
  });

  test("chips and prose hang at the text edge, in the sheet's type (3ZVT-0, 3ZWZ-0)", () => {
    const { all, q } = mount(<ChatProgress form="steps" label="Researching" steps={CHAIN} />, "light");
    const rootBox = rect(q("chat-progress")!);
    const chip = all("chat-progress-chip")[0]!;
    const detail = all("chat-progress-detail")[0]!;

    expect(rect(chip).left - rootBox.left).toBe(24);
    expect(getComputedStyle(chip).backgroundColor).toBe(
      (() => {
        const p = document.createElement("span");
        p.style.backgroundColor = "var(--ui-bg-elevated)";
        container!.appendChild(p);
        const v = getComputedStyle(p).backgroundColor;
        p.remove();
        return v;
      })(),
    );
    expect(getComputedStyle(chip).paddingInline).toBe("6px");
    expect(getComputedStyle(chip).paddingBlock).toBe("2px");
    expect(rect(detail).left - rootBox.left).toBe(24);
    expect(getComputedStyle(detail).fontSize).toBe("12px");
  });

  test("a failed step: the cross, the label in danger, Retry in the clock lane, the reason as prose", async () => {
    let retried = 0;
    const { all } = mount(
      <ChatProgress
        form="steps"
        label="Researching"
        steps={[
          { id: "s", label: "Searched the library", status: "done", duration: "3 s" },
          {
            id: "f",
            label: "Could not open eyemagazine.example",
            status: "failed",
            detail: "Timed out after 10 s. Carried on with 3 of 4 sources.",
            retryLabel: "Retry",
            onRetryAction: () => (retried += 1),
          },
          { id: "c", label: "Compared the two grids", status: "done", duration: "6 s" },
        ]}
      />,
      "light",
    );
    const failed = all("chat-progress-step")[1]!;
    const label = failed.querySelector<HTMLElement>('[data-slot="chat-progress-label"]')!;
    await settled(label);

    expect(getComputedStyle(label).color).toBe(tokenColor("--ui-intent-danger-fg"));
    expect(failed.querySelector('[data-slot="chat-progress-clock"]')).toBeNull();
    const retry = failed.querySelector<HTMLButtonElement>('[data-slot="chat-progress-retry"]')!;
    await userEvent.click(retry);
    expect(retried).toBe(1);
    expect(failed.textContent).toContain("Carried on with 3 of 4 sources.");
  });

  test("the steps are a real list, so a screen reader is given the count", () => {
    const { q } = mount(<ChatProgress form="steps" label="Gathering" steps={STEPS} />);
    const list = q<HTMLElement>("chat-progress-steps")!;

    expect(list.tagName).toBe("UL");
    expect(list.children).toHaveLength(3);
  });
});

describe("ChatProgress — receipt", () => {
  test("a running chain opens by default; a finished one folds", () => {
    const running = mount(<ChatProgress form="steps" label="Gathering" steps={STEPS} />);
    expect(running.q("chat-progress-steps")).not.toBeNull();
    unmount();

    const done = mount(
      <ChatProgress
        form="steps"
        label="Gathering"
        steps={STEPS}
        isComplete
        receiptText="Worked for 26 s · 4 steps"
        expandLabel="Show what the agent did"
      />,
    );
    expect(done.q("chat-progress-summary")!.textContent).toContain("Worked for 26 s · 4 steps");
    expect(done.q("chat-progress-steps")).toBeNull();
  });

  test("a run that finishes WHILE MOUNTED folds to its receipt", () => {
    const { q } = mount(<ChatProgress form="steps" label="Gathering" steps={STEPS} />);
    expect(q("chat-progress-steps")).not.toBeNull();

    rerender(
      <ChatProgress
        form="steps"
        label="Gathering"
        steps={STEPS}
        isComplete
        receiptText="Worked for 26 s · 4 steps"
        expandLabel="Show what the agent did"
      />,
    );
    expect(q("chat-progress-steps")).toBeNull();
  });

  test("the receipt re-expands, and its trigger is named", async () => {
    const { q, container: c } = mount(
      <ChatProgress
        form="steps"
        label="Gathering"
        steps={STEPS}
        isComplete
        receiptText="Worked for 26 s · 4 steps"
        expandLabel="Show what the agent did"
      />,
    );
    const trigger = q<HTMLButtonElement>("chat-progress-summary")!;

    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.textContent).toContain("Show what the agent did");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(c.querySelector('[data-slot="chat-progress-steps"]')).not.toBeNull();
  });

  test("the receipt's glyph says how it ended: check, warning when a step failed, minus when stopped", async () => {
    const receipt = (props: { steps: ChatProgressStep[]; stoppedText?: string }) => (
      <ChatProgress
        form="steps"
        label="Gathering"
        steps={props.steps}
        isComplete
        receiptText="Worked for 58 s"
        expandLabel="Show"
        {...(props.stoppedText ? { stoppedText: props.stoppedText } : {})}
      />
    );
    const glyph = () => container!.querySelector<SVGElement>('[data-slot="chat-progress-node"] svg')!;

    mount(receipt({ steps: [{ id: "a", label: "Tone", status: "done" }, { id: "b", label: "Images", status: "done" }] }), "light");
    expect(getComputedStyle(glyph()).color).toBe(tokenColor("--ui-intent-success-fg"));
    expect(rect(glyph()).width).toBe(16);

    rerender(receipt({ steps: [...STEPS, { id: "x", label: "Lost", status: "failed" }] }));
    await settled(glyph());
    expect(getComputedStyle(glyph()).color).toBe(tokenColor("--ui-intent-warning-fg"));

    rerender(receipt({ steps: STEPS, stoppedText: "Stopped after 5 s" }));
    expect(getComputedStyle(glyph()).color).toBe(tokenColor("--ui-text-muted"));
    expect(container!.textContent).toContain("Stopped after 5 s");
  });

  test("the disclosure is controllable, and a controlled one does not move on its own", async () => {
    const seen: boolean[] = [];
    const { q, container: c } = mount(
      <ChatProgress form="steps" label="Gathering" steps={STEPS} isOpen={false} onOpenChange={(open) => seen.push(open)} />,
    );

    await userEvent.click(q<HTMLButtonElement>("chat-progress-summary")!);
    expect(seen).toEqual([true]);
    expect(c.querySelector('[data-slot="chat-progress-steps"]')).toBeNull();
  });

  test("errorText replaces the form and offers a real Retry", async () => {
    let retried = 0;
    const { q } = mount(
      <ChatProgress
        form="steps"
        label="Gathering"
        steps={STEPS}
        errorText="Stopped after 12 s — connection lost"
        retryLabel="Retry"
        onRetryAction={() => (retried += 1)}
      />,
    );

    expect(q("chat-progress")!.dataset.status).toBe("failed");
    expect(q("chat-progress-steps")).toBeNull();
    expect(q("chat-progress-failure")!.textContent).toContain("Stopped after 12 s");

    const retry = q<HTMLButtonElement>("chat-progress-retry")!;
    await userEvent.click(retry);
    expect(retried).toBe(1);
  });

  test("the whole log is a polite live region", () => {
    const { q } = mount(<ChatProgress label="Thinking…" />);
    const region = q<HTMLElement>("chat-progress")!;

    expect(region.getAttribute("role")).toBe("status");
    expect(region.getAttribute("aria-live")).not.toBe("assertive");
  });
});

describe("ChatProgress — reasoning", () => {
  const THOUGHT = [
    "The brief asks for a carousel, but the reference is a single poster — so the first job is deciding what repeats.",
    "The 1961 grid is four by four with a doubled baseline; the brand grid is twelve columns. Three brand columns to one poster unit keeps both honest.",
    "Palette next: the scan is warm, so lift the red from the paper, not from the ink.",
  ];

  test("running: open, capped at five lines with a 24px fade to the base ground (401D-0, 401T-0)", () => {
    const { q, container: c } = mount(
      <div style={{ width: "334px" }}>
        <ChatProgress label="Thinking" reasoning={THOUGHT} duration="8 s" />
      </div>,
    );
    const body = q("chat-progress-reasoning")!.lastElementChild as HTMLElement;
    const fade = body.querySelector<HTMLElement>('[data-slot="fade"]')!;

    // 401R-0: five lines plus the 4px above. The sheet draws its lines at
    // 20px; the role's leading is what ships (ADR 0020), so the cap is five
    // of THOSE lines — asserted against the paragraph's own line height.
    const line = parseFloat(getComputedStyle(body.querySelector("p")!).lineHeight);
    expect(rect(body).height).toBeCloseTo(5 * line + 4, 1);
    expect(getComputedStyle(body).overflow).toBe("clip");
    expect(fade.dataset.side).toBe("top");
    expect(fade.dataset.ground).toBe("base");
    expect(rect(fade).height).toBe(24);
    // The thinking matrix is the root's glyph, and it moves.
    expect(moving(c)).toHaveLength(1);
    expect(moving(c)[0]!.dataset.status).toBe("thinking");
  });

  test("the thought sits at the 24px text edge, beside the rail", () => {
    const { q } = mount(<ChatProgress label="Thinking" reasoning={THOUGHT} />);
    const rootBox = rect(q("chat-progress")!);
    const p = q("chat-progress-reasoning")!.querySelector("p")!;
    expect(rect(p).left - rootBox.left).toBe(24);
  });

  test("streaming thought is not re-announced: the body opts out of the live region", () => {
    const { q } = mount(<ChatProgress label="Thinking" reasoning={THOUGHT} />);
    expect(q("chat-progress-reasoning")!.lastElementChild!.getAttribute("aria-live")).toBe("off");
  });

  test("done: folded to its receipt, and re-opened to the whole text with no cap", async () => {
    const { q } = mount(
      <ChatProgress label="Thinking" reasoning={THOUGHT} isComplete receiptText="Thought for 12 s" expandLabel="Show the reasoning" />,
    );
    expect(q("chat-progress-reasoning")).toBeNull();

    await userEvent.click(q<HTMLButtonElement>("chat-progress-summary")!);
    const body = q("chat-progress-reasoning")!.lastElementChild as HTMLElement;
    expect(body.querySelector('[data-slot="fade"]')).toBeNull();
    expect(getComputedStyle(body).overflow).toBe("visible");
    expect(body.querySelectorAll("p")).toHaveLength(3);
  });
});

describe("ChatProgress — parallel lanes", () => {
  test("a lane IS the activity pill: same box, a 104px name lane, the activity truncates (403S-0)", () => {
    const { all } = mount(
      <div style={{ width: "530px" }}>
        <ChatProgress form="parallel" label="Working on 4 things" meta="1 done" duration="31 s" lanes={LANES} />
      </div>,
      "light",
    );
    const lanes = all("chat-progress-lane");
    expect(lanes).toHaveLength(4);

    // The relationship, not a constant: the sheet says a lane is the activity
    // pill with a status glyph and a clock, so the two must stay one object.
    const pill = document.createElement("div");
    container!.appendChild(pill);
    const pillRoot = createRoot(pill);
    act(() => pillRoot.render(<ChatProgress form="activity" activities={[{ verb: "Reading…", detail: "A book" }]} />));
    const activityPill = pill.querySelector<HTMLElement>('[data-slot="chat-progress-activity"]')!;
    for (const lane of lanes) {
      expect(rect(lane).height).toBe(rect(activityPill).height);
      expect(getComputedStyle(lane).paddingTop).toBe(getComputedStyle(activityPill).paddingTop);
    }
    act(() => pillRoot.unmount());
    const name = all("chat-progress-lane-name")[0]!;
    expect(rect(name).width).toBe(104);
    const activity = all("chat-progress-lane-activity")[2]!;
    const style = getComputedStyle(activity);
    expect([style.overflow, style.textOverflow, style.whiteSpace]).toEqual(["hidden", "ellipsis", "nowrap"]);
    expect(getComputedStyle(lanes[0]!).borderRadius).toBe("8px");
  });

  test("the root's clock sits over the lanes' clocks", () => {
    const { all, q } = mount(
      <div style={{ width: "530px" }}>
        <ChatProgress form="parallel" label="Working on 4 things" duration="31 s" lanes={LANES} />
      </div>,
    );
    const rootClock = q("chat-progress-summary")!.querySelector('[data-slot="chat-progress-clock"]')!;
    const laneClock = all("chat-progress-lane")[0]!.querySelector('[data-slot="chat-progress-clock"]')!;
    expect(rect(rootClock).right).toBe(rect(laneClock).right);
  });

  test("a running lane holds Working's key frame; only the root's matrix moves", () => {
    const { container: c, q } = mount(<ChatProgress form="parallel" label="Working on 4 things" lanes={LANES} />);
    expect(moving(c)).toHaveLength(1);
    expect(moving(c)[0]!.closest('[data-slot="chat-progress-lane"]')).toBeNull();
    expect(q("chat-progress-lanes")!.querySelectorAll('[data-slot="status-matrix"][data-held]')).toHaveLength(2);
  });

  test("a failed lane keeps its failure in its lane, with Retry", async () => {
    let retried = 0;
    const { all } = mount(
      <ChatProgress
        form="parallel"
        label="Working on 2 things"
        lanes={[
          { id: "alt", name: "Alt text", activity: "Frame 2 could not be read", status: "failed", retryLabel: "Retry", onRetryAction: () => (retried += 1) },
          LANES[0]!,
        ]}
      />,
      "light",
    );
    const lane = all("chat-progress-lane")[0]!;
    const activity = lane.querySelector<HTMLElement>('[data-slot="chat-progress-lane-activity"]')!;
    await settled(activity);
    expect(getComputedStyle(activity).color).toBe(tokenColor("--ui-intent-danger-fg"));
    await userEvent.click(lane.querySelector<HTMLButtonElement>('[data-slot="chat-progress-retry"]')!);
    expect(retried).toBe(1);
  });

  test("a lane with a chain opens to it, inside its own pill", async () => {
    const { all } = mount(
      <ChatProgress
        form="parallel"
        label="Working on 2 things"
        lanes={[{ ...LANES[0]!, steps: STEPS }, LANES[1]!]}
      />,
    );
    const lane = all("chat-progress-lane")[0]!;
    const trigger = lane.querySelector<HTMLButtonElement>("button")!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(trigger);
    expect(lane.querySelector('[data-slot="chat-progress-steps"]')).not.toBeNull();
    expect(rect(lane).height).toBeGreaterThan(40);
  });
});

describe("ChatProgress — activity and measured", () => {
  test("an activity detail truncates and never wraps", () => {
    const { q } = mount(
      <div style={{ width: "400px" }}>
        <ChatProgress
          form="activity"
          activities={[
            { verb: "Searching…", detail: "Grid Systems in Graphic Design, Josef Muller-Brockmann 1961, and every scan in the library that references it" },
          ]}
        />
      </div>,
    );
    const detail = q<HTMLElement>("chat-progress-activity")!.lastElementChild as HTMLElement;
    const style = getComputedStyle(detail);

    expect(style.overflow).toBe("hidden");
    expect(style.textOverflow).toBe("ellipsis");
    expect(style.whiteSpace).toBe("nowrap");
    expect(Math.round(detail.getBoundingClientRect().height)).toBe(Math.round(parseFloat(style.lineHeight)));
  });

  test("the verb never shrinks while the detail does", () => {
    const { q } = mount(
      <div style={{ width: "260px" }}>
        <ChatProgress form="activity" activities={[{ verb: "Searching…", detail: "5 files included across 3 spaces and then some" }]} />
      </div>,
    );
    const verb = q<HTMLElement>("chat-progress-activity")!.firstElementChild as HTMLElement;

    expect(getComputedStyle(verb).flexShrink).toBe("0");
    expect(verb.textContent).toBe("Searching…");
  });

  test("measured renders the Progress primitive with its ARIA, not a bare track", () => {
    const { q, container: c } = mount(<ChatProgress form="measured" label="Generating slide 3 of 6" value={48} />);

    const bar = c.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute("aria-valuenow")).toBe("48");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(c.textContent).toContain("Generating slide 3 of 6");
    expect(c.textContent).toContain("48%");
    expect(q("chat-progress-measured")).not.toBeNull();
  });

  test("max reshapes the percentage rather than the value", () => {
    const { container: c } = mount(<ChatProgress form="measured" label="Generating" value={3} max={6} />);
    const bar = c.querySelector('[role="progressbar"]')!;

    expect(bar.getAttribute("aria-valuenow")).toBe("3");
    expect(bar.getAttribute("aria-valuemax")).toBe("6");
    expect(c.textContent).toContain("50%");
  });
});

describe("ChatProgress — forwarding", () => {
  test("form and status reach the DOM so a thread can style its own log", () => {
    const { q } = mount(<ChatProgress form="measured" label="Generating" value={10} />);
    expect(q("chat-progress")!.dataset.form).toBe("measured");
    expect(q("chat-progress")!.dataset.status).toBe("running");
  });

  test("ref, className and native props land on the outermost node", () => {
    const ref = createRef<HTMLDivElement>();
    const { q } = mount(<ChatProgress ref={ref} label="Thinking…" className="mt-lg" id="run-4" />);
    const rootEl = q<HTMLElement>("chat-progress")!;

    expect(ref.current).toBe(rootEl);
    expect(rootEl.id).toBe("run-4");
    expect(getComputedStyle(rootEl).marginTop).toBe("16px");
  });

  test("a form's own data never reaches the DOM as an attribute", () => {
    const { q } = mount(<ChatProgress form="parallel" label="Working" meta="1 done" duration="12 s" lanes={LANES} />);
    const rootEl = q<HTMLElement>("chat-progress")!;

    for (const attr of ["lanes", "label", "duration", "meta", "steps", "reasoning"]) {
      expect(rootEl.getAttribute(attr)).toBeNull();
    }
  });
});
