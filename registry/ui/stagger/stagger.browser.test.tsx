/**
 * Stagger, measured in Chromium. Motion claims go through `getAnimations()`
 * and each transition's own timing — the techniques are the
 * `motion-component` skill's table.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, type ReactElement } from "react";

import { Stagger } from "./stagger.tsx";

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

function tokenMs(name: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw.endsWith("ms") ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
}

const rows = () => [...container!.querySelectorAll<HTMLElement>("li")];

/** Per property: where its transition starts, its delay and its duration. */
function timings(el: Element) {
  return new Map(
    el.getAnimations().map((a) => {
      const property = (a as CSSTransition).transitionProperty;
      const [from] = (a.effect as KeyframeEffect).getKeyframes();
      const timing = a.effect!.getTiming();
      return [property, { from: String((from as Record<string, unknown>)[property]), delay: timing.delay, duration: timing.duration }];
    }),
  );
}
const translateY = (value: string | undefined) => Number.parseFloat((value ?? "0px 0px").split(" ")[1] ?? "0");

async function settled() {
  for (let pass = 0; pass < 3; pass++) {
    await frames(1);
    await Promise.all(rows().flatMap((r) => r.getAnimations()).map((a) => a.finished.catch(() => undefined)));
  }
  await frames(2);
}

const list = (names: string[], kind?: "rise" | "fade") => (
  <ul>
    <Stagger kind={kind}>
      {names.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </Stagger>
  </ul>
);
const EIGHT = ["Müller-Brockmann", "Tschichold", "Crouwel", "Gerstner", "Hofmann", "Ruder", "Vignelli", "Frutiger"];

describe("arriving in order", () => {
  test("the first render's items rise in one step apart, capped at the sixth", async () => {
    mount(list(EIGHT));
    await frames(1);
    const step = tokenMs("--ui-stagger-step");
    const base = tokenMs("--ui-duration-base");
    const delays = rows().map((row) => Math.round(timings(row).get("opacity")?.delay ?? -1));
    expect(delays, JSON.stringify(delays)).toEqual([0, 1, 2, 3, 4, 5, 5, 5].map((n) => n * step));
    for (const row of rows()) {
      const t = timings(row);
      expect(t.get("opacity")?.from).toBe("0");
      expect(t.get("opacity")?.duration).toBe(base);
      expect(translateY(t.get("translate")?.from)).toBeGreaterThan(0);
      expect(t.get("translate")?.delay).toBe(t.get("opacity")?.delay);
    }
  });

  test("the delay is only for arriving: once settled, no item carries it", async () => {
    mount(list(EIGHT.slice(0, 4)));
    await settled();
    for (const row of rows()) {
      expect(row.dataset.presence).toBe("present");
      expect(new Set(getComputedStyle(row).transitionDelay.split(",").map((d) => d.trim()))).toEqual(new Set(["0s"]));
      expect(getComputedStyle(row).opacity).toBe("1");
    }
  });

  test("an item added later arrives at once, not after the group", async () => {
    mount(list(EIGHT.slice(0, 6)));
    await settled();
    rerender(list([...EIGHT.slice(0, 6), "Late"]));
    await frames(1);
    const late = rows().find((r) => r.textContent === "Late")!;
    const t = timings(late);
    expect(t.get("opacity")?.from).toBe("0");
    expect(t.get("opacity")?.delay).toBe(0);
  });

  test("fade: opacity only, still in order", async () => {
    mount(list(EIGHT.slice(0, 3), "fade"));
    await frames(1);
    const step = tokenMs("--ui-stagger-step");
    expect(rows().map((r) => timings(r).get("opacity")?.delay)).toEqual([0, step, 2 * step]);
    expect(rows().every((r) => !timings(r).has("translate"))).toBe(true);
  });
});

describe("motion levels", () => {
  test("Reduced: the step is 0, so the group fades in together without rising", async () => {
    document.documentElement.setAttribute("data-ui-motion", "reduced");
    mount(list(EIGHT));
    await frames(1);
    for (const row of rows()) {
      const t = timings(row);
      expect(t.get("opacity")?.from).toBe("0");
      expect(t.get("opacity")?.delay).toBe(0);
      expect(translateY(t.get("translate")?.from)).toBe(0);
    }
  });

  test("Off: no delay and 1ms", async () => {
    document.documentElement.setAttribute("data-ui-motion", "off");
    mount(list(EIGHT));
    const durations = rows().map((r) => getComputedStyle(r).transitionDuration.split(",")[0]!.trim());
    const delays = rows().map((r) => getComputedStyle(r).transitionDelay.split(",")[0]!.trim());
    expect(new Set(durations)).toEqual(new Set(["0.001s"]));
    expect(new Set(delays)).toEqual(new Set(["0s"]));
    await settled();
    expect(rows().every((r) => getComputedStyle(r).opacity === "1")).toBe(true);
  });
});

describe("forwarding", () => {
  test("an item keeps its own className and style", async () => {
    mount(
      <ul>
        <Stagger>
          <li key="a" className="text-ink-muted" style={{ paddingTop: "3px" }}>
            a
          </li>
        </Stagger>
      </ul>,
    );
    await frames();
    const row = rows()[0]!;
    expect(row.className).toContain("text-ink-muted");
    expect(row.style.paddingTop).toBe("3px");
    expect(row.style.getPropertyValue("--ui-stagger-index")).toBe("0");
  });
});
