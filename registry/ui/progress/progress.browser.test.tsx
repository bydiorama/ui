import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { Progress } from "./progress.tsx";

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
    track: container.querySelector<HTMLElement>('[data-slot="track"]')!,
    fill: container.querySelector<HTMLElement>('[data-slot="fill"]')!,
    container: container!,
  };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

describe("Progress announces itself correctly", () => {
  test("carries the three attributes a progressbar needs, and a name", () => {
    const { track, container: c } = mount(<Progress label="Usage" value={62} />);
    expect(track.getAttribute("role")).toBe("progressbar");
    expect(track.getAttribute("aria-valuenow")).toBe("62");
    expect(track.getAttribute("aria-valuemin")).toBe("0");
    expect(track.getAttribute("aria-valuemax")).toBe("100");
    // A bar with no name announces only a number.
    const labelledBy = track.getAttribute("aria-labelledby")!;
    expect(c.querySelector(`#${CSS.escape(labelledBy)}`)?.textContent).toBe("Usage");
  });

  test("a hidden label still reaches the accessibility tree", () => {
    const { track, container: c } = mount(<Progress label="Usage" value={10} isLabelHidden />);
    const labelledBy = track.getAttribute("aria-labelledby")!;
    const el = c.querySelector<HTMLElement>(`#${CSS.escape(labelledBy)}`)!;
    expect(el.textContent).toBe("Usage");
    // sr-only clips it; `display: none` would remove it from the tree.
    expect(getComputedStyle(el).display).not.toBe("none");
  });

  test("a custom max is reported, not silently rescaled away", () => {
    const { track } = mount(<Progress label="Files" value={3} max={4} />);
    expect(track.getAttribute("aria-valuenow")).toBe("3");
    expect(track.getAttribute("aria-valuemax")).toBe("4");
  });
});

describe("Progress paints the designed bar", () => {
  test("the fill measures the value, and is clamped at both ends", () => {
    const half = mount(<Progress label="Usage" value={50} />);
    const trackW = half.track.getBoundingClientRect().width;
    expect(half.fill.getBoundingClientRect().width).toBeCloseTo(trackW / 2, 0);
    act(() => root?.unmount()); container?.remove();

    // Real data overflows; a fill wider than its track is a layout bug.
    const over = mount(<Progress label="Usage" value={140} />);
    expect(over.fill.getBoundingClientRect().width).toBeCloseTo(
      over.track.getBoundingClientRect().width, 0,
    );
    expect(over.track.getAttribute("aria-valuenow")).toBe("100");
    act(() => root?.unmount()); container?.remove();

    const under = mount(<Progress label="Usage" value={-20} />);
    expect(under.fill.getBoundingClientRect().width).toBe(0);
    expect(under.track.getAttribute("aria-valuenow")).toBe("0");
  });

  test.each([["md", "16px"], ["sm", "8px"]] as const)("size %s is a %s track", (size, height) => {
    const { track } = mount(<Progress label="Usage" value={62} size={size} />);
    expect(getComputedStyle(track).height).toBe(height);
  });

  test("track and fill use roles, and the fill is pill-ended", () => {
    const { track, fill } = mount(<Progress label="Usage" value={62} />);
    expect(getComputedStyle(track).backgroundColor).toBe("rgb(237, 232, 227)");
    // The sheet paints a three-stop gradient of raw palette steps; the accent
    // role re-skins with a brand, which the palette does not. See knownGaps.
    // bg-accent-legible: the pale brand accent floored at 3:1 against the
    // track, because a progress fill CARRIES the value (SC 1.4.11).
    expect(getComputedStyle(fill).backgroundColor).toBe(tokenColor("--ui-bg-accent-legible"));
    // Chromium clamps a huge radius in the computed value, so assert the
    // SHAPE (pill-ended) rather than the literal the token declares.
    expect(Number.parseFloat(getComputedStyle(fill).borderRadius)).toBeGreaterThanOrEqual(
      fill.getBoundingClientRect().height / 2,
    );
  });

  test("the gradient variant actually paints an image, not nothing", () => {
    const solid = mount(<Progress label="Usage" value={62} />);
    // A solid fill has no background-image at all.
    expect(getComputedStyle(solid.fill).backgroundImage).toBe("none");
    act(() => root?.unmount()); container?.remove();

    const grad = mount(<Progress label="Usage" value={62} variant="gradient" />);
    const image = getComputedStyle(grad.fill).backgroundImage;
    // `bg-(image:--ui-gradient-brand)` is arbitrary, so check:utilities skips
    // it by design. Without the `image:` hint this would set a background
    // COLOUR to a gradient string and paint nothing — dead CSS, silently.
    expect(image).not.toBe("none");
    expect(image).toContain("gradient");
  });

  test("the value text rounds and matches the bar", () => {
    const { container: c } = mount(<Progress label="Usage" value={62} hasValueText />);
    expect(c.querySelector('[data-slot="progress-value"]')?.textContent).toBe("62%");
  });
});
