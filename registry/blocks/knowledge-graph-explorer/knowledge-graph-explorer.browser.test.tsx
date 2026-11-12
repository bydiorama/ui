import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { createRoot, type Root } from "react-dom/client";
import { act, useState } from "react";
import type { ReactElement } from "react";

import type { GraphEdge, GraphNode } from "@/lib/graph";
import type { NetworkType } from "@/ui/network";

import { KnowledgeGraphExplorer } from "./knowledge-graph-explorer.tsx";

const TYPES: Record<string, NetworkType> = {
  person: { label: "Person", slot: 1 },
  organisation: { label: "Organisation", slot: 2 },
  work: { label: "Work", slot: 3 },
  place: { label: "Place", slot: 4 },
};
const NODES: GraphNode[] = [
  { id: "aicher", label: "Otl Aicher", type: "person", description: "Graphic designer, 1922 to 1991." },
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

let container: HTMLDivElement | null = null;
let root: Root | null = null;
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

async function mount(ui: ReactElement) {
  container = document.createElement("div");
  container.style.width = "1200px";
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  await frames();
  await act(async () => {});
  const q = <T extends Element = HTMLElement>(slot: string) => container!.querySelector<T>(`[data-slot="${slot}"]`)!;
  return { q, container: container! };
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const explorer = (props: Partial<React.ComponentProps<typeof KnowledgeGraphExplorer>> = {}) => (
  <KnowledgeGraphExplorer label="Otl Aicher's circle" description="HfG Ulm links most of it." nodes={NODES} edges={EDGES} types={TYPES} {...props} />
);

const historyText = (c: HTMLElement) =>
  [...c.querySelectorAll('[data-slot="knowledge-graph-explorer-history"] li')].map((li) => li.textContent);

describe("KnowledgeGraphExplorer", () => {
  test("the detail panel names the selection, its type and its relations", async () => {
    const { q, container } = await mount(explorer({ defaultSelected: "aicher" }));
    const panel = q("knowledge-graph-explorer-detail");
    expect(panel.getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.getElementById(panel.getAttribute("aria-labelledby")!)!.textContent).toBe("Otl Aicher");
    // A group, not a landmark, and the history nav carries the explorer's own name — two explorers on a page stay apart.
    expect(panel.getAttribute("role")).toBe("group");
    expect(q("knowledge-graph-explorer-history").getAttribute("aria-label")).toBe("History, Otl Aicher's circle");
    expect(q("knowledge-graph-explorer-type").textContent).toBe("Person");
    const rows = [...container.querySelectorAll('[data-slot="knowledge-graph-explorer-relation"]')].map((r) => r.textContent);
    expect(rows).toEqual(["designedMunich pictograms", "co-foundedHfG Ulm", "lived inRotis", "colleague ofMax Billinferred"]);
  });

  test("a relation row walks to its neighbour and the history records the way", async () => {
    const onSelect = vi.fn();
    const { container } = await mount(explorer({ defaultSelected: "aicher", onSelect }));
    const row = [...container.querySelectorAll<HTMLButtonElement>('[data-slot="knowledge-graph-explorer-relation"]')].find((r) => r.textContent?.includes("HfG Ulm"))!;
    await userEvent.click(row);
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "hfg" }));
    expect(historyText(container)).toEqual(["Otl Aicher", "HfG Ulm"]);
    // The incoming relations are listed apart, read from the other end.
    expect(container.textContent).toContain("Linked from");
    // Back through the history: the later step is dropped.
    await userEvent.click(container.querySelector<HTMLButtonElement>('[data-slot="knowledge-graph-explorer-history"] button')!);
    expect(historyText(container)).toEqual(["Otl Aicher"]);
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "aicher" }));
  });

  test("a jump of more than one hop highlights the path between", async () => {
    const { container } = await mount(explorer({ defaultSelected: "rotis" }));
    const input = container.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    await userEvent.click(input);
    await userEvent.keyboard("Zür");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(historyText(container)).toEqual(["Rotis", "Zürich"]);
    // Rotis → Aicher → Bill → Zürich: everything else recedes.
    const dimmed = (id: string) => getComputedStyle(container.querySelector(`[data-slot="network-node"][data-id="${id}"]`)!).opacity;
    expect(dimmed("aicher")).toBe("1");
    expect(dimmed("bill")).toBe("1");
    expect(dimmed("hfg")).toBe("0.32");
    expect(dimmed("brockmann")).toBe("0.32");
  });

  test("the type filter hides a type, counts it, and says how much is shown", async () => {
    const { q, container } = await mount(explorer({ total: 1284 }));
    expect(q("knowledge-graph-explorer-shown").textContent).toBe("7 of 1,284 shown");
    const place = [...container.querySelectorAll("label")].find((l) => l.textContent?.startsWith("Place"))!;
    expect(place.textContent).toBe("Place2");
    await userEvent.click(place);
    expect(q("knowledge-graph-explorer-shown").textContent).toBe("5 of 1,284 shown");
    expect(container.querySelector('[data-slot="network-node"][data-id="zurich"]')).toBeNull();
    expect(container.querySelector('[data-slot="network-node"][data-id="aicher"]')).not.toBeNull();
  });

  test("Expand neighbours asks for them, with the count, and grows the graph in place", async () => {
    const MORE = { id: "gerstner", label: "Karl Gerstner", type: "person" };
    function Harness() {
      const [nodes, setNodes] = useState(NODES);
      const [edges, setEdges] = useState(EDGES);
      const grown = nodes.length > NODES.length;
      return (
        <KnowledgeGraphExplorer
          label="Circle"
          description="Grows."
          nodes={nodes}
          edges={edges}
          types={TYPES}
          defaultSelected="hfg"
          hiddenNeighbours={grown ? {} : { hfg: 1 }}
          onExpandRequest={() => {
            setNodes([...NODES, MORE]);
            setEdges([...EDGES, { id: "m", source: "gerstner", target: "hfg", label: "lectured at" }]);
          }}
        />
      );
    }
    const { container } = await mount(<Harness />);
    const centre = (id: string) => container.querySelector(`[data-slot="network-node"][data-id="${id}"] circle`)!.getAttribute("cx");
    const before = centre("aicher");
    const button = [...container.querySelectorAll("button")].find((b) => b.textContent === "Expand neighbours (1)")!;
    await userEvent.click(button);
    await frames();
    expect(container.querySelector('[data-slot="network-node"][data-id="gerstner"]')).not.toBeNull();
    expect(centre("aicher")).toBe(before);
    expect([...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith("Expand neighbours"))!.disabled).toBe(true);
  });

  test("the toolbar's toggle swaps the drawing for the table", async () => {
    const { container } = await mount(explorer());
    const toggle = container.querySelector<HTMLButtonElement>('button[aria-label="View as table"]')!;
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector('[data-slot="network-table"]')).not.toBeNull();
    // Network's own head stays for assistive tech only.
    expect(container.querySelector('[data-slot="network-table-toggle"]')).toBeNull();
  });

  test("Close clears the selection and the panel asks for one", async () => {
    const onSelect = vi.fn();
    const { container } = await mount(explorer({ defaultSelected: "aicher", onSelect }));
    await userEvent.click(container.querySelector<HTMLButtonElement>('button[aria-label="Close details"]')!);
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(container.textContent).toContain("Select an entity to read its relations.");
  });
});
