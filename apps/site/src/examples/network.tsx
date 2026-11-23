import { Network } from "@/ui/network";

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
      label="Project connections"
      description="The brief, design and review are connected."
      nodes={nodes}
      edges={edges}
      seed={7}
      height={280}
      className="w-full"
    >
      <Network.Controls />
    </Network>
  );
}
