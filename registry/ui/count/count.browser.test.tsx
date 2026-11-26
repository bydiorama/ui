/**
 * Count, measured in Chromium. Every motion claim goes through
 * `getAnimations()` and the transitions' keyframes — the techniques and their
 * reasons are the `motion-component` skill's table.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef, type ReactElement } from "react";

import { Count } from "./count.tsx";

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
/** A length token in px, resolved by the browser (it may be authored in rem). */
function tokenPx(name: string) {
  const probe = document.createElement("div");
  probe.style.width = `var(${name})`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px;
}

const count = () => container!.querySelector<HTMLElement>('[data-slot="count"]')!;
const chars = () => [...count().querySelectorAll<HTMLElement>('[data-slot="count-char"]')];
const ghosts = () => [...count().querySelectorAll<HTMLElement>('[data-slot="count-ghost"]')];
const char = (text: string) => chars().filter((c) => c.textContent === text);

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
const translateY = (value: string) => Number.parseFloat(value.split(" ")[1] ?? "0");

const stat = (value: number) => <Count value={value} className="text-title-lg" />;

describe("the text is the number", () => {
  test("first render: formatted text, one span per character, no ghosts, nothing moving", async () => {
    mount(stat(1249));
    await frames();
    expect(count().textContent).toBe("1,249");
    expect(chars().map((c) => c.textContent)).toEqual(["1", ",", "2", "4", "9"]);
    expect(ghosts()).toHaveLength(0);
    expect(count().getAnimations({ subtree: true })).toHaveLength(0);
  });

  test("mid-change and after, the text is only the new value — the old digits are drawn, not text", async () => {
    mount(stat(1249));
    await shown();
    rerender(stat(1250));
    await frames(1);
    expect(count().textContent).toBe("1,250");
    expect(count().innerText.replace(/\s/g, "")).toBe("1,250");
    const ghostChars = ghosts().map((g) => g.dataset.char);
    expect(ghostChars).toEqual(["4", "9"]);
    expect(ghosts().every((g) => g.getAttribute("aria-hidden") === "true" && g.textContent === "")).toBe(true);
    expect(getComputedStyle(ghosts()[0]!, "::before").content).toBe('"4"');
  });

  test("formats with the caller's locale and options", async () => {
    mount(<Count value={0.425} locale="de-DE" format={{ style: "percent", maximumFractionDigits: 1 }} />);
    await frames();
    expect(count().textContent).toBe(new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 }).format(0.425));
  });
});

describe("changing", () => {
  test("only the changed places move: new digits rise on base, old ones fade on fast in place", async () => {
    mount(stat(1249));
    await shown();
    const thousands = chars()[0]!;
    rerender(stat(1250));
    await frames(1);

    expect(chars()[0]).toBe(thousands); // unchanged places keep their element
    expect(thousands.getAnimations()).toHaveLength(0);
    expect(char("2")[0]!.getAnimations()).toHaveLength(0);

    for (const digit of ["5", "0"]) {
      const arriving = starts(char(digit)[0]!);
      expect(arriving.get("opacity")?.from).toBe("0");
      expect(translateY(arriving.get("translate")!.from)).toBeCloseTo(tokenPx("--ui-space-xs"), 1);
      expect(arriving.get("opacity")?.timing.duration).toBe(tokenMs("--ui-duration-base"));
    }
    for (const ghost of ghosts()) {
      const leaving = starts(ghost);
      expect(leaving.get("opacity")?.from).toBe("1");
      expect(leaving.get("opacity")?.timing.duration).toBe(tokenMs("--ui-duration-fast"));
      expect(leaving.has("translate")).toBe(false);
    }
  });

  test("a shrinking value's new digits drop in from above", async () => {
    mount(stat(1250));
    await shown();
    rerender(stat(1249));
    await frames(1);
    const arriving = starts(char("9")[0]!);
    expect(translateY(arriving.get("translate")!.from)).toBeCloseTo(-tokenPx("--ui-space-xs"), 1);
  });

  test("a new leading place arrives like a changed digit", async () => {
    mount(stat(999));
    await shown();
    rerender(stat(1000));
    await frames(1);
    expect(count().textContent).toBe("1,000");
    expect(starts(chars()[0]!).get("opacity")?.from).toBe("0");
  });

  test("tabular figures: a changing digit does not move its neighbours", async () => {
    mount(stat(1111));
    await shown();
    const before = chars()[0]!.getBoundingClientRect().x;
    rerender(stat(1888));
    await frames(1);
    expect(chars()[0]!.getBoundingClientRect().x).toBe(before);
    expect(getComputedStyle(count()).fontVariantNumeric).toContain("tabular-nums");
  });
});

describe("motion levels", () => {
  test("Reduced: a cross-fade per digit, no rise", async () => {
    document.documentElement.setAttribute("data-ui-motion", "reduced");
    mount(stat(41));
    await shown();
    rerender(stat(42));
    await frames(1);
    const arriving = starts(char("2")[0]!);
    expect(arriving.get("opacity")?.from).toBe("0");
    expect(translateY(arriving.get("translate")?.from ?? "0px 0px")).toBe(0);
  });

  test("Off: 1ms, and the text is still the number", async () => {
    document.documentElement.setAttribute("data-ui-motion", "off");
    mount(stat(41));
    await shown();
    rerender(stat(42));
    expect(getComputedStyle(char("2")[0]!).transitionDuration).toBe("0.001s");
    expect(getComputedStyle(ghosts()[0]!).transitionDuration).toBe("0.001s");
    expect(count().textContent).toBe("42");
  });
});

describe("forwarding", () => {
  test("className lands on the root, merged; ref is the root; native attributes pass through", async () => {
    const ref = createRef<HTMLSpanElement>();
    mount(<Count ref={ref} value={3} className="text-ink-muted" id="cart" aria-label="3 items in cart" />);
    await frames();
    expect(ref.current).toBe(count());
    expect(count().id).toBe("cart");
    expect(count().getAttribute("aria-label")).toBe("3 items in cart");
    expect(count().className).toContain("text-ink-muted");
    expect(count().className).toContain("tabular-nums");
  });
});
