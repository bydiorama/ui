/**
 * IconSwap, measured in Chromium. Every motion claim goes through
 * `getAnimations()` and the transitions' keyframes — the techniques and their
 * reasons are the `motion-component` skill's table.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef, type ReactElement } from "react";
import { Check, Copy } from "griddy-icons";

import { Button } from "@/ui/button/button.tsx";
import { IconSwap } from "./icon-swap.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  return container;
}
const rerender = (ui: ReactElement) => act(() => root!.render(ui));

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = container = null;
  document.documentElement.removeAttribute("data-ui-motion");
});

const frames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
    step(n);
  });
/** On screen before it changes: a transition needs a computed "before". */
const shown = () => frames(2);

function tokenMs(name: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw.endsWith("ms") ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
}

const ICONS = { copy: <Copy />, check: <Check /> };
const copyButton = (show: "copy" | "check") => (
  <Button isIconOnly aria-label={show === "copy" ? "Copy link" : "Copied"} icon={<IconSwap icons={ICONS} show={show} />} />
);

const box = () => container!.querySelector<HTMLElement>('[data-slot="icon-swap"]')!;
const glyphs = () => [...box().querySelectorAll<HTMLElement>('[data-slot="icon-swap-glyph"]')];
const glyph = (index: number) => glyphs()[index]!;

/** A transition's start value and timing, per property, on one element. */
function starts(el: Element) {
  return new Map(
    el.getAnimations().map((a) => {
      const property = (a as CSSTransition).transitionProperty;
      const [from] = (a.effect as KeyframeEffect).getKeyframes();
      return [property, { from: String((from as Record<string, unknown>)[property]), timing: a.effect!.getTiming() }];
    }),
  );
}

async function settledAll() {
  for (let pass = 0; pass < 3; pass++) {
    await frames(1);
    await Promise.all(glyphs().flatMap((el) => el.getAnimations()).map((a) => a.finished.catch(() => undefined)));
  }
  await frames(1);
}

describe("at rest", () => {
  test("every glyph rendered, one shown, nothing moving on the first render", async () => {
    mount(copyButton("copy"));
    await frames();
    expect(glyphs()).toHaveLength(2);
    expect(glyphs().map((g) => g.dataset.state)).toEqual(["shown", "hidden"]);
    expect(getComputedStyle(glyph(0)).opacity).toBe("1");
    expect(getComputedStyle(glyph(1)).opacity).toBe("0");
    expect(getComputedStyle(glyph(1)).scale).toBe("0.5");
    expect(glyphs().flatMap((g) => g.getAnimations())).toHaveLength(0);
  });

  test("glyphs share one cell, the box is the host's icon size, and the host names it", async () => {
    mount(copyButton("copy"));
    await frames();
    // Compare centres: the hidden glyph's rect is drawn at its 0.5 scale.
    const [a, b] = glyphs().map((g) => {
      const r = g.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2];
    });
    expect(a).toEqual(b);
    const svg = glyph(0).querySelector("svg")!.getBoundingClientRect();
    expect([svg.width, svg.height]).toEqual([16, 16]);
    expect(box().getBoundingClientRect().width).toBe(16);
    expect(box().getAttribute("aria-hidden")).toBe("true");
    expect(container!.querySelector("button")!.getAttribute("aria-label")).toBe("Copy link");
  });
});

describe("swapping", () => {
  test("the new glyph fades in and grows on base; the old fades out and shrinks on fast", async () => {
    mount(copyButton("copy"));
    await shown();
    rerender(copyButton("check"));
    await frames(1);

    const arriving = starts(glyph(1));
    expect(arriving.get("opacity")?.from).toBe("0");
    expect(arriving.get("scale")?.from).toBe("0.5");
    expect(arriving.get("opacity")?.timing.duration).toBe(tokenMs("--ui-duration-base"));

    const leaving = starts(glyph(0));
    expect(leaving.get("opacity")?.from).toBe("1");
    expect(leaving.get("opacity")?.timing.duration).toBe(tokenMs("--ui-duration-fast"));
    expect(glyph(0).dataset.state).toBe("hidden");

    await settledAll();
    expect(getComputedStyle(glyph(1)).opacity).toBe("1");
    expect(getComputedStyle(glyph(0)).opacity).toBe("0");
    expect(glyphs()).toHaveLength(2); // nothing unmounted
    expect(container!.querySelector("button")!.getAttribute("aria-label")).toBe("Copied");
  });

  test("a change back mid-swap turns both glyphs around from where they are", async () => {
    mount(copyButton("copy"));
    await shown();
    rerender(copyButton("check"));
    await frames(3);
    rerender(copyButton("copy"));
    await frames(1);

    // The tick was partway in; it now leaves from there, not from 1.
    const tick = starts(glyph(1)).get("opacity");
    expect(tick).toBeDefined();
    expect(Number(tick!.from)).toBeGreaterThan(0);
    expect(Number(tick!.from)).toBeLessThan(1);
    await settledAll();
    expect(getComputedStyle(glyph(0)).opacity).toBe("1");
  });
});

describe("motion levels", () => {
  test("Reduced: a plain cross-fade, no scale", async () => {
    document.documentElement.setAttribute("data-ui-motion", "reduced");
    mount(copyButton("copy"));
    await shown();
    expect(getComputedStyle(glyph(1)).scale).toMatch(/^(1|none)$/);
    rerender(copyButton("check"));
    await frames(1);
    const arriving = starts(glyph(1));
    expect(arriving.get("opacity")?.from).toBe("0");
    const scale = arriving.get("scale");
    if (scale) expect(scale.from).toMatch(/^(1|none)$/);
  });

  test("Off: 1ms, and the glyph still changes", async () => {
    document.documentElement.setAttribute("data-ui-motion", "off");
    mount(copyButton("copy"));
    await shown();
    rerender(copyButton("check"));
    expect(getComputedStyle(glyph(1)).transitionDuration).toBe("0.001s");
    expect(getComputedStyle(glyph(0)).transitionDuration).toBe("0.001s");
    await frames(2);
    expect(getComputedStyle(glyph(1)).opacity).toBe("1");
    expect(getComputedStyle(glyph(0)).opacity).toBe("0");
  });
});

describe("forwarding", () => {
  test("className lands on the box, merged; ref is the box; native attributes pass through", async () => {
    const ref = createRef<HTMLSpanElement>();
    mount(<IconSwap ref={ref} icons={ICONS} show="copy" className="text-ink-muted" id="copy-state" />);
    await frames();
    expect(ref.current).toBe(box());
    expect(box().id).toBe("copy-state");
    expect(box().className).toContain("text-ink-muted");
    expect(box().className).toContain("inline-grid");
  });
});
