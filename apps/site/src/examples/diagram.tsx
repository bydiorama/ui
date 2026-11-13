import { Diagram } from "@/ui/diagram";

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
    <Diagram
      label="Project workflow"
      description="The brief informs the design, which is then reviewed."
      nodes={nodes}
      edges={edges}
      direction="down"
      height={300}
      className="w-full"
    >
      <Diagram.Controls />
    </Diagram>
  );
}
