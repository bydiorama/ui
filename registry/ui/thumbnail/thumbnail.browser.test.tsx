import { afterEach, describe, expect, test, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { Thumbnail } from "./thumbnail.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  return {
    container: container!,
    thumbnail: container.querySelector<HTMLElement>('[data-slot="thumbnail"]')!,
    frame: container.querySelector<HTMLElement>('[data-slot="thumbnail-frame"]')!,
    remove: container.querySelector<HTMLButtonElement>('[data-slot="thumbnail-remove"]'),
  };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

/**
 * A read taken immediately after a state change returns the value the property
 * is transitioning FROM, so a working reveal reads as broken. Wait for the
 * animations the element actually has.
 */
async function settled(el: Element) {
  await act(async () => {
    await Promise.all(
      el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)),
    );
  });
}

describe("Thumbnail tile", () => {
  test("is the sheet's 48px square with a clipped, ringed well", () => {
    const { thumbnail, frame } = mount(<Thumbnail src={PIXEL} alt="Brand guidelines" />);
    const box = getComputedStyle(thumbnail);
    const tile = getComputedStyle(frame);

    expect(box.width).toBe("48px");
    expect(box.height).toBe("48px");
    expect(tile.borderRadius).toBe("8px");
    expect(tile.overflow).toBe("clip");
    // --ui-bg-sunken in light, for BOTH the fill and the ring — which is what
    // the sheet draws, and what needsDesign asks about.
    expect(tile.backgroundColor).toBe("rgb(237, 232, 227)");
    expect(tile.outlineStyle).toBe("solid");
    // 1px and -1px, not 1.5 — both halves of an outline snap to whole device
    // pixels and the test browser runs at dPR 1. Pinned in
    // border-hairline.browser.test.tsx so it is not re-investigated.
    expect(tile.outlineWidth).toBe("1px");
    expect(tile.outlineOffset).toBe("-1px");
    expect(tile.outlineColor).toBe("rgb(237, 232, 227)");
  });

  test("the picture is a real <img> carrying the alt text", () => {
    const { container: c } = mount(<Thumbnail src={PIXEL} alt="Brand guidelines.pdf" />);
    const img = c.querySelector<HTMLImageElement>('[data-slot="thumbnail-image"]')!;
    expect(img.tagName).toBe("IMG");
    expect(img.alt).toBe("Brand guidelines.pdf");
    expect(getComputedStyle(img).objectFit).toBe("cover");
  });

  test("loading shows a spinner instead of a half-painted picture", () => {
    const { container: c, thumbnail } = mount(
      <Thumbnail src={PIXEL} alt="Brand guidelines.pdf" isLoading />,
    );
    // The picture is NOT drawn: an <img> arriving under a spinner reads as a
    // broken one, and the well is the whole of the placeholder.
    expect(c.querySelector('[data-slot="thumbnail-image"]')).toBeNull();

    const status = c.querySelector('[data-slot="thumbnail-loading"]')!;
    // Announced rather than silent — an empty box tells a screen reader
    // nothing, and the name is the FILE's so five loading tiles are five
    // different things.
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-label")).toBe("Brand guidelines.pdf");
    expect(thumbnail.dataset.loading).toBe("true");

    const spinner = c.querySelector<HTMLElement>('[data-slot="thumbnail-spinner"]')!;
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
    // Centred on the tile, which is what was asked for.
    const tile = thumbnail.getBoundingClientRect();
    const mark = spinner.getBoundingClientRect();
    expect(mark.left + mark.width / 2).toBeCloseTo(tile.left + tile.width / 2, 0);
    expect(mark.top + mark.height / 2).toBeCloseTo(tile.top + tile.height / 2, 0);
  });

  test("it really animates, rather than merely declaring an animation", async () => {
    const { container: c } = mount(<Thumbnail src={PIXEL} alt="a" isLoading />);
    const spinner = c.querySelector<HTMLElement>('[data-slot="thumbnail-spinner"]')!;
    // `animation-name` reads as authored whether or not the keyframes exist,
    // which is the trap `transitionProperty` set for the enter animations.
    // getAnimations() is what distinguishes a running one.
    expect(spinner.getAnimations()).not.toHaveLength(0);
  });

  test("not loading draws the picture and no status", () => {
    const { container: c, thumbnail } = mount(<Thumbnail src={PIXEL} alt="a" />);
    expect(c.querySelector('[data-slot="thumbnail-image"]')).not.toBeNull();
    expect(c.querySelector('[data-slot="thumbnail-loading"]')).toBeNull();
    expect(thumbnail.dataset.loading).toBeUndefined();
  });

  test("no onRemove means no control at all", () => {
    const { remove } = mount(<Thumbnail src={PIXEL} alt="a" />);
    // A cross that does nothing is worse than no cross.
    expect(remove).toBeNull();
  });
});

describe("Thumbnail remove control", () => {
  const withRemove = (onRemove = () => {}) =>
    mount(
      <Thumbnail src={PIXEL} alt="Brand guidelines.pdf" onRemove={onRemove} removeLabel="Remove Brand guidelines.pdf" />,
    );

  test("is a real button with the label as its accessible name", () => {
    const { remove } = withRemove();
    expect(remove!.tagName).toBe("BUTTON");
    expect(remove!.type).toBe("button");
    expect(remove!.getAttribute("aria-label")).toBe("Remove Brand guidelines.pdf");
  });

  test("Enter and Space activate it — native behaviour, not re-implemented", async () => {
    const onRemove = vi.fn();
    const { remove } = withRemove(onRemove);
    act(() => remove!.focus());
    expect(document.activeElement).toBe(remove);

    for (const key of ["Enter", " "]) {
      // A real click is what a keyboard activation dispatches; asserting the
      // handler runs is what proves the contract, and a dispatched click
      // proves it without racing Playwright's actionability checks against an
      // element that is transparent until it is focused.
      await act(async () => {
        remove!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
        remove!.click();
      });
    }
    expect(onRemove).toHaveBeenCalledTimes(2);
  });

  /**
   * SC 2.5.8 — the arithmetic, written out.
   *
   * The sheet draws 16x16. The floor is 24. The difference is a pseudo-element
   * inset -4px on every side: 16 + 4 + 4 = 24. `py-*` arithmetic like this is
   * exactly what gets eyeballed and comes out 16 — so it is measured, from the
   * pseudo-element's own box rather than from the button's.
   */
  test("paints 16px and targets 24px", () => {
    const { remove } = withRemove();
    const box = remove!.getBoundingClientRect();
    expect(box.width).toBeCloseTo(16, 1);
    expect(box.height).toBeCloseTo(16, 1);

    const before = getComputedStyle(remove!, "::before");
    expect(before.content).not.toBe("none");
    // -4px on each side of a 16px box.
    for (const side of ["top", "right", "bottom", "left"] as const) {
      expect(before[side]).toBe("-4px");
    }
    expect(box.width + 8).toBeGreaterThanOrEqual(24);
  });

  test("the glyph is 12px and inherits the muted ink", () => {
    const { remove } = withRemove();
    const svg = remove!.querySelector("svg")!;
    // griddy renders width/height as presentation ATTRIBUTES (24px), so an
    // unsized slot ships the library's default. The sheet draws 12 here.
    expect(Math.round(svg.getBoundingClientRect().width)).toBe(12);
    expect(getComputedStyle(remove!).color).toBe("rgb(105, 99, 93)");
  });

  test("it sits ON the tile's corner and is not clipped by the frame", () => {
    const { thumbnail, frame, remove } = withRemove();
    const tile = thumbnail.getBoundingClientRect();
    const mark = remove!.getBoundingClientRect();

    expect(mark.right).toBeCloseTo(tile.right, 1);
    expect(mark.top).toBeCloseTo(tile.top, 1);
    // The reason there are two nodes: the frame clips, so a control inside it
    // would lose its outer half to the radius.
    expect(getComputedStyle(frame).overflow).toBe("clip");
    expect(remove!.parentElement).toBe(thumbnail);
    expect(getComputedStyle(thumbnail).overflow).toBe("visible");
  });

  /**
   * The sheet's defect, asserted as the fix.
   *
   * Hidden at rest, revealed on hover — and ALSO on focus, which the sheet
   * does not draw. Without the second half a keyboard user tabs to something
   * invisible (SC 2.4.7), and the control is transparent for the entire time
   * it holds focus.
   */
  test("is transparent at rest and opaque once focused", async () => {
    const { remove } = withRemove();
    expect(getComputedStyle(remove!).opacity).toBe("0");

    act(() => remove!.focus());
    await settled(remove!);
    expect(getComputedStyle(remove!).opacity).toBe("1");
  });

  test("stays in the tab order while it is invisible", () => {
    const { remove } = withRemove();
    expect(getComputedStyle(remove!).opacity).toBe("0");
    // Opacity, not mounting, and no `pointer-events: none` — the control is
    // reachable and operable throughout, which is the whole reason it is not
    // conditionally rendered.
    expect(remove!.disabled).toBe(false);
    expect(getComputedStyle(remove!).pointerEvents).not.toBe("none");
    act(() => remove!.focus());
    expect(document.activeElement).toBe(remove);
  });
});

describe("Thumbnail.Group", () => {
  const three = [
    <Thumbnail key="a" src={PIXEL} alt="a" />,
    <Thumbnail key="b" src={PIXEL} alt="b" />,
    <Thumbnail key="c" src={PIXEL} alt="c" />,
  ];

  const boxes = (c: HTMLElement) =>
    [...c.querySelectorAll<HTMLElement>('[data-slot="thumbnail"]')].map((el) =>
      el.getBoundingClientRect(),
    );

  test("a spaced row leaves the sheet's 4px between tiles", () => {
    const { container: c } = mount(<Thumbnail.Group>{three}</Thumbnail.Group>);
    const [a, b] = boxes(c);
    // Measured as the gap between PAINTED boxes, not as a declaration.
    expect(b!.left - a!.right).toBeCloseTo(4, 1);
  });

  test("a stack overlaps by 4px, first tile flush", () => {
    const { container: c } = mount(<Thumbnail.Group isStacked>{three}</Thumbnail.Group>);
    const [a, b] = boxes(c);
    expect(b!.left - a!.right).toBeCloseTo(-4, 1);
  });

  test("the two layouts are actually different", () => {
    const spaced = mount(<Thumbnail.Group>{three}</Thumbnail.Group>);
    const spacedWidth = spaced.container.querySelector<HTMLElement>('[data-slot="thumbnail-group"]')!
      .getBoundingClientRect().width;
    unmount();

    const stacked = mount(<Thumbnail.Group isStacked>{three}</Thumbnail.Group>);
    const stackedWidth = stacked.container.querySelector<HTMLElement>('[data-slot="thumbnail-group"]')!
      .getBoundingClientRect().width;

    // 3x48 + 2x4 = 152 against 3x48 - 2x4 = 136. Two layouts that draw the
    // same width would be one layout with two names.
    expect(spacedWidth).toBeCloseTo(152, 0);
    expect(stackedWidth).toBeCloseTo(136, 0);
  });

  /**
   * The sheet's "Stacked Animation" row: the stack returns to the spaced
   * layout so an overlapped tile's remove control stops being underneath its
   * neighbour.
   *
   * Driven through focus-within rather than hover, because focus is something
   * a test can cause and hover is not — and because focus-within is the half
   * the sheet does not draw and the keyboard depends on.
   */
  test("a stack spreads when something inside it takes focus", async () => {
    const { container: c } = mount(
      <Thumbnail.Group isStacked>
        <Thumbnail src={PIXEL} alt="a" onRemove={() => {}} removeLabel="Remove a" />
        <Thumbnail src={PIXEL} alt="b" onRemove={() => {}} removeLabel="Remove b" />
      </Thumbnail.Group>,
    );
    const group = c.querySelector<HTMLElement>('[data-slot="thumbnail-group"]')!;
    expect(group.getBoundingClientRect().width).toBeCloseTo(92, 0); // 2x48 - 4

    const remove = c.querySelector<HTMLButtonElement>('[data-slot="thumbnail-remove"]')!;
    act(() => remove.focus());
    await settled(group);
    // Spread to TOUCHING, not to the sheet's +4px gap: half the travel, and
    // all the travel the interaction needs — what the overlap hides is the
    // next tile's top-right corner, which is where the remove control sits.
    expect(group.getBoundingClientRect().width).toBeCloseTo(96, 0); // 2x48, no gap
  });

  test("the spread eases OUT over the slow duration, not the standard curve", () => {
    const { container: c } = mount(
      <Thumbnail.Group isStacked>{three}</Thumbnail.Group>,
    );
    const tile = c.querySelectorAll<HTMLElement>('[data-slot="thumbnail"]')[1]!;
    const style = getComputedStyle(tile);
    // An unfolding, not a state flip. At 200ms on the default curve a stack of
    // four reads as a snap.
    expect(style.transitionProperty).toContain("margin-inline-start");
    expect(style.transitionDuration).toBe("0.32s");
    expect(style.transitionTimingFunction).toBe("cubic-bezier(0, 0, 0.2, 1)");
  });

  test("max hides the rest behind a counter that says how many", () => {
    const { container: c } = mount(
      <Thumbnail.Group max={2} overflowLabel="1 more attachment">
        {three}
      </Thumbnail.Group>,
    );
    expect(c.querySelectorAll('[data-slot="thumbnail"]')).toHaveLength(2);

    const overflow = c.querySelector('[data-slot="thumbnail-overflow"]')!;
    expect(overflow.querySelector('[aria-hidden="true"]')!.textContent).toBe("+1");
    // The glyph is aria-hidden; the sentence is what gets announced.
    expect(overflow.textContent).toContain("1 more attachment");
  });

  test("a conditional child does not silently consume a slot", () => {
    const show = false;
    const { container: c } = mount(
      <Thumbnail.Group max={2} overflowLabel="1 more">
        <Thumbnail src={PIXEL} alt="a" />
        {show && <Thumbnail src={PIXEL} alt="ghost" />}
        <Thumbnail src={PIXEL} alt="b" />
        <Thumbnail src={PIXEL} alt="c" />
      </Thumbnail.Group>,
    );
    expect(c.querySelectorAll('[data-slot="thumbnail"]')).toHaveLength(2);
    expect(c.querySelector('[data-slot="thumbnail-overflow"]')!.textContent).toContain("+1");
  });

  test("no counter when nothing is hidden", () => {
    const { container: c } = mount(
      <Thumbnail.Group max={5} overflowLabel="never shown">
        {three}
      </Thumbnail.Group>,
    );
    expect(c.querySelector('[data-slot="thumbnail-overflow"]')).toBeNull();
    expect(c.textContent).not.toContain("never shown");
  });

  test("the counter is the same tile as a thumbnail", () => {
    const { container: c } = mount(
      <Thumbnail.Group max={1} overflowLabel="2 more">
        {three}
      </Thumbnail.Group>,
    );
    const tile = getComputedStyle(c.querySelector<HTMLElement>('[data-slot="thumbnail-frame"]')!);
    const counter = getComputedStyle(c.querySelector<HTMLElement>('[data-slot="thumbnail-overflow"]')!);

    // A RELATIONSHIP, not numbers: the counter sits in the row, so it has to
    // wear the same tile or it reads as a different kind of object.
    expect(counter.width).toBe(tile.width);
    expect(counter.height).toBe(tile.height);
    expect(counter.borderRadius).toBe(tile.borderRadius);
    expect(counter.backgroundColor).toBe(tile.backgroundColor);
    expect(counter.outlineWidth).toBe(tile.outlineWidth);
    expect(counter.outlineColor).toBe(tile.outlineColor);
  });
});

describe("Thumbnail forwarding — §5", () => {
  test("the ref lands on the outermost node", () => {
    const ref = createRef<HTMLSpanElement>();
    const { thumbnail } = mount(<Thumbnail ref={ref} src={PIXEL} alt="a" />);
    expect(ref.current).toBe(thumbnail);
  });

  test("className lands on the outermost node, not on the frame", () => {
    const { thumbnail, frame } = mount(<Thumbnail src={PIXEL} alt="a" className="opacity-50" />);
    expect(getComputedStyle(thumbnail).opacity).toBe("0.5");
    expect(getComputedStyle(frame).opacity).toBe("1");
  });

  test("native props go to the outermost node", () => {
    const { thumbnail } = mount(<Thumbnail src={PIXEL} alt="a" id="attachment-1" />);
    expect(thumbnail.id).toBe("attachment-1");
  });
});
