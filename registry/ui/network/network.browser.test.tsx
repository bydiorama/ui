import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "react";
import type { ReactElement } from "react";

import { seededRandom, type GraphEdge, type GraphNode } from "@/lib/graph";

import { Network, type NetworkType } from "./network.tsx";
import { NetworkCanvas } from "./network-canvas.tsx";

const TYPES: Record<string, NetworkType> = {
  person: { label: "Person", slot: 1 },
  organisation: { label: "Organisation", slot: 2 },
  work: { label: "Work", slot: 3 },
  place: { label: "Place", slot: 4 },
};

const NODES: GraphNode[] = [
  { id: "aicher", label: "Otl Aicher", type: "person" },
  { id: "pictograms", label: "Munich pictograms", type: "work" },
  { id: "hfg", label: "HfG Ulm", type: "organisation" },
  { id: "rotis", label: "Rotis", type: "place" },
  { id: "bill", label: "Max Bill", type: "person" },
  { id: "brockmann", label: "Josef Müller-Brockmann", type: "person" },
  { id: "zurich", label: "Zürich", type: "place" },
];
const EDGES: GraphEdge[] = [
  { id: "r1", source: "aicher", target: "pictograms", label: "designed" },
  { id: "r2", source: "aicher", target: "hfg", label: "co-founded" },
  { id: "r3", source: "aicher", target: "rotis", label: "lived in" },
  { id: "r4", source: "aicher", target: "bill", label: "colleague of", isInferred: true },
  { id: "r5", source: "bill", target: "hfg", label: "co-founded" },
  { id: "r6", source: "bill", target: "zurich", label: "worked in" },
  { id: "r7", source: "brockmann", target: "zurich", label: "worked in" },
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
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

async function mount(ui: ReactElement, width = 960) {
  container = document.createElement("div");
  container.style.width = `${width}px`;
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  await frames();
  await act(async () => {});
  await frames();
  await act(async () => {});
  const all = <T extends Element = HTMLElement>(slot: string) => [...container!.querySelectorAll<T>(`[data-slot="${slot}"]`)];
  const q = <T extends Element = HTMLElement>(slot: string) => all<T>(slot)[0]!;
  const node = (id: string) => container!.querySelector<SVGGElement>(`[data-slot="network-node"][data-id="${id}"]`)!;
  const rerender = async (next: ReactElement) => {
    act(() => root!.render(next));
    await frames();
    await act(async () => {});
  };
  return { q, all, node, rerender, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const circle = (props: Partial<React.ComponentProps<typeof Network>> = {}) => (
  <Network label="Otl Aicher's circle" description="HfG Ulm links most of it." nodes={NODES} edges={EDGES} types={TYPES} {...props} />
);

async function settled(el: Element) {
  await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
}

/** Tab past the table toggle onto the drawing. */
async function enter() {
  await userEvent.tab();
  await userEvent.tab();
}

const announced = (c: HTMLElement) => c.querySelector('[data-slot="network-announcer"]')!.textContent ?? "";
const centreOf = (g: SVGGElement) => {
  const c = g.querySelector("circle")!;
  return { x: Number(c.getAttribute("cx")), y: Number(c.getAttribute("cy")) };
};

describe("Network is a named figure with one tab stop", () => {
  test("the drawing is a labelled group with the keyboard hint as its description", async () => {
    const { q, container } = await mount(circle());
    const figure = q("network");
    expect(figure.tagName).toBe("FIGURE");
    const vp = q("network-viewport");
    expect(vp.getAttribute("role")).toBe("group");
    expect(vp.getAttribute("aria-roledescription")).toBe("network");
    expect(vp.tabIndex).toBe(0);
    // Nodes are drawn, not focusable: one stop for the whole graph.
    expect(container.querySelectorAll("[data-slot='network-node'][tabindex]").length).toBe(0);
  });

  test("focus starts on the selection and is announced with type, hops and neighbours", async () => {
    const { container } = await mount(circle({ defaultSelected: "aicher", hiddenNeighbours: { hfg: 12 }, onExpandRequest: () => {} }));
    await enter();
    expect(announced(container)).toBe("Otl Aicher, Person. Selected. 4 neighbours.");
  });
});

describe("the Network sheet's keyboard model", () => {
  test("Down and Up move round the focused node's ring, and come back round", async () => {
    const { container } = await mount(circle({ defaultSelected: "aicher" }));
    await enter();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    // Now on a ring-1 node. Four nodes share ring 1; four Downs come home.
    const first = announced(container).split(",")[0];
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      await userEvent.keyboard("{ArrowDown}");
      seen.add(announced(container).split(",")[0]!);
      expect(announced(container)).toContain("1 hop from Otl Aicher");
    }
    expect(seen.size).toBe(4);
    expect(announced(container).split(",")[0]).toBe(first);
    await userEvent.keyboard("{ArrowUp}");
    expect(announced(container).split(",")[0]).not.toBe(first);
  });

  test("Right steps onto a relation, read from the far node, and Right again crosses it", async () => {
    const onExpandRequest = vi.fn();
    const { container } = await mount(circle({ defaultSelected: "aicher", hiddenNeighbours: { hfg: 12 }, onExpandRequest }));
    await enter();
    await userEvent.keyboard("{ArrowRight}");
    let text = announced(container);
    for (let i = 0; i < 4 && !text.startsWith("HfG Ulm"); i++) {
      await userEvent.keyboard("{ArrowDown}");
      text = announced(container);
    }
    expect(text).toMatch(/^HfG Ulm, Organisation\. Otl Aicher co-founded it\. \d of 4 neighbours\. 12 more not shown: press Plus to expand\.$/);
    // Plus expands the far node; it does not zoom.
    await userEvent.keyboard("+");
    expect(onExpandRequest).toHaveBeenCalledWith(expect.objectContaining({ id: "hfg" }));
    await userEvent.keyboard("{ArrowRight}");
    expect(announced(container)).toMatch(/^HfG Ulm, Organisation\. 1 hop from Otl Aicher\. 2 neighbours\./);
  });

  test("Left steps back from a relation, and Escape does the same", async () => {
    const { container } = await mount(circle({ defaultSelected: "aicher" }));
    await enter();
    await userEvent.keyboard("{ArrowLeft}");
    expect(announced(container)).toContain("of 4 neighbours");
    await userEvent.keyboard("{ArrowLeft}");
    expect(announced(container)).toMatch(/^Otl Aicher, Person/);
    await userEvent.keyboard("{ArrowRight}{Escape}");
    expect(announced(container)).toMatch(/^Otl Aicher, Person/);
  });

  test("an inferred relation is named in words", async () => {
    const { container } = await mount(circle({ defaultSelected: "aicher" }));
    await enter();
    await userEvent.keyboard("{ArrowRight}");
    let text = announced(container);
    for (let i = 0; i < 4 && !text.startsWith("Max Bill"); i++) {
      await userEvent.keyboard("{ArrowDown}");
      text = announced(container);
    }
    expect(text).toContain("Otl Aicher colleague of it (inferred).");
  });

  test("Enter selects, Escape clears, and Escape again hands focus back", async () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();
    const { container, node } = await mount(circle({ rootId: "brockmann", onSelect, onDismiss }));
    await enter();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "brockmann" }));
    expect(node("brockmann").dataset.state).toBe("selected");
    await userEvent.keyboard("{Escape}");
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(announced(container)).toBe("Selection cleared.");
    await userEvent.keyboard("{Escape}");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("Plus zooms when the node has nothing to expand", async () => {
    const onExpandRequest = vi.fn();
    const { q } = await mount(circle({ rootId: "rotis", onExpandRequest }));
    await enter();
    const before = q("network-world").style.transform;
    await userEvent.keyboard("+");
    expect(onExpandRequest).not.toHaveBeenCalled();
    expect(q("network-world").style.transform).not.toBe(before);
  });

  test("Tab walks the relations and then leaves", async () => {
    const after = document.createElement("button");
    after.textContent = "after";
    const { container } = await mount(circle({ rootId: "brockmann" }));
    document.body.appendChild(after);
    await enter();
    await userEvent.tab();
    expect(announced(container)).toMatch(/^Zürich, Place\./);
    await userEvent.tab();
    expect(document.activeElement).toBe(after);
    after.remove();
  });
});

describe("what the sheet draws", () => {
  test("a typed node: canvas fill, its slot's wash and a 1.5px ring in the slot's solid", async () => {
    const { node } = await mount(circle());
    const [, wash, ring] = [...node("aicher").querySelectorAll("circle")];
    expect(getComputedStyle(wash!).fill).toBe(tokenColor("--ui-data-cat-1-bg"));
    expect(getComputedStyle(ring!).stroke).toBe(tokenColor("--ui-data-cat-1-solid"));
    expect(getComputedStyle(ring!).strokeWidth).toBe("1.5px");
    expect(ring!.getAttribute("r")).toBe("19.25");
  });

  test("the selected node: no wash, a 2px ring in primary ink; its relations go active; outsiders dim", async () => {
    const { node, container } = await mount(circle({ defaultSelected: "aicher" }));
    const circles = [...node("aicher").querySelectorAll("circle")];
    expect(circles.length).toBe(2);
    expect(getComputedStyle(circles[1]!).stroke).toBe(tokenColor("--ui-text-primary"));
    expect(getComputedStyle(circles[1]!).strokeWidth).toBe("2px");
    expect(getComputedStyle(node("brockmann")).opacity).toBe("0.32");
    expect(getComputedStyle(node("hfg")).opacity).toBe("1");
    const active = container.querySelectorAll('[data-slot="network-edge"][data-state="active"]');
    expect(active.length).toBe(4); // all four of Aicher's relations, the inferred one included
  });

  test("an inferred edge is thinner, muted, has no arrow, and says so in its label", async () => {
    const { container, all } = await mount(circle());
    const inferred = container.querySelector<SVGGElement>('[data-slot="network-edge"][data-state="inferred"]')!;
    const paths = inferred.querySelectorAll("path");
    expect(paths.length).toBe(1);
    expect(getComputedStyle(paths[0]!).strokeWidth).toBe("1.5px");
    expect(getComputedStyle(paths[0]!).stroke).toBe(tokenColor("--ui-text-muted"));
    expect(all("network-edge-label").map((l) => l.textContent)).toContain("colleague of · inferred");
  });

  test("the keyboard focus ring is drawn at r23 in the focus colour", async () => {
    const { container } = await mount(circle({ rootId: "rotis" }));
    await enter();
    const ring = container.querySelector<SVGCircleElement>('[data-slot="network-focus-ring"]')!;
    expect(ring.getAttribute("r")).toBe("23");
    expect(getComputedStyle(ring).stroke).toBe(tokenColor("--ui-border-focus"));
  });

  test("the +N chip names its node and count, and asks for the expansion", async () => {
    const onExpandRequest = vi.fn();
    const { q } = await mount(circle({ hiddenNeighbours: { hfg: 12 }, onExpandRequest }));
    const chip = q<HTMLButtonElement>("network-expand");
    expect(chip.getAttribute("aria-label")).toBe("Expand HfG Ulm, 12 more");
    expect(getComputedStyle(chip).height).toBe("24px");
    expect(getComputedStyle(chip).borderTopColor).toBe(tokenColor("--ui-border-control"));
    await userEvent.click(chip);
    expect(onExpandRequest).toHaveBeenCalledWith(expect.objectContaining({ id: "hfg" }));
  });

  test("a click on a node selects it", async () => {
    const onSelect = vi.fn();
    const { node, q } = await mount(circle({ onSelect }));
    await settled(q("network-world"));
    await userEvent.click(node("rotis"));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "rotis" }));
  });

  test("without types, the ninth type folds into Other", async () => {
    const nodes = Array.from({ length: 9 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}`, type: `t${i}` }));
    const edges = nodes.slice(1).map((n, i) => ({ id: `e${i}`, source: "n0", target: n.id }));
    const { node } = await mount(<Network label="Types" description="Nine types." nodes={nodes} edges={edges} />);
    expect(getComputedStyle([...node("n7").querySelectorAll("circle")][2]!).stroke).toBe(tokenColor("--ui-data-cat-8-solid"));
    const other = [...node("n8").querySelectorAll("circle")];
    expect(other.length).toBe(2); // canvas fill and ring: no wash
    expect(getComputedStyle(other[1]!).stroke).toBe(tokenColor("--ui-border-control"));
  });
});

describe("layout", () => {
  test("the same seed draws the same picture", async () => {
    const a = await mount(circle());
    const first = a.all("network-node").map((g) => JSON.stringify(centreOf(g as unknown as SVGGElement)));
    act(() => root?.unmount());
    container?.remove();
    const b = await mount(circle());
    expect(b.all("network-node").map((g) => JSON.stringify(centreOf(g as unknown as SVGGElement)))).toEqual(first);
  });

  test("expanding a node keeps every node already drawn where it was", async () => {
    const { node, rerender } = await mount(circle());
    const before = Object.fromEntries(NODES.map((n) => [n.id, centreOf(node(n.id))]));
    const more = [{ id: "gerstner", label: "Karl Gerstner", type: "person" }, { id: "crouwel", label: "Wim Crouwel", type: "person" }];
    await rerender(circle({ nodes: [...NODES, ...more], edges: [...EDGES, ...more.map((m, i) => ({ id: `m${i}`, source: m.id, target: "hfg" }))] }));
    for (const n of NODES) expect(centreOf(node(n.id))).toEqual(before[n.id]);
    // The new ones land near what they hang from.
    const hfg = before.hfg!;
    const g = centreOf(node("gerstner"));
    expect(Math.hypot(g.x - hfg.x, g.y - hfg.y)).toBeLessThan(400);
  });

  test("above the threshold the layout runs in a worker, and draws what the main thread would", async () => {
    const random = seededRandom(3);
    const nodes = Array.from({ length: 60 }, (_, i) => ({ id: `n${i}`, label: `N${i}` }));
    const edges = nodes.slice(1).map((n, i) => ({ id: `e${i}`, source: n.id, target: `n${Math.floor(random() * (i + 1))}` }));
    const main = await mount(<Network label="Sixty" description="A tree." nodes={nodes} edges={edges} />);
    const expected = main.all("network-node").map((g) => JSON.stringify(centreOf(g as unknown as SVGGElement)));
    act(() => root?.unmount());
    container?.remove();
    const off = await mount(<Network label="Sixty" description="A tree." nodes={nodes} edges={edges} workerThreshold={10} />);
    await vi.waitFor(() => expect(off.all("network-node").length).toBe(60), { timeout: 5000 });
    expect(off.all("network-node").map((g) => JSON.stringify(centreOf(g as unknown as SVGGElement)))).toEqual(expected);
  });

  test("the server draws a small graph in full", () => {
    const html = renderToString(circle());
    expect(html).toContain('data-slot="network-node"');
    expect(html).toContain("Josef Müller-Brockmann");
  });
});

describe("the table and the Canvas tier", () => {
  test("the table view lists every relation with the sheet's four columns", async () => {
    const { q, container } = await mount(circle());
    await userEvent.click(q("network-table-toggle"));
    const headers = [...container.querySelectorAll("th")].map((th) => th.textContent?.trim());
    expect(headers).toEqual(["Node", "Relation", "Neighbour", "Type"]);
    expect(container.querySelectorAll("tbody tr").length).toBe(EDGES.length);
    expect(container.textContent).toContain("colleague of (inferred)");
  });

  test("a renderer is admitted only above the threshold", async () => {
    const small = await mount(circle({ renderer: NetworkCanvas }));
    expect(small.q("network").dataset.renderer).toBe("svg");
    act(() => root?.unmount());
    container?.remove();
    const big = await mount(circle({ renderer: NetworkCanvas, canvasThreshold: 4 }));
    expect(big.q("network").dataset.renderer).toBe("custom");
    const canvas = big.q<HTMLCanvasElement>("network-canvas");
    const ctx = canvas.getContext("2d")!;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let painted = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) painted++;
    expect(painted).toBeGreaterThan(1000);
  });

  test("before hydration an admitted renderer is replaced by the table", () => {
    const html = renderToString(circle({ renderer: NetworkCanvas, canvasThreshold: 4 }));
    expect(html).toContain('data-slot="network-table"');
    expect(html).not.toContain("<canvas");
  });
});
