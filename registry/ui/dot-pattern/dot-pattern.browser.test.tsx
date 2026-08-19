import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { DotPattern } from "./dot-pattern.tsx";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/**
 * A POSITIONED, sized container — the caller's half of the contract.
 *
 * The layer is absolute inset-0, so inside a static or auto-sized parent it
 * resolves against some ancestor instead and the grid silently paints
 * elsewhere. The doc records that as a known gap; every test here mounts into
 * the composition the sheet draws.
 */
const WIDTH = 320;
const HEIGHT = 160;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = `${WIDTH}px`;
  container.style.height = `${HEIGHT}px`;
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(ui);
  });
  const layer = container.querySelector<SVGSVGElement>('[data-slot="dot-pattern"]');
  if (!layer) throw new Error("DotPattern did not render");
  return { layer, container: container! };
}

function unmount() {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
}

afterEach(unmount);

/**
 * The resolved value of a token, through the same pipeline the component uses.
 * Asserting against a pinned rgb() would pass while the component pointed at a
 * different role that resolves the same today — the assertion is that the ink
 * IS the token, so both sides are read from the cascade.
 */
function resolved(property: string) {
  const probe = document.createElement("div");
  probe.style.color = `var(${property})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

describe("DotPattern fills its container", () => {
  test("the layer's box is the container's box", () => {
    const { layer, container } = mount(<DotPattern />);
    const layerBox = layer.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    expect(layerBox.width).toBe(containerBox.width);
    expect(layerBox.height).toBe(containerBox.height);
    expect(layerBox.left).toBe(containerBox.left);
    expect(layerBox.top).toBe(containerBox.top);
    expect(getComputedStyle(layer).position).toBe("absolute");
  });

  /**
   * The documented limitation, pinned rather than described (the doc's
   * knownGaps). In a STATIC container, absolute inset-0 resolves against the
   * nearest positioned ancestor — here the viewport — so the grid silently
   * paints somewhere else entirely. This is the evidence for that sentence,
   * and it fails if someone "fixes" the component to size itself, at which
   * point the doc must change with it.
   */
  test("a static container loses the layer — the documented gap", () => {
    container = document.createElement("div");
    container.style.width = `${WIDTH}px`;
    container.style.height = `${HEIGHT}px`;
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(<DotPattern />);
    });
    const layer = container.querySelector<SVGSVGElement>('[data-slot="dot-pattern"]')!;
    const layerBox = layer.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    // The layer escaped to the viewport, not the 320px container.
    expect(layerBox.width).not.toBe(containerBox.width);
  });

  test("the layer paints no ground of its own", () => {
    const { layer } = mount(<DotPattern />);
    // The shader recipe's colorBack was transparent in both shipped usages;
    // the container's fill is what shows between the dots.
    expect(getComputedStyle(layer).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  });

  test("it never intercepts the pointer", () => {
    const { layer } = mount(<DotPattern />);
    expect(getComputedStyle(layer).pointerEvents).toBe("none");
  });
});

describe("DotPattern geometry — the sheet's numbers", () => {
  /**
   * The pattern numbers are asserted HERE because no geometry spec exists for
   * this item, deliberately: the geometry laws (ADR 0019) measure container/
   * child insets from world coordinates, and a tile pitch has neither a
   * padding box nor children. This block is where the sheet's Geometry
   * section is pinned instead — the doc's knownGaps records the decision.
   */
  test("defaults transcribe the shipped shader recipe: gap 16, dot 2", () => {
    const { layer } = mount(<DotPattern />);
    const pattern = layer.querySelector("pattern")!;
    const circle = layer.querySelector("circle")!;
    expect(pattern.getAttribute("width")).toBe("16");
    expect(pattern.getAttribute("height")).toBe("16");
    // Centred in the cell: first dot centre at (gap/2, gap/2), so edges clip
    // mid-dot rather than the grid re-centring on resize (sheet, Tiling).
    expect(circle.getAttribute("cx")).toBe("8");
    expect(circle.getAttribute("cy")).toBe("8");
    // Diameter 2 — the shader's size:1 read as a RADIUS (sheet, Gaps).
    expect(circle.getAttribute("r")).toBe("1");
  });

  test("gap and dotSize reshape the tile", () => {
    const { layer } = mount(<DotPattern gap={24} dotSize={4} />);
    const pattern = layer.querySelector("pattern")!;
    const circle = layer.querySelector("circle")!;
    expect(pattern.getAttribute("width")).toBe("24");
    expect(circle.getAttribute("cx")).toBe("12");
    expect(circle.getAttribute("r")).toBe("2");
  });

  test("two instances keep distinct tiles", () => {
    const { container } = mount(
      <>
        <DotPattern gap={8} />
        <DotPattern gap={24} />
      </>,
    );
    const layers = Array.from(container.querySelectorAll<SVGSVGElement>('[data-slot="dot-pattern"]'));
    expect(layers).toHaveLength(2);
    const ids = layers.map((l) => l.querySelector("pattern")!.id);
    // Distinct pattern ids, or both rects draw whichever <pattern> the
    // document defines first and the second grid renders the first's pitch.
    expect(new Set(ids).size).toBe(2);
    for (const layer of layers) {
      const rectFill = layer.querySelector("rect")!.getAttribute("fill")!;
      expect(rectFill).toBe(`url(#${layer.querySelector("pattern")!.id})`);
    }
  });
});

describe("DotPattern colour — tokens through currentColor", () => {
  test("the default ink is border-subtle", () => {
    const { layer } = mount(<DotPattern />);
    expect(getComputedStyle(layer).color).toBe(resolved("--ui-border-subtle"));
    // The circle rides on currentColor — that is what makes className the
    // retint surface.
    expect(layer.querySelector("circle")!.getAttribute("fill")).toBe("currentColor");
  });

  /**
   * The tailwind-merge claim, measured against the default it displaces.
   * text-edge-* is the first non-ink text colour utility in the library; an
   * unregistered namespace gets guessed at and dropped at runtime, so the
   * override has to be watched winning rather than assumed.
   */
  test("className retints — text-edge-default displaces the default ink", () => {
    const { layer } = mount(<DotPattern className="text-edge-default" />);
    expect(getComputedStyle(layer).color).toBe(resolved("--ui-border-default"));
    expect(getComputedStyle(layer).color).not.toBe(resolved("--ui-border-subtle"));
  });

  test("a bg-* utility gives the layer itself a ground", () => {
    const { layer } = mount(<DotPattern className="bg-sunken" />);
    const probe = document.createElement("div");
    probe.style.backgroundColor = "var(--ui-bg-sunken)";
    document.body.appendChild(probe);
    expect(getComputedStyle(layer).backgroundColor).toBe(getComputedStyle(probe).backgroundColor);
    probe.remove();
  });
});

describe("DotPattern accessibility", () => {
  test("is hidden from assistive tech", () => {
    const { layer } = mount(<DotPattern />);
    expect(layer.getAttribute("aria-hidden")).toBe("true");
  });

  /**
   * Contract, not default — the deliberate difference from Skeleton, whose
   * aria-hidden sits BEFORE the spread so one skeleton can stand for one named
   * thing. A texture never names anything, so the attribute sits after the
   * spread and a caller cannot un-hide it. Asserted so a refactor that
   * "harmonises" the two components does not silently open the escape hatch.
   */
  test("a caller cannot un-hide it", () => {
    const { layer } = mount(<DotPattern aria-hidden={false} />);
    expect(layer.getAttribute("aria-hidden")).toBe("true");
  });

  test("is not focusable", () => {
    const { layer } = mount(<DotPattern />);
    expect(layer.getAttribute("tabindex")).toBeNull();
    (layer as unknown as { focus?: () => void }).focus?.();
    expect(document.activeElement).not.toBe(layer);
  });
});

describe("DotPattern forwarding — §5", () => {
  test("the ref lands on the only node", () => {
    const ref = createRef<SVGSVGElement>();
    const { layer } = mount(<DotPattern ref={ref} />);
    expect(ref.current).toBe(layer);
  });

  test("native props land on the same node", () => {
    const { layer } = mount(<DotPattern id="stage-grid" data-testid="grid" />);
    expect(layer.id).toBe("stage-grid");
    expect(layer.getAttribute("data-testid")).toBe("grid");
  });
});
