import { Network } from "@/ui/network";
import { NetworkCanvas } from "@/ui/network-canvas";

const nodes = [
  {
    id: "brief",
    label: "Brief",
    type: "document",
    description: "The project direction",
  },
  {
    id: "design",
    label: "Design",
    type: "work",
    description: "The proposed layout",
  },
  {
    id: "review",
    label: "Review",
    type: "work",
    description: "Feedback from the team",
  },
];
const edges = [
  { id: "a", source: "brief", target: "design", label: "informs" },
  { id: "b", source: "design", target: "review", label: "ready for" },
];
export function Example() {
  return (
    <Network
      label="Canvas project connections"
      description="The project network painted on canvas, with an accessible table view."
      nodes={nodes}
      edges={edges}
      renderer={NetworkCanvas}
      canvasThreshold={0}
      seed={7}
      height={280}
      className="w-full"
    >
      <Network.Controls />
    </Network>
  );
}
