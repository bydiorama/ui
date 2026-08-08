import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useState } from "react";
import type { ReactElement } from "react";

import { Drawer } from "./drawer.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return container;
}

const panel = () => document.querySelector<HTMLElement>('[data-slot="drawer-panel"]');
const scrim = () => document.querySelector<HTMLElement>('[data-slot="drawer-scrim"]');
const handle = () => document.querySelector<HTMLElement>('[data-slot="drawer-handle"]')!;
const trigger = () => document.querySelector<HTMLElement>('[data-slot="drawer-trigger"]')!;

async function settled(el: Element) {
  // Wait for the transition to EXIST before waiting for it to finish.
  //
  // Base UI suppresses transitions for exactly one frame after a surface
  // opens — it writes `style="transition: none"` inline so the panel cannot
  // animate from a stale position — and an inline style beats every class.
  // So `getAnimations()` sampled on that frame returns [], this helper
  // resolves instantly, and the caller reads geometry or computed style in
  // the MIDDLE of the transition it thought it had awaited.
  //
  // That was not theoretical: Select's "opens BELOW the trigger" and "the
  // enter transition ACTUALLY runs on scale" both flaked on main, one or the
  // other on nearly every run, and this is the single cause of both. A panel
  // read while `scale-98` is still applied is 2% smaller and sits 2px lower,
  // which is exactly the 10.35-versus-8 the offset assertion kept reporting.
  for (let i = 0; i < 3 && el.getAnimations().length === 0; i++) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  }
  // Then DRAIN, rather than awaiting one batch. Waiting for a transition to
  // appear can itself let a second one start — Switch's track begins moving
  // between two accent fills during those frames — and a single
  // `Promise.all` returns while that one is still mid-flight, which reads as
  // an interpolated colour that matches no token at all.
  for (let i = 0; i < 5; i++) {
    const running = el.getAnimations();
    if (running.length === 0) break;
    await Promise.all(running.map((a) => a.finished.catch(() => undefined)));
  }
}

const rest = () => new Promise((r) => setTimeout(r, 260));

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

function Basic(props: { isDismissable?: boolean; onOpenChange?: (v: boolean) => void } = {}) {
  return (
    <Drawer {...props}>
      <Drawer.Trigger>Open</Drawer.Trigger>
      <Drawer.Panel label="Complete profile">
        <Drawer.Body>
          <Drawer.Title>Complete profile</Drawer.Title>
          <a href="#one">One</a>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>Done</Drawer.Close>
        </Drawer.Footer>
      </Drawer.Panel>
    </Drawer>
  );
}

/**
 * Drives a real pointer drag on the handle.
 *
 * Dispatched as PointerEvents rather than through userEvent because the
 * component's contract IS the pointer sequence — capture, move, release — and
 * a synthetic click would exercise none of it.
 */
async function drag(from: HTMLElement, dy: number, ms = 400) {
  const box = from.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const opts = { pointerId: 1, pointerType: "touch", bubbles: true, cancelable: true } as const;
  // timeStamp is NOT settable through the event init, and dispatching
  // synthetically puts every event within a millisecond of the last — which
  // made a leisurely 40px drag read as 40px/ms and dismissed the drawer. The
  // gesture's timing is half its meaning, so it is stamped explicitly.
  const t0 = performance.now();
  const send = (type: string, clientY: number, at: number) => {
    const ev = new PointerEvent(type, { ...opts, clientX: x, clientY });
    Object.defineProperty(ev, "timeStamp", { value: t0 + at });
    from.dispatchEvent(ev);
  };

  await act(async () => { send("pointerdown", y, 0); });
  // Two moves, not one: the first proves the panel tracks MID-gesture, which a
  // single jump to the end would skip straight past.
  await act(async () => { send("pointermove", y + dy / 2, ms / 2); });
  const mid = panel() ? getComputedStyle(panel()!).translate : "";
  await act(async () => {
    send("pointermove", y + dy, ms);
    send("pointerup", y + dy, ms);
  });
  return mid;
}

describe("Drawer is a dialog, and Base UI provides the behaviour", () => {
  test("nothing is rendered until it is opened", () => {
    mount(<Basic />);
    expect(panel()).toBeNull();
    expect(scrim()).toBeNull();
  });

  test("it is a named modal dialog with the page behind inert", async () => {
    const c = mount(
      <>
        <button type="button" id="behind">Behind</button>
        <Basic />
      </>,
    );
    await userEvent.click(trigger());
    await settled(panel()!);
    expect(panel()!.getAttribute("role")).toBe("dialog");
    expect(panel()!.getAttribute("aria-label")).toBe("Complete profile");
    const behind = c.querySelector<HTMLElement>("#behind")!;
    expect(behind.closest("[inert], [aria-hidden='true']")).not.toBeNull();
  });

  test("focus moves in on open and RETURNS to the trigger on close", async () => {
    mount(<Basic />);
    const t = trigger();
    await userEvent.click(t);
    await settled(panel()!);
    expect(panel()!.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard("{Escape}");
    await rest();
    expect(document.activeElement).toBe(t);
  });

  test("isDismissable={false} refuses Escape but NOT the close control", async () => {
    mount(<Basic isDismissable={false} />);
    await userEvent.click(trigger());
    await settled(panel()!);
    await userEvent.keyboard("{Escape}");
    await rest();
    expect(panel()).not.toBeNull();
    await userEvent.click(document.querySelector<HTMLElement>('[data-slot="drawer-close"]')!);
    await rest();
    expect(panel()).toBeNull();
  });
});

describe("Drawer comes from the bottom and is built to be grabbed", () => {
  test("it sits at the bottom, inset, with all four corners rounded", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    const style = getComputedStyle(p);
    const box = p.getBoundingClientRect();

    expect(style.position).toBe("fixed");
    // 4px (space-xs) off three edges: the sheet floats the panel inside its
    // window rather than sitting it flush, which is also why it keeps a border
    // where the edge-flush Sheet drops one.
    expect(Math.round(box.left)).toBe(4);
    expect(Math.round(window.innerHeight - box.bottom)).toBe(4);
    for (const corner of [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomLeftRadius,
      style.borderBottomRightRadius,
    ]) {
      expect(corner).toBe("16px");
    }
    // A cap, so a strip of scrim always shows above it — that strip is what
    // says the drawer can be pushed away.
    expect(box.height).toBeLessThanOrEqual(window.innerHeight * 0.8 + 1);
  });

  test("the handle is a real button covering the 32px band, not the 8px bar", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await settled(panel()!);
    const h = handle();
    expect(h.tagName).toBe("BUTTON");
    expect(h.getAttribute("aria-label")).toBe("Close");
    // SC 2.5.8: the bar alone is an 8px target. The band around it is 32.
    expect(Math.round(h.getBoundingClientRect().height)).toBe(32);

    const bar = document.querySelector<HTMLElement>('[data-slot="drawer-handle-bar"]')!;
    const barBox = bar.getBoundingClientRect();
    expect(Math.round(barBox.height)).toBe(8);
    // 30% of the panel, per the sheet.
    expect(barBox.width / panel()!.getBoundingClientRect().width).toBeCloseTo(0.3, 1);
  });

  test("the panel FOLLOWS the finger while dragging", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await settled(panel()!);
    // A short drag: below both thresholds, so it must snap back rather than
    // close — which is what makes the mid-drag reading meaningful.
    const mid = await drag(handle(), 40);
    // Asserted mid-gesture, because a panel that only moved on release would
    // pass every end-state assertion while feeling completely dead.
    expect(mid).not.toBe("none");
    expect(mid).toContain("20px");
    await rest();
    expect(panel()).not.toBeNull();
    expect(getComputedStyle(panel()!).translate).toBe("none");
  });

  test("a long drag DISMISSES it", async () => {
    const onOpenChange = vi.fn();
    mount(<Basic onOpenChange={onOpenChange} />);
    await userEvent.click(trigger());
    await settled(panel()!);
    await drag(handle(), 140);
    await rest();
    // 140 clears the 96px distance threshold on its own.
    expect(panel()).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("a SHORT, FAST flick dismisses it too", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await settled(panel()!);
    const h = handle();
    const box = h.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const opts = { pointerId: 1, pointerType: "touch", bubbles: true, cancelable: true } as const;
    // 60px — under the distance threshold — but delivered in 20ms, which is
    // 3px/ms. Distance alone would ignore the fastest gesture a user can make.
    await act(async () => {
      h.dispatchEvent(new PointerEvent("pointerdown", { ...opts, clientX: x, clientY: y }));
    });
    const down = performance.now();
    await act(async () => {
      const ev = new PointerEvent("pointerup", { ...opts, clientX: x, clientY: y + 60 });
      Object.defineProperty(ev, "timeStamp", { value: down + 20 });
      h.dispatchEvent(ev);
    });
    await rest();
    expect(panel()).toBeNull();
  });

  test("TAPPING the handle closes it — the alternative SC 2.5.7 requires", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await settled(panel()!);
    // A pointer user who cannot drag must still have a way out, and it has to
    // be the same control rather than a second one hidden elsewhere.
    await userEvent.click(handle());
    await rest();
    expect(panel()).toBeNull();
  });

  test("the handle is keyboard-operable, and does not trap a drag mid-flight", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await settled(panel()!);
    const h = handle();
    h.focus();
    await userEvent.keyboard("{Enter}");
    await rest();
    expect(panel()).toBeNull();
  });

  test("the entrance ACTUALLY animates the panel's position", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    const running = panel()!
      .getAnimations()
      .map((a) => (a as CSSTransition).transitionProperty);
    // v4's translate-* writes the standalone `translate` property; a transition
    // naming `transform` would cover nothing and the drawer would appear fully
    // open. Modal and Popover both shipped that defect.
    expect(running).toContain("translate");
  });

  test("the footer STACKS, unlike Modal's row", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await settled(panel()!);
    const footer = document.querySelector<HTMLElement>('[data-slot="drawer-footer"]')!;
    // A drawer is a thumb surface: a full-width target at the bottom of the
    // screen is the easiest thing on it to hit.
    expect(getComputedStyle(footer).flexDirection).toBe("column");
  });

  test("the title is FIXED at 16px, not a fluid role", async () => {
    mount(<Basic />);
    await userEvent.click(trigger());
    await settled(panel()!);
    const title = document.querySelector<HTMLElement>('[data-slot="drawer-title"]')!;
    // title-sm peaks at 16 too, but it is fluid — and a drawer is narrowest on
    // the phone, which is exactly where the sheet draws this at 16.
    expect(getComputedStyle(title).fontSize).toBe("16px");
    expect(getComputedStyle(title).fontWeight).toBe("600");
  });
});

describe("Drawer re-skins under a brand scope, when given somewhere to live", () => {
  const BRAND = { "--ui-bg-base": "rgb(255, 224, 102)" } as Record<string, string>;

  function Scoped({ withContainer }: { withContainer: boolean }) {
    const [scope, setScope] = useState<HTMLDivElement | null>(null);
    return (
      <div ref={setScope} style={BRAND as React.CSSProperties} id="scope">
        <Drawer>
          <Drawer.Trigger>Open</Drawer.Trigger>
          <Drawer.Panel label="Scoped" {...(withContainer ? { container: scope } : {})}>
            <Drawer.Body>Content</Drawer.Body>
          </Drawer.Panel>
        </Drawer>
      </div>
    );
  }

  test("WITHOUT container it leaves the scope and paints theme zero", async () => {
    mount(<Scoped withContainer={false} />);
    await userEvent.click(trigger());
    await settled(panel()!);
    expect(panel()!.closest("#scope")).toBeNull();
    expect(getComputedStyle(panel()!).backgroundColor).toBe("rgb(255, 255, 255)");
  });

  test("WITH container it inherits the brand", async () => {
    mount(<Scoped withContainer />);
    await userEvent.click(trigger());
    await settled(panel()!);
    expect(panel()!.closest("#scope")).not.toBeNull();
    expect(getComputedStyle(panel()!).backgroundColor).toBe("rgb(255, 224, 102)");
  });
});

describe("Detents: a drawer can rest at more than one height", () => {
  const Detented = (props: {
    snapPoints?: number[];
    defaultSnapPoint?: number;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <Drawer defaultIsOpen {...(props.onOpenChange ? { onOpenChange: props.onOpenChange } : {})}>
      <Drawer.Panel
        label="Complete profile"
        snapPoints={props.snapPoints ?? [0.5, 0.9]}
        {...(props.defaultSnapPoint !== undefined ? { defaultSnapPoint: props.defaultSnapPoint } : {})}
      >
        <p>Body</p>
      </Drawer.Panel>
    </Drawer>
  );

  test("the resting height is the detent, as a fraction of the viewport", () => {
    mount(<Detented />);
    const height = panel()!.getBoundingClientRect().height;
    // Asserted as a RELATIONSHIP to the viewport rather than a pixel count —
    // the number is meaningless without the window it is half of, and the
    // test viewport is not the one a person uses.
    expect(height / window.innerHeight).toBeCloseTo(0.5, 1);
    expect(panel()!.getAttribute("data-snap-point")).toBe("0");
  });

  test("a taller detent is taller — the fractions are not decorative", () => {
    mount(<Detented defaultSnapPoint={1} />);
    expect(panel()!.getBoundingClientRect().height / window.innerHeight).toBeCloseTo(0.9, 1);
  });

  test("dragging DOWN steps to the shorter detent instead of dismissing", async () => {
    const onOpenChange = vi.fn();
    mount(<Detented defaultSnapPoint={1} onOpenChange={onOpenChange} />);
    await drag(handle(), 60);
    // The whole point of the detent: a drawer at full height must not go
    // straight off the screen, or the state it exists to offer is skipped and
    // whatever is in the drawer is lost.
    expect(panel()!.getAttribute("data-snap-point")).toBe("0");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test("dragging DOWN from the shortest detent dismisses", async () => {
    const onOpenChange = vi.fn();
    mount(<Detented onOpenChange={onOpenChange} />);
    await drag(handle(), 60);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("dragging UP steps to the taller detent", async () => {
    mount(<Detented />);
    await drag(handle(), -60);
    expect(panel()!.getAttribute("data-snap-point")).toBe("1");
  });

  test("the panel tracks the finger UPWARD, which it refuses to do without detents", async () => {
    mount(<Detented />);
    const mid = await drag(handle(), -60);
    // Without a taller detent this is deliberately clamped at 0, because
    // rubber-banding up would promise an expansion that cannot happen.
    expect(mid).not.toBe("none");
    expect(mid).toContain("-");
  });

  test("SC 2.5.7: the tap reaches BOTH directions, by wrapping", async () => {
    mount(<Detented />);
    await userEvent.click(handle());
    expect(panel()!.getAttribute("data-snap-point")).toBe("1");
    // At the tallest it wraps back to the shortest, so a pointer user who
    // cannot drag can still collapse it. Without the wrap, "expand" would be
    // the only single-pointer move and 2.5.7 would be half-satisfied.
    await userEvent.click(handle());
    expect(panel()!.getAttribute("data-snap-point")).toBe("0");
  });

  test("the handle stops calling itself Close once it resizes", () => {
    mount(<Detented />);
    expect(handle().getAttribute("aria-label")).toBe("Resize drawer");
  });

  test("no snapPoints keeps the old drawer exactly", async () => {
    const onOpenChange = vi.fn();
    mount(
      <Drawer defaultIsOpen onOpenChange={onOpenChange}>
        <Drawer.Panel label="Complete profile"><p>Body</p></Drawer.Panel>
      </Drawer>,
    );
    expect(panel()!.getAttribute("data-snap-point")).toBeNull();
    expect(handle().getAttribute("aria-label")).toBe("Close");
    // A tap still closes when there is nowhere to step to.
    await userEvent.click(handle());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("an EMPTY snapPoints array falls back rather than rendering nothing", () => {
    mount(<Detented snapPoints={[]} />);
    // A caller computing this list can hand back an empty one, and honouring
    // it literally would mean a zero-height panel.
    expect(panel()!.getAttribute("data-snap-point")).toBeNull();
    expect(panel()!.getBoundingClientRect().height).toBeGreaterThan(0);
  });
});
