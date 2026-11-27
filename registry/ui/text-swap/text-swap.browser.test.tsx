/**
 * TextSwap, measured in Chromium. Every motion claim goes through
 * `getAnimations()`, the transitions' keyframes or `transitionrun` — the
 * techniques and their reasons are the `motion-component` skill's table.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef, type ReactElement } from "react";

import { Button } from "@/ui/button/button.tsx";
import { TextSwap } from "./text-swap.tsx";

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

const box = () => container!.querySelector<HTMLElement>('[data-slot="text-swap"]')!;
const labels = () => [...box().querySelectorAll<HTMLElement>('[data-slot="text-swap-label"]')];
const label = (text: string) => labels().find((l) => l.textContent === text);

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
    const running = [box(), ...labels()].flatMap((el) => el.getAnimations());
    await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
  }
  await frames(2);
}

/** The width a TextSwap settles at for `text`, measured on its own. */
async function restingWidth(text: string) {
  const probe = document.createElement("div");
  document.body.appendChild(probe);
  const r = createRoot(probe);
  act(() => r.render(<Button><TextSwap>{text}</TextSwap></Button>));
  await frames();
  const width = probe.querySelector('[data-slot="text-swap"]')!.getBoundingClientRect().width;
  act(() => r.unmount());
  probe.remove();
  return width;
}

describe("at rest", () => {
  test("one label, no motion, no inline width", async () => {
    mount(<Button><TextSwap>Save changes</TextSwap></Button>);
    await frames();
    expect(labels()).toHaveLength(1);
    expect(box().style.width).toBe("");
    expect([box(), ...labels()].flatMap((el) => el.getAnimations())).toHaveLength(0);
  });

  test("clips sideways only, so the rise and descenders are never cut", () => {
    mount(<TextSwap>Typography</TextSwap>);
    expect(getComputedStyle(box()).overflowX).toBe("clip");
    expect(getComputedStyle(box()).overflowY).toBe("visible");
  });
});

describe("swapping", () => {
  test("the new words arrive and the old ones leave, hidden, while the button is named by the new ones", async () => {
    mount(<Button><TextSwap>Save changes</TextSwap></Button>);
    await shown();
    rerender(<Button><TextSwap>Saved</TextSwap></Button>);
    await frames(1);
    const old = label("Save changes")!;
    const next = label("Saved")!;
    expect(old.dataset.presence).toBe("leaving");
    expect(old.getAttribute("aria-hidden")).toBe("true");
    expect(next.dataset.presence).toBe("entering");
    expect(starts(next).get("opacity")?.from).toBe("0");
    expect(starts(next).get("translate")?.from).toBe("0px 4px");
    expect(starts(old).get("opacity")?.timing.duration).toBe(tokenMs("--ui-duration-fast"));
    // The accessible name skips aria-hidden content.
    const button = container!.querySelector("button")!;
    expect(button.textContent).toContain("Saved");
    expect(button.getAttribute("aria-hidden")).toBeNull();
  });

  test("the width eases from the old label's to the new one's on --ui-duration-base, then lets go", async () => {
    const wide = await restingWidth("Save changes");
    const narrow = await restingWidth("Saved");
    expect(wide).toBeGreaterThan(narrow);
    mount(<Button><TextSwap>Save changes</TextSwap></Button>);
    await shown();
    rerender(<Button><TextSwap>Saved</TextSwap></Button>);
    await frames(1);
    const width = starts(box()).get("width");
    expect(Number.parseFloat(width!.from)).toBeCloseTo(wide, 0);
    expect(width!.timing.duration).toBe(tokenMs("--ui-duration-base"));
    await settledAll();
    expect(box().style.width).toBe("");
    expect(box().getBoundingClientRect().width).toBeCloseTo(narrow, 0);
    expect(labels()).toHaveLength(1);
  });

  test("a word that comes back mid-swap turns around and stays", async () => {
    mount(<Button><TextSwap>Save</TextSwap></Button>);
    await shown();
    rerender(<Button><TextSwap>Saving…</TextSwap></Button>);
    await frames(2);
    rerender(<Button><TextSwap>Save</TextSwap></Button>);
    await frames(1);
    expect(label("Save")!.dataset.presence).not.toBe("leaving");
    await settledAll();
    expect(labels().map((l) => l.textContent)).toEqual(["Save"]);
    expect(box().getBoundingClientRect().width).toBeCloseTo(await restingWidth("Save"), 0);
  });
});

describe("motion levels", () => {
  test("Reduced keeps the cross-fade and the width, and drops the rise", async () => {
    document.documentElement.setAttribute("data-ui-motion", "reduced");
    mount(<Button><TextSwap>Save changes</TextSwap></Button>);
    await shown();
    rerender(<Button><TextSwap>Saved</TextSwap></Button>);
    await frames(1);
    const next = starts(label("Saved")!);
    expect(next.get("translate")?.from ?? "none").toMatch(/^(none|0px( 0px)?)$/);
    expect(next.get("opacity")?.from).toBe("0");
    expect(starts(box()).get("width")?.timing.duration).toBe(tokenMs("--ui-duration-base"));
  });

  test("Off runs a 1ms width transition, and still ends on the new label alone", async () => {
    document.documentElement.setAttribute("data-ui-motion", "off");
    mount(<Button><TextSwap>Save changes</TextSwap></Button>);
    await shown();
    rerender(<Button><TextSwap>Saved</TextSwap></Button>);
    expect(getComputedStyle(box()).transitionDuration).toBe("0.001s");
    await settledAll();
    expect(labels().map((l) => l.textContent)).toEqual(["Saved"]);
    expect(box().style.width).toBe("");
  });
});

describe("the element", () => {
  test("className lands on the box, the ref is the box, native props pass through", () => {
    const ref = createRef<HTMLSpanElement>();
    mount(
      <TextSwap ref={ref} className="text-ink-muted" id="status" title="Status">
        Queued
      </TextSwap>,
    );
    expect(ref.current).toBe(box());
    expect(box().className).toContain("text-ink-muted");
    expect(box().id).toBe("status");
    expect(box().title).toBe("Status");
  });
});
