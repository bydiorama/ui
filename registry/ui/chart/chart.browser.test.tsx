import { afterEach, describe, expect, test } from "vitest";
import { commands, userEvent } from "vitest/browser";
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

/** The Bar sheet's horizontal specimen: four designers, ranked. */
const RANKED = [
  { name: "Josef Müller-Brockmann", posters: 342 },
  { name: "Massimo Vignelli", posters: 270 },
  { name: "Adrian Frutiger", posters: 198 },
  { name: "Otl Aicher", posters: 135 },
];
const rows = () => (
  <BarChart
    orientation="horizontal"
    label="Posters by designer"
    description="Müller-Brockmann made the most."
    data={RANKED}
    x="name"
    xLabel="Designer"
    series={[{ key: "posters", label: "Posters" }]}
  />
);

describe("Horizontal bars are the Bar sheet's ranked rows", () => {
  test("a 168px name lane, 24px bars 16px apart, the value at each tip, no axis", async () => {
    const { q, all } = await mount(rows());
    const names = all("chart-tick");
    expect(names.map((n) => n.textContent)).toEqual(RANKED.map((r) => r.name));
    expect(q("chart-y-axis").getBoundingClientRect().width).toBe(168);
    const barBoxes = all("chart-bar").map((b) => b.getBoundingClientRect());
    expect(barBoxes.map((b) => b.height)).toEqual([24, 24, 24, 24]);
    expect(barBoxes.slice(1).map((b, i) => b.top - barBoxes[i]!.top)).toEqual([40, 40, 40]);
    // Each name centres on its bar.
    names.forEach((n, i) => {
      const r = n.getBoundingClientRect();
      expect(r.top + r.height / 2).toBe(barBoxes[i]!.top + 12);
    });
    // Bars share one scale, longest first, all from the same start.
    expect(new Set(barBoxes.map((b) => b.left)).size).toBe(1);
    expect(barBoxes.map((b) => b.width)).toEqual([...barBoxes.map((b) => b.width)].sort((a, b) => b - a));
    // The value: label-sm 600 in primary ink, 8px past the tip.
    const values = all("chart-value");
    expect(values.map((v) => v.textContent)).toEqual(["342", "270", "198", "135"]);
    const v = getComputedStyle(values[0]!);
    expect(v.fill).toBe(tokenColor("--ui-text-primary"));
    expect(v.fontWeight).toBe("600");
    expect(Math.round(values[0]!.getBoundingClientRect().left - barBoxes[0]!.right)).toBe(8);
    // The longest value stays inside the plot.
    expect(values[0]!.getBoundingClientRect().right).toBeLessThanOrEqual(q("chart-plot").getBoundingClientRect().right);
    // No grid, no baseline, no x axis, no legend: the rows carry it all.
    for (const slot of ["chart-grid", "chart-baseline", "chart-x-axis", "chart-legend"]) expect(all(slot)).toHaveLength(0);
  });

  test("↓ ↑ walk the rows, Home and End jump; the band and ring follow, no tooltip", async () => {
    const { q } = await mount(rows());
    await userEvent.keyboard("{Tab}{Tab}");
    await expect.poll(() => q("chart-announcer").textContent).toBe("Josef Müller-Brockmann, Posters, 342");
    const said = async (keys: string, text: string) => {
      await userEvent.keyboard(keys);
      await expect.poll(() => q("chart-announcer").textContent).toBe(text);
    };
    await said("{ArrowDown}", "Massimo Vignelli, Posters, 270");
    await said("{ArrowRight}", "Massimo Vignelli, Posters, 270");
    await said("{End}", "Otl Aicher, Posters, 135");
    await said("{ArrowUp}", "Adrian Frutiger, Posters, 198");
    await said("{Home}", "Josef Müller-Brockmann, Posters, 342");
    const band = q("chart-highlight").getBoundingClientRect();
    const bar = q("chart-bar").getBoundingClientRect();
    expect(band.top).toBe(bar.top - 8);
    expect(band.height).toBe(40);
    const ring = q("chart-focus-ring").getBoundingClientRect();
    expect(ring.height).toBeGreaterThan(bar.height);
    expect(q("chart-tooltip")).toBeUndefined();
  });

  test("a negative value grows left from zero, its value on the outside", async () => {
    const { all } = await mount(
      <BarChart
        orientation="horizontal"
        label="Change"
        description="Aicher fell."
        data={[{ name: "Vignelli", change: 60 }, { name: "Aicher", change: -40 }]}
        x="name"
        xLabel="Designer"
        series={[{ key: "change", label: "Change" }]}
      />,
    );
    const [up, down] = all("chart-bar").map((b) => b.getBoundingClientRect());
    expect(Math.round(down!.right)).toBe(Math.round(up!.left));
    const [, label] = all("chart-value");
    expect(label!.getBoundingClientRect().right).toBeLessThan(down!.left);
  });

  test("more than one series, stacking or a rule is refused", () => {
    expect(() =>
      renderToString(
        <Chart label="x" description="y" data={PRINTED} x="year" xLabel="Year" series={TWO}>
          <Chart.Bars orientation="horizontal" />
        </Chart>,
      ),
    ).toThrow(/one series/);
  });

  test("loading reserves four rows of sunken marks", async () => {
    const { q, all } = await mount(
      <BarChart orientation="horizontal" isLoading label="x" description="y" data={[] as typeof RANKED} x="name" xLabel="Designer" series={[{ key: "posters", label: "Posters" }]} />,
    );
    expect(q("chart-skeleton").children).toHaveLength(4);
    expect(q("chart-plot").getBoundingClientRect().height).toBe(4 * 40 - 16 + 1);
    expect(all("chart-tick")).toHaveLength(0);
  });
});

describe("Forced colours keep series apart without colour", () => {
  afterEach(async () => {
    await commands.setForcedColors(false);
  });

  test("slot 1 is solid system ink, slot 2 the sheet's 45° hatch inside an outline", async () => {
    const { all } = await mount(bars());
    // Read before emulating: in forced colours the probe's own colour is forced too.
    const slot1 = tokenColor("--ui-data-cat-1-solid");
    await commands.setForcedColors(true);
    expect(matchMedia("(forced-colors: active)").matches).toBe(true);
    const [posters, books] = all("chart-series");
    const ink = getComputedStyle(posters!.querySelector("path")!);
    const hatch = getComputedStyle(books!.querySelector("path")!);
    // CanvasText resolves to a real colour, not the slot's.
    expect(ink.fill).not.toBe(slot1);
    expect(ink.fill).toMatch(/^rgb/);
    expect(hatch.fill).toMatch(/^url\("?#.+-2"?\)$/);
    expect(hatch.stroke).toBe(ink.fill);
    // The pattern exists and is the 45° family: lines rising left to right.
    const id = hatch.fill.match(/#([^")]+)/)![1]!;
    const pattern = document.getElementById(id)!;
    expect(pattern.tagName.toLowerCase()).toBe("pattern");
    expect(pattern.querySelector("path")!.getAttribute("d")).toContain("l6-6");
  });

  test("the legend keys wear the same fills as their marks", async () => {
    const { all } = await mount(bars());
    await commands.setForcedColors(true);
    const keys = all("chart-legend-item").map((li) => getComputedStyle(li.querySelector("path")!).fill);
    const marks = all("chart-series").map((g) => getComputedStyle(g.querySelector("path")!).fill);
    expect(keys).toEqual(marks);
  });

  test("all eight slots get eight different fills", async () => {
    const data = [{ c: "a", s1: 1, s2: 2, s3: 3, s4: 4, s5: 5, s6: 6, s7: 7, s8: 8 }];
    const series = (["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const).map((key) => ({ key, label: key }));
    const { all } = await mount(<BarChart label="x" description="y" data={data} x="c" xLabel="C" series={series} />);
    await commands.setForcedColors(true);
    const fills = all("chart-series").map((g) => getComputedStyle(g.querySelector("path")!).fill);
    const patterns = fills.slice(1).map((f) => document.getElementById(f.match(/#([^")]+)/)![1]!)!.innerHTML);
    expect(new Set(fills).size).toBe(8);
    expect(new Set(patterns).size).toBe(7);
  });

  test("out of forced colours, the slot colours are untouched", async () => {
    const { all } = await mount(bars());
    expect(getComputedStyle(all("chart-series")[1]!.querySelector("path")!).fill).toBe(tokenColor("--ui-data-cat-2-solid"));
  });
});

describe("Hovering a legend entry dims the other series (Bar sheet: Interaction)", () => {
  const opacities = (all: (slot: string) => (SVGElement & HTMLElement)[]) =>
    all("chart-series").map((g) => getComputedStyle(g).opacity);

  test("bars: the others drop to 0.32, the hovered one stays whole, leaving restores", async () => {
    const { all } = await mount(bars());
    expect(opacities(all)).toEqual(["1", "1"]);
    const [, books] = all("chart-legend-item");
    await userEvent.hover(books!);
    await expect.poll(() => opacities(all)).toEqual(["0.32", "1"]);
    await userEvent.unhover(books!);
    await expect.poll(() => opacities(all)).toEqual(["1", "1"]);
  });

  test("lines and their washes dim together", async () => {
    const { all } = await mount(
      <AreaChart label="x" description="y" data={PRINTED} x="year" xLabel="Year" series={TWO} />,
    );
    await userEvent.hover(all("chart-legend-item")[0]!);
    await expect.poll(() => all("chart-area").map((a) => getComputedStyle(a).opacity)).toEqual(["1", "0.32"]);
    expect(opacities(all)).toEqual(["1", "0.32"]);
  });
});

describe("The tooltip is on the overlay layer", () => {
  test("fixed on --ui-z-tooltip, inside the chart's own figure, and not cut by a clipping parent", async () => {
    // A 60px clipping box. Focus scrolls it so the plot's top is at the top
    // of the box; the card, 16px into the plot and ~70px tall, ends past the
    // clip — where an absolutely positioned card would have been cut.
    const { q } = await mount(
      <div style={{ height: 60, overflow: "hidden" }}>{bars()}</div>,
      // Narrower than the test frame (414px): the positioner measures the real
      // window now, and a chart wider than it would shift the card to fit.
      400,
    );
    await userEvent.keyboard("{Tab}{Tab}{End}");
    await expect.poll(() => q("chart-tooltip")).toBeTruthy();
    const card = q("chart-tooltip");
    const positioner = card.parentElement!;
    expect(getComputedStyle(positioner).position).toBe("fixed");
    const probe = document.createElement("div");
    probe.style.zIndex = "var(--ui-z-tooltip)";
    probe.style.position = "relative";
    document.body.appendChild(probe);
    expect(getComputedStyle(positioner).zIndex).toBe(getComputedStyle(probe).zIndex);
    probe.remove();
    // Portalled into the figure, so a brand scope on any ancestor still reaches it.
    expect(q("chart").contains(card)).toBe(true);
    // The last band sits right of centre, so the card opens to its LEFT.
    const band = q("chart-highlight").getBoundingClientRect();
    const box = card.getBoundingClientRect();
    expect(Math.round(band.left - box.right)).toBe(8);
    // The card reaches past the clipping box…
    expect(box.bottom).toBeGreaterThan(q("chart").parentElement!.getBoundingClientRect().bottom);
    // …and is painted there: hit-testing a point below the clip finds it, not
    // whatever is behind. (The card ignores the pointer by design; switched on
    // for this probe only, since elementFromPoint skips pointer-events: none.)
    card.style.pointerEvents = "auto";
    const hit = document.elementFromPoint(box.left + box.width / 2, box.bottom - 4);
    expect(card.contains(hit) || hit === card).toBe(true);
  });
});
