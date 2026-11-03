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

afterEach(async () => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
  // Park the pointer off every mount: a hover test leaves the mouse where the
  // next test mounts its slider, which then reads its "rest" state mid-hover.
  await userEvent.hover(document.documentElement, { position: { x: 1, y: 1 } });
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

  test("getAriaValueText becomes aria-valuetext on the INPUT, and follows the value (#25)", async () => {
    // Five 0-100 sliders between named poles announced "Formality, 70",
    // which means nothing without the poles. The text belongs on the input:
    // that is the element with the slider role, so a valuetext on the thumb
    // div or the group would be announced by nothing.
    const poles = vi.fn((v: number) => (v >= 60 ? "Mostly formal" : v <= 40 ? "Mostly casual" : "Balanced"));
    mount(<Slider label="Formality" defaultValue={70} getAriaValueText={poles} />);
    const s = slider();
    expect(s.getAttribute("aria-valuetext")).toBe("Mostly formal");
    expect(s.getAttribute("aria-valuenow")).toBe("70");

    s.focus();
    await userEvent.keyboard("{Home}");
    await expect.poll(() => s.getAttribute("aria-valuetext")).toBe("Mostly casual");
    await userEvent.keyboard("{End}");
    await expect.poll(() => s.getAttribute("aria-valuetext")).toBe("Mostly formal");
    // Called with the NUMBER alone — not Base UI's (formattedValue, value,
    // index), whose first argument is a locale-formatted STRING.
    expect(poles.mock.calls.every((call) => call.length === 1 && typeof call[0] === "number")).toBe(true);
  });

  test("without getAriaValueText the value is not dressed up", () => {
    mount(<Slider label="Logo size" defaultValue={62} />);
    // Base UI's default is the formatted number; nothing invented on top.
    const text = slider().getAttribute("aria-valuetext");
    expect(text === null || text === "62").toBe(true);
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

// ── The revision (Paper: Component --- Slider --- Revision) ────────────────

/** A shadow role, resolved, so an assertion names the role rather than a copy. */
function tokenShadow(name: string): string {
  const probe = document.createElement("div");
  probe.style.boxShadow = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).boxShadow;
  probe.remove();
  return value;
}

/**
 * The layers that paint. Tailwind composes every box-shadow with four ring
 * layers that are transparent when unused, so a computed shadow is never the
 * bare token value — compare what is actually drawn.
 */
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

/** A read straight after a state change returns the value being transitioned FROM. */
async function settled(element: Element) {
  await Promise.all(element.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

describe("The thumb's states are painted, not just declared", () => {
  /**
   * Base UI focuses the native input INSIDE the thumb, never the thumb div,
   * so the ring was written as `focus-visible:` on the div and never matched
   * anything. Every gate was green: the class resolved, the token existed,
   * and no test had ever focused the slider and looked.
   */
  test("keyboard focus paints the focus ring on the thumb", async () => {
    const { thumb } = mount(<Slider label="Logo size" defaultValue={62} />);
    await tabTo(slider());
    await settled(thumb);
    expect(getComputedStyle(thumb).boxShadow).toContain(tokenColor("--ui-focus-ring-color"));
  });

  test("hovering anywhere on the control lifts the thumb to --ui-shadow-md", async () => {
    const { thumb, control } = mount(<Slider label="Logo size" defaultValue={62} />);
    await settled(thumb);
    const rest = painted(getComputedStyle(thumb).boxShadow);
    expect(rest).toBe(tokenShadow("--ui-shadow-sm"));

    // The far end of the control, nowhere near the thumb: a press there moves
    // the thumb, so hovering there is what the lift answers.
    await userEvent.hover(control, { position: { x: 4, y: 12 } });
    await settled(thumb);
    expect(painted(getComputedStyle(thumb).boxShadow)).toBe(tokenShadow("--ui-shadow-md"));
    expect(painted(getComputedStyle(thumb).boxShadow)).not.toBe(rest);
  });

  test("focused and hovered at once shows the ring, never the lift", async () => {
    const { thumb, control } = mount(<Slider label="Logo size" defaultValue={62} />);
    await tabTo(slider());
    await userEvent.hover(control);
    await settled(thumb);
    // Exclusive by construction: two box-shadow utilities under different
    // modifiers are not a conflict tailwind-merge can see.
    expect(getComputedStyle(thumb).boxShadow).toContain(tokenColor("--ui-focus-ring-color"));
  });

  test("disabled: the ring drops to --ui-border-subtle, no shadow, disabled ink", () => {
    const { thumb, container: c } = mount(
      <Slider label="Logo size" defaultValue={62} isDisabled hasValueText />,
    );
    // A div has no :disabled — `disabled:` on the thumb never matched either.
    expect(getComputedStyle(thumb).borderTopColor).toBe(tokenColor("--ui-border-subtle"));
    // `shadow-none` computes as five TRANSPARENT layers, not the keyword —
    // so assert what is painted: nothing.
    expect(painted(getComputedStyle(thumb).boxShadow)).toBe("");
    const label = c.querySelector('[data-slot="slider-label"]')!;
    const value = c.querySelector('[data-slot="slider-value"]')!;
    expect(getComputedStyle(label).color).toBe(tokenColor("--ui-text-disabled"));
    expect(getComputedStyle(value).color).toBe(tokenColor("--ui-text-disabled"));
  });

  test("the value uses tabular figures, so it does not shimmer under a drag", () => {
    const { container: c } = mount(<Slider label="Logo size" defaultValue={62} hasValueText />);
    const value = c.querySelector('[data-slot="slider-value"]')!;
    expect(getComputedStyle(value).fontVariantNumeric).toBe("tabular-nums");
  });
});

describe("Steppers step from where the thumb is", () => {
  test("an UNCONTROLLED slider keeps stepping (was knownGaps: it stepped once)", async () => {
    const onValueChange = vi.fn();
    const { container: c } = mount(
      <Slider
        label="Logo size"
        defaultValue={62}
        hasSteppers
        decrementLabel="Smaller"
        incrementLabel="Larger"
        onValueChange={onValueChange}
      />,
    );
    const inc = c.querySelector<HTMLButtonElement>('[data-slot="slider-increment"]')!;
    await userEvent.click(inc);
    await userEvent.click(inc);
    await userEvent.click(inc);
    expect(onValueChange).toHaveBeenLastCalledWith(65);
    expect(slider().getAttribute("aria-valuenow")).toBe("65");
  });

  test("the decrement disables at the minimum", () => {
    const { container: c } = mount(
      <Slider label="Logo size" defaultValue={0} hasSteppers decrementLabel="Smaller" incrementLabel="Larger" />,
    );
    expect(c.querySelector<HTMLButtonElement>('[data-slot="slider-decrement"]')!.disabled).toBe(true);
    expect(c.querySelector<HTMLButtonElement>('[data-slot="slider-increment"]')!.disabled).toBe(false);
  });
});

describe("formatValue: what is seen is what is heard", () => {
  test("drives the visible value AND aria-valuetext", () => {
    const { container: c } = mount(
      <Slider label="Dot size" defaultValue={12} hasValueText formatValue={(v) => `${v} px`} />,
    );
    expect(c.querySelector('[data-slot="slider-value"]')!.textContent).toBe("12 px");
    expect(slider().getAttribute("aria-valuetext")).toBe("12 px");
  });

  test("getAriaValueText overrides the ANNOUNCEMENT only", () => {
    const { container: c } = mount(
      <Slider
        label="Dot size"
        defaultValue={12}
        hasValueText
        formatValue={(v) => `${v} px`}
        getAriaValueText={(v) => `${v} pixels`}
      />,
    );
    expect(c.querySelector('[data-slot="slider-value"]')!.textContent).toBe("12 px");
    expect(slider().getAttribute("aria-valuetext")).toBe("12 pixels");
  });
});

// ── Balance (Paper: Component --- Slider --- Variants · 06) ────────────────

const formality = (v: number) =>
  v >= 80 ? "Formal" : v >= 60 ? "Mostly formal" : v > 40 ? "Balanced" : v > 20 ? "Mostly casual" : "Casual";

function balance(value: number, extra: Partial<Parameters<typeof Slider>[0]> = {}) {
  return mount(
    <Slider
      label="Formality"
      defaultValue={value}
      origin={50}
      startLabel="Casual"
      endLabel="Formal"
      hasValueText
      formatValue={formality}
      {...(extra as object)}
    />,
  );
}

describe("Balance: the fill grows from the origin", () => {
  test("above the origin the fill runs from the origin to the thumb", () => {
    const { track, fill, thumb } = balance(70);
    const t = track.getBoundingClientRect();
    const f = fill.getBoundingClientRect();
    const th = thumb.getBoundingClientRect();
    expect(f.left).toBeCloseTo(t.left + t.width * 0.5, 0);
    expect(f.right).toBeCloseTo(th.left + th.width / 2, 0);
    expect(getComputedStyle(fill).scale).toBe("none");
  });

  test("below the origin the same ramp is MIRRORED, so it deepens toward the thumb", () => {
    const { track, fill, thumb } = balance(30);
    const t = track.getBoundingClientRect();
    const f = fill.getBoundingClientRect();
    const th = thumb.getBoundingClientRect();
    expect(f.right).toBeCloseTo(t.left + t.width * 0.5, 0);
    expect(f.left).toBeCloseTo(th.left + th.width / 2, 0);
    expect(getComputedStyle(fill).scale).toBe("-1 1");
  });

  test("at the origin there is no fill, and the mark shows above and below the thumb", () => {
    const { fill, thumb, container: c } = balance(50);
    expect(fill.getBoundingClientRect().width).toBe(0);
    const mark = c.querySelector('[data-slot="slider-origin"]')!.getBoundingClientRect();
    const th = thumb.getBoundingClientRect();
    expect(mark.width).toBe(2);
    // The track (16) plus space-xs above and below: 24, taller than the thumb.
    expect(mark.height).toBe(24);
    expect(mark.top).toBeLessThan(th.top);
    expect(mark.bottom).toBeGreaterThan(th.bottom);
  });

  test("the pole the value leans toward lifts to the primary ink; both muted at the origin", () => {
    const poles = (c: HTMLElement) => ({
      start: getComputedStyle(c.querySelector('[data-slot="slider-pole-start"]')!).color,
      end: getComputedStyle(c.querySelector('[data-slot="slider-pole-end"]')!).color,
    });
    const primary = tokenColor("--ui-text-primary");
    const muted = tokenColor("--ui-text-muted");

    let { container: c } = balance(70);
    expect(poles(c)).toEqual({ start: muted, end: primary });
    act(() => root?.unmount()); container?.remove();

    ({ container: c } = balance(30));
    expect(poles(c)).toEqual({ start: primary, end: muted });
    act(() => root?.unmount()); container?.remove();

    ({ container: c } = balance(50));
    expect(poles(c)).toEqual({ start: muted, end: muted });
  });

  test("the descriptor is shown AND announced — never the bare number", () => {
    const { container: c } = balance(70);
    expect(c.querySelector('[data-slot="slider-value"]')!.textContent).toBe("Mostly formal");
    expect(slider().getAttribute("aria-valuetext")).toBe("Mostly formal");
    expect(slider().getAttribute("aria-valuenow")).toBe("70");
  });

  test("a pointer released within one step of the origin lands ON it", async () => {
    const onValueChange = vi.fn();
    const { control, track } = balance(80, { step: 5, onValueChange });
    const t = track.getBoundingClientRect();
    const c = control.getBoundingClientRect();
    // 54% of the track: 54 snaps to the 5-step grid at 55, one step from 50.
    await userEvent.click(control, { position: { x: t.left - c.left + t.width * 0.54, y: c.height / 2 } });
    await expect.poll(() => slider().getAttribute("aria-valuenow")).toBe("50");
    expect(onValueChange).toHaveBeenLastCalledWith(50);
  });

  test("the keyboard is NOT snapped: one step from the origin stays one step away", async () => {
    balance(50, { step: 5 });
    slider().focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(slider().getAttribute("aria-valuenow")).toBe("55");
  });
});

// ── Inline (Paper: Component --- Slider --- Variants · 05) ─────────────────

function inline(extra: Partial<Parameters<typeof Slider>[0]> = {}) {
  return mount(
    <Slider label="Dot size" variant="inline" defaultValue={25} formatValue={(v) => `${v} px`} {...(extra as object)} />,
  );
}

describe("Inline: the whole bar is the slider", () => {
  test.each([["sm", 32], ["md", 40], ["lg", 48]] as const)(
    "size %s is a %spx bar with a handle 16px shorter",
    (size, bar) => {
      const { control, thumb } = inline({ size });
      expect(control.getBoundingClientRect().height).toBe(bar);
      const h = thumb.getBoundingClientRect();
      expect(h.width).toBe(2);
      expect(h.height).toBe(bar - 16);
    },
  );

  test("label and value sit INSIDE the bar, and the value is always shown", () => {
    const { control, container: c } = inline();
    const bar = control.getBoundingClientRect();
    const label = c.querySelector('[data-slot="slider-label"]')!.getBoundingClientRect();
    const value = c.querySelector('[data-slot="slider-value"]')!;
    const v = value.getBoundingClientRect();
    expect(value.textContent).toBe("25 px");
    for (const r of [label, v]) {
      expect(r.top).toBeGreaterThanOrEqual(bar.top);
      expect(r.bottom).toBeLessThanOrEqual(bar.bottom);
    }
    // md insets the content by space-md on both sides.
    expect(label.left - bar.left).toBe(12);
    expect(bar.right - v.right).toBe(12);
  });

  test("paints the bar, the wash and the handle from their roles", () => {
    const { control, fill, thumb } = inline();
    expect(getComputedStyle(control).backgroundColor).toBe(tokenColor("--ui-bg-elevated"));
    expect(getComputedStyle(fill).backgroundColor).toBe(tokenColor("--ui-bg-accent-subtle"));
    expect(getComputedStyle(fill).backgroundImage).toBe("none");
    expect(getComputedStyle(thumb).borderInlineStartColor).toBe(tokenColor("--ui-border-strong"));
    expect(getComputedStyle(thumb).borderInlineStartWidth).toBe("2px");
  });

  test("hover steps the wash and the handle together", async () => {
    const { control, fill, thumb } = inline();
    await userEvent.hover(control, { position: { x: 300, y: 20 } });
    await settled(fill);
    await settled(thumb);
    expect(getComputedStyle(fill).backgroundColor).toBe(tokenColor("--ui-bg-accent-subtle-hover"));
    expect(getComputedStyle(thumb).borderInlineStartColor).toBe(tokenColor("--ui-text-primary"));
  });

  test("keyboard focus rings the BAR, not the 2px handle", async () => {
    const { control } = inline();
    await tabTo(slider());
    await settled(control);
    expect(getComputedStyle(control).boxShadow).toContain(tokenColor("--ui-focus-ring-color"));
  });

  test("a press anywhere on the bar — even on the label — moves the value", async () => {
    const onValueChange = vi.fn();
    const { control } = inline({ onValueChange });
    const bar = control.getBoundingClientRect();
    await userEvent.click(control, { position: { x: bar.width * 0.75, y: bar.height / 2 } });
    expect(onValueChange).toHaveBeenCalled();
    expect(onValueChange.mock.lastCall?.[0]).toBeGreaterThan(70);
  });

  test("at 0 and at 100 the handle sits flush with the bar's edges", async () => {
    let { control, thumb } = inline({ defaultValue: 0 });
    await expect.poll(() => thumb.getBoundingClientRect().left - control.getBoundingClientRect().left).toBeCloseTo(0, 0);
    act(() => root?.unmount()); container?.remove();

    ({ control, thumb } = inline({ defaultValue: 100 }));
    await expect.poll(() => control.getBoundingClientRect().right - thumb.getBoundingClientRect().right).toBeCloseTo(0, 0);
  });

  test("a long label truncates; the value never does", () => {
    container = document.createElement("div");
    container.style.width = "240px";
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <Slider label="Left-to-right taper of the halftone band" variant="inline" defaultValue={62} formatValue={(v) => (v / 100).toFixed(2)} />,
      );
    });
    const label = container.querySelector<HTMLElement>('[data-slot="slider-label"]')!;
    const value = container.querySelector<HTMLElement>('[data-slot="slider-value"]')!;
    expect(getComputedStyle(label).textOverflow).toBe("ellipsis");
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
    expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth + 0.5);
    expect(value.textContent).toBe("0.62");
  });

  test("inline and track are different fills, not the same paint twice", () => {
    const a = inline();
    const inlineFill = getComputedStyle(a.fill).backgroundColor + getComputedStyle(a.fill).backgroundImage;
    act(() => root?.unmount()); container?.remove();
    const b = mount(<Slider label="Dot size" defaultValue={25} />);
    const trackFill = getComputedStyle(b.fill).backgroundColor + getComputedStyle(b.fill).backgroundImage;
    expect(inlineFill).not.toBe(trackFill);
  });

  test("inline with an origin: the wash runs from the centre, marked by two notches", () => {
    const { track, fill, container: c } = inline({ min: -50, max: 50, defaultValue: -12, origin: 0 });
    const t = track.getBoundingClientRect();
    const f = fill.getBoundingClientRect();
    expect(f.right).toBeCloseTo(t.left + t.width / 2, 0);
    expect(f.width).toBeCloseTo(t.width * 0.12, 0);
    const notches = c.querySelectorAll('[data-slot="slider-origin"]');
    expect(notches.length).toBe(2);
    for (const n of Array.from(notches)) {
      const r = n.getBoundingClientRect();
      expect(r.width).toBe(2);
      expect(r.height).toBe(6);
    }
  });
});

describe("Disabled is the GROUP's state", () => {
  test("the group carries aria-disabled, so its label and value are read as part of a disabled control", () => {
    const { container: c } = mount(<Slider label="Logo size" defaultValue={62} isDisabled hasValueText />);
    const group = c.querySelector("[aria-labelledby]")!;
    expect(group.getAttribute("aria-disabled")).toBe("true");
    act(() => root?.unmount()); container?.remove();
    const on = mount(<Slider label="Logo size" defaultValue={62} />);
    expect(on.container.querySelector("[aria-labelledby]")!.hasAttribute("aria-disabled")).toBe(false);
  });
});

/**
 * Forced colours removes box-shadow, so the ring above does not survive
 * Windows High Contrast — the outline fallback does, IF it is compiled under a
 * variant that matches. Read from the compiled sheet (layer 3): every
 * `@media (forced-colors: active)` rule that draws an outline, matched against
 * the element itself. The shipped class was `focus-visible:forced-colors:…`
 * on the thumb div, which matches nothing — the same defect as the ring.
 */
function forcedColorOutlineRules(): CSSStyleRule[] {
  const out: CSSStyleRule[] = [];
  const walk = (rules: CSSRuleList, forced: boolean) => {
    for (const rule of Array.from(rules)) {
      const media = (rule as CSSMediaRule).media?.mediaText ?? "";
      const inForced = forced || media.includes("forced-colors: active");
      if (rule instanceof CSSStyleRule && inForced && /outline/.test(rule.style.cssText)) out.push(rule);
      const nested = (rule as unknown as { cssRules?: CSSRuleList }).cssRules;
      if (nested) walk(nested, inForced);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { walk(sheet.cssRules, false); } catch { /* cross-origin */ }
  }
  return out;
}

function matchedBy(el: Element, rules: CSSStyleRule[]) {
  return rules.some((r) => {
    try { return el.matches(r.selectorText); } catch { return false; }
  });
}

describe("The focus indicator survives forced colours", () => {
  test("the thumb matches a forced-colours outline rule when focused, and none at rest", async () => {
    const { thumb } = mount(<Slider label="Logo size" defaultValue={62} />);
    const rules = forcedColorOutlineRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(matchedBy(thumb, rules)).toBe(false);
    await tabTo(slider());
    expect(matchedBy(thumb, rules)).toBe(true);
  });

  test("the inline BAR matches it when its handle is focused", async () => {
    const { control } = inline();
    const rules = forcedColorOutlineRules();
    expect(matchedBy(control, rules)).toBe(false);
    await tabTo(slider());
    expect(matchedBy(control, rules)).toBe(true);
  });
});

describe("The lift is a transition, not a jump", () => {
  test("the thumb's box-shadow transitions at a real, non-zero duration", () => {
    const { thumb } = mount(<Slider label="Logo size" defaultValue={62} />);
    const cs = getComputedStyle(thumb);
    // `duration-[--x]` compiles to a bare property name — 0s, silently. The
    // parens form resolves the token; a zero here is that bug.
    expect(cs.transitionProperty).toContain("box-shadow");
    expect(parseFloat(cs.transitionDuration)).toBeGreaterThan(0);
  });
});
