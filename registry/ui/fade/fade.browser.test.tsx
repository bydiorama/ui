import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { act, createRef, useState } from "react";
import type { ReactElement } from "react";

import { FADE_RAMP_DARK, FADE_RAMP_LIGHT } from "@/lib/fade-ramp";
import { Fade, type FadeSide } from "./fade.tsx";

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

function mount(ui: ReactElement, scheme: "light" | "dark" = "light") {
  container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = `${WIDTH}px`;
  container.style.height = `${HEIGHT}px`;
  container.style.overflow = "clip";
  // Pinned per test: the ramp switches per stop with light-dark(), so a test
  // that does not say which scheme it means is reading whichever the runner
  // happens to prefer.
  container.style.colorScheme = scheme;
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
 * The resolved value of a colour expression, through the same cascade the
 * component uses — asserting against a pinned rgb() would pass while the
 * component pointed at a different role that resolves the same today.
 */
function resolved(expression: string, scheme: "light" | "dark" = "light") {
  const probe = document.createElement("div");
  probe.style.colorScheme = scheme;
  probe.style.backgroundColor = expression;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

/**
 * The alpha of every stop of a computed ramp, in order. The engine resolves
 * light-dark() and color-mix() at computed-value time, so this reads what is
 * PAINTED, not what was authored: `color(srgb r g b / a) p%`, with the alpha
 * omitted on the opaque end.
 */
function stopAlphas(image: string): number[] {
  return [...image.matchAll(/color\(srgb [\d. ]+?(?: \/ ([\d.]+))?\) [\d.]+%/g)].map((m) =>
    m[1] === undefined ? 1 : Number(m[1]),
  );
}

describe("Fade ramp — perceptual, not linear", () => {
  test("the painted profile is the light table, stop for stop", () => {
    const { band } = mount(<Fade ground="base" />, "light");
    const alphas = stopAlphas(getComputedStyle(band).backgroundImage);
    expect(alphas).toHaveLength(FADE_RAMP_LIGHT.length);
    alphas.forEach((a, i) => expect(a, `stop ${i}`).toBeCloseTo(FADE_RAMP_LIGHT[i]!, 3));
  });

  test("a dark scheme paints the dark table — the polarity correction is live", () => {
    // light-dark() is resolved per element, so the SAME component under a
    // dark-scheme container must carry more alpha at every inner stop. This
    // is the test that fails if the switch is ever collapsed to one table.
    const { band } = mount(<Fade ground="base" />, "dark");
    const alphas = stopAlphas(getComputedStyle(band).backgroundImage);
    alphas.forEach((a, i) => expect(a, `stop ${i}`).toBeCloseTo(FADE_RAMP_DARK[i]!, 3));
    expect(alphas[8]!, "mid-ramp").toBeGreaterThan(FADE_RAMP_LIGHT[8]!);
  });

  test("no corner at the content end — the start line the linear ramp drew", () => {
    // A linear ramp's first step is 1/16 of the depth at 0.0625 alpha. The
    // trail must enter at a small fraction of that.
    const { band } = mount(<Fade />);
    const alphas = stopAlphas(getComputedStyle(band).backgroundImage);
    expect(alphas[0]).toBe(0);
    expect(alphas[1]! - alphas[0]!).toBeLessThan(0.0625 / 4);
  });

  test("five grounds paint five ramps, each ending ON its role", () => {
    const images = (["base", "surface", "elevated", "sunken", "affix"] as const).map((ground) => {
      const { band } = mount(<Fade ground={ground} />);
      const image = getComputedStyle(band).backgroundImage;
      // The solid end, resolved through the same mix the ramp authors, so
      // the comparison is format-for-format.
      const end = resolved(`color-mix(in srgb, var(--ui-bg-${ground}) 100%, transparent)`);
      expect(image.endsWith(`${end} 100%)`), `ground=${ground} ends on the role: ${image.slice(-60)}`).toBe(true);
      unmount();
      return image;
    });
    expect(new Set(images).size).toBe(5);
  });

  test("affix ends at the bar's own alpha, so a band under the bar meets it", () => {
    const { band } = mount(<Fade side="top" ground="affix" />);
    const alphas = stopAlphas(getComputedStyle(band).backgroundImage);
    // The whole profile scales by the ground's 0.9: the edge is the bar's
    // alpha, never the page's solid 1.
    // Two places: the token stores its alpha in eight bits (230/255 = 0.902).
    expect(alphas.at(-1)).toBeCloseTo(0.9, 2);
    expect(alphas[8]).toBeCloseTo(0.9 * FADE_RAMP_LIGHT[8]!, 2);
  });
});

describe("Fade geometry — the sheet's numbers", () => {
  /**
   * Asserted HERE because no geometry spec exists for this item, deliberately
   * (doc, knownGaps): the geometry laws measure container/child insets, and an
   * edge-pinned band is the shape they cannot express — its off-edge inset is
   * height minus depth, not a declared padding.
   */
  test("default band: bottom edge, full width, 48px deep (md)", () => {
    const { band, container } = mount(<Fade />);
    const b = band.getBoundingClientRect();
    const c = container.getBoundingClientRect();
    expect(getComputedStyle(band).position).toBe("absolute");
    expect(b.width).toBe(c.width);
    expect(b.height).toBe(48);
    expect(b.bottom).toBe(c.bottom);
    expect(b.left).toBe(c.left);
  });

  test("depths are 24 / 48 / 96 on both axes — and all three differ", () => {
    for (const side of ["bottom", "left"] as const) {
      const depths = (["sm", "md", "lg"] as const).map((size) => {
        const { band } = mount(<Fade side={side} size={size} />);
        const r = band.getBoundingClientRect();
        unmount();
        return side === "bottom" ? r.height : r.width;
      });
      expect(depths, `side=${side}`).toEqual([24, 48, 96]);
    }
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
      expect(span === "width" ? b.height : b.width, `side=${side} depth`).toBe(48);
      unmount();
    }
  });

  test("the ramp runs toward the pinned edge — four sides, four directions", () => {
    // `to bottom` is the default and the computed style serializes it AWAY,
    // so bottom is asserted by the absence of every other direction.
    const images = (["top", "bottom", "left", "right"] as const).map((side) => {
      const { band } = mount(<Fade side={side} />);
      const image = getComputedStyle(band).backgroundImage;
      if (side === "bottom") expect(image).not.toMatch(/to (top|left|right)/);
      else expect(image, `side=${side} runs to ${side}`).toContain(`to ${side}`);
      unmount();
      return image;
    });
    expect(new Set(images).size).toBe(4);
  });

  test("the depth is an override surface: --ui-fade-band-depth sizes the band", () => {
    // §6: a caller who needs a dissolve sized to a type role sets this.
    const { band } = mount(<Fade style={{ ["--ui-fade-band-depth" as string]: "72px" }} />);
    expect(band.getBoundingClientRect().height).toBe(72);
  });
});

describe("Fade is paint, never a participant", () => {
  test("it never intercepts the pointer — content under the band stays hittable", () => {
    const { band, container } = mount(
      <>
        <a href="#more" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "48px" }}>
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
    const { band, container } = mount(<Fade side="top" className="top-12" />);
    expect(band.getBoundingClientRect().top - container.getBoundingClientRect().top).toBe(48);
  });
});

describe("Fade visibility — isVisible", () => {
  test("hidden means opacity 0, box kept — toggling never reflows", async () => {
    const { band } = mount(<Fade isVisible={false} />);
    await settled(band);
    expect(getComputedStyle(band).opacity).toBe("0");
    expect(band.getBoundingClientRect().height).toBe(48);
  });

  test("the change is opacity on the motion tokens, and it retargets", async () => {
    const { band } = mount(<Fade />);
    await settled(band);
    expect(getComputedStyle(band).opacity).toBe("1");

    const style = getComputedStyle(band);
    expect(style.transitionProperty).toContain("opacity");
    expect(style.transitionDuration).toBe(resolvedDuration());

    rerender(<Fade isVisible={false} />);
    // getAnimations() is the only reading that distinguishes a live
    // transition from a declared-but-dead one.
    expect(band.getAnimations().length).toBeGreaterThan(0);
    await settled(band);
    expect(getComputedStyle(band).opacity).toBe("0");
    rerender(<Fade isVisible />);
    await settled(band);
    expect(getComputedStyle(band).opacity).toBe("1");
  });
});

function resolvedDuration() {
  const probe = document.createElement("div");
  probe.style.transitionDuration = "var(--ui-duration-fast)";
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).transitionDuration;
  probe.remove();
  return value;
}

/* ------------------------------------------------------------------ *
 * Scroll-linked mode
 * ------------------------------------------------------------------ */

/**
 * The composition the library's own callers use (Card.Body, ChatWidget): a
 * positioned, clipping wrapper holding the scroller and the band as SIBLINGS.
 * The scroller's node is held in state, because the band binds to the
 * element itself.
 */
function Scrolling({
  side = "bottom",
  rows = 40,
  isVisible = true,
  direction,
}: {
  side?: FadeSide;
  rows?: number;
  isVisible?: boolean;
  direction?: "rtl";
}) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const horizontal = side === "left" || side === "right";
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "clip" }} dir={direction}>
      <div
        ref={setNode}
        data-testid="scroller"
        style={{
          width: "100%",
          height: "100%",
          overflow: "auto",
          display: horizontal ? "flex" : "block",
        }}
      >
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} style={horizontal ? { flex: "0 0 40px", height: 20 } : { height: 20 }}>
            row {i}
          </div>
        ))}
      </div>
      <Fade side={side} scrollContainer={node} isVisible={isVisible} />
    </div>
  );
}

const scroller = () => document.querySelector<HTMLElement>('[data-testid="scroller"]')!;
function scrollTo(position: { top?: number; left?: number }) {
  act(() => {
    if (position.top !== undefined) scroller().scrollTop = position.top;
    if (position.left !== undefined) scroller().scrollLeft = position.left;
    scroller().dispatchEvent(new Event("scroll"));
  });
}
const opacity = (el: Element) => Number(getComputedStyle(el).opacity);

describe("Fade bound to a scroll container", () => {
  test("full strength while content runs past the edge, none flush against it", async () => {
    const { band } = mount(<Scrolling />);
    expect(band.dataset.scrollLinked).toBe("true");
    await settled(band);
    expect(opacity(band)).toBe(1);

    scrollTo({ top: 1e6 });
    await settled(band);
    expect(opacity(band)).toBe(0);
  });

  test("it EASES OUT over the last band-depth of scroll instead of switching off", async () => {
    // The pop this mode exists to remove: with 24px of a 48px band still to
    // scroll, the band is part-way, not on and not off.
    const { band } = mount(<Scrolling />);
    const s = scroller();
    scrollTo({ top: s.scrollHeight - s.clientHeight - 25 });
    await settled(band);
    const mid = opacity(band);
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.8);
  });

  test("a top band is off at rest and arrives as the content scrolls under it", async () => {
    const { band } = mount(<Scrolling side="top" />);
    await settled(band);
    expect(opacity(band)).toBe(0);
    scrollTo({ top: 200 });
    await settled(band);
    expect(opacity(band)).toBe(1);
  });

  test("content that fits shows no band — and growing content brings it back", async () => {
    // The re-measure at commit: rows appended can resize nothing the band
    // observes, so the re-render is the only signal (the useScrollEdges trap).
    const { band } = mount(<Scrolling rows={2} />);
    await settled(band);
    expect(opacity(band)).toBe(0);
    rerender(<Scrolling rows={40} />);
    await settled(band);
    expect(opacity(band)).toBe(1);
  });

  test("isVisible still gates it — off means off, whatever the scroll says", async () => {
    const { band } = mount(<Scrolling isVisible={false} />);
    await settled(band);
    expect(opacity(band)).toBe(0);
  });

  test("hidden until measured — a server render never shows a band at a flush edge", () => {
    const markup = renderToStaticMarkup(<Fade side="top" scrollContainer={document.body} />);
    expect(markup).toContain("--ui-fade-band-strength:0");
    expect(markup).toContain("opacity-(--ui-fade-band-strength)");
  });
});

describe("Fade keeps off a classic scrollbar", () => {
  /**
   * The runner cannot DRAW a classic scrollbar: headless Chromium launches
   * with hidden scrollbars, so every scroller here measures zero, styled or
   * not. What the band reads is the scroller's client box — clientLeft,
   * clientWidth, clientHeight — and a classic bar is exactly the gap between
   * that box and the border box. So the bar is stubbed where the band reads
   * it: the geometry the inset is computed from, asserted against the band's
   * rendered rect. A real classic bar (Windows, "always show scrollbars")
   * produces these numbers; the stories show it drawn.
   */
  const BAR = 12;
  function stubBar(el: HTMLElement, side: "right" | "left" | "bottom") {
    const width = el.clientWidth;
    const height = el.clientHeight;
    if (side === "bottom") {
      Object.defineProperty(el, "clientHeight", { configurable: true, get: () => height - BAR });
    } else {
      Object.defineProperty(el, "clientWidth", { configurable: true, get: () => width - BAR });
      if (side === "left") Object.defineProperty(el, "clientLeft", { configurable: true, get: () => BAR });
    }
    act(() => el.dispatchEvent(new Event("scroll")));
  }

  test("a bottom band stops at the vertical scrollbar instead of veiling it", async () => {
    const { band } = mount(<Scrolling />);
    stubBar(scroller(), "right");
    const s = scroller().getBoundingClientRect();
    expect(band.getBoundingClientRect().right).toBeCloseTo(s.right - BAR, 1);
    expect(band.getBoundingClientRect().left).toBeCloseTo(s.left, 1);
  });

  test("in RTL the bar is on the left, and so is the inset", async () => {
    const { band } = mount(<Scrolling direction="rtl" />);
    stubBar(scroller(), "left");
    const s = scroller().getBoundingClientRect();
    expect(band.getBoundingClientRect().left).toBeCloseTo(s.left + BAR, 1);
    expect(band.getBoundingClientRect().right).toBeCloseTo(s.right, 1);
  });

  test("a side band stops above the horizontal scrollbar", async () => {
    const { band } = mount(<Scrolling side="right" />);
    stubBar(scroller(), "bottom");
    const s = scroller().getBoundingClientRect();
    expect(band.getBoundingClientRect().bottom).toBeCloseTo(s.bottom - BAR, 1);
  });

  test("an overlay scrollbar (zero width) changes nothing", async () => {
    const { band } = mount(<Scrolling />);
    await settled(band);
    expect(band.style.right).toBe("");
    expect(band.getBoundingClientRect().right).toBeCloseTo(scroller().getBoundingClientRect().right, 1);
  });

  test("a band INSIDE its scroller (a sticky region) is left alone", async () => {
    function Inside() {
      const [node, setNode] = useState<HTMLDivElement | null>(null);
      return (
        <div ref={setNode} data-testid="scroller" style={{ height: "100%", overflow: "auto" }}>
          {Array.from({ length: 40 }, (_, i) => <div key={i} style={{ height: 20 }}>row {i}</div>)}
          <div style={{ position: "sticky", bottom: 0, height: 0 }}>
            <Fade scrollContainer={node} className="top-auto bottom-full" />
          </div>
        </div>
      );
    }
    const { band } = mount(<Inside />);
    stubBar(scroller(), "right");
    expect(band.style.right).toBe("");
    expect(band.style.left).toBe("");
  });
});
