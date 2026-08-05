import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Slider } from "./slider.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = "400px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  return {
    thumb: container.querySelector<HTMLElement>('[data-slot="slider-thumb"]')!,
    track: container.querySelector<HTMLElement>('[data-slot="slider-track"]')!,
    fill: container.querySelector<HTMLElement>('[data-slot="slider-fill"]')!,
    control: container.querySelector<HTMLElement>('[data-slot="slider-control"]')!,
    container: container!,
  };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

/**
 * Base UI renders a native `input[type=range]` inside the thumb. It has the
 * IMPLICIT slider role rather than an explicit attribute, so `[role="slider"]`
 * finds nothing — the implicit role is the point of using a native control.
 */
const slider = () => document.querySelector('input[type="range"]') as HTMLInputElement;

describe("The behaviour layer carries the slider contract", () => {
  test("exposes role=slider with its value bounds and a name", () => {
    const { container: c } = mount(<Slider label="Logo size" defaultValue={62} />);
    const s = slider();
    expect(s.getAttribute("aria-valuenow")).toBe("62");
    expect(s.min).toBe("0");
    expect(s.max).toBe("100");
    const name = s.getAttribute("aria-labelledby");
    expect(c.querySelector(`#${CSS.escape(name!)}`)?.textContent).toContain("Logo size");
  });

  test("arrow keys step, Home and End jump — the part hand-rolling gets wrong", async () => {
    const onValueChange = vi.fn();
    mount(<Slider label="Logo size" defaultValue={50} onValueChange={onValueChange} />);
    const s = slider();
    s.focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(51);
    await userEvent.keyboard("{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith(50);

    await userEvent.keyboard("{Home}");
    expect(onValueChange).toHaveBeenLastCalledWith(0);
    await userEvent.keyboard("{End}");
    expect(onValueChange).toHaveBeenLastCalledWith(100);
  });

  test("step and bounds are honoured, and the callback reports a NUMBER", async () => {
    const onValueChange = vi.fn();
    mount(<Slider label="Rating" defaultValue={4} min={0} max={10} step={2} onValueChange={onValueChange} />);
    slider().focus();
    await userEvent.keyboard("{ArrowRight}");
    // Narrowed from Base UI's number | number[]: a one-thumb control should
    // never make a caller destructure an array.
    expect(onValueChange).toHaveBeenLastCalledWith(6);
    expect(typeof onValueChange.mock.calls[0]?.[0]).toBe("number");
  });

  test("disabled does not respond to the keyboard", async () => {
    const onValueChange = vi.fn();
    mount(<Slider label="Logo size" defaultValue={50} isDisabled onValueChange={onValueChange} />);
    slider().focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("Slider paints the designed control", () => {
  test.each([["lg", "20px"], ["sm", "8px"]] as const)("size %s is a %s track", (size, height) => {
    const { track } = mount(<Slider label="Logo size" defaultValue={62} size={size} />);
    expect(getComputedStyle(track).height).toBe(height);
  });

  test("the pointer target clears 24px even when the track is 8px", () => {
    const { control } = mount(<Slider label="Logo size" defaultValue={62} size="sm" />);
    // SC 2.5.8: the painted track is 8px, so the CONTROL is padded rather than
    // resized — the affordance stays thin while the target stays legal.
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  });

  test("fill and thumb use roles, and the thumb carries the ring that makes it legible", () => {
    const { fill, thumb, track } = mount(<Slider label="Logo size" defaultValue={62} />);
    expect(getComputedStyle(track).backgroundColor).toBe("rgb(237, 232, 227)");
    // The sheet drew --ui-blue-80 and --ui-neutral-100 directly.
    expect(getComputedStyle(fill).backgroundColor).toBe("rgb(81, 140, 162)");
    expect(getComputedStyle(thumb).backgroundColor).toBe("rgb(255, 255, 255)");
    // White on the pale accent is 1.5:1 alone; the 2px accent ring is what
    // keeps the thumb discernible (SC 1.4.11).
    expect(getComputedStyle(thumb).borderTopWidth).toBe("2px");
    expect(getComputedStyle(thumb).borderTopColor).toBe("rgb(81, 140, 162)");
  });

  test("the fill measures the value", () => {
    const { fill, track } = mount(<Slider label="Logo size" defaultValue={50} />);
    expect(fill.getBoundingClientRect().width).toBeCloseTo(
      track.getBoundingClientRect().width / 2, 0,
    );
  });
});
