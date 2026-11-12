import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { Building, FileText, LocationPin, User } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { seededRandom, shortestPath, type GraphEdge, type GraphNode } from "@/lib/graph";

import { Network, type NetworkType } from "./network.tsx";
import { NetworkCanvas } from "./network-canvas.tsx";

const meta: Meta<typeof Network> = {
  title: "UI/Network",
  component: Network,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Network>;

const TYPES: Record<string, NetworkType> = {
  person: { label: "Person", slot: 1, glyph: <User /> },
  organisation: { label: "Organisation", slot: 2, glyph: <Building /> },
  work: { label: "Work", slot: 3, glyph: <FileText /> },
  place: { label: "Place", slot: 4, glyph: <LocationPin /> },
};

/** The Network sheet's neighbourhood round Otl Aicher. */
const NODES: GraphNode[] = [
  { id: "aicher", label: "Otl Aicher", type: "person", description: "Graphic designer, 1922 to 1991" },
  { id: "pictograms", label: "Munich pictograms", type: "work", description: "1972" },
  { id: "hfg", label: "HfG Ulm", type: "organisation", description: "School of design, 1953 to 1968" },
  { id: "rotis", label: "Rotis", type: "place" },
  { id: "bill", label: "Max Bill", type: "person", description: "Architect and designer" },
  { id: "brockmann", label: "Josef Müller-Brockmann", type: "person", description: "Grid systems" },
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
const MORE: GraphNode[] = [
  { id: "gerstner", label: "Karl Gerstner", type: "person" },
  { id: "crouwel", label: "Wim Crouwel", type: "person" },
  { id: "frutiger", label: "Adrian Frutiger", type: "person" },
];
const MORE_EDGES: GraphEdge[] = MORE.map((n, i) => ({ id: `m${i}`, source: n.id, target: "hfg", label: "lectured at" }));

const onSelect = fn();

export const Playground: Story = {
  render: function Render() {
    const [nodes, setNodes] = useState(NODES);
    const [edges, setEdges] = useState(EDGES);
    const expanded = nodes.length > NODES.length;
    return (
      <Network
        style={{ maxWidth: 960 }}
        label="Otl Aicher's circle"
        description="Aicher and Max Bill both co-founded HfG Ulm; the school links most of this neighbourhood."
        nodes={nodes}
        edges={edges}
        types={TYPES}
        defaultSelected="aicher"
        onSelect={onSelect}
        hiddenNeighbours={expanded ? {} : { hfg: MORE.length }}
        onExpandRequest={() => {
          setNodes([...NODES, ...MORE]);
          setEdges([...EDGES, ...MORE_EDGES]);
        }}
      >
        <Network.Controls />
      </Network>
    );
  },
};

export const Radial: Story = {
  render: () => (
    <Network
      style={{ maxWidth: 960 }}
      label="Round Otl Aicher"
      description="Everything within two hops of Aicher, one ring per hop."
      layout="radial"
      rootId="aicher"
      nodes={NODES}
      edges={EDGES}
      types={TYPES}
      onSelect={onSelect}
    >
      <Network.Controls />
    </Network>
  ),
};

/** Selection, a path, loading and empty. */
export const States: Story = {
  render: () => (
    <div className="grid max-w-[1200px] grid-cols-2 gap-xl">
      <Network label="Selected" description="Aicher's relations turn active; the rest of the graph recedes." nodes={NODES} edges={EDGES} types={TYPES} defaultSelected="aicher" height={400} />
      <Network
        label="Highlighted path"
        description="Müller-Brockmann reaches Aicher through Zürich and Max Bill."
        nodes={NODES}
        edges={EDGES}
        types={TYPES}
        highlight={shortestPath(EDGES, "brockmann", "aicher") ?? []}
        height={400}
      />
      <Network label="Loading" description="Waiting for the graph." nodes={[]} edges={[]} isLoading height={200} />
      <Network label="Empty" description="No entities yet." nodes={[]} edges={[]} height={200} />
    </div>
  ),
};

const DESIGNERS = ["Tschichold", "Müller-Brockmann", "Crouwel", "Frutiger", "Aicher", "Vignelli", "Gerstner", "Cooper", "Pineles", "Bayer", "Gutenberg", "Mergenthaler", "Bíró", "Marconi", "Tesla", "Diesel", "Lovelace", "Turing", "Lamarr", "Jacquard"];

/** A seeded random graph: a few hubs with many leaves, like a citation network. */
function bigGraph(count: number) {
  const random = seededRandom(7);
  const kinds = ["person", "organisation", "work", "place"];
  const nodes: GraphNode[] = Array.from({ length: count }, (_, i) => ({
    id: `n${i}`,
    label: `${DESIGNERS[i % DESIGNERS.length]} ${Math.floor(i / DESIGNERS.length) + 1}`,
    type: kinds[i % 4]!,
  }));
  const edges: GraphEdge[] = [];
  for (let i = 1; i < count; i++) {
    const to = Math.floor(Math.pow(random(), 2) * i);
    edges.push({ id: `e${i}`, source: `n${i}`, target: `n${to}` });
  }
  return { nodes, edges };
}

const SIX_HUNDRED = bigGraph(600);
const TWO_THOUSAND = bigGraph(2000);

/** Above 500 nodes the force layout runs in a worker; the frame shows its skeleton until it answers. */
export const InAWorker: Story = {
  render: () => (
    <Network
      style={{ maxWidth: 960 }}
      label="Six hundred entities"
      description="A few hubs hold most of the links."
      nodes={SIX_HUNDRED.nodes}
      edges={SIX_HUNDRED.edges}
      types={TYPES}
      height={560}
    >
      <Network.Controls />
    </Network>
  ),
};

/** 2,000 nodes and 1,999 edges: above the SVG ceiling, so the Canvas renderer is admitted. */
export const CanvasTier: Story = {
  render: () => (
    <Network
      style={{ maxWidth: 960 }}
      label="Two thousand entities"
      description="Drawn on one canvas; the table is the same graph as rows."
      nodes={TWO_THOUSAND.nodes}
      edges={TWO_THOUSAND.edges}
      types={TYPES}
      renderer={NetworkCanvas}
      height={560}
    >
      <Network.Controls />
    </Network>
  ),
};

const STRESS_BRAND: ThemeSeed = {
  colors: {
    bg: "#fffdf5", surface: "#ffffff", muted: "#f4ecd8",
    textPrimary: "#1a1400", textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)", accent: "#ffe066",
  },
};

export const BrandThemed: Story = {
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex flex-1 flex-col gap-lg bg-base p-lg">
        <p className="text-caption text-ink-muted">{title}</p>
        <Network label="Otl Aicher's circle" description="HfG Ulm links most of it." nodes={NODES} edges={EDGES} types={TYPES} defaultSelected="aicher" height={420}>
          <Network.Controls />
        </Network>
      </div>
    );
    return (
      <div style={{ maxWidth: 1200 }} className="flex gap-xl">
        <Panel style={zero as React.CSSProperties} title="theme zero" />
        <Panel style={brand as React.CSSProperties} title="stress brand — pale yellow accent" />
      </div>
    );
  },
};
