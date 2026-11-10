import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "react";
import type { ReactElement } from "react";

import { Sparkline, type DataSeries } from "./sparkline.tsx";

/** The resolved value of a colour token, so assertions name the ROLE. */
function tokenColor(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function tokenLength(name: string): string {
  const probe = document.createElement("div");
  probe.style.width = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).width;
  probe.remove();
  return value;
}

const DATA = [12, 16, 14, 20, 18, 24, 22, 28, 25, 30, 28, 32];
const DESCRIPTION = "Rose from 12 to 32 over twelve months.";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function mount(ui: ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(ui); });
  const q = <T extends Element>(slot: string) => container!.querySelector<T>(`[data-slot="${slot}"]`);
  return { root: q<HTMLElement>("sparkline")!, q, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
});

describe("Sparkline is one described image", () => {
  test("role=img, named by label, described by the description", () => {
    const { root: el, container: c } = mount(<Sparkline data={DATA} label="Posters printed" description={DESCRIPTION} />);
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe("Posters printed");
    const describedBy = el.getAttribute("aria-describedby")!;
    expect(c.querySelector(`#${CSS.escape(describedBy)}`)?.textContent).toBe(DESCRIPTION);
  });

  test("the SVG is hidden from assistive technology and takes no focus", () => {
    const { q } = mount(<Sparkline data={DATA} label="x" description={DESCRIPTION} />);
    const svg = q<SVGSVGElement>("sparkline-plot")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
  });

  test("loading keeps the name and description, and says it is busy", () => {
    const { root: el, q } = mount(<Sparkline data={[]} label="Orders" description="Loading." isLoading />);
    expect(el.getAttribute("aria-busy")).toBe("true");
    expect(el.getAttribute("aria-label")).toBe("Orders");
    expect(q("sparkline-plot")).toBeNull();
  });
});

describe("Sparkline paints the designed marks", () => {
  test("the line is the slot's solid ink at the thick stroke step, round-capped", () => {
    const { q } = mount(<Sparkline data={DATA} label="x" description={DESCRIPTION} />);
    const line = getComputedStyle(q<SVGPathElement>("sparkline-line")!);
    expect(line.stroke).toBe(tokenColor("--ui-data-cat-1-solid"));
    expect(line.strokeWidth).toBe(tokenLength("--ui-stroke-thick"));
    expect(line.strokeWidth).toBe("2px");
    expect(line.strokeLinecap).toBe("round");
    expect(line.fill).toBe("none");
  });

  test("the end marker is a 4px dot in a 6px surface ring, on the LAST point", () => {
    const { q } = mount(<Sparkline data={DATA} label="x" description={DESCRIPTION} />);
    const ring = q<SVGCircleElement>("sparkline-marker-ring")!;
    const dot = q<SVGCircleElement>("sparkline-marker")!;
    expect(ring.getAttribute("r")).toBe("6");
    expect(dot.getAttribute("r")).toBe("4");
    expect(getComputedStyle(ring).fill).toBe(tokenColor("--ui-bg-surface"));
    expect(getComputedStyle(dot).fill).toBe(tokenColor("--ui-data-cat-1-solid"));
    // The maximum is the last value, so the dot sits on the top inset and
    // its ring stays inside the 40px box (6 - 6 = 0).
    expect(dot.getAttribute("cy")).toBe("6");
    // Ring inside the right edge: 160 - 8 + 6 = 158 ≤ 160.
    expect(Number(dot.getAttribute("cx")) + 6).toBeLessThanOrEqual(160);
  });

  test("hasEndMarker={false} removes both circles", () => {
    const { q } = mount(<Sparkline data={DATA} label="x" description={DESCRIPTION} hasEndMarker={false} />);
    expect(q("sparkline-marker")).toBeNull();
    expect(q("sparkline-marker-ring")).toBeNull();
  });

  test("the area is the slot's own wash, under the line", () => {
    const { q } = mount(<Sparkline data={DATA} label="x" description={DESCRIPTION} variant="area" series={2} />);
    const area = q<SVGPathElement>("sparkline-area")!;
    expect(getComputedStyle(area).fill).toBe(tokenColor("--ui-data-cat-2-bg"));
    // Painted first, so the line draws over it.
    expect(area.nextElementSibling?.getAttribute("data-slot")).toBe("sparkline-line");
  });

  test("columns: one per finite value, filled with the slot, apart by the gap", () => {
    const { container: c } = mount(<Sparkline data={[...DATA, Number.NaN]} label="x" description={DESCRIPTION} variant="column" series={3} />);
    const cols = [...c.querySelectorAll<SVGPathElement>('[data-slot="sparkline-column"]')];
    expect(cols).toHaveLength(12);
    expect(getComputedStyle(cols[0]!).fill).toBe(tokenColor("--ui-data-cat-3-solid"));
    const a = cols[0]!.getBBox();
    const b = cols[1]!.getBBox();
    expect(a.width).toBe(8);
    expect(b.x - (a.x + a.width)).toBeGreaterThanOrEqual(2);
  });

  test("the eight slots paint eight different marks", () => {
    const strokes = ([1, 2, 3, 4, 5, 6, 7, 8] as const satisfies readonly DataSeries[]).map((series) => {
      const { q } = mount(<Sparkline data={DATA} label="x" description={DESCRIPTION} series={series} />);
      const s = getComputedStyle(q<SVGPathElement>("sparkline-line")!).stroke;
      act(() => root?.unmount()); container?.remove();
      return s;
    });
    expect(new Set(strokes).size).toBe(8);
  });

  test("sizes are the sheet's 160×40 and 120×32, and loading reserves the same box", () => {
    for (const [size, w, h] of [["md", 160, 40], ["sm", 120, 32]] as const) {
      for (const isLoading of [false, true]) {
        const { root: el } = mount(<Sparkline data={DATA} label="x" description={DESCRIPTION} size={size} isLoading={isLoading} />);
        const r = el.getBoundingClientRect();
        expect([r.width, r.height]).toEqual([w, h]);
        act(() => root?.unmount()); container?.remove();
      }
    }
  });

  test("the skeleton is the sunken fill at the small radius", () => {
    const { q } = mount(<Sparkline data={[]} label="x" description="Loading." isLoading />);
    const s = getComputedStyle(q<HTMLElement>("sparkline-skeleton")!);
    expect(s.backgroundColor).toBe(tokenColor("--ui-bg-sunken"));
    expect(s.borderTopLeftRadius).toBe(tokenLength("--ui-radius-sm"));
  });

  test("one point is a bare, centred dot", () => {
    const { q } = mount(<Sparkline data={[42]} label="x" description="One reading." />);
    const dot = q<SVGCircleElement>("sparkline-marker")!;
    expect([dot.getAttribute("cx"), dot.getAttribute("cy")]).toEqual(["80", "20"]);
    expect(q("sparkline-marker-ring")).toBeNull();
    expect(q("sparkline-line")).toBeNull();
  });
});

describe("Sparkline renders the same on the server", () => {
  test("server markup's paths equal the client's — no hydration needed", () => {
    const ui = <Sparkline data={DATA} label="x" description={DESCRIPTION} variant="area" />;
    const host = document.createElement("div");
    host.innerHTML = renderToString(ui);
    const { container: c } = mount(ui);
    // Geometry and paint, attribute by attribute. Not outerHTML: the server
    // writes `style="stroke-width:var(…)"` and the DOM re-serialises it as
    // `stroke-width: var(…);` — a spelling difference, not a mismatch.
    const GEOMETRY = ["data-slot", "d", "cx", "cy", "r", "class"];
    const paths = (el: Element) =>
      [...el.querySelectorAll("path, circle")].map((n) => GEOMETRY.map((a) => `${a}=${n.getAttribute(a)}`).join(" "));
    expect(paths(host)).toEqual(paths(c));
    expect(paths(host).length).toBeGreaterThan(0);
  });
});

describe("Sparkline forwards per §5", () => {
  test("className, ref and native props land on the root", () => {
    let node: HTMLDivElement | null = null;
    const { root: el } = mount(
      <Sparkline ref={(n) => { node = n; }} data={DATA} label="x" description={DESCRIPTION} className="ms-sm" data-testid="spark" />,
    );
    expect(node).toBe(el);
    expect(el.classList.contains("ms-sm")).toBe(true);
    expect(el.dataset.testid).toBe("spark");
  });
});
