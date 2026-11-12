import { afterEach, describe, expect, test } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act, createRef } from "react";
import type { ReactElement } from "react";

import { AreaChart, Chart } from "@/ui/chart/chart.tsx";
import { StatTiles } from "@/blocks/stat-tiles/stat-tiles.tsx";

import { ChartCard } from "./chart-card.tsx";

const PRINTED = [
  { year: 1957, printed: 200 },
  { year: 1961, printed: 320 },
  { year: 1964, printed: 370 },
  { year: 1967, printed: 400 },
  { year: 1972, printed: 540 },
  { year: 1975, printed: 540 },
];
const ONE = [{ key: "printed" as const, label: "Printed work" }];

let container: HTMLDivElement | null = null;
let root: Root | null = null;

/** 774: the sheet's card, the Chart frame's own width. */
async function mount(ui: ReactElement, width = 774) {
  container = document.createElement("div");
  container.style.width = `${width}px`;
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await act(async () => {});
  const all = (slot: string) => [...container!.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`)];
  return { all, q: (slot: string) => all(slot)[0]!, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const card = (extra: Partial<{ children: ReactElement }> = {}) => (
  <ChartCard
    label="Printed work by year"
    description="Output more than doubled from 1957."
    value="2,370"
    delta={{ change: 0.18, comparison: "vs 1951–1956" }}
    data={PRINTED}
    x="year"
    xLabel="Year"
    series={ONE}
    {...extra}
  />
);

describe("ChartCard loading", () => {
  test("the head shows the tile's skeletons, not a stale change, and keeps its height", async () => {
    // The stand-in screen's loading story printed "25% vs Dec 1971" beside an
    // em dash: the head had no loading state of its own.
    const loaded = await mount(card());
    const height = loaded.q("chart-headline").getBoundingClientRect().height;
    act(() => root?.unmount());
    container?.remove();
    const { q, container: c } = await mount(
      <ChartCard label="Printed work by year" description="d" value="—" delta={{ change: 0.18, comparison: "vs 1951–1956" }} data={[]} x="year" xLabel="Year" series={ONE} isLoading />,
    );
    const head = q("chart-headline");
    expect(head.textContent).toBe("");
    expect(c.querySelector('[data-slot="stat-delta"]')).toBeNull();
    expect(head.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2);
    expect(head.getBoundingClientRect().height).toBeCloseTo(height, 0);
  });
});

describe("ChartCard is the Chart with the tile's figure in its head", () => {
  test("title, then the figure and change; the description is hidden but still describes", async () => {
    const { q } = await mount(card());
    const figure = q("chart");
    expect(figure.dataset.block).toBe("chart-card");
    const headline = q("chart-headline");
    expect(headline.querySelector('[data-slot="stat-value"]')!.textContent).toBe("2,370");
    expect(headline.querySelector('[data-slot="stat-delta"]')!.textContent).toBe("Up 18%vs 1951–1956");
    expect(document.getElementById(figure.getAttribute("aria-describedby")!)!.textContent).toBe("Output more than doubled from 1957.");
    expect(q("chart-description").getBoundingClientRect().width).toBeLessThanOrEqual(1);
  });

  test("by default it draws one fading area — the sheet's card", async () => {
    const { q, all } = await mount(card());
    expect(q("chart-areas").getAttribute("data-wash")).toBe("fade");
    expect(all("chart-line")).toHaveLength(1);
    expect(all("chart-bar")).toHaveLength(0);
  });

  test("any Chart mark goes in as children instead", async () => {
    const { all } = await mount(card({ children: <Chart.Bars /> }));
    expect(all("chart-areas")).toHaveLength(0);
    expect(all("chart-bar").length).toBeGreaterThan(0);
  });

  test("below the head it IS the Chart: same plot, same axes, same frame", async () => {
    const { container: a } = await mount(card());
    const cardPlot = a.querySelector('[data-slot="chart-plot"]')!.getBoundingClientRect();
    // Copied out: a CSSStyleDeclaration is live, and the re-render below
    // replaces the element, leaving a detached one that reads empty.
    const PROPS = ["paddingTop", "borderTopLeftRadius", "backgroundColor", "rowGap"] as const;
    const live = getComputedStyle(a.querySelector('[data-slot="chart"]')!);
    const cardFrame = Object.fromEntries(PROPS.map((p) => [p, live[p]]));
    const cardTicks = [...a.querySelectorAll('[data-slot="chart-tick"]')].map((t) => t.textContent);
    act(() => root!.render(<AreaChart wash="fade" label="Printed work by year" description="d" data={PRINTED} x="year" xLabel="Year" series={ONE} />));
    await act(async () => {});
    const plot = a.querySelector('[data-slot="chart-plot"]')!.getBoundingClientRect();
    expect([cardPlot.width, cardPlot.height]).toEqual([plot.width, plot.height]);
    expect([...a.querySelectorAll('[data-slot="chart-tick"]')].map((t) => t.textContent)).toEqual(cardTicks);
    const frame = getComputedStyle(a.querySelector('[data-slot="chart"]')!);
    for (const prop of PROPS) {
      expect(cardFrame[prop], prop).toBe(frame[prop]);
      expect(frame[prop], prop).not.toBe("");
    }
  });

  test("the head's figure matches a stat tile's figure", async () => {
    const { all } = await mount(
      <div>
        {card()}
        <StatTiles>
          <StatTiles.Tile label="a" value="2,370" />
        </StatTiles>
      </div>,
    );
    const [inCard, inTile] = all("stat-value").map((v) => getComputedStyle(v.tagName === "DD" ? v.firstElementChild! : v));
    for (const prop of ["fontSize", "lineHeight", "fontWeight", "fontVariantNumeric", "color"] as const) {
      expect(inCard![prop], prop).toBe(inTile![prop]);
    }
  });

  test("className and ref reach the figure", async () => {
    const ref = createRef<HTMLElement>();
    const { q } = await mount(
      <ChartCard ref={ref} className="max-w-xl" label="x" description="y" value="1" data={PRINTED} x="year" xLabel="Year" series={ONE} />,
    );
    expect(ref.current).toBe(q("chart"));
    expect(q("chart").classList.contains("max-w-xl")).toBe(true);
  });
});
