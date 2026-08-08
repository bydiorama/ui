import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { MEDIA_SCRIM_ALPHA } from "@bydiorama/tokens";

import { AspectRatio } from "@/ui/aspect-ratio/aspect-ratio.tsx";
import { ImageOverlay } from "./image-overlay.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const WIDTH = 256;
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = `${WIDTH}px`;
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return {
    container: container!,
    root: container.querySelector<HTMLElement>('[data-slot="image-overlay"]')!,
    veil: container.querySelector<HTMLElement>('[data-slot="image-overlay-veil"]')!,
  };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

/** The frame's identity, as plain strings that survive an unmount. */
const pick = (s: CSSStyleDeclaration) => ({
  borderRadius: s.borderRadius,
  overflow: s.overflow,
  backgroundColor: s.backgroundColor,
});

const CAPTION = (
  <>
    <ImageOverlay.Title>Abstract background</ImageOverlay.Title>
    <ImageOverlay.Description>Photo Library</ImageOverlay.Description>
  </>
);

describe("ImageOverlay is AspectRatio's frame", () => {
  /**
   * A RELATIONSHIP, not numbers on both sides.
   *
   * The claim in the doc is that the overlay does not draw its own frame — it
   * IS one. Asserting "8px radius" here and "8px radius" in the AspectRatio
   * test would pass forever while the two silently diverged, which is the only
   * failure that matters. Rendering both and comparing is what cannot.
   */
  test("radius, clip, well and ratio all come from AspectRatio", () => {
    const overlay = mount(
      <ImageOverlay src={PIXEL} alt="" ratio="landscape">
        {CAPTION}
      </ImageOverlay>,
    );
    // COPIED, not held. getComputedStyle returns a LIVE declaration bound to
    // the element, so reading it after unmount answers "" for everything —
    // and `expect("").toBe("8px")` looks like a missing radius rather than a
    // detached node.
    const a = { ...pick(getComputedStyle(overlay.root)) };
    const overlayBox = overlay.root.getBoundingClientRect();
    unmount();

    const plain = mount(
      <AspectRatio ratio="landscape">
        <img src={PIXEL} alt="" />
      </AspectRatio>,
    );
    const frame = plain.container.querySelector<HTMLElement>('[data-slot="aspect-ratio"]')!;
    const frameBox = frame.getBoundingClientRect();
    const c = pick(getComputedStyle(frame));

    expect(a).toEqual(c);
    expect(c.borderRadius).not.toBe("");
    expect(overlayBox.width).toBeCloseTo(frameBox.width, 1);
    expect(overlayBox.height).toBeCloseTo(frameBox.height, 1);
  });

  test("the root replaces the frame's data-slot, as the doc says", () => {
    const { root: el, container: c } = mount(
      <ImageOverlay src={PIXEL} alt="">{CAPTION}</ImageOverlay>,
    );
    expect(el.dataset.slot).toBe("image-overlay");
    expect(el.dataset.variant).toBe("scrim");
    // Documented under `dont` — a consumer reaching for the AspectRatio slot
    // inside an overlay finds nothing, and this is where that is pinned.
    expect(c.querySelector('[data-slot="aspect-ratio"]')).toBeNull();
  });

  test("the image is a real <img> carrying the alt text", () => {
    const { container: c } = mount(
      <ImageOverlay src={PIXEL} alt="Abstract gradient">{CAPTION}</ImageOverlay>,
    );
    const img = c.querySelector<HTMLImageElement>('[data-slot="image-overlay-image"]')!;
    expect(img.tagName).toBe("IMG");
    expect(img.alt).toBe("Abstract gradient");
    expect(getComputedStyle(img).objectFit).toBe("cover");
  });
});

describe("ImageOverlay veil", () => {
  /**
   * The veil's strength is the AA guarantee, so it is asserted against the
   * TOKEN CONSTANT rather than against a remembered number. `bg-media/72`
   * and `MEDIA_SCRIM_ALPHA` are the same decision written in two files; if one moves
   * without the other, the contrast pairs in the doc stop describing what is
   * painted and `check:contrast` keeps reporting the old numbers.
   */
  /**
   * Chromium does NOT report `rgba(...)` here.
   *
   * Tailwind's opacity modifier compiles to `color-mix(in oklab, var(--…) 72%,
   * transparent)`, and the computed value comes back as
   * `oklab(0.2236 0.0019 0.0046 / 0.72)` — the modern slash form. A parser
   * written for rgba() throws on it, which is a test bug that looks exactly
   * like a missing veil.
   */
  const alphaOf = (color: string) => {
    const slash = /\/\s*([\d.]+)%?\s*\)$/.exec(color);
    if (slash) {
      const value = Number.parseFloat(slash[1]!);
      return color.includes("%)") ? value / 100 : value;
    }
    const rgb = /^rgba?\(([^)]+)\)$/.exec(color);
    if (!rgb) throw new Error(`not a colour: ${color}`);
    const parts = rgb[1]!.split(",").map((p) => Number.parseFloat(p));
    return parts.length === 4 ? parts[3]! : 1;
  };

  test.each(["scrim", "full"] as const)("%s paints the veil at MEDIA_SCRIM_ALPHA", (variant) => {
    const { container: c } = mount(
      <ImageOverlay src={PIXEL} alt="" variant={variant}>{CAPTION}</ImageOverlay>,
    );
    // In `scrim` the ground under the caption is the content block; in `full`
    // it is the veil itself. Both must be the same strength.
    const ground = c.querySelector<HTMLElement>(
      variant === "full" ? '[data-slot="image-overlay-veil"]' : '[data-slot="image-overlay-content"]',
    )!;
    expect(alphaOf(getComputedStyle(ground).backgroundColor)).toBeCloseTo(MEDIA_SCRIM_ALPHA, 2);
  });

  test("scrim pins the veil to the bottom; full covers the frame", () => {
    const scrim = mount(<ImageOverlay src={PIXEL} alt="">{CAPTION}</ImageOverlay>);
    const scrimBox = scrim.veil.getBoundingClientRect();
    const scrimFrame = scrim.root.getBoundingClientRect();
    expect(scrimBox.bottom).toBeCloseTo(scrimFrame.bottom, 1);
    expect(scrimBox.height).toBeLessThan(scrimFrame.height);
    unmount();

    const full = mount(
      <ImageOverlay src={PIXEL} alt="" variant="full">{CAPTION}</ImageOverlay>,
    );
    const fullBox = full.veil.getBoundingClientRect();
    const fullFrame = full.root.getBoundingClientRect();
    expect(fullBox.height).toBeCloseTo(fullFrame.height, 1);
    // The sheet's 8px glass. A backdrop filter that silently resolved to
    // `none` looks identical in a screenshot of a flat-coloured test image.
    expect(getComputedStyle(full.veil).backdropFilter).toBe("blur(8px)");
  });

  /**
   * The fade sits ABOVE the caption, which is the whole reason there are two
   * nodes instead of one gradient.
   *
   * A single 0%->72% ramp behind the text is under-strength for every line but
   * the last, because the text spans the ramp — and a screenshot of a caption
   * over a dark photo looks fine either way. What distinguishes them is where
   * the fade STOPS relative to where the text STARTS.
   */
  test("no caption text sits on the fade", () => {
    const { container: c } = mount(
      <ImageOverlay src={PIXEL} alt="">{CAPTION}</ImageOverlay>,
    );
    const fade = c.querySelector<HTMLElement>('[data-slot="image-overlay-fade"]')!.getBoundingClientRect();
    const content = c.querySelector<HTMLElement>('[data-slot="image-overlay-content"]')!.getBoundingClientRect();

    expect(fade.bottom).toBeCloseTo(content.top, 1);
    expect(fade.height).toBeGreaterThan(0);
    // And it is actually a gradient. `bg-linear-to-b` is the first gradient in
    // this library — the utility that check:utilities used to reject — so the
    // one thing worth pinning is that it emits a background-image at all.
    const fadeStyle = getComputedStyle(
      c.querySelector<HTMLElement>('[data-slot="image-overlay-fade"]')!,
    );
    expect(fadeStyle.backgroundImage).toContain("linear-gradient");
    for (const slot of ["image-overlay-title", "image-overlay-description"]) {
      const box = c.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!.getBoundingClientRect();
      expect(box.top).toBeGreaterThanOrEqual(fade.bottom - 0.01);
    }
  });

  test("the fade is decoration and is hidden from assistive tech", () => {
    const { container: c } = mount(<ImageOverlay src={PIXEL} alt="">{CAPTION}</ImageOverlay>);
    const fade = c.querySelector('[data-slot="image-overlay-fade"]')!;
    expect(fade.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("ImageOverlay caption", () => {
  test("the two inks are the on-media ROLES, not the sheet's inverse ink", () => {
    const { container: c } = mount(<ImageOverlay src={PIXEL} alt="">{CAPTION}</ImageOverlay>);
    const title = getComputedStyle(c.querySelector('[data-slot="image-overlay-title"]')!);
    const description = getComputedStyle(c.querySelector('[data-slot="image-overlay-description"]')!);

    // --ui-text-on-media (neutral-95) and --ui-text-on-media-muted
    // (neutral-80). --ui-text-inverse would resolve to the same value HERE, in
    // light — which is exactly why the mistake survived the sheet. The
    // difference only shows in dark, and the token test pins it there.
    expect(title.color).toBe("rgb(246, 243, 240)");
    expect(description.color).toBe("rgb(218, 212, 206)");
    // A hierarchy of two lines that paint the same colour is a hierarchy of one.
    expect(title.color).not.toBe(description.color);
  });

  /**
   * A clamp only clamps if the line has a width to be clamped to.
   *
   * The veil is `items-start` so a Badge sits at its own width — and a flex
   * item under `align-items: flex-start` takes its CONTENT's cross size, so a
   * paragraph does too. `line-clamp-1` then applies to a box that is as wide
   * as the sentence, and a long asset name runs out of the picture instead of
   * being truncated. It looks correct with the short strings the sheet draws
   * and with every string in the stories, which is why the assertion uses one
   * that is deliberately far too long.
   */
  test("a long caption is clamped INSIDE the frame, not run past it", () => {
    const { root: el, container: c } = mount(
      <ImageOverlay src={PIXEL} alt="">
        <ImageOverlay.Title>
          Brand guidelines master document, final revision, approved
        </ImageOverlay.Title>
        <ImageOverlay.Description>
          Photo Library / Diorama Studio / Q3 exports / originals
        </ImageOverlay.Description>
      </ImageOverlay>,
    );
    const frame = el.getBoundingClientRect();
    for (const slot of ["image-overlay-title", "image-overlay-description"]) {
      const box = c.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!.getBoundingClientRect();
      expect(box.right, `${slot} escapes the frame`).toBeLessThanOrEqual(frame.right + 0.01);
      // One line, at the role's own leading — 16 x 1.35 and 12 x 1.35.
      expect(box.height).toBeLessThan(30);
    }
  });

  test("the caption's sizes are the sheet's, as computed values", () => {
    const { container: c } = mount(<ImageOverlay src={PIXEL} alt="">{CAPTION}</ImageOverlay>);
    const title = getComputedStyle(c.querySelector('[data-slot="image-overlay-title"]')!);
    const description = getComputedStyle(c.querySelector('[data-slot="image-overlay-description"]')!);

    // 16px, and the whole point of asserting it. `text-title-sm` PEAKS at 16
    // and is fluid — it computed to 12.17px here, in a frame whose width comes
    // from a grid column rather than from the viewport. Only the number tells
    // the right role from the plausible one.
    expect(title.fontSize).toBe("16px");
    expect(title.fontWeight).toBe("600");
    expect(description.fontSize).toBe("12px");
  });

  /**
   * §6's inset rule, which is a 4px nobody remembers.
   *
   * Unboxed text inside a rounded surface takes a further step of inline
   * padding; a child with its own fill sits flush. The sheet draws exactly
   * that, and encoding it in Title/Description is what stops it being a line
   * in the docs that call sites skip.
   */
  test("caption text is inset from the veil's padding; a filled child is not", () => {
    const { container: c } = mount(
      <ImageOverlay src={PIXEL} alt="">
        <span data-testid="filled" className="bg-accent">Approved</span>
        {CAPTION}
      </ImageOverlay>,
    );
    const content = c.querySelector<HTMLElement>('[data-slot="image-overlay-content"]')!.getBoundingClientRect();
    const filled = c.querySelector<HTMLElement>('[data-testid="filled"]')!.getBoundingClientRect();
    const title = c.querySelector<HTMLElement>('[data-slot="image-overlay-title"]')!.getBoundingClientRect();

    // Both BOXES start at the veil's own 8px padding — the title is a
    // full-width paragraph, so its border box does. What differs is where the
    // TEXT starts, which is the box plus its own padding: 8 + 4 = 12.
    expect(filled.left - content.left).toBeCloseTo(8, 0);
    expect(title.left - content.left).toBeCloseTo(8, 0);
    const inset = parseFloat(
      getComputedStyle(c.querySelector<HTMLElement>('[data-slot="image-overlay-title"]')!).paddingLeft,
    );
    expect(inset).toBe(4);
    expect(title.left + inset - content.left).toBeCloseTo(12, 0);
  });
});

describe("ImageOverlay forwarding — §5", () => {
  test("the ref lands on the frame", () => {
    const ref = createRef<HTMLDivElement>();
    const { root: el } = mount(
      <ImageOverlay ref={ref} src={PIXEL} alt="">{CAPTION}</ImageOverlay>,
    );
    expect(ref.current).toBe(el);
  });

  test("className lands on the frame and still displaces the ratio", () => {
    const { root: el } = mount(
      <ImageOverlay src={PIXEL} alt="" ratio="square" className="aspect-[21/9]">
        {CAPTION}
      </ImageOverlay>,
    );
    const box = el.getBoundingClientRect();
    expect(box.width / box.height).toBeCloseTo(21 / 9, 2);
  });
});
