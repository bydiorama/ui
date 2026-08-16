import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { Skeleton } from "./skeleton.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/**
 * A FIXED width, because the default box is `w-full`.
 *
 * In an auto-width parent `w-full` is circular and an empty div resolves to
 * nothing — which is the exact failure the default size exists to prevent, so
 * a test that mounted into a shrink-to-fit container would report the bug as
 * the expected result.
 */
const WIDTH = 200;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = `${WIDTH}px`;
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const bar = container.querySelector<HTMLElement>('[data-slot="skeleton"]');
  if (!bar) throw new Error("Skeleton did not render");
  return { bar, container: container! };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

/**
 * The resolved value of a token, through the same pipeline the component uses.
 *
 * Comparing against a pinned `rgb(...)` would pass while the component pointed
 * at a different role that happened to resolve to the same colour today. What
 * is being asserted is that the fill IS the token, so both sides have to be
 * read from the cascade.
 */
function resolved(property: string) {
  const probe = document.createElement("div");
  probe.style.backgroundColor = `var(${property})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

describe("Skeleton default box", () => {
  test("renders visibly with no className at all", () => {
    const { bar } = mount(<Skeleton />);
    const box = bar.getBoundingClientRect();

    // The footgun this default exists to close: every className-sized
    // placeholder that ships without one renders a 0px box, and a component
    // that draws nothing reads as broken rather than as loading.
    expect(box.height).toBe(16);
    expect(box.width).toBe(WIDTH);
  });

  test("the fill is --ui-bg-sunken, the same well Table's own bar uses", () => {
    const { bar } = mount(<Skeleton />);
    expect(getComputedStyle(bar).backgroundColor).toBe(resolved("--ui-bg-sunken"));
  });

  test("the radius is --ui-radius-sm", () => {
    const { bar } = mount(<Skeleton />);
    const radius = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--ui-radius-sm"),
    );
    expect(Number.parseFloat(getComputedStyle(bar).borderTopLeftRadius)).toBeCloseTo(radius, 3);
  });
});

describe("Skeleton is sized from the outside", () => {
  /**
   * The tailwind-merge claim, which is the entire API.
   *
   * An unregistered utility namespace gets guessed at and dropped at runtime
   * (a trap this repo has paid for), so "className wins" has to be measured
   * rather than assumed — and it has to be measured against the DEFAULT it is
   * displacing, or the assertion passes on a component with no defaults.
   */
  test("className displaces the default height and width", () => {
    const { bar } = mount(<Skeleton className="h-8 w-48" />);
    const box = bar.getBoundingClientRect();
    expect(box.height).toBe(32);
    expect(box.width).toBe(192);
    expect(box.width).not.toBe(WIDTH);
  });

  /**
   * The documented limitation, pinned rather than described.
   *
   * `w-full` inside a shrink-to-fit parent is circular and collapses — the
   * same 0px box the default HEIGHT exists to prevent, arriving down the
   * other axis. The doc says so in knownGaps; this is the evidence for that
   * sentence, and it fails if someone "fixes" the default to something with a
   * min-width without updating the doc.
   */
  test("w-full collapses in a shrink-to-fit parent — the documented gap", () => {
    container = document.createElement("div");
    container.style.display = "inline-block";
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<Skeleton />);
    });
    const bar = container.querySelector<HTMLElement>('[data-slot="skeleton"]')!;
    const box = bar.getBoundingClientRect();
    expect(box.width).toBe(0);
    // The height still resolves, which is what makes the failure confusing:
    // the element is there, it is just infinitely thin.
    expect(box.height).toBe(16);
  });

  test("size-10 rounded-full makes a circle", () => {
    const { bar } = mount(<Skeleton className="size-10 rounded-full" />);
    const box = bar.getBoundingClientRect();
    expect(box.width).toBe(40);
    expect(box.height).toBe(40);
    // A circle, not the default's small radius. `rounded-full` resolves to a
    // very large length rather than a percentage, so the comparison is against
    // the box rather than against a literal.
    expect(Number.parseFloat(getComputedStyle(bar).borderTopLeftRadius)).toBeGreaterThanOrEqual(20);
  });
});

describe("Skeleton motion", () => {
  /**
   * That the pulse RUNS, not that the class is present.
   *
   * A class list is what `check:motion` reads; it cannot tell a working
   * animation from a declared one. `getAnimations()` can, and it is the
   * measurement that caught Modal and Popover transitioning nothing while
   * their declarations looked correct.
   *
   * The prefers-reduced-motion half is NOT asserted here: this harness has no
   * way to emulate the media query, so a test claiming to cover it would be
   * theatre. `check:motion` enforces the `motion-safe:` guard statically
   * instead (ADR 0018), which is the strongest hold available for it.
   */
  test("the bar pulses", () => {
    const { bar } = mount(<Skeleton />);
    const animations = bar.getAnimations();
    expect(animations.length).toBeGreaterThan(0);
    expect(animations.map((a) => (a as CSSAnimation).animationName)).toContain("pulse");
  });

  /**
   * The timing comes from the TOKEN, not from Tailwind's utility name.
   *
   * `animate-pulse` bakes 2s and its own curve into the class name, which is
   * a hard-coded duration in the one place `check:motion` cannot look. The
   * override is only worth anything if it actually wins the cascade — an
   * arbitrary property losing to the shorthand would leave the token
   * decorative and everything still green.
   */
  test("the pulse period is --ui-duration-loop, not Tailwind's 2s", () => {
    const { bar } = mount(<Skeleton />);
    const token = getComputedStyle(document.documentElement)
      .getPropertyValue("--ui-duration-loop")
      .trim();
    expect(token).not.toBe("");
    expect(getComputedStyle(bar).animationDuration).toBe(
      `${Number.parseFloat(token) / 1000}s`,
    );
  });

  test("the pulse loops rather than settling", () => {
    const { bar } = mount(<Skeleton />);
    const pulse = bar
      .getAnimations()
      .find((a) => (a as CSSAnimation).animationName === "pulse");
    if (!pulse) throw new Error("no pulse animation");
    // A placeholder that stops breathing looks like content that arrived
    // empty. Infinity is what separates a loading loop from an entrance.
    expect(pulse.effect?.getTiming().iterations).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("Skeleton accessibility", () => {
  test("is hidden from assistive tech by default", () => {
    const { bar } = mount(<Skeleton />);
    expect(bar.getAttribute("aria-hidden")).toBe("true");
  });

  /**
   * The documented exception to §5 — `aria-hidden` is set BEFORE the spread,
   * so it is a default rather than a contract prop. Asserted because a
   * refactor that "tidied" the attribute below the spread would silently take
   * the escape hatch away, and nothing else would notice.
   */
  test("a caller can label a single skeleton instead", () => {
    const { bar } = mount(<Skeleton aria-hidden={false} aria-label="Loading title" />);
    expect(bar.getAttribute("aria-hidden")).toBe("false");
    expect(bar.getAttribute("aria-label")).toBe("Loading title");
  });

  test("is not focusable", () => {
    const { bar } = mount(<Skeleton />);
    expect(bar.tabIndex).toBe(-1);
    bar.focus();
    expect(document.activeElement).not.toBe(bar);
  });
});

describe("Skeleton forwarding — §5", () => {
  test("the ref lands on the only node", () => {
    const ref = createRef<HTMLDivElement>();
    const { bar } = mount(<Skeleton ref={ref} />);
    expect(ref.current).toBe(bar);
  });

  test("native props land on the same node", () => {
    const { bar } = mount(<Skeleton id="placeholder" data-testid="bar" />);
    expect(bar.id).toBe("placeholder");
    expect(bar.dataset["testid"]).toBe("bar");
  });
});
