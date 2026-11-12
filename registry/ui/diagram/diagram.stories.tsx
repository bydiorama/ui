import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { resolveThemePair, toStyleObject, THEME_ZERO, ZERO_AUTHORED, type ThemeSeed } from "@bydiorama/tokens";
import { shortestPath, type GraphEdge, type GraphNode } from "@/lib/graph";

import { Diagram } from "./diagram.tsx";

const meta: Meta<typeof Diagram> = {
  title: "UI/Diagram",
  component: Diagram,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Diagram>;

/** The Diagram sheet's pipeline: a print job from brief to press. */
const PIPELINE: GraphNode[] = [
  { id: "brief", label: "Brief", description: "Muriel Cooper" },
  { id: "grid", label: "Grid system", description: "Josef Müller-Brockmann" },
  { id: "layout", label: "Layout", description: "Jan Tschichold" },
  { id: "proof", label: "Proof", description: "Wim Crouwel", parentId: "print" },
  { id: "press", label: "Press", description: "Ottmar Mergenthaler", parentId: "print" },
];
const PIPELINE_EDGES: GraphEdge[] = [
  { id: "e1", source: "brief", target: "grid", label: "informs" },
  { id: "e2", source: "brief", target: "layout", label: "informs" },
  { id: "e3", source: "grid", target: "proof", isInferred: true },
  { id: "e4", source: "layout", target: "proof", label: "approved" },
  { id: "e5", source: "proof", target: "press" },
];

/** An org chart: a studio and its departments. */
const STUDIO: GraphNode[] = [
  { id: "bayer", label: "Herbert Bayer", description: "Studio director" },
  { id: "aicher", label: "Otl Aicher", description: "Pictograms" },
  { id: "frutiger", label: "Adrian Frutiger", description: "Type" },
  { id: "vignelli", label: "Massimo Vignelli", description: "Signage" },
  { id: "pineles", label: "Cipe Pineles", description: "Editorial" },
  { id: "gerstner", label: "Karl Gerstner", description: "Programmes" },
  { id: "lovelace", label: "Ada Lovelace", description: "Analytical notes" },
];
const STUDIO_EDGES: GraphEdge[] = [
  { id: "s1", source: "bayer", target: "aicher" },
  { id: "s2", source: "bayer", target: "frutiger" },
  { id: "s3", source: "bayer", target: "vignelli" },
  { id: "s4", source: "frutiger", target: "pineles" },
  { id: "s5", source: "frutiger", target: "gerstner" },
  { id: "s6", source: "vignelli", target: "lovelace" },
];

const onSelect = fn();

export const Playground: Story = {
  render: () => (
    <Diagram
      style={{ maxWidth: 960 }}
      label="Print run"
      description="Every layout passes a proof before it reaches the press."
      nodes={PIPELINE}
      edges={PIPELINE_EDGES}
      onSelect={onSelect}
    >
      <Diagram.Group id="print" label="Print run" />
      <Diagram.Legend />
      <Diagram.Minimap />
      <Diagram.Controls />
    </Diagram>
  ),
};

export const OrgChart: Story = {
  render: () => (
    <Diagram
      style={{ maxWidth: 960 }}
      label="Studio structure"
      description="Three departments report to the director; type has the most people."
      layout="tree"
      route="orthogonal"
      nodes={STUDIO}
      edges={STUDIO_EDGES}
      onSelect={onSelect}
    >
      <Diagram.Controls />
    </Diagram>
  ),
};

export const Radial: Story = {
  render: () => (
    <Diagram
      style={{ maxWidth: 960 }}
      label="Studio, round its director"
      description="The same studio as a radial tree."
      layout="radial"
      route="straight"
      height={560}
      nodes={STUDIO}
      edges={STUDIO_EDGES}
      onSelect={onSelect}
    >
      <Diagram.Controls />
    </Diagram>
  ),
};

/** The sheet's three routes on one flow, left to right. */
export const Routes: Story = {
  render: () => (
    <div className="flex max-w-[960px] flex-col gap-xl">
      {(["straight", "curved", "orthogonal"] as const).map((route) => (
        <Diagram
          key={route}
          label={`${route[0]!.toUpperCase()}${route.slice(1)} edges`}
          description="Brief informs both the grid and the layout."
          direction="right"
          route={route}
          height={280}
          nodes={PIPELINE.slice(0, 3)}
          edges={PIPELINE_EDGES.slice(0, 3)}
        />
      ))}
    </div>
  ),
};

/** Selection, a highlighted path, a collapsed group, loading and empty. */
export const States: Story = {
  render: () => (
    <div className="grid max-w-[1200px] grid-cols-2 gap-xl">
      <Diagram label="Selected" description="Layout is selected; its edges turn active." nodes={PIPELINE} edges={PIPELINE_EDGES} defaultSelected="layout" height={420}>
        <Diagram.Group id="print" label="Print run" />
        <Diagram.Legend />
      </Diagram>
      <Diagram
        label="Highlighted path"
        description="Brief to press runs through the layout."
        nodes={PIPELINE}
        edges={PIPELINE_EDGES}
        highlight={shortestPath(PIPELINE_EDGES, "brief", "press") ?? []}
        height={420}
      >
        <Diagram.Legend />
      </Diagram>
      <Diagram label="Collapsed group" description="The print run folds to one node that carries its edges." nodes={PIPELINE} edges={PIPELINE_EDGES} height={420}>
        <Diagram.Group id="print" label="Print run" defaultIsCollapsed />
        <Diagram.Legend />
      </Diagram>
      <div className="flex flex-col gap-xl">
        <Diagram label="Loading" description="Waiting for the pipeline." nodes={[]} edges={[]} isLoading height={200} />
        <Diagram label="Empty" description="No steps yet." nodes={[]} edges={[]} height={200} />
      </div>
    </div>
  ),
};

/** A controlled selection, with a path from the brief to whatever is chosen. */
export const PathToSelection: Story = {
  render: function Render() {
    const [selected, setSelected] = useState<string | null>("press");
    const path = selected ? (shortestPath(PIPELINE_EDGES, "brief", selected) ?? []) : [];
    return (
      <Diagram
        style={{ maxWidth: 960 }}
        label="From the brief"
        description="Select a step to see how the brief reaches it."
        nodes={PIPELINE}
        edges={PIPELINE_EDGES}
        selected={selected}
        onSelect={(node) => setSelected(node?.id ?? null)}
        highlight={path}
      >
        <Diagram.Legend />
        <Diagram.Controls />
      </Diagram>
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
  render: () => {
    const zero = toStyleObject(resolveThemePair(THEME_ZERO, { authored: ZERO_AUTHORED }));
    const brand = toStyleObject(resolveThemePair(STRESS_BRAND));
    const Panel = ({ style, title }: { style: React.CSSProperties; title: string }) => (
      <div style={style} className="flex flex-1 flex-col gap-lg bg-base p-lg">
        <p className="text-caption text-ink-muted">{title}</p>
        <Diagram label="Print run" description="Every layout passes a proof." nodes={PIPELINE} edges={PIPELINE_EDGES} defaultSelected="layout" height={420}>
          <Diagram.Group id="print" label="Print run" />
          <Diagram.Legend />
          <Diagram.Controls />
        </Diagram>
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
