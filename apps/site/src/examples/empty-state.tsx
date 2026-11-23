import { EmptyState } from "@/ui/empty-state";
import { Inbox } from "griddy-icons";

export function Example() {
  return (
    <EmptyState
      icon={<Inbox />}
      title="Nothing archived yet"
      description="Archived projects will appear here."
    />
  );
}
