/**
 * `fadeMask`, the ground-agnostic mode.
 *
 * Asserted as COMPUTED style rather than as the returned object, because the
 * object is what was authored and the computed value is what the engine
 * accepted — the same rule the rest of this suite follows. A mask-composite
 * the browser rejects computes back to its initial value, and the returned
 * object looks perfect either way.
 */
import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

import { fadeMask } from "@/ui/fade/fade.tsx";

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: React.ReactElement) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(ui));
  return host;
}

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
});

const box = () => document.querySelector<HTMLElement>('[data-testid="scroller"]')!;

describe("fadeMask", () => {
  test("no active edge produces NO mask, not an empty one", () => {
    // An empty mask-image list is `none` in some engines and a fully
    // transparent layer in others, and the second hides the container's
    // entire content — a blank panel with no error anywhere.
    mount(<div data-testid="scroller" style={fadeMask({ sides: {} })}>rows</div>);
    const image = getComputedStyle(box()).maskImage;
    expect(image === "none" || image === "").toBe(true);
  });

  test("one active edge ramps from that edge inward, and the sides differ", () => {
    // NOTE ON READING THESE VALUES: Chromium normalises `to bottom` out of a
    // computed gradient, because it is the default direction — so the top
    // ramp serialises with NO direction keyword at all. Asserting
    // `toContain("to bottom")` fails against a perfectly correct mask, which
    // is why the discriminator here is the presence of "to top" rather than
    // the name of each direction.
    mount(<div data-testid="scroller" style={fadeMask({ sides: { bottom: true } })}>rows</div>);
    const fromBottom = getComputedStyle(box()).maskImage;
    expect(fromBottom).toContain("linear-gradient");
    // A bottom fade ramps `to top`: transparent AT the bottom edge.
    expect(fromBottom).toContain("to top");

    act(() => root!.unmount());
    host!.remove();

    mount(<div data-testid="scroller" style={fadeMask({ sides: { top: true } })}>rows</div>);
    const fromTop = getComputedStyle(box()).maskImage;
    expect(fromTop).toContain("linear-gradient");
    expect(fromTop, "the top ramp runs the other way").not.toContain("to top");
    expect(fromTop, "the two sides are not the same mask").not.toBe(fromBottom);
  });

  test("two opposite edges INTERSECT rather than adding", () => {
    // The trap. Composited additively, each layer is opaque exactly where
    // the other fades, so their union is fully opaque and a container
    // ramping at both ends shows no fade at all. Intersect is what makes
    // two ramps compose.
    mount(
      <div data-testid="scroller" style={fadeMask({ sides: { top: true, bottom: true } })}>
        rows
      </div>,
    );
    const style = getComputedStyle(box());
    // Two layers, and only ONE of them carries "to top" — the other is the
    // top ramp, whose `to bottom` Chromium normalises away.
    expect(style.maskImage.match(/linear-gradient/g)?.length, "two ramps").toBe(2);
    expect(style.maskImage).toContain("to top");
    // One value PER LAYER, so two ramps serialise as "intersect, intersect".
    // Every layer has to be intersect: one `add` in the list is enough to
    // fill the union back in. This also pins the prefixed/standard ordering
    // in `fadeMask` — with the standard property written first the legacy
    // one wins in Chromium and this reads "source-in, source-in", which
    // means the same thing today and is a fallback silently in charge.
    const composites = style.maskComposite.split(",").map((v) => v.trim());
    expect(composites.length, "one composite per ramp").toBe(2);
    expect(
      composites.every((v) => v === "intersect"),
      `additive composition would erase both ramps: ${style.maskComposite}`,
    ).toBe(true);
  });

  test("the depth scale is the painted band's, not a new one", () => {
    // Same three steps as `Fade`'s size prop, resolved through the spacing
    // tokens so the two modes cannot drift to different ramp depths.
    const depths = (["sm", "md", "lg"] as const).map((size) => {
      mount(
        <div data-testid="scroller" style={fadeMask({ sides: { bottom: true }, size })}>
          rows
        </div>,
      );
      const image = getComputedStyle(box()).maskImage;
      act(() => root!.unmount());
      host!.remove();
      return image;
    });
    // 16 / 32 / 64, the space-lg / 2xl / 4xl steps.
    expect(depths[0]).toContain("16px");
    expect(depths[1]).toContain("32px");
    expect(depths[2]).toContain("64px");
    expect(new Set(depths).size, "three distinct depths").toBe(3);
  });
});
