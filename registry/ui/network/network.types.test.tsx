/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { User } from "griddy-icons";

import { Network } from "./network.tsx";
import { NetworkCanvas } from "./network-canvas.tsx";

const nodes = [{ id: "a", label: "Otl Aicher", type: "person", data: { born: 1922 } }];
const edges = [{ id: "e", source: "a", target: "a" }];

export function Valid() {
  return (
    <>
      <Network label="Circle" description="One person." nodes={nodes} edges={edges} />
      <Network
        label="Circle"
        description="One person."
        nodes={nodes}
        edges={edges}
        types={{ person: { label: "Person", slot: 1, glyph: <User /> } }}
        layout="radial"
        rootId="a"
        seed={4}
        onSelect={(n) => n?.data?.born}
        hiddenNeighbours={{ a: 12 }}
        onExpandRequest={(n) => n.data?.born}
        onDismiss={() => {}}
        renderer={NetworkCanvas}
        canvasThreshold={1000}
        className="max-w-xl"
      >
        <Network.Controls fitLabel="Einpassen" />
      </Network>
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* @ts-expect-error label is the accessible name: required */}
      <Network description="One person." nodes={nodes} edges={edges} />
      {/* @ts-expect-error description is the takeaway: required */}
      <Network label="Circle" nodes={nodes} edges={edges} />
      {/* @ts-expect-error there are eight slots; a ninth type folds into Other */}
      <Network label="Circle" description="One person." nodes={nodes} edges={edges} types={{ person: { label: "Person", slot: 9 } }} />
      {/* @ts-expect-error a type needs a name to be read */}
      <Network label="Circle" description="One person." nodes={nodes} edges={edges} types={{ person: { slot: 1 } }} />
      {/* @ts-expect-error Network lays out force or radial; ranks are Diagram's */}
      <Network label="Circle" description="One person." nodes={nodes} edges={edges} layout="layered" />
    </>
  );
}
