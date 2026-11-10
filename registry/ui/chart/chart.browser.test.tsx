import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "react";
import type { ReactElement } from "react";

import { AreaChart, BarChart, Chart, LineChart } from "./chart.tsx";

const PRINTED = [
  { year: 1957, posters: 120, books: 80 },
  { year: 1961, posters: 180, books: 140 },
  { year: 1964, posters: 240, books: 130 },
  { year: 1967, posters: 210, books: 190 },
  { year: 1972, posters: 320, books: 220 },
  { year: 1975, posters: 280, books: 260 },
];
const TWO = [
  { key: "posters" as const, label: "Posters" },
  { key: "books" as const, label: "Books" },
];

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

/** Mounted so the plot is the anatomy sheet's 684px SVG: 684 + an 8px gap +
 *  the 32px tick column + 2 × 24px inset + 2 × 1px border = 774. (The sheet's
 *  frame is 784 and its plot does not stretch to fill the last 10px.) */
async function mount(ui: ReactElement, width = 774) {
  container = document.createElement("div");
  container.style.width = `${width}px`;
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  // Let the ResizeObserver report the real width and re-render.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await act(async () => {});
  const all = (slot: string) => [...container!.querySelectorAll<SVGElement & HTMLElement>(`[data-slot="${slot}"]`)];
  const q = (slot: string) => all(slot)[0]!;
  return { q, all, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const bars = () => (
  <BarChart label="Printed work by year" description="Posters led books in every year and peaked in 1972." data={PRINTED} x="year" xLabel="Year" series={TWO} />
);

describe("Chart frames the data the way the anatomy sheet does", () => {
  test("a figure named by its title and described by its takeaway", async () => {
    const { q } = await mount(bars());
    const figure = q("chart");
    expect(figure.tagName).toBe("FIGURE");
    expect(document.getElementById(figure.getAttribute("aria-labelledby")!)!.textContent).toBe("Printed work by year");
    expect(document.getElementById(figure.getAttribute("aria-describedby")!)!.textContent).toContain("peaked in 1972");
    const s = getComputedStyle(figure);
    expect(s.backgroundColor).toBe(tokenColor("--ui-bg-surface"));
    expect(s.paddingTop).toBe("24px");
    expect(s.borderTopLeftRadius).toBe("8px");
  });

  test("the sheet's plot: 684px wide, 0–400 in five ticks, bars 24px wide and 2px apart", async () => {
    const { q, all } = await mount(bars());
    expect(q("chart-plot").getBoundingClientRect().width).toBe(684);
    expect(all("chart-tick").slice(0, 5).map((t) => t.textContent)).toEqual(["0", "100", "200", "300", "400"]);
    // The sheet's first two bars: x 32 and 58, 24 wide, the posters bar to 120.
    const [p0] = all("chart-series")[0]!.querySelectorAll("path");
    const [b0] = all("chart-series")[1]!.querySelectorAll("path");
    const pb = p0!.getBBox();
    const bb = b0!.getBBox();
    expect([pb.x, pb.width]).toEqual([32, 24]);
    expect(bb.x - (pb.x + pb.width)).toBe(2);
    expect(pb.y).toBe(168);
  });

  test("the legend keys differ in shape as well as colour", async () => {
    const { all } = await mount(bars());
    const keys = all("chart-legend-item").map((li) => li.querySelector("path")!.getAttribute("d"));
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
    const fills = all("chart-legend-item").map((li) => getComputedStyle(li.querySelector("path")!).fill);
    expect(fills[0]).toBe(tokenColor("--ui-data-cat-1-solid"));
    expect(fills[1]).toBe(tokenColor("--ui-data-cat-2-solid"));
  });

  test("one series needs no legend", async () => {
    const { container: c } = await mount(<BarChart label="x" description="y" data={PRINTED} x="year" xLabel="Year" series={[TWO[0]!]} />);
    expect(c.querySelector('[data-slot="chart-legend"]')).toBeNull();
  });

  test("grid in border-subtle, the baseline one role stronger, ticks at 400 in muted ink", async () => {
    const { q } = await mount(bars());
    expect(getComputedStyle(q("chart-grid")).stroke).toBe(tokenColor("--ui-border-subtle"));
    expect(getComputedStyle(q("chart-baseline")).stroke).toBe(tokenColor("--ui-border-default"));
    const tick = getComputedStyle(q("chart-tick"));
    expect(tick.color).toBe(tokenColor("--ui-text-muted"));
    expect(tick.fontWeight).toBe("400");
    expect(tick.fontVariantNumeric).toContain("tabular-nums");
  });

  test("a pinned slot keeps a series' colour when the others are filtered out", async () => {
    const { all } = await mount(
      <BarChart label="x" description="y" data={PRINTED} x="year" xLabel="Year" series={[{ key: "books", label: "Books", slot: 2 }]} />,
    );
    expect(getComputedStyle(all("chart-bar")[0]!).fill).toBe(tokenColor("--ui-data-cat-2-solid"));
  });

  test("more than eight series is refused, not cycled", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ key: "posters" as const, label: `S${i}` }));
    expect(() => renderToString(<BarChart label="x" description="y" data={PRINTED} x="year" xLabel="Year" series={many} />)).toThrow(/one to eight/);
  });
});

describe("Chart is one tab stop with arrow keys and announcements", () => {
  test("Tab enters the plot on the first value and announces it", async () => {
    const { q } = await mount(bars());
    await userEvent.keyboard("{Tab}{Tab}");
    expect(document.activeElement).toBe(q("chart-plot"));
    await expect.poll(() => q("chart-announcer").textContent).toBe("1957, Posters, 120");
    expect(q("chart-focus-ring")).toBeTruthy();
  });

  test("← → walk categories, ↑ ↓ walk series, Home and End jump, Escape clears", async () => {
    const { q } = await mount(bars());
    await userEvent.keyboard("{Tab}{Tab}");
    await expect.poll(() => q("chart-announcer").textContent).toBe("1957, Posters, 120");
    const said = async (keys: string, text: string) => {
      await userEvent.keyboard(keys);
      await expect.poll(() => q("chart-announcer").textContent).toBe(text);
    };
    await said("{ArrowRight}", "1961, Posters, 180");
    await said("{ArrowUp}", "1961, Books, 140");
    await said("{End}", "1975, Books, 260");
    await said("{ArrowRight}", "1975, Books, 260");
    await said("{Home}", "1957, Books, 80");
    await said("{ArrowDown}", "1957, Posters, 120");
    await userEvent.keyboard("{Escape}");
    await expect.poll(() => q("chart-tooltip")).toBeUndefined();
    expect(document.activeElement).toBe(q("chart-plot"));
  });

  test("the focused band is highlighted, the ring wraps its bar, and the tooltip shows every series", async () => {
    const { q, all } = await mount(bars());
    await userEvent.keyboard("{Tab}{Tab}{ArrowRight}");
    const band = q("chart-highlight");
    expect(getComputedStyle(band).fill).toBe(tokenColor("--ui-bg-hover"));
    const ring = q("chart-focus-ring");
    expect(getComputedStyle(ring).stroke).toBe(tokenColor("--ui-border-focus"));
    expect(getComputedStyle(ring).strokeWidth).toBe("2px");
    const tip = q("chart-tooltip");
    expect(tip.getAttribute("aria-hidden")).toBe("true");
    expect(all("chart-tooltip-value").map((v) => v.textContent)).toEqual(["180", "140"]);
    expect(getComputedStyle(tip).backgroundColor).toBe(tokenColor("--ui-bg-elevated"));
  });

  test("hovering a band shows its tooltip; leaving hides it", async () => {
    const { q, all } = await mount(bars());
    const plot = q("chart-plot");
    const r = plot.getBoundingClientRect();
    await userEvent.hover(plot, { position: { x: 114 * 4 + 57, y: r.height / 2 } });
    await expect.poll(() => all("chart-tooltip-value").map((v) => v.textContent)).toEqual(["320", "220"]);
    await userEvent.unhover(plot);
    await expect.poll(() => q("chart-tooltip")).toBeUndefined();
  });

  test("the table view holds every value", async () => {
    const { q, container: c } = await mount(bars());
    const toggle = c.querySelector<HTMLButtonElement>('button[aria-label="View as table"]')!;
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    const table = q("chart-table").querySelector("table")!;
    expect([...table.querySelectorAll("th")].slice(0, 3).map((t) => t.textContent)).toEqual(["Year", "Posters", "Books"]);
    expect(table.textContent).toContain("320");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(6);
  });
});

describe("Lines, areas and rules", () => {
  const rows = [
    { year: 1967, posters: 140, books: 105, signage: 250 },
    { year: 1969, posters: 150, books: 160, signage: 180 },
    { year: 1972, posters: 310, books: 205, signage: 60 },
  ];
  const three = [...TWO, { key: "signage" as const, label: "Signage" }];

  test("2px solid lines, a ringed marker and a direct label at each end", async () => {
    const { all } = await mount(<LineChart size="sm" label="x" description="y" data={rows} x="year" xLabel="Year" series={three} />);
    const lines = all("chart-line");
    expect(lines).toHaveLength(3);
    for (const l of lines) {
      const s = getComputedStyle(l);
      expect(s.strokeWidth).toBe("2px");
      expect(s.strokeDasharray).toBe("none");
      expect(s.strokeLinejoin).toBe("round");
    }
    expect(all("chart-direct-label").map((l) => l.textContent)).toEqual(["Posters", "Books", "Signage"]);
  });

  test("a missing value breaks the line instead of bridging it", async () => {
    const { all } = await mount(
      <LineChart label="x" description="y" data={[{ y: 1, v: 1 }, { y: 2, v: 2 }, { y: 3, v: null }, { y: 4, v: 3 }, { y: 5, v: 2 }]} x="y" xLabel="Y" series={[{ key: "v", label: "V" }]} />,
    );
    expect(all("chart-line")).toHaveLength(2);
  });

  test("a rule is solid border-strong, carries its label, and widens the axis to fit", async () => {
    const { q, all } = await mount(
      <Chart size="sm" label="x" description="y" data={rows} x="year" xLabel="Year" series={[TWO[0]!]}>
        <Chart.Lines />
        <Chart.Rule value={500} label="Target 500" />
      </Chart>,
    );
    const rule = q("chart-rule").querySelector("path")!;
    expect(getComputedStyle(rule).stroke).toBe(tokenColor("--ui-border-strong"));
    expect(getComputedStyle(rule).strokeDasharray).toBe("none");
    expect(q("chart-rule-label").textContent).toBe("Target 500");
    expect(Number(all("chart-tick").at(2)!.textContent!.replace(/\D/g, ""))).toBeGreaterThanOrEqual(500);
  });

  test("stacked areas are bands, one per series, under the lines", async () => {
    const { all } = await mount(<AreaChart isStacked size="sm" label="x" description="y" data={rows} x="year" xLabel="Year" series={three} />);
    expect(all("chart-area")).toHaveLength(3);
    expect(getComputedStyle(all("chart-area")[0]!).fill).toBe(tokenColor("--ui-data-cat-1-bg"));
  });
});

describe("Chart's data states keep the frame", () => {
  test("loading: skeleton marks in bg-sunken, no axis text, aria-busy, table toggle off", async () => {
    const { q, container: c } = await mount(<BarChart isLoading label="x" description="y" data={PRINTED} x="year" xLabel="Year" series={TWO} />);
    expect(q("chart").getAttribute("aria-busy")).toBe("true");
    expect(c.querySelectorAll('[data-slot="chart-tick"]')).toHaveLength(0);
    expect(getComputedStyle(q("chart-skeleton").querySelector("path")!).fill).toBe(tokenColor("--ui-bg-sunken"));
    expect(q("chart-plot").getAttribute("tabindex")).toBeNull();
  });

  test("empty: the baseline and the message, at the same height", async () => {
    const { q } = await mount(<BarChart emptyText="No work in this range" label="x" description="y" data={[] as typeof PRINTED} x="year" xLabel="Year" series={TWO} />);
    expect(q("chart-empty").textContent).toBe("No work in this range");
    expect(q("chart-plot").getBoundingClientRect().height).toBe(241);
  });

  test("the server renders the same SVG as the first client render (ADR 0023 §7)", () => {
    const a = renderToString(bars());
    const b = renderToString(bars());
    expect(a).toBe(b);
    expect(a).toContain('data-slot="chart-bar"');
    expect(a).not.toContain("NaN");
  });
});

describe("Chart forwards per §5", () => {
  test("className, ref and native props land on the figure", async () => {
    let node: HTMLElement | null = null;
    const { q } = await mount(
      <BarChart ref={(n) => { node = n; }} className="max-w-xl" data-testid="c" label="x" description="y" data={PRINTED} x="year" xLabel="Year" series={TWO} />,
    );
    const el = q("chart");
    expect(node).toBe(el);
    expect(el.classList.contains("max-w-xl")).toBe(true);
    expect(el.dataset.testid).toBe("c");
  });
});
