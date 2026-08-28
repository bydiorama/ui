import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { Fade } from "./fade.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/**
 * A POSITIONED, clipping container — the caller's half of the contract.
 *
 * The band is absolute and edge-pinned, so inside a static parent it resolves
 * against some ancestor and paints elsewhere (the doc's knownGaps records it,
 * same as DotPattern). Every test here mounts the composition the sheet draws.
 */
const WIDTH = 320;
const HEIGHT = 160;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = `${WIDTH}px`;
  container.style.height = `${HEIGHT}px`;
  container.style.overflow = "clip";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const band = container.querySelector<HTMLSpanElement>('[data-slot="fade"]');
  if (!band) throw new Error("Fade did not render");
  return { band, container: container! };
}

function rerender(ui: ReactElement) {
  act(() => {
    root!.render(ui);
  });
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

/** Wait out running transitions — a read mid-flight returns the FROM value. */
async function settled(el: Element) {
  await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
}

/**
 * The resolved value of a colour token, through the same cascade the
 * component uses — asserting against a pinned rgb() would pass while the
 * component pointed at a different role that resolves the same today.
 */
function resolved(property: string) {
  const probe = document.createElement("div");
  probe.style.backgroundColor = `var(${property})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

describe("Fade geometry — the sheet's numbers", () => {
  /**
   * Asserted HERE because no geometry spec exists for this item, deliberately
   * (doc, knownGaps): the geometry laws measure container/child insets, and an
   * edge-pinned band is the shape they cannot express — its off-edge inset is
   * height minus depth, not a declared padding. This block pins the sheet's
   * Depth and Sides sections instead.
   */
  test("default band: bottom edge, full width, 32px deep (md)", () => {
    const { band, container } = mount(<Fade />);
    const b = band.getBoundingClientRect();
    const c = container.getBoundingClientRect();
    expect(getComputedStyle(band).position).toBe("absolute");
    expect(b.width).toBe(c.width);
    expect(b.height).toBe(32);
    expect(b.bottom).toBe(c.bottom);
    expect(b.left).toBe(c.left);
  });

  test("depths are the spacing scale — 16, 32, 64 — and all three DIFFER", () => {
    const heights = (["sm", "md", "lg"] as const).map((size) => {
      const { band } = mount(<Fade size={size} />);
      const h = band.getBoundingClientRect().height;
      unmount();
      return h;
    });
    expect(heights).toEqual([16, 32, 64]);
    expect(new Set(heights).size).toBe(3);
  });

  test("horizontal depths measure the same scale — the parens widths compile", () => {
    // The vertical axis uses named steps (h-lg); the horizontal one spells
    // the token in parens (w-(--ui-space-lg)) to satisfy check:utilities'
    // width rule — a DIFFERENT class family, so md passing in the sides test
    // proves nothing about sm and lg. A typo here would ship a zero-width
    // band with every other assertion green.
    const widths = (["sm", "md", "lg"] as const).map((size) => {
      const { band } = mount(<Fade side="left" size={size} />);
      const w = band.getBoundingClientRect().width;
      unmount();
      return w;
    });
    expect(widths).toEqual([16, 32, 64]);
  });

  test("each side pins flush to its own edge and spans the cross axis", () => {
    const cases = [
      { side: "top", edge: (b: DOMRect, c: DOMRect) => b.top === c.top, span: "width" },
      { side: "bottom", edge: (b: DOMRect, c: DOMRect) => b.bottom === c.bottom, span: "width" },
      { side: "left", edge: (b: DOMRect, c: DOMRect) => b.left === c.left, span: "height" },
      { side: "right", edge: (b: DOMRect, c: DOMRect) => b.right === c.right, span: "height" },
    ] as const;
    for (const { side, edge, span } of cases) {
      const { band, container } = mount(<Fade side={side} />);
      const b = band.getBoundingClientRect();
      const c = container.getBoundingClientRect();
      expect(edge(b, c), `side=${side} sits flush`).toBe(true);
      expect(b[span], `side=${side} spans the cross axis`).toBe(c[span]);
      // Depth lands on the side's own axis: height for a horizontal band,
      // width for a vertical one.
      expect(span === "width" ? b.height : b.width, `side=${side} depth`).toBe(32);
      unmount();
    }
  });

  test("the ramp runs toward the pinned edge — four sides, four directions", () => {
    // `to bottom` is the default and the computed style serializes it AWAY,
    // so bottom is asserted by the absence of every other direction; the
    // non-default three appear literally.
    const images = (["top", "bottom", "left", "right"] as const).map((side) => {
      const { band } = mount(<Fade side={side} />);
      const image = getComputedStyle(band).backgroundImage;
      expect(image, `side=${side} paints a gradient`).toContain("linear-gradient");
      if (side === "bottom") {
        expect(image).not.toMatch(/to (top|left|right)/);
      } else {
        expect(image, `side=${side} runs to ${side}`).toContain(`to ${side}`);
      }
      unmount();
      return image;
    });
    expect(new Set(images).size).toBe(4);
  });

  test("grounds paint four DIFFERENT ramps whose solid stop IS the role", () => {
    const images = (["base", "surface", "elevated", "sunken"] as const).map((ground) => {
      const { band } = mount(<Fade ground={ground} />);
      const image = getComputedStyle(band).backgroundImage;
      // The transparent end: fully transparent by ALPHA. Its hue is
      // irrelevant — Tailwind's /0 modifier computes to transparent black
      // through color-mix, and gradient interpolation is premultiplied, so a
      // zero-alpha stop cannot grey the mid-band. The contract worth pinning
      // is the alpha, and that the SOLID stop is the ground role.
      expect(image, `ground=${ground} starts fully transparent`).toMatch(/\/ 0\)/);
      // Probing the CONTRACT token (--ui-bg-*): the Tailwind theme is inline,
      // so --color-* never exists as a custom property at runtime.
      expect(image, `ground=${ground} ends on the role`).toContain(resolved(`--ui-bg-${ground}`));
      unmount();
      return image;
    });
    expect(new Set(images).size).toBe(4);
  });
});

describe("Fade is paint, never a participant", () => {
  test("it never intercepts the pointer — content under the band stays hittable", () => {
    const { band, container } = mount(
      <>
        <a
          href="#more"
          style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "32px" }}
        >
          under the band
        </a>
        <Fade />
      </>,
    );
    expect(getComputedStyle(band).pointerEvents).toBe("none");
    const b = band.getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    expect(container.querySelector("a")!.contains(hit)).toBe(true);
  });

  test("aria-hidden is contract, not default — a caller cannot un-hide paint", () => {
    const { band } = mount(<Fade aria-hidden={false} />);
    expect(band.getAttribute("aria-hidden")).toBe("true");
  });

  test("ref reaches the span, and native props land on it", () => {
    const ref = createRef<HTMLSpanElement>();
    const { band } = mount(<Fade ref={ref} id="preview-fade" />);
    expect(ref.current).toBe(band);
    expect(band.tagName).toBe("SPAN");
    expect(band.id).toBe("preview-fade");
  });

  test("className merges last — the doc's pinned-header nudge displaces the pin", () => {
    // side="top" pins top-0; the shipped composition hangs the band below a
    // 48px bar with `top-12`. The consumer's utility must win the merge.
    const { band, container } = mount(<Fade side="top" className="top-12" />);
    const b = band.getBoundingClientRect();
    const c = container.getBoundingClientRect();
    expect(b.top - c.top).toBe(48);
  });
});

describe("Fade visibility — the two states the sheet draws", () => {
  test("hidden means opacity 0, box kept — toggling never reflows", async () => {
    const { band } = mount(<Fade isVisible={false} />);
    await settled(band);
    expect(getComputedStyle(band).opacity).toBe("0");
    // The band keeps its box either way (sheet § Behaviour, Visibility).
    expect(band.getBoundingClientRect().height).toBe(32);
  });

  test("the change is opacity on the motion tokens, and it retargets", async () => {
    const { band } = mount(<Fade />);
    await settled(band);
    expect(getComputedStyle(band).opacity).toBe("1");

    const style = getComputedStyle(band);
    expect(style.transitionProperty).toContain("opacity");
    // --ui-duration-fast resolves to 120ms; asserting through the cascade so
    // the test follows the token rather than pinning a magic number twice.
    const probe = document.createElement("div");
    probe.style.transitionDuration = "var(--ui-duration-fast)";
    document.body.appendChild(probe);
    const tokenDuration = getComputedStyle(probe).transitionDuration;
    probe.remove();
    expect(style.transitionDuration).toBe(tokenDuration);

    rerender(<Fade isVisible={false} />);
    // The transition RUNS — getAnimations() is the only reading that
    // distinguishes a live transition from a declared-but-dead one (a snap
    // ends at the same computed value the assertions below accept).
    expect(band.getAnimations().length).toBeGreaterThan(0);
    await settled(band);
    expect(getComputedStyle(band).opacity).toBe("0");
    rerender(<Fade isVisible />);
    await settled(band);
    expect(getComputedStyle(band).opacity).toBe("1");
  });
});
