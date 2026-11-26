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
import { cdp, userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Accordion } from "@/ui/accordion/accordion.tsx";
import { Button } from "@/ui/button/button.tsx";
import { Drawer } from "@/ui/drawer/drawer.tsx";
import { motionLevel, subscribeMotionLevel, type MotionLevel } from "@/lib/motion";
import { Popover } from "@/ui/popover/popover.tsx";
import { Progress } from "@/ui/progress/progress.tsx";
import { Sheet } from "@/ui/sheet/sheet.tsx";
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

afterEach(async () => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  document.documentElement.removeAttribute("data-ui-motion");
  await prefersReducedMotion(false);
});

/** Emulate the OS preference for the page, through CDP — the media query itself, not a stub. */
async function prefersReducedMotion(reduce: boolean) {
  // vitest types the session as an empty interface; the Playwright provider's is the real one.
  const session = cdp() as unknown as { send(method: string, params: object): Promise<unknown> };
  await session.send("Emulation.setEmulatedMedia", {
    features: reduce ? [{ name: "prefers-reduced-motion", value: "reduce" }] : [],
  });
  expect(matchMedia("(prefers-reduced-motion: reduce)").matches, "emulation did not take").toBe(reduce);
}

/** Set the page's level, the way an app's motion setting would. */
function setPageLevel(level: MotionLevel | null) {
  if (level) document.documentElement.setAttribute("data-ui-motion", level);
  else document.documentElement.removeAttribute("data-ui-motion");
}

const slot = (name: string) => container!.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;

/**
 * The transitions an interaction STARTS, rather than the ones still running by
 * the time the assertion happens to execute.
 *
 * Every test below used to read `getAnimations()` on the line after an awaited
 * click. That is a race with a deadline of `--ui-duration-fast`, which is
 * 120ms: the browser finishes the transition, drops the CSSTransition, and the
 * assertion sees an empty array on code that works perfectly. It passed for as
 * long as the suite was small enough to give each file a whole core, and
 * started failing roughly one run in two — a different test each time, never
 * the same one twice — once the file count grew past the worker pool.
 *
 * A flake in a gate is worse than no gate: it trains everyone to re-run.
 * `transitionrun` fires when the browser CREATES the transition, before any
 * delay and long before it can finish, so capturing there cannot race. The one
 * frame afterwards covers a transition created between the action resolving
 * and the listener being removed.
 */
async function transitionsStartedBy(element: Element, interaction: () => Promise<void>) {
  const captured = new Set<Animation>();
  const capture = () => {
    for (const animation of element.getAnimations()) captured.add(animation);
  };
  element.addEventListener("transitionrun", capture);
  await interaction();
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  element.removeEventListener("transitionrun", capture);
  // Anything still in flight counts too — this is a superset of the old read,
  // never a subset, so it cannot hide a genuinely dead transition.
  capture();
  return [...captured];
}

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
    const running = await transitionsStartedBy(thumb, () => userEvent.click(slot("track")));

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

    const running = await transitionsStartedBy(second, () => userEvent.click(second));

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

    // The panel is not in the DOM until the trigger is pressed, so the capture
    // listens on the container — `transitionrun` bubbles.
    await transitionsStartedBy(container!, () => userEvent.click(trigger));

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
    const running = await transitionsStartedBy(fill, async () => {
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
    });

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

/**
 * Motion levels (ADR 0028): `full`, `reduced`, `off`.
 *
 * The record made two claims it said must be MEASURED before it is accepted:
 * that the precedence holds when the attribute and the OS disagree, in both
 * directions, and that keyframes and JavaScript follow the level rather than
 * the bare media query. Every case below sets one or both and reads what the
 * browser actually resolved.
 */
describe("the level resolves the same way in CSS and in JavaScript", () => {
  const travel = (el: Element) => getComputedStyle(el).getPropertyValue("--ui-motion-travel").trim();

  test.each<[string, boolean, MotionLevel | null, MotionLevel, string]>([
    ["no attribute, no OS preference", false, null, "full", "1"],
    ["no attribute, OS asks for less", true, null, "reduced", "0"],
    ["the user chose full over the OS", true, "full", "full", "1"],
    ["the app chose reduced", false, "reduced", "reduced", "0"],
    ["the app chose off", false, "off", "off", "0"],
  ])("%s", async (_, os, page, expected, travelValue) => {
    await prefersReducedMotion(os);
    setPageLevel(page);
    const c = mount(<p>text</p>);
    expect(motionLevel(c)).toBe(expected);
    expect(travel(c)).toBe(travelValue);
  });

  test("going down is always honoured, however the attributes nest", () => {
    const c = mount(
      <div data-ui-motion="reduced">
        <div data-ui-motion="full" id="full-in-reduced" />
        <div data-ui-motion="off">
          <div data-ui-motion="full" id="full-in-off" />
        </div>
      </div>,
    );
    const at = (id: string) => c.querySelector(`#${id}`)!;
    expect(motionLevel(at("full-in-reduced"))).toBe("reduced");
    expect(motionLevel(at("full-in-off"))).toBe("off");
    expect(travel(at("full-in-off"))).toBe("0");
    // A region quieter than the page, under a page set to full.
    setPageLevel("full");
    expect(motionLevel(c.firstElementChild)).toBe("reduced");
  });

  test("subscribeMotionLevel hears an attribute change and the OS changing", async () => {
    let calls = 0;
    const unsubscribe = subscribeMotionLevel(() => calls++);
    setPageLevel("off");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toBeGreaterThan(0);
    const before = calls;
    await prefersReducedMotion(true);
    // The media query's change event is queued with the next rendering
    // update, not dispatched by the emulation call itself.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
    expect(calls).toBeGreaterThan(before);
    unsubscribe();
  });
});

describe("`reduced` keeps change in place and removes travel", () => {
  test("Switch's thumb still eases, at --ui-duration-fast", async () => {
    setPageLevel("reduced");
    mount(<Switch defaultIsChecked={false}>Notifications</Switch>);
    const running = await transitionsStartedBy(slot("thumb"), () => userEvent.click(slot("track")));
    expect(running.length).toBeGreaterThan(0);
    for (const animation of running) {
      expect(animation.effect?.getTiming().duration).toBe(durationMs("--ui-duration-fast"));
    }
  });

  test("`off` runs the same thumb at 1ms, so Base UI still has an animation to await", async () => {
    setPageLevel("off");
    mount(<Switch defaultIsChecked={false}>Notifications</Switch>);
    const running = await transitionsStartedBy(slot("thumb"), () => userEvent.click(slot("track")));
    expect(running.length).toBeGreaterThan(0);
    for (const animation of running) expect(animation.effect?.getTiming().duration).toBe(1);
  });

  /** The properties a portalled surface transitions as it enters. */
  async function entering(open: () => Promise<void>, panelSlot: string) {
    const captured: CSSTransition[] = [];
    const capture = (event: Event) => {
      const target = event.target as Element;
      if (target.matches(`[data-slot="${panelSlot}"]`)) {
        for (const a of target.getAnimations()) captured.push(a as CSSTransition);
      }
    };
    document.addEventListener("transitionrun", capture, true);
    await open();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
    document.removeEventListener("transitionrun", capture, true);
    const panel = document.querySelector(`[data-slot="${panelSlot}"]`);
    for (const a of panel?.getAnimations() ?? []) captured.push(a as CSSTransition);
    return captured;
  }

  /** Each transitioned property and the value it starts FROM. */
  const startsOf = (running: CSSTransition[]) =>
    new Map(
      running.map((a) => {
        const [from] = (a.effect as KeyframeEffect).getKeyframes();
        const property = a.transitionProperty;
        return [property, String((from as Record<string, unknown>)[property] ?? "")];
      }),
    );

  /*
   * WHAT "NO TRAVEL" MEANS, MEASURED. At `reduced` the Sheet still creates a
   * `translate` transition: its starting offset computes to `0%`, the resting
   * panel has `translate: none`, and Chromium treats those as two different
   * values. Nothing moves — both are the identity. So these assert where each
   * transition STARTS, which is what the user sees, rather than whether one
   * exists, which is an implementation detail found by the first run.
   */
  const IDENTITY = { translate: /^(none|0(px|%)?(\s+0(px|%)?)*)$/, scale: /^(none|1(\s+1)*)$/ };

  const sheet = () => (
    <Sheet>
      <Sheet.Trigger>Open menu</Sheet.Trigger>
      <Sheet.Panel label="Primary navigation">
        <p>Links</p>
        <Sheet.Close>Done</Sheet.Close>
      </Sheet.Panel>
    </Sheet>
  );

  test("Sheet slides at full", async () => {
    mount(sheet());
    const starts = startsOf(await entering(() => userEvent.click(slot("sheet-trigger")), "sheet-panel"));
    expect(starts.get("translate")).toBeDefined();
    expect(starts.get("translate")).not.toMatch(IDENTITY.translate);
  });

  test("Sheet fades in place at reduced: its slide starts where it ends", async () => {
    setPageLevel("reduced");
    mount(sheet());
    const starts = startsOf(await entering(() => userEvent.click(slot("sheet-trigger")), "sheet-panel"));
    expect(starts.get("translate") ?? "none").toMatch(IDENTITY.translate);
    expect(starts.get("opacity")).toBe("0");
  });

  // Drawer slides OPAQUE at full — it never faded, and must not start to.
  // Its entry opacity is the travel factor: 1 at full, 0 at reduced. The
  // first version wrote 1 − travel, which faded it at full; no test covered
  // Drawer, so these two exist.
  const drawer = () => (
    <Drawer>
      <Drawer.Trigger>Open</Drawer.Trigger>
      <Drawer.Panel label="Complete profile">
        <Drawer.Body>
          <Drawer.Title>Complete profile</Drawer.Title>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>Done</Drawer.Close>
        </Drawer.Footer>
      </Drawer.Panel>
    </Drawer>
  );

  test("Drawer slides up opaque at full, exactly as before the levels", async () => {
    mount(drawer());
    const starts = startsOf(await entering(() => userEvent.click(slot("drawer-trigger")), "drawer-panel"));
    expect(starts.get("translate")).not.toMatch(IDENTITY.translate);
    expect(starts.get("opacity") ?? "1").toBe("1");
  });

  test("Drawer fades in place at reduced", async () => {
    setPageLevel("reduced");
    mount(drawer());
    const starts = startsOf(await entering(() => userEvent.click(slot("drawer-trigger")), "drawer-panel"));
    expect(starts.get("translate") ?? "none").toMatch(IDENTITY.translate);
    expect(starts.get("opacity")).toBe("0");
  });

  const popover = () => (
    <Popover>
      <Popover.Trigger>Details</Popover.Trigger>
      <Popover.Panel>
        <p>Body</p>
      </Popover.Panel>
    </Popover>
  );

  test("Popover grows from --ui-enter-scale at full, and starts full size at reduced", async () => {
    mount(popover());
    const full = startsOf(await entering(() => userEvent.click(slot("popover-trigger")), "popover-panel"));
    expect(full.get("scale")).toMatch(/^0\.98/);
    act(() => root?.unmount());
    container?.remove();

    setPageLevel("reduced");
    mount(popover());
    const reduced = startsOf(await entering(() => userEvent.click(slot("popover-trigger")), "popover-panel"));
    expect(reduced.get("scale") ?? "none").toMatch(IDENTITY.scale);
    expect(reduced.get("opacity")).toBe("0");
  });
});

describe("keyframes run only at full", () => {
  const pulse = () => slot("skeleton").getAnimations().find((a) => (a as CSSAnimation).animationName === "pulse");
  const spin = () => slot("button-spinner").getAnimations().find((a) => (a as CSSAnimation).animationName === "spin");

  test("a region set to reduced stops the loops, with no OS preference at all", () => {
    mount(
      <div data-ui-motion="reduced">
        <Skeleton />
        <Button isBusy>Saving</Button>
      </div>,
    );
    expect(pulse()).toBeUndefined();
    expect(spin()).toBeUndefined();
  });

  test("the OS preference alone stops them", async () => {
    await prefersReducedMotion(true);
    mount(<Skeleton />);
    expect(pulse()).toBeUndefined();
  });

  test("a user who chose full in the app gets them back over the OS", async () => {
    await prefersReducedMotion(true);
    setPageLevel("full");
    mount(
      <div>
        <Skeleton />
        <Button isBusy>Saving</Button>
      </div>,
    );
    expect(pulse()).toBeDefined();
    expect(spin()).toBeDefined();
  });
});

/**
 * `--ui-ease-spring` is a real spring (ADR 0028 §7). Its name promised a
 * bounce for the library's whole life while its value, a cubic-bezier, could
 * never pass its target. Measured by pausing a real transition: at 55% of
 * the duration it has gone past the end, and at the end it is exactly there.
 */
describe("the spring token overshoots and settles", () => {
  test("a 1000ms transition on --ui-ease-spring passes 100px and lands on it", async () => {
    const c = mount(<div style={{ width: 10, height: 10, translate: "0px 0px" }} />);
    const box = c.firstElementChild as HTMLElement;
    box.style.transition = "translate 1000ms var(--ui-ease-spring)";
    // Read the start so the browser has a value to transition FROM.
    expect(getComputedStyle(box).translate).toBe("0px");
    box.style.translate = "100px 0px";
    const [run] = box.getAnimations();
    expect(run, "no transition: the spring value did not parse").toBeDefined();
    run!.pause();
    const at = (ms: number) => {
      run!.currentTime = ms;
      return Number.parseFloat(getComputedStyle(box).translate);
    };
    expect(at(330)).toBeGreaterThan(88); // as quick as the curve it replaced
    expect(at(550)).toBeGreaterThan(101); // past the target: a spring
    expect(at(550)).toBeLessThan(104); // a small settle, not a bounce
    expect(at(999)).toBeCloseTo(100, 0);
  });
});
