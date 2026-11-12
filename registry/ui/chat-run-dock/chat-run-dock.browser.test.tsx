import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { Button } from "@/ui/button/button.tsx";

import { ChatRunDock, ChatRunMark, type ChatRun, type ChatRunMarkKind } from "./chat-run-dock.tsx";

/**
 * Geometry is asserted against the Paper sheet — Chat Progress, section
 * "05 Background" (3ZIE-0) — with the node each number was read from cited
 * beside it. Values are read through the tokens the sheet names, never
 * written as hexes, so a brand that moves a token moves both sides.
 */

function probe<K extends keyof CSSStyleDeclaration>(prop: K, value: string): string {
  const el = document.createElement("div");
  (el.style as unknown as Record<string, string>)[prop as string] = value;
  document.body.appendChild(el);
  const out = getComputedStyle(el)[prop] as unknown as string;
  el.remove();
  return out;
}
const tokenColor = (name: string) => probe("color", `var(${name})`);
const tokenBg = (name: string) => probe("backgroundColor", `var(${name})`);
const tokenRadius = (name: string) => probe("borderTopLeftRadius", `var(${name})`);

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement, width = 530) {
  container = document.createElement("div");
  // The sheet's composer block is 530px wide (3ZIO-0); the dock is inset in it.
  container.style.width = `${width}px`;
  container.style.display = "flex";
  container.style.flexDirection = "column";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  return container;
}

function rerender(ui: ReactElement) {
  act(() => root!.render(ui));
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

const q = <T extends Element = HTMLElement>(c: ParentNode, slot: string) => c.querySelector<T>(`[data-slot="${slot}"]`)!;
const all = <T extends Element = HTMLElement>(c: ParentNode, slot: string) => [...c.querySelectorAll<T>(`[data-slot="${slot}"]`)];
const levels = (svg: Element) => [...svg.querySelectorAll<SVGCircleElement>('[data-slot="status-matrix-dot"]')].map((d) => d.dataset.level).join("");
const wait = (ms: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));
const settled = (el: Element) =>
  Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));

const RUNS: ChatRun[] = [
  { id: "cuts", name: "Rendering Story cuts", activity: "2 of 3 · keeps going while you chat", elapsed: "1:48", value: 66 },
  { id: "kit", name: "Exporting brand kit", activity: "Packaging 248 files", elapsed: "0:12" },
];
const stopLabel = (run: ChatRun) => `Stop ${run.name}`;

function Dock(props: Partial<React.ComponentProps<typeof ChatRunDock>> & { runs?: ChatRun[] }) {
  return <ChatRunDock aria-label="Background runs" runs={RUNS} onStopAction={() => {}} stopLabel={stopLabel} {...(props as object)} />;
}

describe("ChatRunDock geometry (sheet 3ZIE-0)", () => {
  test("the dock is bg-elevated at radius-lg with an xs inset (3ZIP-0)", async () => {
    const dock = q(mount(<Dock />), "chat-run-dock");
    await settled(dock);
    const style = getComputedStyle(dock);
    expect(style.backgroundColor).toBe(tokenBg("--ui-bg-elevated"));
    expect(style.borderTopLeftRadius).toBe(tokenRadius("--ui-radius-lg"));
    expect(style.borderBottomRightRadius).toBe(tokenRadius("--ui-radius-lg"));
    expect(style.paddingTop).toBe("4px");
    expect(style.paddingInlineStart).toBe("4px");
  });

  test("the dock is inset 24px each side of the composer's pill (3ZIP-0: calc(100% - 48px))", () => {
    const c = mount(<Dock />);
    const block = c.getBoundingClientRect();
    const dock = q(c, "chat-run-dock").getBoundingClientRect();
    expect(dock.left - block.left).toBe(24);
    expect(block.right - dock.right).toBe(24);
    expect(dock.width).toBe(530 - 48);
  });

  test("rows are 32px, ps-md / pe-xs, gap-sm (3ZIQ-0)", () => {
    const rows = all(mount(<Dock />), "chat-run-dock-row");
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      const style = getComputedStyle(row);
      expect(row.getBoundingClientRect().height).toBe(32);
      expect(style.paddingInlineStart).toBe("12px");
      expect(style.paddingInlineEnd).toBe("4px");
      expect(style.columnGap).toBe("8px");
    }
  });

  test("the row's lanes: a 14px matrix, the name in label-md secondary, the activity muted (3ZIQ-0, 3ZIU-0, 3ZIV-0)", () => {
    const c = mount(<Dock />);
    const row = all(c, "chat-run-dock-row")[0]!;
    const matrix = q(row, "status-matrix").getBoundingClientRect();
    expect([matrix.width, matrix.height]).toEqual([14, 14]);
    const name = getComputedStyle(q(row, "chat-run-dock-name"));
    expect(name.fontSize).toBe("13px");
    expect(name.fontWeight).toBe("600");
    expect(name.color).toBe(tokenColor("--ui-text-secondary"));
    const activity = getComputedStyle(q(row, "chat-run-dock-activity"));
    expect(activity.fontSize).toBe("13px");
    expect(activity.color).toBe(tokenColor("--ui-text-muted"));
  });

  test("the clock is a fixed 40px lane, right-aligned, tabular, caption, muted — and it stays when empty (04 Parallel, 4046-0)", () => {
    const c = mount(<Dock runs={[...RUNS, { id: "x", name: "Researching", activity: "Reading sources" }]} />);
    const clocks = all(c, "chat-run-dock-clock");
    for (const clock of clocks) {
      const style = getComputedStyle(clock);
      expect(clock.getBoundingClientRect().width).toBe(40);
      expect(style.textAlign).toBe("end");
      expect(style.fontVariantNumeric).toBe("tabular-nums");
      expect(style.fontSize).toBe("12px");
      expect(style.color).toBe(tokenColor("--ui-text-muted"));
    }
    // The lanes line up down the dock, whatever each clock reads.
    expect(new Set(clocks.map((el) => el.getBoundingClientRect().right)).size).toBe(1);
  });

  test("the activity truncates to one line; it never wraps (3ZIV-0)", () => {
    const long = "Describing frame 2 for Josef Müller-Brockmann's Beethoven poster, 1955, in the archive's own words";
    const c = mount(<Dock runs={[{ id: "a", name: "Alt text", activity: long, elapsed: "22 s" }]} />);
    const activity = q(c, "chat-run-dock-activity");
    const style = getComputedStyle(activity);
    expect(style.whiteSpace).toBe("nowrap");
    expect(style.textOverflow).toBe("ellipsis");
    expect(activity.scrollWidth).toBeGreaterThan(activity.clientWidth);
    expect(q(c, "chat-run-dock-row").getBoundingClientRect().height).toBe(32);
  });
});

describe("ChatRunDock matrices", () => {
  test("a measured run is a Progress meter; an unmeasured one is Working", () => {
    const c = mount(<Dock />);
    const [measured, working] = all(c, "chat-run-dock-row");
    expect(q(measured!, "status-matrix").dataset.status).toBe("progress");
    expect(measured!.hasAttribute("data-measured")).toBe(true);
    expect(q(working!, "status-matrix").dataset.status).toBe("working");
    expect(working!.hasAttribute("data-measured")).toBe(false);
  });

  test("isHeld holds every row's matrix still", async () => {
    const c = mount(<Dock isHeld />);
    expect(q(c, "chat-run-dock").hasAttribute("data-held")).toBe(true);
    const matrices = all(c, "status-matrix");
    const before = matrices.map(levels);
    await wait(450);
    expect(matrices.map(levels)).toEqual(before);
    for (const m of matrices) expect(m.hasAttribute("data-held")).toBe(true);
  });

  // Working first: a Progress meter at a steady value barely changes inside a
  // few ticks, so a Working figure is the one that proves the clock runs.
  const WORKING_FIRST = [...RUNS].reverse();

  test("with the thread idle (isHeld false) ONE matrix ticks — the first run's; the rest hold", async () => {
    const c = mount(<Dock runs={WORKING_FIRST} />);
    const [first, ...others] = all(c, "status-matrix");
    expect(others.length).toBeGreaterThan(0);
    const before = [first!, ...others].map(levels);
    await wait(450);
    expect(levels(first!)).not.toBe(before[0]);
    expect(first!.hasAttribute("data-held")).toBe(false);
    for (const [i, m] of others.entries()) {
      expect(m.hasAttribute("data-held")).toBe(true);
      expect(levels(m)).toBe(before[i + 1]);
    }
  });

  test("clearing isHeld lets a held dock start ticking", async () => {
    const c = mount(<Dock runs={WORKING_FIRST} isHeld />);
    const first = () => all(c, "status-matrix")[0]!;
    const held = levels(first());
    rerender(<Dock runs={WORKING_FIRST} isHeld={false} />);
    await wait(450);
    expect(levels(first())).not.toBe(held);
  });

  test("the matrix is decorative — the activity line says the state", () => {
    const c = mount(<Dock />);
    for (const m of all(c, "status-matrix")) expect(m.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("ChatRunDock Stop", () => {
  test("each Stop is named for its run and calls onStopAction with the run's id", async () => {
    const onStopAction = vi.fn();
    const c = mount(<Dock onStopAction={onStopAction} />);
    const stops = all<HTMLButtonElement>(c, "chat-run-dock-stop");
    expect(stops.map((s) => s.getAttribute("aria-label"))).toEqual(["Stop Rendering Story cuts", "Stop Exporting brand kit"]);
    await userEvent.click(stops[1]!);
    expect(onStopAction).toHaveBeenCalledExactlyOnceWith("kit");
  });

  test("Stop is reached by Tab and activated by Enter", async () => {
    const onStopAction = vi.fn();
    const c = mount(<Dock onStopAction={onStopAction} />);
    const stops = all<HTMLButtonElement>(c, "chat-run-dock-stop");
    stops[0]!.focus();
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(stops[1]);
    await userEvent.keyboard("{Enter}");
    expect(onStopAction).toHaveBeenCalledExactlyOnceWith("kit");
  });

  test("Stop IS Button ghost · sm · icon-only — same box, radius and ink (3ZIX-0)", async () => {
    const c = mount(
      <>
        <Dock />
        <Button variant="ghost" size="sm" isIconOnly aria-label="reference" data-slot="reference" />
      </>,
    );
    const stop = q(c, "chat-run-dock-stop");
    const ref = q(c, "reference");
    await settled(stop);
    const a = getComputedStyle(stop), b = getComputedStyle(ref);
    expect([stop.getBoundingClientRect().width, stop.getBoundingClientRect().height]).toEqual([24, 24]);
    expect(a.borderTopLeftRadius).toBe(b.borderTopLeftRadius);
    expect(a.color).toBe(b.color);
    expect(a.color).toBe(tokenColor("--ui-text-secondary"));
    const glyph = stop.querySelector("svg")!.getBoundingClientRect();
    expect([glyph.width, glyph.height]).toEqual([16, 16]);
  });

  test("the Stop glyph takes the ink — it is not griddy's fixed-fill Stop", () => {
    const c = mount(<Dock />);
    const path = q(c, "chat-run-dock-stop").querySelector("path")!;
    expect(getComputedStyle(path).fill).toBe(tokenColor("--ui-text-secondary"));
  });

  test("no onStopAction, no Stop", () => {
    const c = mount(<ChatRunDock aria-label="Background runs" runs={RUNS} />);
    expect(all(c, "chat-run-dock-stop")).toHaveLength(0);
  });

  test("focus is not lost when the stopped run's row leaves: it moves to the Stop now in that place", async () => {
    let runs = RUNS;
    const onStopAction = (id: string) => { runs = runs.filter((r) => r.id !== id); };
    const c = mount(<Dock runs={runs} onStopAction={onStopAction} />);
    await userEvent.click(all(c, "chat-run-dock-stop")[0]!);
    rerender(<Dock runs={runs} onStopAction={onStopAction} />);
    const stops = all(c, "chat-run-dock-stop");
    expect(stops).toHaveLength(1);
    expect(document.activeElement).toBe(stops[0]);
  });

  test("a reader who has moved on is not pulled back when the row finally leaves", async () => {
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    const c = mount(<Dock />);
    await userEvent.click(all(c, "chat-run-dock-stop")[0]!);
    elsewhere.focus();
    rerender(<Dock runs={RUNS.slice(1)} />);
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });
});

describe("ChatRunDock region and forwarding", () => {
  test("a named region holding a list of runs", () => {
    const c = mount(<Dock />);
    const dock = q(c, "chat-run-dock");
    expect(dock.getAttribute("role")).toBe("region");
    expect(dock.getAttribute("aria-label")).toBe("Background runs");
    expect(q(dock, "chat-run-dock-list").tagName).toBe("UL");
    expect(all(dock, "chat-run-dock-row").every((r) => r.tagName === "LI")).toBe(true);
  });

  test("zero runs renders nothing", () => {
    const ref = createRef<HTMLDivElement>();
    const c = mount(<Dock runs={[]} ref={ref} />);
    expect(c.childElementCount).toBe(0);
    expect(ref.current).toBeNull();
  });

  test("className, ref and native attributes land on the root", () => {
    const ref = createRef<HTMLDivElement>();
    const c = mount(<Dock ref={ref} className="mb-xs" data-testid="dock" id="dock" />);
    const dock = q(c, "chat-run-dock");
    expect(ref.current).toBe(dock);
    expect(dock.classList.contains("mb-xs")).toBe(true);
    expect(getComputedStyle(dock).marginBottom).toBe("4px");
    expect(dock.getAttribute("data-testid")).toBe("dock");
    expect(dock.id).toBe("dock");
  });
});

// ---------------------------------------------------------------- marks

const MARKS: Array<[ChatRunMarkKind, string, string]> = [
  ["started", "--ui-text-muted", "--ui-text-muted"],
  ["finished", "--ui-intent-success-fg", "--ui-text-secondary"],
  ["failed", "--ui-intent-danger-fg", "--ui-intent-danger-fg"],
  ["stopped", "--ui-text-muted", "--ui-text-muted"],
];

function Mark({ kind }: { kind: ChatRunMarkKind }) {
  if (kind === "finished") return <ChatRunMark kind="finished" label="Story cuts finished" detail="3 files · 2 min 6 s" actionLabel="Open" onAction={() => {}} />;
  if (kind === "failed") return <ChatRunMark kind="failed" label="Brand kit export stopped at 180 of 248 files" retryLabel="Retry" onRetryAction={() => {}} />;
  return <ChatRunMark kind={kind} label="Rendering Story cuts in the background" />;
}

describe("ChatRunMark (sheet 3ZJM-0)", () => {
  test.each(MARKS)("%s: glyph in %s, line in %s", async (kind, glyphInk, lineInk) => {
    const c = mount(<Mark kind={kind} />);
    const mark = q(c, "chat-run-mark");
    await settled(mark);
    expect(mark.dataset.kind).toBe(kind);
    const glyph = q<SVGSVGElement>(mark, "chat-run-mark-glyph");
    expect(getComputedStyle(glyph).color).toBe(tokenColor(glyphInk));
    expect(getComputedStyle(glyph.querySelector("path")!).fill).toBe(tokenColor(glyphInk));
    expect(getComputedStyle(q(mark, "chat-run-mark-text")).color).toBe(tokenColor(lineInk));
  });

  test("the four glyphs are the sheet's layers (3ZJO-0, 3ZJS-0, 3ZJY-0, 3ZK4-0) — and differ", () => {
    const paths = MARKS.map(([kind]) => {
      const c = mount(<Mark kind={kind} />);
      const d = q(c, "chat-run-mark-glyph").querySelector("path")!.getAttribute("d");
      unmount();
      return d;
    });
    expect(new Set(paths).size).toBe(4);
  });

  test("one line on the root's metrics: a 16px glyph, gap-sm, body-sm, a 32px floor (3ZJN-0)", () => {
    const c = mount(<Mark kind="started" />);
    const mark = q(c, "chat-run-mark");
    const glyph = q(mark, "chat-run-mark-glyph").getBoundingClientRect();
    expect([glyph.width, glyph.height]).toEqual([16, 16]);
    expect(getComputedStyle(mark).columnGap).toBe("8px");
    expect(getComputedStyle(mark).minHeight).toBe("32px");
    expect(mark.getBoundingClientRect().height).toBe(32);
    expect(getComputedStyle(q(mark, "chat-run-mark-text")).fontSize).toBe("13px");
  });

  test("the four kinds' inks are not one ink: success, danger and muted are three (3ZJS-0, 3ZJY-0, 3ZJO-0)", () => {
    const inks = MARKS.map(([kind]) => {
      const c = mount(<Mark kind={kind} />);
      const color = getComputedStyle(q(c, "chat-run-mark-glyph")).color;
      unmount();
      return color;
    });
    expect(new Set(inks).size).toBe(3);
  });

  test("finished: the label is bold, the detail follows a middot, and the action is Button secondary · md (3ZJU-0, 3ZJV-0)", async () => {
    const onAction = vi.fn();
    const c = mount(<ChatRunMark kind="finished" label="Story cuts finished" detail="3 files" actionLabel="Open" onAction={onAction} />);
    const text = q(c, "chat-run-mark-text");
    expect(text.textContent).toBe("Story cuts finished · 3 files");
    expect(getComputedStyle(text.querySelector("span")!).fontWeight).toBe("600");
    const action = q(c, "chat-run-mark-action");
    expect(action.dataset.variant).toBe("secondary");
    expect(action.getBoundingClientRect().height).toBe(32);
    await userEvent.click(action);
    expect(onAction).toHaveBeenCalledOnce();
  });

  test("failed: Retry is Button ghost · sm and calls onRetryAction (3ZK1-0)", async () => {
    const onRetryAction = vi.fn();
    const c = mount(<ChatRunMark kind="failed" label="Export stopped" retryLabel="Retry" onRetryAction={onRetryAction} />);
    const retry = q(c, "chat-run-mark-retry");
    expect(retry.dataset.variant).toBe("ghost");
    expect(retry.getBoundingClientRect().height).toBe(24);
    await userEvent.click(retry);
    expect(onRetryAction).toHaveBeenCalledOnce();
  });

  test("the glyph is aria-hidden: the words carry the outcome", () => {
    const c = mount(<Mark kind="failed" />);
    expect(q(c, "chat-run-mark-glyph").getAttribute("aria-hidden")).toBe("true");
  });

  test("className, ref and native attributes land on the mark's root", () => {
    const ref = createRef<HTMLDivElement>();
    const c = mount(<ChatRunMark kind="stopped" label="You stopped it" ref={ref} className="mt-sm" data-testid="mark" />);
    const mark = q(c, "chat-run-mark");
    expect(ref.current).toBe(mark);
    expect(mark.classList.contains("mt-sm")).toBe(true);
    expect(mark.getAttribute("data-testid")).toBe("mark");
  });
});
