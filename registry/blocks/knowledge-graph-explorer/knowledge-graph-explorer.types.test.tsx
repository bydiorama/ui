/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { KnowledgeGraphExplorer } from "./knowledge-graph-explorer.tsx";

const nodes = [{ id: "a", label: "Otl Aicher", type: "person", data: { born: 1922 } }];
const edges = [{ id: "e", source: "a", target: "a" }];
const types = { person: { label: "Person", slot: 1 as const } };

export function Valid() {
  return (
    <KnowledgeGraphExplorer
      label="Circle"
      description="One person."
      nodes={nodes}
      edges={edges}
      types={types}
      total={1284}
      hiddenNeighbours={{ a: 3 }}
      onExpandRequest={(n) => n.data?.born}
      onSelect={(n) => n?.data?.born}
      shownText={(s, t) => `${s}/${t}`}
    />
  );
}

export function Invalid() {
  return (
    <>
      {/* @ts-expect-error types are required: the filter is built from them */}
      <KnowledgeGraphExplorer label="Circle" description="One person." nodes={nodes} edges={edges} />
      {/* @ts-expect-error label names the drawing */}
      <KnowledgeGraphExplorer description="One person." nodes={nodes} edges={edges} types={types} />
    </>
  );
}
