import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { RangeSlider, type RangeSliderProps } from "./range-slider.tsx";
import { Slider } from "../slider/slider.tsx";

function tokenColor(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function tokenShadow(name: string): string {
  const probe = document.createElement("div");
  probe.style.boxShadow = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).boxShadow;
  probe.remove();
  return value;
}

/** Tailwind adds four transparent ring layers to every box-shadow; compare what paints. */
function painted(boxShadow: string): string {
  return boxShadow
    .split(/,(?![^(]*\))/)
    .map((layer) => layer.trim())
    .filter((layer) => !layer.startsWith("rgba(0, 0, 0, 0)"))
    .join(", ");
}

/**
 * Tab until the element is focused, by REAL key presses (programmatic focus
 * does not set :focus-visible). A fixed count of Tabs asserts against
 * whatever happens to be next — and Chromium keeps the sequential-focus
 * starting point where the previous test's removed input was.
 */
async function tabTo(target: Element) {
  for (let i = 0; i < 8 && document.activeElement !== target; i++) await userEvent.tab();
  expect(document.activeElement).toBe(target);
}

async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = "400px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  const c = container;
  return {
    container: c,
    control: c.querySelector<HTMLElement>('[data-slot="slider-control"]')!,
    track: c.querySelector<HTMLElement>('[data-slot="slider-track"]')!,
    fill: c.querySelector<HTMLElement>('[data-slot="slider-fill"]')!,
    thumbs: Array.from(c.querySelectorAll<HTMLElement>('[data-slot="slider-thumb"]')),
    inputs: Array.from(c.querySelectorAll<HTMLInputElement>('input[type="range"]')),
  };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
}

/**
 * Park the pointer off every mount. A hover test leaves the mouse where the
 * next test mounts its slider, and the next test then reads its "rest" state
 * mid-hover.
 */
afterEach(async () => {
  unmount();
  await userEvent.hover(document.documentElement, { position: { x: 1, y: 1 } });
});

const years = (extra: Partial<RangeSliderProps> = {}) =>
  mount(
    <RangeSlider
      label="Active years"
      startThumbLabel="Earliest year"
      endThumbLabel="Latest year"
      min={1800}
      max={2000}
      defaultValue={[1925, 1972]}
      formatValue={String}
      {...extra}
    />,
  );

describe("Two named thumbs, one group", () => {
  test("each thumb is its own input with its OWN name", () => {
    const { inputs, container: c } = years();
    expect(inputs).toHaveLength(2);
    expect(inputs.map((i) => i.getAttribute("aria-label"))).toEqual(["Earliest year", "Latest year"]);
    // aria-labelledby would OUTRANK aria-label and name both thumbs "Active
    // years" — the "slider, slider" problem with extra words.
    for (const i of inputs) expect(i.hasAttribute("aria-labelledby")).toBe(false);
    // ...while the group is still named by the visible label.
    const group = c.querySelector("[aria-labelledby]")!;
    const id = group.getAttribute("aria-labelledby")!;
    expect(c.querySelector(`#${CSS.escape(id)}`)?.textContent).toBe("Active years");
  });

  test("each thumb announces its own end", () => {
    const { inputs } = years();
    expect(inputs.map((i) => i.getAttribute("aria-valuenow"))).toEqual(["1925", "1972"]);
    expect(inputs.map((i) => i.getAttribute("aria-valuetext"))).toEqual(["1925", "1972"]);
  });

  test("onValueChange reports a PAIR, in order", async () => {
    const onValueChange = vi.fn();
    const { inputs } = years({ onValueChange });
    inputs[1]!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith([1925, 1973]);
  });

  test("Tab moves start, then end", async () => {
    const { inputs } = years();
    await tabTo(inputs[0]!);
    // From the start thumb, ONE Tab reaches the end thumb: that is the order.
    await userEvent.tab();
    expect(document.activeElement).toBe(inputs[1]);
  });
});

describe("The thumbs may meet but never cross", () => {
  test("the start thumb stops AT the end thumb under the keyboard", async () => {
    const onValueChange = vi.fn();
    const { inputs } = years({ defaultValue: [1950, 1953], onValueChange });
    inputs[0]!.focus();
    for (let i = 0; i < 6; i++) await userEvent.keyboard("{ArrowRight}");
    const [start, end] = onValueChange.mock.lastCall![0] as [number, number];
    expect(start).toBeLessThanOrEqual(end);
    // The end thumb was not PUSHED — the value the user was not touching
    // does not move.
    expect(end).toBe(1953);
  });

  /**
   * The keyboard test above cannot see the collision rule: Base UI clamps a
   * key press at the neighbour whatever the rule is, so it passed with `push`
   * too (probed). Only a pointer drag reaches `thumbCollisionBehavior`.
   */
  test("a DRAGGED thumb stops at the other one instead of pushing it", async () => {
    const onValueChange = vi.fn();
    const { thumbs, control, track } = years({ onValueChange });
    const t = track.getBoundingClientRect();
    const c = control.getBoundingClientRect();
    await userEvent.dragAndDrop(thumbs[0]!, control, {
      targetPosition: { x: t.left - c.left + t.width * 0.95, y: c.height / 2 },
    });
    const [start, end] = onValueChange.mock.lastCall![0] as [number, number];
    expect(end).toBe(1972);
    expect(start).toBeLessThanOrEqual(end);
  });

  test("minStepsBetweenValues keeps them apart", async () => {
    const onValueChange = vi.fn();
    const { inputs } = years({ defaultValue: [1950, 1960], minStepsBetweenValues: 5, onValueChange });
    inputs[0]!.focus();
    for (let i = 0; i < 10; i++) await userEvent.keyboard("{ArrowRight}");
    const [start, end] = onValueChange.mock.lastCall![0] as [number, number];
    expect(end - start).toBeGreaterThanOrEqual(5);
  });

  test("a press on the bare track moves the NEAREST thumb", async () => {
    const onValueChange = vi.fn();
    const { control, track, inputs } = years({ onValueChange });
    const t = track.getBoundingClientRect();
    const c = control.getBoundingClientRect();
    // Year 1990 — far past the end thumb, so the end is nearest.
    await userEvent.click(control, { position: { x: t.left - c.left + t.width * 0.95, y: c.height / 2 } });
    expect(inputs[0]!.getAttribute("aria-valuenow")).toBe("1925");
    expect(Number(inputs[1]!.getAttribute("aria-valuenow"))).toBeGreaterThan(1972);
  });
});

describe("The readout", () => {
  test("states both ends with a spaced en dash", () => {
    const { container: c } = years();
    expect(c.querySelector('[data-slot="slider-value"]')!.textContent).toBe("1925 – 1972");
  });

  test("collapses equal ends to one number", () => {
    const { container: c } = years({ defaultValue: [1950, 1950] });
    expect(c.querySelector('[data-slot="slider-value"]')!.textContent).toBe("1950");
  });

  test("is on by default — and uses tabular figures", () => {
    const { container: c } = mount(
      <RangeSlider label="Price" startThumbLabel="Minimum price" endThumbLabel="Maximum price" />,
    );
    const value = c.querySelector('[data-slot="slider-value"]')!;
    expect(value).not.toBeNull();
    expect(getComputedStyle(value).fontVariantNumeric).toBe("tabular-nums");
  });
});

describe("Everything visible is Slider's", () => {
  /**
   * Asserted as a RELATIONSHIP. Pinning 16px on each would pass while the two
   * components drifted apart, which is the only failure that matters: they
   * read their geometry from one table today, and this is what keeps it so.
   */
  test.each(["sm", "md", "lg", "xl"] as const)("at %s the control, track and thumb match Slider's", (size) => {
    const range = mount(
      <RangeSlider label="Range" isLabelHidden startThumbLabel="a" endThumbLabel="b" size={size} defaultValue={[20, 80]} />,
    );
    const r = {
      control: range.control.getBoundingClientRect().height,
      track: range.track.getBoundingClientRect().height,
      thumb: range.thumbs[0]!.getBoundingClientRect(),
      radius: getComputedStyle(range.track).borderRadius,
      ring: getComputedStyle(range.thumbs[0]!).borderTopColor,
    };
    unmount();

    const one = mount(<Slider label="One" isLabelHidden size={size} defaultValue={20} />);
    expect(r.control).toBe(one.control.getBoundingClientRect().height);
    expect(r.track).toBe(one.track.getBoundingClientRect().height);
    const t = one.thumbs[0]!.getBoundingClientRect();
    expect([r.thumb.width, r.thumb.height]).toEqual([t.width, t.height]);
    expect(r.radius).toBe(getComputedStyle(one.track).borderRadius);
    expect(r.ring).toBe(getComputedStyle(one.thumbs[0]!).borderTopColor);
  });

  test("the fill is the span between the thumbs' centres, FLAT accent", () => {
    const { fill, thumbs } = years();
    const f = fill.getBoundingClientRect();
    const a = thumbs[0]!.getBoundingClientRect();
    const b = thumbs[1]!.getBoundingClientRect();
    expect(f.left).toBeCloseTo(a.left + a.width / 2, 0);
    expect(f.right).toBeCloseTo(b.left + b.width / 2, 0);
    expect(getComputedStyle(fill).backgroundColor).toBe(tokenColor("--ui-bg-accent"));
    expect(getComputedStyle(fill).backgroundImage).toBe("none");
  });

  test("at the full range both thumbs' outer edges sit on the control's edges", () => {
    const { control, thumbs } = years({ defaultValue: [1800, 2000] });
    const c = control.getBoundingClientRect();
    expect(thumbs[0]!.getBoundingClientRect().left).toBeCloseTo(c.left, 0);
    expect(thumbs[1]!.getBoundingClientRect().right).toBeCloseTo(c.right, 0);
  });

  test("keyboard focus rings only the focused thumb", async () => {
    const { thumbs, inputs } = years();
    await tabTo(inputs[0]!);
    await settled(thumbs[0]!);
    const focus = tokenColor("--ui-focus-ring-color");
    expect(getComputedStyle(thumbs[0]!).boxShadow).toContain(focus);
    expect(getComputedStyle(thumbs[1]!).boxShadow).not.toContain(focus);
  });

  test("hovering a thumb lifts THAT thumb, not both", async () => {
    const { thumbs } = years();
    await userEvent.hover(thumbs[1]!);
    await settled(thumbs[0]!);
    await settled(thumbs[1]!);
    expect(painted(getComputedStyle(thumbs[1]!).boxShadow)).toBe(tokenShadow("--ui-shadow-md"));
    expect(painted(getComputedStyle(thumbs[0]!).boxShadow)).toBe(tokenShadow("--ui-shadow-sm"));
  });

  test("disabled: no response, disabled ink, subtle rings", async () => {
    const onValueChange = vi.fn();
    const { inputs, thumbs, container: c } = years({ isDisabled: true, onValueChange });
    inputs[0]!.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(getComputedStyle(c.querySelector('[data-slot="slider-value"]')!).color).toBe(tokenColor("--ui-text-disabled"));
    for (const t of thumbs) expect(getComputedStyle(t).borderTopColor).toBe(tokenColor("--ui-border-subtle"));
  });
});
