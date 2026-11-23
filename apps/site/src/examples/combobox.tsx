import { Combobox } from "@/ui/combobox";

export function Example() {
  return (
    <Combobox
      label="Find a project"
      placeholder="Type to search"
      items={[
        { value: "brand", label: "Brand guidelines" },
        { value: "website", label: "Website" },
        { value: "launch", label: "Launch assets" },
      ]}
      className="specimen-field"
    />
  );
}
