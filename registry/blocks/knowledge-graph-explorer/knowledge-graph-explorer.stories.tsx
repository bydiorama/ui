import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { fn } from "storybook/test";
import { Building, FileText, LocationPin, User } from "griddy-icons";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import type { GraphEdge, GraphNode } from "@/lib/graph";
import type { NetworkType } from "@/ui/network";

import { KnowledgeGraphExplorer } from "./knowledge-graph-explorer.tsx";

const meta: Meta<typeof KnowledgeGraphExplorer> = {
  title: "Blocks/KnowledgeGraphExplorer",
  component: KnowledgeGraphExplorer,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof KnowledgeGraphExplorer>;

const TYPES: Record<string, NetworkType> = {
  person: { label: "Person", slot: 1, glyph: <User /> },
  organisation: { label: "Organisation", slot: 2, glyph: <Building /> },
  work: { label: "Work", slot: 3, glyph: <FileText /> },
  place: { label: "Place", slot: 4, glyph: <LocationPin /> },
};

/** The whole store: what a server would answer from, a neighbourhood at a time. */
const STORE_NODES: GraphNode[] = [
  { id: "aicher", label: "Otl Aicher", type: "person", description: "Graphic designer, 1922 to 1991. Ulm and Rotis." },
  { id: "bill", label: "Max Bill", type: "person", description: "Architect, artist and designer." },
  { id: "brockmann", label: "Josef Müller-Brockmann", type: "person", description: "Grid systems." },
  { id: "bayer", label: "Herbert Bayer", type: "person", description: "Universal typeface, 1925." },
  { id: "tschichold", label: "Jan Tschichold", type: "person", description: "Asymmetric typography." },
  { id: "gerstner", label: "Karl Gerstner", type: "person", description: "Programme design." },
  { id: "crouwel", label: "Wim Crouwel", type: "person", description: "New Alphabet, 1967." },
  { id: "frutiger", label: "Adrian Frutiger", type: "person", description: "Univers, 1957." },
  { id: "vignelli", label: "Massimo Vignelli", type: "person", description: "Signage and identity." },
  { id: "hfg", label: "HfG Ulm", type: "organisation", description: "School of design, 1953 to 1968." },
  { id: "bauhaus", label: "Bauhaus", type: "organisation", description: "School of art and design, 1919 to 1933." },
  { id: "total", label: "Total Design", type: "organisation", description: "Studio, Amsterdam, 1963." },
  { id: "unimark", label: "Unimark International", type: "organisation", description: "Studio, 1965." },
  { id: "pictograms", label: "Munich pictograms", type: "work", description: "Olympic Games, 1972." },
  { id: "rotis-type", label: "Rotis typeface", type: "work", description: "1988." },
  { id: "universal", label: "Universal typeface", type: "work", description: "1925." },
  { id: "new-alphabet", label: "New Alphabet", type: "work", description: "1967." },
  { id: "univers", label: "Univers", type: "work", description: "1957." },
  { id: "rotis", label: "Rotis", type: "place" },
  { id: "zurich", label: "Zürich", type: "place" },
  { id: "ulm", label: "Ulm", type: "place" },
  { id: "dessau", label: "Dessau", type: "place" },
  { id: "basel", label: "Basel", type: "place" },
  { id: "amsterdam", label: "Amsterdam", type: "place" },
  { id: "paris", label: "Paris", type: "place" },
  { id: "milan", label: "Milan", type: "place" },
  { id: "munich", label: "Munich", type: "place" },
];
const STORE_EDGES: GraphEdge[] = [
  { id: "r1", source: "aicher", target: "pictograms", label: "designed" },
  { id: "r2", source: "aicher", target: "hfg", label: "co-founded" },
  { id: "r3", source: "aicher", target: "rotis", label: "lived in" },
  { id: "r4", source: "aicher", target: "bill", label: "colleague of", isInferred: true },
  { id: "r5", source: "bill", target: "hfg", label: "co-founded" },
  { id: "r6", source: "bill", target: "zurich", label: "worked in" },
  { id: "r7", source: "brockmann", target: "zurich", label: "worked in" },
  { id: "r8", source: "aicher", target: "rotis-type", label: "designed" },
  { id: "r9", source: "bill", target: "bauhaus", label: "studied at" },
  { id: "r10", source: "brockmann", target: "hfg", label: "lectured at" },
  { id: "r11", source: "hfg", target: "ulm", label: "based in" },
  { id: "r12", source: "bauhaus", target: "dessau", label: "based in" },
  { id: "r13", source: "bayer", target: "bauhaus", label: "taught at" },
  { id: "r14", source: "bayer", target: "universal", label: "designed" },
  { id: "r15", source: "tschichold", target: "basel", label: "worked in" },
  { id: "r16", source: "gerstner", target: "basel", label: "worked in" },
  { id: "r17", source: "crouwel", target: "total", label: "co-founded" },
  { id: "r18", source: "crouwel", target: "new-alphabet", label: "designed" },
  { id: "r19", source: "total", target: "amsterdam", label: "based in" },
  { id: "r20", source: "frutiger", target: "univers", label: "designed" },
  { id: "r21", source: "frutiger", target: "paris", label: "worked in" },
  { id: "r22", source: "vignelli", target: "unimark", label: "co-founded" },
  { id: "r23", source: "vignelli", target: "milan", label: "worked in" },
  { id: "r24", source: "pictograms", target: "munich", label: "made for" },
  { id: "r25", source: "brockmann", target: "tschichold", label: "influenced by", isInferred: true },
];

/** What the store would answer for one node: it, and every edge that touches it, with the far ends. */
function neighbourhood(id: string) {
  const edges = STORE_EDGES.filter((e) => e.source === id || e.target === id);
  const ids = new Set([id, ...edges.flatMap((e) => [e.source, e.target])]);
  return { nodes: STORE_NODES.filter((n) => ids.has(n.id)), edges };
}

/** Loads neighbourhoods into the explorer as you expand them, and counts what is still out there. */
function useStore(start: string) {
  const [loaded, setLoaded] = useState(() => neighbourhood(start));
  const hiddenNeighbours = useMemo(() => {
    // A relation not loaded yet counts, even when both its ends already are.
    const have = new Set(loaded.edges.map((e) => e.id));
    const out: Record<string, number> = {};
    for (const n of loaded.nodes) {
      const far = STORE_EDGES.filter((e) => (e.source === n.id || e.target === n.id) && !have.has(e.id));
      if (far.length) out[n.id] = far.length;
    }
    return out;
  }, [loaded]);
  const expand = (node: GraphNode) => {
    const next = neighbourhood(node.id);
    setLoaded((l) => ({
      nodes: [...l.nodes, ...next.nodes.filter((n) => !l.nodes.some((m) => m.id === n.id))],
      edges: [...l.edges, ...next.edges.filter((e) => !l.edges.some((f) => f.id === e.id))],
    }));
  };
  return { ...loaded, hiddenNeighbours, expand };
}

const onSelect = fn();

export const Playground: Story = {
  render: function Render() {
    const store = useStore("aicher");
    return (
      <KnowledgeGraphExplorer
        style={{ maxWidth: 1200 }}
        label="Otl Aicher's circle"
        description="Aicher and Max Bill both co-founded HfG Ulm; expand a node to bring in its neighbours."
        nodes={store.nodes}
        edges={store.edges}
        types={TYPES}
        total={STORE_NODES.length}
        hiddenNeighbours={store.hiddenNeighbours}
        onExpandRequest={store.expand}
        defaultSelected="aicher"
        onSelect={onSelect}
      />
    );
  },
};

/** Nothing chosen yet: the panel asks for a selection. */
export const NothingSelected: Story = {
  render: function Render() {
    const store = useStore("hfg");
    return (
      <KnowledgeGraphExplorer
        style={{ maxWidth: 1200 }}
        label="HfG Ulm"
        description="The school and the people who founded and taught at it."
        nodes={store.nodes}
        edges={store.edges}
        types={TYPES}
        total={STORE_NODES.length}
        hiddenNeighbours={store.hiddenNeighbours}
        onExpandRequest={store.expand}
      />
    );
  },
};

const STRESS_BRAND: ThemeSeed = {
  colors: {
    bg: "#fffdf5", surface: "#ffffff", muted: "#f4ecd8",
    textPrimary: "#1a1400", textMuted: "#6b5d3f",
    border: "rgba(26, 20, 0, 0.12)", accent: "#ffe066",
  },
};

export const BrandThemed: Story = {
  render: function Render() {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const store = useStore("aicher");
    const panel = (style: React.CSSProperties, title: string) => (
      <div style={style} className="flex flex-col gap-lg bg-base p-lg">
        <p className="text-caption text-ink-muted">{title}</p>
        <KnowledgeGraphExplorer
          label={`Otl Aicher's circle, ${title}`}
          description="HfG Ulm links most of it."
          nodes={store.nodes}
          edges={store.edges}
          types={TYPES}
          hiddenNeighbours={store.hiddenNeighbours}
          onExpandRequest={store.expand}
          defaultSelected="aicher"
          height={400}
        />
      </div>
    );
    return (
      <div style={{ maxWidth: 1200 }} className="flex flex-col gap-xl">
        {panel(zero as React.CSSProperties, "theme zero")}
        {panel(brand as React.CSSProperties, "stress brand — pale yellow accent")}
      </div>
    );
  },
};
