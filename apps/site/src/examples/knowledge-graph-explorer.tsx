import { KnowledgeGraphExplorer } from "@/components/blocks/knowledge-graph-explorer";

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
    <KnowledgeGraphExplorer
      label="Explore the project"
      description="Search the project and inspect its connections."
      nodes={nodes}
      edges={edges}
      types={{
        document: { label: "Document", slot: 1 },
        work: { label: "Work", slot: 2 },
      }}
      height={280}
      defaultSelected="brief"
      className="example-explorer w-full"
    />
  );
}
