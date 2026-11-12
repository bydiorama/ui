import { afterEach, describe, expect, test, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { StatusMatrix } from "./status-matrix.tsx";

/**
 * The sheet's own key frames, decoded from the 16px marks on Pattern ---
 * Status matrix: 25 cells row by row, 0 Off · 1 Ember · 2 Glow · 3 Lit. These
 * are the drawings, not the component's output written back — the component
 * computes its frames from the simulator rules, and these catch it drifting.
 */
const SHEET = {
  waiting: "0000000000333330000000000",
  typing: "0000020302301030000000000",
  thinking: "0111010001103011000101110",
  working: "0333132003300033002313330",
  streaming: "1233023123300120000100000",
  done: "0000300030303000300000000",
  failed: "3000303030003000303030003",
  stopped: "0000003330033300333000000",
} as const;
/** Progress at 66%: three full columns, the fourth's bottom dot, and the next breathing at Ember. */
const SHEET_PROGRESS_66 = "3330033300333003331033330";

function tokenColor(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function tokenSeconds(name: string): string {
  const probe = document.createElement("div");
  probe.style.transitionDuration = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).transitionDuration;
  probe.remove();
  return value;
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
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
  vi.unstubAllGlobals();
}

afterEach(unmount);

const svg = (c: HTMLElement) => c.querySelector<SVGSVGElement>('[data-slot="status-matrix"]')!;
const dots = (c: HTMLElement) => [...c.querySelectorAll<SVGCircleElement>('[data-slot="status-matrix-dot"]')];
const levels = (c: HTMLElement) => dots(c).map((d) => d.dataset.level).join("");
const wait = (ms: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));
const settled = (el: Element) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));

describe("StatusMatrix draws the sheet's key frames", () => {
  test.each(Object.entries(SHEET))("%s, held, is the frame the sheet draws", (status, frame) => {
    const c = mount(<StatusMatrix status={status as keyof typeof SHEET} isHeld />);
    expect(levels(c)).toBe(frame);
  });

  test("progress at 66% is the sheet's level meter", () => {
    const c = mount(<StatusMatrix status="progress" value={66} isHeld />);
    expect(levels(c)).toBe(SHEET_PROGRESS_66);
  });

  test("progress reads value against max", () => {
    const a = mount(<StatusMatrix status="progress" value={2} max={3} isHeld />);
    const third = levels(a);
    unmount();
    const b = mount(<StatusMatrix status="progress" value={66.6667} isHeld />);
    expect(third).toBe(levels(b));
  });

  test("the first render of a moving matrix is its key frame — server and client agree", () => {
    const c = mount(<StatusMatrix status="thinking" />);
    expect(levels(c)).toBe(SHEET.thinking);
  });

  test("the four levels paint at the sheet's opacities", () => {
    const c = mount(<StatusMatrix status="streaming" isHeld />);
    const byLevel = new Map(dots(c).map((d) => [d.dataset.level, getComputedStyle(d).opacity]));
    expect(Object.fromEntries(byLevel)).toEqual({ "0": "0.1", "1": "0.15", "2": "0.35", "3": "1" });
  });
});

describe("StatusMatrix inks", () => {
  test.each([
    ["thinking", "--ui-bg-accent-legible"],
    ["typing", "--ui-text-muted"],
    ["done", "--ui-intent-success-fg"],
    ["failed", "--ui-intent-danger-fg"],
    ["stopped", "--ui-text-muted"],
  ] as const)("%s draws in %s", async (status, token) => {
    const c = mount(<StatusMatrix status={status} isHeld />);
    await settled(svg(c));
    for (const dot of dots(c)) expect(getComputedStyle(dot).fill).toBe(tokenColor(token));
  });

  test("a live status and its ending are different inks — the ending is not colour-identical", () => {
    const live = tokenColor("--ui-bg-accent-legible");
    expect(new Set([live, tokenColor("--ui-intent-success-fg"), tokenColor("--ui-intent-danger-fg")]).size).toBe(3);
  });
});

describe("StatusMatrix sizes", () => {
  test("md is 16px and sm is 14px — and they differ", () => {
    const md = mount(<StatusMatrix status="working" isHeld />);
    const mdRect = svg(md).getBoundingClientRect();
    unmount();
    const sm = mount(<StatusMatrix status="working" size="sm" isHeld />);
    const smRect = svg(sm).getBoundingClientRect();
    expect([mdRect.width, mdRect.height]).toEqual([16, 16]);
    expect([smRect.width, smRect.height]).toEqual([14, 14]);
  });
});

describe("StatusMatrix moves on the shared clock", () => {
  test("a live matrix changes frame within a few ticks", async () => {
    const c = mount(<StatusMatrix status="working" />);
    const first = levels(c);
    await wait(450);
    expect(levels(c)).not.toBe(first);
  });

  test("a held matrix never moves", async () => {
    const c = mount(<StatusMatrix status="working" isHeld />);
    await wait(450);
    expect(levels(c)).toBe(SHEET.working);
  });

  test("the tempo is --ui-stagger-step: with no token there is no clock, and the matrix stays still", async () => {
    const c = mount(<StatusMatrix status="working" style={{ "--ui-stagger-step": "none" } as React.CSSProperties} />);
    await wait(450);
    expect(levels(c)).toBe(SHEET.working);
  });

  test("prefers-reduced-motion renders the key frame and does not tick", async () => {
    const real = window.matchMedia.bind(window);
    vi.stubGlobal("matchMedia", (query: string) =>
      query.includes("prefers-reduced-motion") ? { ...real(query), matches: true, addEventListener() {}, removeEventListener() {} } : real(query),
    );
    const c = mount(<StatusMatrix status="streaming" />);
    await wait(450);
    expect(levels(c)).toBe(SHEET.streaming);
  });

  test("each dot transitions opacity and fill on --ui-duration-fast", () => {
    const c = mount(<StatusMatrix status="working" isHeld />);
    const style = getComputedStyle(dots(c)[0]!);
    expect(style.transitionProperty).toBe("opacity, fill");
    expect(style.transitionDuration).toBe(tokenSeconds("--ui-duration-fast"));
  });

  test("typing's lift settles on --ui-duration-base, slower than the rest", () => {
    const c = mount(<StatusMatrix status="typing" isHeld />);
    expect(getComputedStyle(dots(c)[0]!).transitionDuration).toBe(tokenSeconds("--ui-duration-base"));
    expect(tokenSeconds("--ui-duration-base")).not.toBe(tokenSeconds("--ui-duration-fast"));
  });
});

describe("StatusMatrix hands over and settles", () => {
  test("an ending mounted is already drawn and stays still", async () => {
    const c = mount(<StatusMatrix status="done" />);
    expect(levels(c)).toBe(SHEET.done);
    await wait(300);
    expect(levels(c)).toBe(SHEET.done);
  });

  test("an ending arrived at draws on in the same matrix, then holds its key frame", async () => {
    const c = mount(<StatusMatrix status="working" />);
    await wait(250);
    const node = svg(c);
    rerender(<StatusMatrix status="done" />);
    // The switch tick only fades: the check is not there at once.
    expect(levels(c)).not.toBe(SHEET.done);
    await wait(1400);
    expect(svg(c)).toBe(node);
    expect(levels(c)).toBe(SHEET.done);
    await settled(node);
    for (const dot of dots(c)) expect(getComputedStyle(dot).fill).toBe(tokenColor("--ui-intent-success-fg"));
  });

  test("a progress value moving keeps the meter breathing rather than restarting it", async () => {
    const c = mount(<StatusMatrix status="progress" value={20} />);
    await wait(250);
    rerender(<StatusMatrix status="progress" value={60} />);
    await wait(250);
    // 60% is 15 dots lit — three full columns — whatever tick the breath is on.
    expect(levels(c).split("").filter((l) => l === "3").length).toBe(15);
  });

  test("a value updated faster than a tick still advances the meter", async () => {
    // An upload reports progress every few milliseconds. Re-subscribing to the
    // clock on each value restarted its phase, so no tick ever came due and
    // the meter froze at its first value.
    // Tick first, so what is on screen is a moving frame and not the key-frame
    // fallback (which tracks the latest value without the clock). Then read
    // DURING the stream: with no tick due, the meter would still show zero.
    const c = mount(<StatusMatrix status="progress" value={0} />);
    await wait(250);
    for (let v = 4; v <= 60; v += 4) {
      rerender(<StatusMatrix status="progress" value={v} />);
      await wait(40);
    }
    expect(levels(c).split("").filter((l) => l === "3").length).toBeGreaterThan(10);
  });

  test("a status changing faster than a tick still hands over rather than freezing", async () => {
    const c = mount(<StatusMatrix status="working" />);
    for (let i = 0; i < 10; i++) {
      rerender(<StatusMatrix status={i % 2 ? "working" : "streaming"} />);
      await wait(40);
    }
    expect(levels(c)).not.toBe(SHEET.working);
  });

  test("a hand-over gives the incoming figure a one-tick lead (behaviour sheet, Hand-overs)", async () => {
    // A slow step makes the tick count exact: mount, change status, and read
    // after ONE tick. Failed's first cell is the centre, which Working's key
    // frame leaves dark — so it is lit only if the incoming beam ran on the
    // first tick rather than waiting out a fade-only beat.
    const slow = { "--ui-stagger-step": "400ms" } as React.CSSProperties;
    const c = mount(<StatusMatrix status="working" style={slow} />);
    await wait(50);
    rerender(<StatusMatrix status="failed" style={slow} />);
    await wait(550);
    expect(dots(c)[12]!.dataset.level).toBe("3");
  });

  test("--ui-fx-ambient-speed divides the tick", async () => {
    const calm = mount(<StatusMatrix status="working" style={{ "--ui-stagger-step": "400ms", "--ui-fx-ambient-speed": "0.25" } as React.CSSProperties} />);
    await wait(900);
    // 400ms / 0.25 = 1600ms: no tick has come due yet.
    expect(levels(calm)).toBe(SHEET.working);
    unmount();
    const lively = mount(<StatusMatrix status="working" style={{ "--ui-stagger-step": "400ms", "--ui-fx-ambient-speed": "4" } as React.CSSProperties} />);
    await wait(300);
    // 400ms / 4 = 100ms: several ticks have.
    expect(levels(lively)).not.toBe(SHEET.working);
  });

  test("resuming from held continues from the key frame on screen", async () => {
    const c = mount(<StatusMatrix status="working" isHeld />);
    rerender(<StatusMatrix status="working" />);
    expect(levels(c)).toBe(SHEET.working);
    await wait(450);
    expect(levels(c)).not.toBe(SHEET.working);
  });
});

describe("StatusMatrix in forced colours", () => {
  /** The compiled rules under @media (forced-colors: active), read structurally. */
  function forcedRules(): CSSStyleRule[] {
    const out: CSSStyleRule[] = [];
    const walk = (rules: CSSRuleList, forced: boolean) => {
      for (const rule of rules) {
        if (rule instanceof CSSMediaRule) walk(rule.cssRules, forced || rule.conditionText.includes("forced-colors"));
        else if (rule instanceof CSSStyleRule) {
          if (forced) out.push(rule);
          if (rule.cssRules.length) walk(rule.cssRules, forced);
        } else if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules, forced);
      }
    };
    for (const sheet of document.styleSheets) walk(sheet.cssRules, false);
    return out;
  }

  test("the Off grid drops out and the figure draws in CanvasText", () => {
    const c = mount(<StatusMatrix status="working" isHeld />);
    const off = dots(c).find((d) => d.dataset.level === "0")!;
    const lit = dots(c).find((d) => d.dataset.level === "3")!;
    const rules = forcedRules();
    const hides = rules.some((r) => off.matches(r.selectorText) && r.style.opacity === "0");
    const inks = rules.some((r) => lit.matches(r.selectorText) && r.style.fill.toLowerCase() === "canvastext");
    expect(hides).toBe(true);
    expect(inks).toBe(true);
    // And only the Off grid hides: a lit dot must never match the hiding rule.
    expect(rules.some((r) => lit.matches(r.selectorText) && r.style.opacity === "0")).toBe(false);
  });
});

describe("StatusMatrix accessibility", () => {
  test("decorative by default: aria-hidden, not focusable, no role", () => {
    const el = svg(mount(<StatusMatrix status="thinking" />));
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.getAttribute("focusable")).toBe("false");
    expect(el.getAttribute("role")).toBeNull();
  });

  test("label makes it a named image", () => {
    const el = svg(mount(<StatusMatrix status="thinking" label="Thinking" />));
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe("Thinking");
    expect(el.getAttribute("aria-hidden")).toBeNull();
  });
});

describe("StatusMatrix forwarding", () => {
  test("className, ref and native attributes land on the svg", () => {
    const ref = createRef<SVGSVGElement>();
    const c = mount(<StatusMatrix status="done" ref={ref} className="me-xs" data-testid="mark" />);
    const el = svg(c);
    expect(ref.current).toBe(el);
    expect(el.classList.contains("me-xs")).toBe(true);
    expect(el.getAttribute("data-testid")).toBe("mark");
    expect(el.dataset.status).toBe("done");
    expect(el.dataset.size).toBe("md");
  });
});
