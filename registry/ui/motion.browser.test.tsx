/**
 * Motion RUNS, and it runs at the duration it names.
 *
 * The gap this closes is the one ADR 0018 called the highest-leverage item
 * left: every other layer can only see motion's declaration. `check:motion`
 * reads source, so it proves a class is present. `check:utilities` proves the
 * class resolves. A visual baseline is a single frame in which, by
 * construction, nothing is moving. None of them can tell a working transition
 * from a dead one — and this library has shipped dead ones twice.
 *
 * Both times the DECLARATION was correct and the effect was nil. Modal and
 * Popover wrote `transition-[opacity,transform]` beside `scale-98`, and
 * Tailwind v4 writes `scale-*` as the standalone `scale` property, so
 * `transform` covered nothing. `getComputedStyle().transitionProperty` reads
 * back exactly as authored in both the working and the broken version, which
 * is why a test asserting it contained "transform" passed for the defect's
 * whole life.
 *
 * `getAnimations()` is the only thing that distinguishes them, and it is what
 * every assertion here goes through.
 *
 * WHY A SHARED FILE rather than one test per component: what is being checked
 * is a SYSTEM property — no component animates at a number the token layer
 * does not know about. A per-component version of that is 29 chances to
 * forget, and the components that most need it are the ones nobody thought to
 * add it to.
 */
import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Accordion } from "@/ui/accordion/accordion.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { Skeleton } from "@/ui/skeleton/skeleton.tsx";
import { Switch } from "@/ui/switch/switch.tsx";
import { Tabs } from "@/ui/tabs/tabs.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = "480px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const slot = (name: string) => container!.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

/** A token's resolved value in ms, read from the cascade rather than pinned. */
function durationMs(token: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!raw) throw new Error(`${token} is not in the emitted stylesheet`);
  return raw.endsWith("ms") ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
}

/**
 * Every duration token the library animates at.
 *
 * Asserted as a SET so a token that stops being emitted, or silently changes
 * unit, fails here rather than in whatever component happened to read it.
 */
describe("the duration tokens are real numbers in the stylesheet", () => {
  test.each(["--ui-duration-fast", "--ui-duration-base", "--ui-duration-slow", "--ui-duration-loop"])(
    "%s resolves",
    (token) => {
      expect(durationMs(token)).toBeGreaterThan(0);
    },
  );
});

/**
 * A transition that actually transitions, measured at the token.
 *
 * `el.getAnimations()` during a state change returns a CSSTransition per
 * property in flight. Its resolved duration is the number the browser is
 * really using — not the string the author typed.
 */
describe("interaction motion runs at --ui-duration-fast", () => {
  test("Switch's thumb travels", async () => {
    mount(<Switch defaultIsChecked={false}>Notifications</Switch>);
    const thumb = slot("thumb");

    // A real click on the painted track — Playwright refuses a visually
    // hidden input, and a synthetic `.click()` returns before the browser has
    // recalculated style, so `getAnimations()` is empty on WORKING code.
    await userEvent.click(slot("track"));

    const running = thumb.getAnimations();
    expect(running.length).toBeGreaterThan(0);
    for (const animation of running) {
      expect(animation.effect?.getTiming().duration).toBe(durationMs("--ui-duration-fast"));
    }
  });

  test("Tabs' trigger transitions its fill", async () => {
    mount(
      <Tabs defaultValue="a">
        <Tabs.List>
          <Tabs.Tab value="a">First</Tabs.Tab>
          <Tabs.Tab value="b">Second</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="a">one</Tabs.Panel>
        <Tabs.Panel value="b">two</Tabs.Panel>
      </Tabs>,
    );
    const tabs = container!.querySelectorAll<HTMLElement>('[data-slot="tabs-tab"]');
    const second = tabs[1]!;

    await userEvent.click(second);

    const running = second.getAnimations();
    expect(running.length).toBeGreaterThan(0);
    for (const animation of running) {
      expect(animation.effect?.getTiming().duration).toBe(durationMs("--ui-duration-fast"));
    }
  });
});

describe("surface motion runs at --ui-duration-base", () => {
  test("Accordion's panel animates its HEIGHT, not just its opacity", async () => {
    mount(
      <Accordion>
        <Accordion.Item value="one">
          <Accordion.Trigger>First</Accordion.Trigger>
          <Accordion.Panel>Body copy for the first section.</Accordion.Panel>
        </Accordion.Item>
      </Accordion>,
    );
    const trigger = slot("accordion-trigger");

    await userEvent.click(trigger);

    const panel = slot("accordion-panel");
    const running = panel.getAnimations();
    // The property matters as much as the duration: a panel that fades but
    // does not grow leaves the rows below it jumping.
    const properties = running.map((a) => (a as CSSTransition).transitionProperty);
    expect(properties).toContain("height");
    for (const animation of running) {
      expect(animation.effect?.getTiming().duration).toBe(durationMs("--ui-duration-base"));
    }
  });

  test("Progress' fill animates its width", async () => {
    const c = mount(<Progress label="Upload" value={20} />);
    const fill = c.querySelector<HTMLElement>('[data-slot="fill"]')!;

    // Read the STARTING width before changing it. This is not defensive
    // padding — without it the assertion below fails on a transition that
    // demonstrably runs. A transition needs a previously-computed value to
    // start from, and until something forces a style recalculation the 20%
    // width has never been computed; the element then goes straight to 80%
    // as its first computed value, which is not a change and does not
    // transition. Diagnosed by finding that the same sequence passed in a
    // scratch file that happened to log the width first.
    const startWidth = getComputedStyle(fill).width;
    expect(Number.parseFloat(startWidth)).toBeGreaterThan(0);

    // A SYNCHRONOUS act, deliberately. `await act(async …)` yields to the
    // microtask queue before the DOM change lands, so the frames waited for
    // below are already spent by the time the width actually moves — and
    // `getAnimations()` comes back empty on a transition that demonstrably
    // runs. Measured both ways before settling on this one.
    act(() => {
      root!.render(<Progress label="Upload" value={80} />);
    });
    // No user event to wait behind, so wait for a real style recalculation.
    // ONE frame is not enough: rAF runs BEFORE style/layout for that frame,
    // so the transition has not been created yet when the first callback
    // fires. Two frames is the first point at which it reliably exists.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
    );

    const running = fill.getAnimations();
    expect(running.length).toBeGreaterThan(0);
    expect(running.map((a) => (a as CSSTransition).transitionProperty)).toContain("width");
    for (const animation of running) {
      expect(animation.effect?.getTiming().duration).toBe(durationMs("--ui-duration-base"));
    }
  });
});

/**
 * A keyframe is the case the token layer CANNOT reach.
 *
 * `--ui-duration-*` collapses to 1ms under prefers-reduced-motion and that
 * covers every transition in the library for free. An `animate-*` utility
 * carries its own timing, so it keeps running — which is why ADR 0018 makes
 * the `motion-safe:` guard a requirement and `check:motion` enforces it.
 * These two assert the other half: that the keyframe that IS declared runs,
 * and at a duration the system chose.
 */
describe("keyframes carry their own timing, so it is checked separately", () => {
  test("Skeleton pulses at --ui-duration-loop", () => {
    mount(<Skeleton />);
    const bar = slot("skeleton");
    const pulse = bar.getAnimations().find((a) => (a as CSSAnimation).animationName === "pulse");
    expect(pulse).toBeDefined();
    expect(pulse!.effect?.getTiming().duration).toBe(durationMs("--ui-duration-loop"));
    expect(pulse!.effect?.getTiming().iterations).toBe(Number.POSITIVE_INFINITY);
  });

  test("Button's busy spinner is a guarded keyframe", () => {
    mount(<Button isBusy>Saving</Button>);
    const spinner = slot("button-spinner");
    const spin = spinner.getAnimations().find((a) => (a as CSSAnimation).animationName === "spin");
    expect(spin).toBeDefined();
    expect(spin!.effect?.getTiming().iterations).toBe(Number.POSITIVE_INFINITY);
  });
});
