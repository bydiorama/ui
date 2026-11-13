import { Textarea } from "@/ui/textarea";

export function Example() {
  return (
    <Textarea
      label="Project notes"
      placeholder="What are you working on?"
      defaultValue="A clearer way to share our work."
      className="w-full"
    />
  );
}
