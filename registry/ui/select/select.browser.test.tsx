import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Input } from "@/ui/input/input.tsx";
import { Select, type SelectItem } from "./select.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return container;
}

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

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

const ITEMS: SelectItem[] = [
  { value: "design", label: "Design" },
  { value: "brand", label: "Brand strategy" },
  { value: "build", label: "Build", isDisabled: true },
  { value: "research", label: "Research" },
];

const trigger = () => document.querySelector<HTMLElement>('[data-slot="select-trigger"]')!;
const panel = () => document.querySelector<HTMLElement>('[data-slot="select-panel"]');
const options = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="select-option"]'));

describe("Select is a named listbox, and Base UI provides the behaviour", () => {
  test("the trigger is named by the LABEL, not by the placeholder", () => {
    const c = mount(<Select label="Services" items={ITEMS} />);
    const labelledBy = trigger().getAttribute("aria-labelledby")!;
    // A placeholder vanishes the moment a value is chosen, taking the field's
    // name with it — which is why `label` is required (§10).
    expect(c.querySelector(`#${CSS.escape(labelledBy)}`)?.textContent).toBe("Services");
  });

  test("nothing is rendered until it is opened", () => {
    mount(<Select label="Services" items={ITEMS} />);
    expect(panel()).toBeNull();
  });

  test("opening reveals one option per item, with the disabled one marked", async () => {
    mount(<Select label="Services" items={ITEMS} />);
    await userEvent.click(trigger());
    await settled(panel()!);
    expect(options()).toHaveLength(4);
    const build = options().find((o) => o.textContent?.includes("Build"))!;
    expect(build.getAttribute("data-disabled")).not.toBeNull();
  });

  test("choosing an option reports the VALUE, not the label", async () => {
    const onValueChange = vi.fn();
    mount(<Select label="Services" items={ITEMS} onValueChange={onValueChange} />);
    await userEvent.click(trigger());
    await settled(panel()!);
    await userEvent.click(options().find((o) => o.textContent?.includes("Brand strategy"))!);
    // The label is for people; the value is for the form. Reporting the label
    // would make every consumer map it back.
    expect(onValueChange).toHaveBeenCalledWith("brand");
    expect(trigger().textContent).toContain("Brand strategy");
  });

  test("the keyboard opens it and Escape closes it, restoring focus", async () => {
    mount(<Select label="Services" items={ITEMS} />);
    const t = trigger();
    t.focus();
    await userEvent.keyboard("{Enter}");
    await settled(panel()!);
    expect(panel()).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    await new Promise((r) => setTimeout(r, 250));
    // Focus falling to <body> after a dismiss is the classic hand-rolled
    // listbox failure.
    expect(document.activeElement).toBe(t);
  });

  test("errorText marks the field invalid and is announced", () => {
    const c = mount(<Select label="Services" items={ITEMS} errorText="Choose a service" />);
    expect(trigger().getAttribute("aria-invalid")).toBe("true");
    const describedBy = trigger().getAttribute("aria-describedby")!;
    expect(c.querySelector(`#${CSS.escape(describedBy)}`)?.textContent).toBe("Choose a service");
  });
});

describe("Select's trigger IS Input's control surface", () => {
  test("every size matches Input's geometry exactly", () => {
    for (const size of ["lg", "md", "sm"] as const) {
      const c = mount(
        <>
          <Select label="Services" size={size} items={ITEMS} />
          <Input label="Company" size={size} />
        </>,
      );
      const a = getComputedStyle(trigger());
      const b = getComputedStyle(c.querySelector<HTMLElement>('[data-slot="control"]')!);
      // Asserted as a RELATIONSHIP, never as numbers. `48px` on each would
      // pass while the two silently drifted apart, and drifting apart is the
      // only failure that matters — the claim is that a field is a field.
      expect(a.height, `${size} height`).toBe(b.height);
      expect(a.borderRadius, `${size} radius`).toBe(b.borderRadius);
      expect(a.borderTopWidth, `${size} border`).toBe(b.borderTopWidth);
      expect(a.borderTopColor, `${size} edge colour`).toBe(b.borderTopColor);
      expect(a.backgroundColor, `${size} fill`).toBe(b.backgroundColor);
      expect(a.paddingLeft, `${size} inset`).toBe(b.paddingLeft);
      act(() => root?.unmount());
      container?.remove();
      root = null; container = null;
    }
  });

  test("the focus ring is PAINTED, with the forced-colors fallback", async () => {
    mount(<Select label="Services" items={ITEMS} />);
    const t = trigger();
    expect(getComputedStyle(t).boxShadow).toBe("none");
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(t);
    await settled(t);
    expect(getComputedStyle(t).boxShadow).not.toBe("none");
  });
});

describe("Select's panel is the system's panel", () => {
  test("it carries the drawn surface and clips its own scroll", async () => {
    mount(<Select label="Services" items={ITEMS} />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    const style = getComputedStyle(p);
    // radius-md, as the sheet draws it (GVG-0). It shipped at radius-lg over a
    // 4px inset, which is what made the menu read as un-concentric.
    expect(style.borderRadius).toBe("8px");
    expect(style.backgroundColor).toBe("rgb(253, 252, 251)");
    // A long list scrolls inside the panel rather than pushing the page.
    expect(style.overflowY).toBe("auto");
  });

  test("the panel is CONCENTRIC with its rows — asserted as arithmetic", async () => {
    // §6 is an equation, so assert the equation rather than three numbers.
    // Pinning `8px`, `4px`, `4px` separately would pass while someone changed
    // all three consistently-but-wrongly, and would have to be rewritten by
    // hand every time the design moves — which is exactly the edit where a
    // person "fixes" the expectation to match the code and loses the rule.
    mount(<Select label="Services" items={ITEMS} defaultValue="design" />);
    await userEvent.click(trigger());
    const p = panel()!;
    await settled(p);
    const panelStyle = getComputedStyle(p);
    const rowStyle = getComputedStyle(options()[0]!);

    const outer = Number.parseFloat(panelStyle.borderTopLeftRadius);
    const inner = Number.parseFloat(rowStyle.borderTopLeftRadius);
    const inset = Number.parseFloat(panelStyle.paddingTop);
    expect(outer, `outer ${outer} ≠ inner ${inner} + inset ${inset}`).toBe(inner + inset);

    // And the inset really is uniform, or the equation only holds on one edge.
    expect(panelStyle.paddingBottom).toBe(panelStyle.paddingTop);
    expect(panelStyle.paddingLeft).toBe(panelStyle.paddingTop);
    expect(panelStyle.paddingRight).toBe(panelStyle.paddingTop);
  });

  test("selection is shown by a TICK and a weight, not by fill alone", async () => {
    mount(<Select label="Services" items={ITEMS} defaultValue="design" />);
    await userEvent.click(trigger());
    await settled(panel()!);
    const chosen = options().find((o) => o.textContent?.includes("Design"))!;
    const other = options().find((o) => o.textContent?.includes("Research"))!;
    // The highlighted row already owns a fill, so selection cannot also be a
    // fill — that would be two states competing for one channel, and colour
    // alone is WCAG 1.4.1 regardless.
    expect(chosen.querySelector('[data-slot="select-indicator"]')).not.toBeNull();
    expect(other.querySelector('[data-slot="select-indicator"]')).toBeNull();
    expect(Number(getComputedStyle(chosen).fontWeight)).toBeGreaterThan(
      Number(getComputedStyle(other).fontWeight),
    );
  });

  test("it opens BELOW the trigger, not over it — from a mouse", async () => {
    // Base UI's `alignItemWithTrigger` defaults to true: the panel overlaps
    // the trigger so the selected row lands on the trigger's value, iOS
    // style. It also swallows sideOffset while doing so.
    //
    // Opened with a real CLICK deliberately. The prop "only applies to mouse
    // input", so a keyboard-driven open positions correctly either way and
    // proves nothing — this test passes for free on the wrong code if you
    // reach for {Enter}.
    mount(<Select label="Services" items={ITEMS} defaultValue="brand" />);
    const t = trigger();
    await userEvent.click(t);
    const p = panel()!;
    await settled(p);
    const above = t.getBoundingClientRect();
    const below = p.getBoundingClientRect();
    // A relationship, not coordinates: the panel starts after the field ends.
    expect(below.top).toBeGreaterThanOrEqual(above.bottom);
    // And the offset is real rather than absorbed by the positioning mode.
    expect(below.top - above.bottom).toBeCloseTo(8, 0);
  });

  test("the enter transition ACTUALLY runs on scale", async () => {
    mount(<Select label="Services" items={ITEMS} />);
    await userEvent.click(trigger());
    // v4's scale-* writes the standalone property; a list naming `transform`
    // covers nothing, which is how Modal and Popover shipped a dead entrance.
    //
    // POLLED, not sampled once: Base UI writes an inline `transition: none`
    // for the first frame of an open, so a single sample taken there finds no
    // animations and reads as a dead transition on working code. That is what
    // made this test flake on main.
    await expect
      .poll(() => panel()!.getAnimations().map((a) => (a as CSSTransition).transitionProperty))
      .toContain("scale");
  });
});
