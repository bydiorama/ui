import { Multiselect } from "@/ui/multiselect";

export function Example() {
  return (
    <Multiselect
      label="Project disciplines"
      items={[
        { value: "design", label: "Design" },
        { value: "writing", label: "Writing" },
        { value: "development", label: "Development" },
      ]}
      defaultValue={["design"]}
      className="specimen-field"
    />
  );
}
