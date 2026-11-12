import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "react";
import type { ReactElement } from "react";

import type { GraphEdge, GraphNode } from "@/lib/graph";

import { Diagram } from "./diagram.tsx";

const NODES: GraphNode[] = [
  { id: "brief", label: "Brief", description: "Muriel Cooper" },
  { id: "grid", label: "Grid system", description: "Josef Müller-Brockmann" },
  { id: "layout", label: "Layout", description: "Jan Tschichold" },
  { id: "proof", label: "Proof", description: "Wim Crouwel", parentId: "print" },
  { id: "press", label: "Press", description: "Ottmar Mergenthaler", parentId: "print" },
];
const EDGES: GraphEdge[] = [
  { id: "e1", source: "brief", target: "grid", label: "informs" },
  { id: "e2", source: "brief", target: "layout", label: "informs" },
  { id: "e3", source: "grid", target: "proof", isInferred: true },
  { id: "e4", source: "layout", target: "proof", label: "approved" },
  { id: "e5", source: "proof", target: "press" },
];

function tokenColor(name: string, prop: "color" | "backgroundColor" = "color"): string {
  const probe = document.createElement("div");
  probe.style[prop] = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe)[prop];
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
  const node = (id: string) => container!.querySelector<HTMLElement>(`[data-slot="diagram-node"][data-id="${id}"]`)!;
  return { q, all, node, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const pipeline = (props: Partial<React.ComponentProps<typeof Diagram>> = {}, children?: React.ReactNode) => (
  <Diagram label="Print run" description="Every layout passes a proof." nodes={NODES} edges={EDGES} {...props}>
    {children ?? (
      <>
        <Diagram.Group id="print" label="Print run" />
        <Diagram.Controls />
        <Diagram.Minimap />
        <Diagram.Legend />
      </>
    )}
  </Diagram>
);

/** Wait for the world layer's transform transition to finish. */
async function settled(el: Element) {
  await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
}

/** Tab past the list toggle onto the drawing. */
async function enter() {
  await userEvent.tab();
  await userEvent.tab();
}

const announced = (c: HTMLElement) => c.querySelector('[data-slot="diagram-announcer"]')!.textContent ?? "";

describe("Diagram is a named figure with one tab stop", () => {
  test("the figure is named and described; the drawing is a labelled group", async () => {
    const { q } = await mount(pipeline());
    const fig = q("diagram");
    expect(fig.tagName).toBe("FIGURE");
    expect(document.getElementById(fig.getAttribute("aria-labelledby")!)!.textContent).toBe("Print run");
    expect(document.getElementById(fig.getAttribute("aria-describedby")!)!.textContent).toBe("Every layout passes a proof.");
    const vp = q("diagram-viewport");
    expect(vp.getAttribute("role")).toBe("group");
    expect(vp.getAttribute("aria-roledescription")).toBe("diagram");
    expect(vp.tabIndex).toBe(0);
    // Nodes are pictures of what the announcer says, not extra stops.
    for (const n of q("diagram").querySelectorAll('[data-slot="diagram-node"]')) expect(n.getAttribute("aria-hidden")).toBe("true");
  });

  test("server markup lays out against the size hint and does not throw", () => {
    const html = renderToString(pipeline());
    expect(html).toContain('data-slot="diagram-node"');
    // 5 nodes, 5 edges, one expanded group.
    expect(html.match(/data-slot="diagram-node"/g)).toHaveLength(5);
    expect(html.match(/data-slot="diagram-edge"/g)).toHaveLength(5);
    expect(html).toContain('data-slot="diagram-group"');
  });

  test("two renders of the same data lay out identically", async () => {
    const one = await mount(pipeline());
    const a = NODES.map((n) => one.node(n.id).style.cssText);
    act(() => root?.unmount());
    container?.remove();
    const two = await mount(pipeline());
    expect(NODES.map((n) => two.node(n.id).style.cssText)).toEqual(a);
  });
});

describe("Nodes, edges and groups are drawn as the sheet draws them", () => {
  test("a node is 160 wide, at least 56 tall, bg-surface with a 1.5px border-strong ring", async () => {
    const { node } = await mount(pipeline());
    const n = node("brief");
    const cs = getComputedStyle(n);
    expect(n.offsetWidth).toBe(160);
    expect(n.offsetHeight).toBeGreaterThanOrEqual(56);
    expect(cs.backgroundColor).toBe(tokenColor("--ui-bg-surface", "backgroundColor"));
    expect(cs.borderTopColor).toBe(tokenColor("--ui-border-strong"));
    // The USED width: Chromium snaps 1.5px to whole device pixels, so compare
    // with a probe carrying the token rather than with the declared string.
    const probe = document.createElement("div");
    probe.style.border = "var(--ui-stroke-hairline) solid";
    document.body.appendChild(probe);
    expect(cs.borderTopWidth).toBe(getComputedStyle(probe).borderTopWidth);
    probe.remove();
  });

  test("an edge's tip lands on its target's frame, and its stroke is 2px border-control", async () => {
    const { container: c, node } = await mount(pipeline());
    const world = c.querySelector('[data-slot="diagram-world"]')!;
    await settled(world);
    const edge = c.querySelectorAll<SVGGElement>('[data-slot="diagram-edge"]')[0]!;
    const [stroke, head] = [...edge.querySelectorAll("path")];
    expect(getComputedStyle(stroke!).strokeWidth).toBe("2px");
    expect(getComputedStyle(stroke!).stroke).toBe(tokenColor("--ui-border-control"));
    // The head's tip is its first vertex; in screen space it must touch the grid node's top edge.
    const tip = head!.getAttribute("d")!.match(/^M([\d.-]+) ([\d.-]+)/)!.slice(1).map(Number) as [number, number];
    const svg = edge.ownerSVGElement!;
    const pt = svg.createSVGPoint();
    pt.x = tip[0];
    pt.y = tip[1];
    const screen = pt.matrixTransform(svg.getScreenCTM()!);
    const target = node("grid").getBoundingClientRect();
    expect(Math.abs(screen.y - target.top)).toBeLessThan(1);
    expect(screen.x).toBeGreaterThan(target.left);
    expect(screen.x).toBeLessThan(target.right);
  });

  test("an inferred edge is muted, thinner, solid, and says so in words", async () => {
    const { container: c } = await mount(pipeline());
    const inferred = c.querySelector<SVGGElement>('[data-slot="diagram-edge"][data-state="inferred"]')!;
    const stroke = inferred.querySelector("path")!;
    const cs = getComputedStyle(stroke);
    expect(cs.strokeWidth).toBe("1.5px");
    expect(cs.stroke).toBe(tokenColor("--ui-text-muted"));
    expect(cs.strokeDasharray).toBe("none");
    const labels = [...c.querySelectorAll('[data-slot="diagram-edge-label"]')].map((l) => l.textContent);
    expect(labels).toContain("inferred");
  });

  test("a group draws round its members and collapses to one node carrying their edges", async () => {
    const { q, all, node, container: c } = await mount(pipeline());
    const group = q("diagram-group").getBoundingClientRect();
    for (const id of ["proof", "press"]) {
      const r = node(id).getBoundingClientRect();
      expect(r.left).toBeGreaterThanOrEqual(group.left);
      expect(r.bottom).toBeLessThanOrEqual(group.bottom);
    }
    await userEvent.click(q("diagram-group-toggle"));
    await frames();
    expect(all("diagram-group")).toHaveLength(0);
    const collapsed = c.querySelector<HTMLElement>('[data-slot="diagram-node"][data-group="collapsed"]')!;
    expect(collapsed.textContent).toContain("Print run");
    expect(collapsed.textContent).toContain("2 nodes, 1 edge inside");
    expect(collapsed.offsetWidth).toBe(208);
    // layout → proof is now layout → the group; proof → press is inside and gone.
    expect(all("diagram-edge")).toHaveLength(4);
  });

  test("selection paints bg-selected with a 2px primary border, and its edges turn active", async () => {
    const onSelect = vi.fn();
    const { node, container: c } = await mount(pipeline({ onSelect }));
    await userEvent.click(node("layout"));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "layout" }));
    const cs = getComputedStyle(node("layout"));
    expect(cs.backgroundColor).toBe(tokenColor("--ui-bg-selected", "backgroundColor"));
    expect(cs.borderTopWidth).toBe("2px");
    expect(cs.borderTopColor).toBe(tokenColor("--ui-text-primary"));
    expect(c.querySelectorAll('[data-slot="diagram-edge"][data-state="active"]')).toHaveLength(2);
    // Muted ink is measured on bg-surface, not bg-selected; on the selected fill the description steps up to primary.
    const description = (id: string) => getComputedStyle(node(id).querySelector('[data-slot="diagram-node-description"]')!).color;
    expect(description("layout")).toBe(tokenColor("--ui-text-primary"));
    expect(description("brief")).toBe(tokenColor("--ui-text-muted"));
  });

  test("a highlighted path keeps its nodes and dims the rest", async () => {
    const { node } = await mount(pipeline({ highlight: ["brief", "layout", "proof"] }));
    expect(getComputedStyle(node("layout")).opacity).toBe("1");
    expect(getComputedStyle(node("grid")).opacity).toBe("0.32");
  });
});

describe("The keyboard reaches every node with its relations announced", () => {
  test("Tab enters on the first node in reading order and announces it", async () => {
    const { container: c, node } = await mount(pipeline());
    await enter();
    expect(document.activeElement?.getAttribute("data-slot")).toBe("diagram-viewport");
    expect(announced(c)).toContain("Brief, Muriel Cooper.");
    expect(announced(c)).toContain("2 relations: Brief informs Grid system; Brief informs Layout.");
    await settled(c);
    expect(getComputedStyle(node("brief")).boxShadow).not.toBe("none");
  });

  test("arrows move to the nearest node in that direction; every node is reachable", async () => {
    const { container: c } = await mount(pipeline());
    await enter();
    const seen = new Set<string>();
    const read = () => announced(c).split(",")[0]!;
    seen.add(read());
    for (const key of ["{ArrowDown}", "{ArrowRight}", "{ArrowLeft}", "{ArrowDown}", "{ArrowDown}", "{ArrowUp}"]) {
      await userEvent.keyboard(key);
      seen.add(read());
    }
    expect([...seen].sort()).toEqual(["Brief", "Grid system", "Layout", "Press", "Proof"].sort());
  });

  test("Tab walks the relations, Enter follows one, then Tab leaves", async () => {
    const { container: c } = await mount(
      <>
        {pipeline()}
        <button type="button">after</button>
      </>,
    );
    await enter();
    await userEvent.keyboard("{Tab}");
    expect(announced(c)).toMatch(/^Brief informs Grid system\. Relation 1 of 2\./);
    await userEvent.keyboard("{Tab}");
    expect(announced(c)).toMatch(/^Brief informs Layout\. Relation 2 of 2\./);
    await userEvent.keyboard("{Enter}");
    expect(announced(c)).toMatch(/^Layout, Jan Tschichold\./);
    // Layout has two relations; walk them both, then the next Tab leaves.
    await userEvent.keyboard("{Tab}{Tab}");
    expect(announced(c)).toMatch(/^Layout approved Proof\. Relation 2 of 2\./);
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Zoom in");
  });

  test("Enter selects, Escape clears", async () => {
    const onSelect = vi.fn();
    const { container: c } = await mount(pipeline({ onSelect }));
    await enter();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "brief" }));
    expect(announced(c)).toBe("Brief, selected.");
    await userEvent.keyboard("{Escape}");
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  test("Space closes the group a node is in, and opens it again", async () => {
    const { container: c, all } = await mount(pipeline({ defaultSelected: "proof" }));
    await enter();
    expect(announced(c)).toContain("In Print run.");
    await userEvent.keyboard(" ");
    expect(all("diagram-group")).toHaveLength(0);
    expect(announced(c)).toBe("Print run, collapsed.");
    await userEvent.keyboard(" ");
    expect(all("diagram-group")).toHaveLength(1);
    expect(announced(c)).toBe("Print run, expanded.");
  });

  test("+, - and 0 zoom and fit; the Controls do the same", async () => {
    const { q, container: c } = await mount(pipeline());
    const world = q("diagram-world");
    const scale = () => new DOMMatrix(getComputedStyle(world).transform).a;
    await settled(world);
    const fitted = scale();
    await enter();
    await userEvent.keyboard("+");
    await settled(world);
    expect(scale()).toBeCloseTo(Math.min(2, fitted * 1.25), 3);
    await userEvent.keyboard("0");
    await settled(world);
    expect(scale()).toBeCloseTo(fitted, 3);
    await userEvent.click(c.querySelector('[aria-label="Zoom out"]')!);
    await settled(world);
    expect(scale()).toBeCloseTo(fitted * 0.8, 3);
  });

  test("the view follows focus to a node outside the frame (SC 2.4.11)", async () => {
    const { q, node, container: c } = await mount(pipeline({ height: 240 }));
    const world = q("diagram-world");
    await enter();
    // Zoom right in so most of the drawing is off-screen, then walk to the press.
    for (let i = 0; i < 4; i++) await userEvent.keyboard("+");
    await userEvent.keyboard("{End}");
    await settled(world);
    const frame = q("diagram-frame").getBoundingClientRect();
    const r = node("press").getBoundingClientRect();
    expect(announced(c)).toMatch(/^Press/);
    expect(r.top).toBeGreaterThanOrEqual(frame.top);
    expect(r.bottom).toBeLessThanOrEqual(frame.bottom);
  });
});

describe("The adjacency list holds every fact", () => {
  test("each node lists its relations, and a relation moves focus to its node", async () => {
    const { q, container: c } = await mount(pipeline());
    await userEvent.click(q("diagram-list-toggle"));
    expect(q("diagram-list-toggle").getAttribute("aria-pressed")).toBe("true");
    const list = q("diagram-list");
    expect(list.querySelectorAll(":scope > li")).toHaveLength(5);
    expect(list.textContent).toContain("links to Proof (inferred)");
    const rel = [...c.querySelectorAll("button")].find((b) => b.textContent === "informs Layout")!;
    await userEvent.click(rel);
    expect(document.activeElement?.textContent).toMatch(/^Layout/);
    expect(list.textContent).toContain("(inferred)");
    expect(list.textContent).toContain("In Print run");
  });
});
