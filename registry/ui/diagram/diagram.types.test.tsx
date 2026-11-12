/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Diagram } from "./diagram.tsx";

const nodes = [{ id: "a", label: "Brief", data: { owner: "Muriel Cooper" } }];
const edges = [{ id: "e", source: "a", target: "a" }];

export function Valid() {
  return (
    <>
      <Diagram label="Flow" description="One step." nodes={nodes} edges={edges} />
      <Diagram
        label="Flow"
        description="One step."
        nodes={nodes}
        edges={edges}
        layout="tree"
        direction="right"
        route="orthogonal"
        nodeSize={(n) => ({ width: n.data?.owner ? 200 : 160, height: 56 })}
        onSelect={(n) => n?.data?.owner}
        highlight={["a"]}
        renderNode={(n, { isSelected }) => <span>{isSelected ? n.label : n.data?.owner}</span>}
        className="max-w-xl"
      >
        <Diagram.Group id="g" label="Group" defaultIsCollapsed />
        <Diagram.Controls zoomInLabel="Vergrößern" />
        <Diagram.Minimap />
        <Diagram.Legend items={["relation", "group"]} />
      </Diagram>
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* @ts-expect-error label is the accessible name: required */}
      <Diagram description="One step." nodes={nodes} edges={edges} />
      {/* @ts-expect-error description is the takeaway: required */}
      <Diagram label="Flow" nodes={nodes} edges={edges} />
      {/* @ts-expect-error a node without a label has no name */}
      <Diagram label="Flow" description="One step." nodes={[{ id: "a" }]} edges={edges} />
      {/* @ts-expect-error no such layout */}
      <Diagram label="Flow" description="One step." nodes={nodes} edges={edges} layout="force" />
      {/* @ts-expect-error a group needs its label */}
      <Diagram.Group id="g" />
      {/* @ts-expect-error legend rows are a closed set */}
      <Diagram.Legend items={["dashed"]} />
    </>
  );
}
