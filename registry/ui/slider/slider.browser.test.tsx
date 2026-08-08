import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Slider } from "./slider.tsx";

/**
 * The resolved value of a token, so an assertion names the ROLE rather than a
 * copy of what it resolved to on the day it was written. This one is FLOORED
 * against several grounds, so it moves whenever a new pair is declared — and
 * four tests whose names all say "uses the role, not the palette step" each
 * failed the first time it did, on a hard-coded rgb().
 */
function tokenColor(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}


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
  test.each([["xl", "32px"], ["lg", "24px"], ["md", "16px"], ["sm", "8px"]] as const)(
    "size %s is a %s track",
    (size, height) => {
      const { track } = mount(<Slider label="Logo size" defaultValue={62} size={size} />);
      expect(getComputedStyle(track).height).toBe(height);
    },
  );

  test("the four sizes are strictly ordered, not merely different", () => {
    const heights = (["sm", "md", "lg", "xl"] as const).map((size) => {
      const { track } = mount(<Slider label="Logo size" defaultValue={62} size={size} />);
      const h = parseFloat(getComputedStyle(track).height);
      act(() => root?.unmount());
      container?.remove();
      return h;
    });
    // Badge shipped two sizes that were pixel-identical because nothing ever
    // compared them to each other.
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
    expect(new Set(heights).size).toBe(4);
  });

  test("xl squares off to match the 32px controls it shares a row with", () => {
    const xl = mount(<Slider label="Logo size" defaultValue={62} size="xl" />);
    const xlRadius = getComputedStyle(xl.track).borderRadius;
    act(() => root?.unmount());
    container?.remove();

    const lg = mount(<Slider label="Logo size" defaultValue={62} size="lg" />);
    // A pill beside a soft-cornered Select reads as a different family. The
    // radius difference is the sheet's, not an oversight.
    expect(xlRadius).toBe("8px");
    expect(parseFloat(getComputedStyle(lg.track).borderRadius)).toBeGreaterThan(100);
  });

  /**
   * Both halves, because satisfying one alone is how the first version was
   * wrong: a flat `py-sm` on every size cleared the target everywhere and made
   * three of the four rows 16px taller than the sheet draws them. Nothing in
   * the render gave it away — the 32px steppers centre inside whatever height
   * the row has, so an over-tall row still LOOKS aligned.
   */
  test.each([
    ["sm", 8, 24],
    ["md", 16, 24],
    ["lg", 24, 24],
    ["xl", 32, 32],
  ] as const)("size %s paints a %spx track in a %spx row", (size, trackPx, rowPx) => {
    const { control, track } = mount(<Slider label="Logo size" defaultValue={62} size={size} />);

    expect(parseFloat(getComputedStyle(track).height)).toBe(trackPx);
    // The row is the sheet's height, not the track plus a uniform pad.
    expect(control.getBoundingClientRect().height).toBe(rowPx);
    // ...and it is still a legal target (SC 2.5.8).
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  });

  /**
   * The handle is four SHAPES, not one scaled four ways — the sheet draws a
   * 16px circle at sm and md, a 24px circle at lg, and a 32x16 vertical pill
   * at xl that spans the bar. Shipped first as a 20px circle at xl, from
   * reading the sheet's placeholder frame instead of the handle itself.
   */
  test.each([
    ["sm", 16, 16],
    ["md", 16, 16],
    ["lg", 24, 24],
    ["xl", 16, 32],
  ] as const)("size %s has a %sx%s handle", (size, w, h) => {
    const { container: c } = mount(<Slider label="Logo size" defaultValue={62} size={size} />);
    const thumb = c.querySelector('[data-slot="slider-thumb"]')!.getBoundingClientRect();
    expect(thumb.width).toBe(w);
    expect(thumb.height).toBe(h);
  });

  test("the xl handle is a pill that fills the bar, not a dot on it", () => {
    const { track, container: c } = mount(
      <Slider label="Logo size" defaultValue={62} size="xl" />,
    );
    const thumb = c.querySelector('[data-slot="slider-thumb"]')!.getBoundingClientRect();
    // Taller than wide, and exactly the bar's height — the two facts that
    // separate a grip from a dot, and neither is visible in a class list.
    expect(thumb.height).toBeGreaterThan(thumb.width);
    expect(thumb.height).toBe(track.getBoundingClientRect().height);
  });

  /**
   * The fill and the handle have to read as ONE form.
   *
   * The fill ends at the thumb's centre, so a trailing radius curves away from
   * the thumb and leaves a crescent of bare track between them — a visible
   * notch at every value, and the thing that made the first version look
   * unlike the sheet. Squaring the trailing edge is the fix; what pins it is
   * the geometry, since a radius is easy to reintroduce by writing
   * `rounded-full` back onto the fill.
   */
  test.each(["sm", "md", "lg", "xl"] as const)(
    "at %s the fill runs under the handle with no trailing radius",
    (size) => {
      const { container: c } = mount(
        <Slider label="Logo size" defaultValue={62} size={size} />,
      );
      const fill = c.querySelector<HTMLElement>('[data-slot="slider-fill"]')!;
      const thumb = c.querySelector('[data-slot="slider-thumb"]')!.getBoundingClientRect();
      const style = getComputedStyle(fill);

      // Leading edge keeps the track's radius; trailing edge is square.
      expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThan(0);
      expect(style.borderTopRightRadius).toBe("0px");
      expect(style.borderBottomRightRadius).toBe("0px");

      // ...and the fill terminates UNDER the handle, so there is no bare
      // track between the two at any value.
      const right = fill.getBoundingClientRect().right;
      expect(right).toBeGreaterThanOrEqual(thumb.left - 0.5);
      expect(right).toBeLessThanOrEqual(thumb.right + 0.5);
    },
  );

  test("at xl the track and the steppers share a lane", () => {
    const { container: c } = mount(
      <Slider
        label="Logo size"
        defaultValue={62}
        size="xl"
        hasSteppers
        decrementLabel="Smaller"
        incrementLabel="Larger"
      />,
    );
    const track = c.querySelector('[data-slot="slider-track"]')!.getBoundingClientRect();
    const dec = c.querySelector('[data-slot="slider-decrement"]')!.getBoundingClientRect();

    // The whole point of xl: everything in the row is 32px and lines up.
    expect(track.height).toBe(32);
    expect(dec.height).toBe(32);
    expect(dec.top).toBeCloseTo(track.top, 1);
    expect(dec.bottom).toBeCloseTo(track.bottom, 1);
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
    // The fill is a GRADIENT now, so backgroundColor is transparent and the
    // paint lives in backgroundImage. Asserting the colour would have read
    // "rgba(0, 0, 0, 0)" and looked like a missing fill.
    expect(getComputedStyle(fill).backgroundImage).toContain("gradient");
    // The sheet's own stops, preserved: blue-80 into blue-70. They are pale
    // against the track (1.24:1 and 1.80:1 in light) BY DESIGN — the thumb's
    // ring is what identifies the control, and it is asserted below.
    expect(getComputedStyle(fill).backgroundImage).toContain("rgb(158, 219, 243)");
    expect(getComputedStyle(fill).backgroundImage).toContain("rgb(121, 184, 211)");
    expect(getComputedStyle(thumb).backgroundColor).toBe("rgb(255, 255, 255)");
    // White on the pale accent is 1.5:1 alone; the 2px accent ring is what
    // keeps the thumb discernible (SC 1.4.11).
    expect(getComputedStyle(thumb).borderTopWidth).toBe("2px");
    expect(getComputedStyle(thumb).borderTopColor).toBe(tokenColor("--ui-bg-accent-legible"));
  });

  test("the fill measures the value", () => {
    const { fill, track } = mount(<Slider label="Logo size" defaultValue={50} />);
    expect(fill.getBoundingClientRect().width).toBeCloseTo(
      track.getBoundingClientRect().width / 2, 0,
    );
  });
});
