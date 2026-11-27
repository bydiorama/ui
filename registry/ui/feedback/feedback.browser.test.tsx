/**
 * Feedback, measured in Chromium. The shake is a Web Animation, so it is read
 * from `getAnimations()` and sampled by seeking; the check is a CSS
 * transition, read from its starting keyframe (the `motion-component` skill).
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef, useImperativeHandle, forwardRef, type ReactElement } from "react";

import { SuccessCheck, useShake } from "./feedback.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  return container;
}

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
function tokenPx(name: string) {
  const probe = document.createElement("div");
  probe.style.width = `var(${name})`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px;
}

/** A field wired to useShake, exposing shake() to the test. */
const Field = forwardRef<{ shake: () => void }>(function Field(_, handle) {
  const { ref, shake } = useShake<HTMLInputElement>();
  useImperativeHandle(handle, () => ({ shake }), [shake]);
  return <input ref={ref} aria-label="Code" aria-invalid="true" defaultValue="48213" />;
});

const field = () => container!.querySelector("input")!;

describe("useShake", () => {
  test("at Full, one shake on --ui-duration-slow, swinging 4 → 2.5 → 1px and back to rest", async () => {
    const handle = createRef<{ shake: () => void }>();
    mount(<Field ref={handle} />);
    await frames();
    act(() => handle.current!.shake());
    const [shake, ...others] = field().getAnimations();
    expect(others).toHaveLength(0);
    const duration = tokenMs("--ui-duration-slow");
    expect(shake!.effect!.getTiming().duration).toBe(duration);
    shake!.pause();
    const xs = () => Number.parseFloat(getComputedStyle(field()).translate.split(" ")[0] ?? "0");
    const step = duration / 6;
    const unit = tokenPx("--ui-space-xs");
    const at = (i: number) => {
      shake!.currentTime = i * step;
      return xs();
    };
    expect(at(1)).toBeCloseTo(-unit, 1);
    expect(at(2)).toBeCloseTo(unit, 1);
    expect(at(3)).toBeCloseTo(-unit * 0.625, 1);
    expect(at(5)).toBeCloseTo(-unit * 0.25, 1);
    shake!.finish();
    expect(field().getAnimations()).toHaveLength(0);
    expect(getComputedStyle(field()).translate).toBe("none");
  });

  test("shaking again mid-shake restarts it rather than stacking", async () => {
    const handle = createRef<{ shake: () => void }>();
    mount(<Field ref={handle} />);
    await frames();
    act(() => handle.current!.shake());
    await frames(2);
    act(() => handle.current!.shake());
    expect(field().getAnimations().filter((a) => a.playState === "running")).toHaveLength(1);
  });

  test.each(["reduced", "off"] as const)("at %s it does nothing: the static cue carries the error", async (level) => {
    document.documentElement.setAttribute("data-ui-motion", level);
    const handle = createRef<{ shake: () => void }>();
    mount(<Field ref={handle} />);
    await frames();
    act(() => handle.current!.shake());
    expect(field().getAnimations()).toHaveLength(0);
  });
});

const check = () => container!.querySelector<HTMLElement>('[data-slot="success-check"]')!;
function starts(el: Element) {
  return new Map(
    el.getAnimations().map((a) => {
      const property = (a as CSSTransition).transitionProperty;
      const [from] = (a.effect as KeyframeEffect).getKeyframes() as Record<string, unknown>[];
      // Keyframes name properties in camelCase (clipPath); transitions in CSS (clip-path).
      const key = property.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      return [property, { from: String(from![key]), duration: a.effect!.getTiming().duration }];
    }),
  );
}

describe("SuccessCheck", () => {
  test("at Full it is written in left to right on --ui-duration-slow, not faded", async () => {
    mount(<SuccessCheck />);
    await frames(1);
    const t = starts(check());
    expect(t.get("clip-path")?.from).toBe("inset(0px 100% 0px 0px)");
    expect(t.get("clip-path")?.duration).toBe(tokenMs("--ui-duration-slow"));
    expect(t.has("opacity")).toBe(false);
  });

  test("at Reduced it fades in whole, on the capped duration", async () => {
    document.documentElement.setAttribute("data-ui-motion", "reduced");
    mount(<SuccessCheck />);
    await frames(1);
    const t = starts(check());
    expect(t.get("opacity")?.from).toBe("0");
    expect(t.get("opacity")?.duration).toBe(tokenMs("--ui-duration-base"));
    expect(t.has("clip-path")).toBe(false);
  });

  test("at Off it is simply there", async () => {
    document.documentElement.setAttribute("data-ui-motion", "off");
    mount(<SuccessCheck />);
    expect(getComputedStyle(check()).transitionDuration).toBe("0.001s");
    await frames(2);
    expect(getComputedStyle(check()).opacity).toBe("1");
  });

  test("decorative, 16px and success-ink by default; className and ref forward", async () => {
    const ref = createRef<HTMLSpanElement>();
    mount(<SuccessCheck ref={ref} className="size-6" id="done" />);
    await frames();
    expect(ref.current).toBe(check());
    expect(check().getAttribute("aria-hidden")).toBe("true");
    expect(check().id).toBe("done");
    expect(check().getBoundingClientRect().width).toBe(24);
    expect(check().querySelector("svg")!.getBoundingClientRect().width).toBe(24);
  });
});
