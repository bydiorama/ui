import { Sheet } from "@/ui/sheet";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";

export function Example() {
  return (
    <Sheet>
      <Sheet.Trigger
        render={<Button variant="outline">Filter projects</Button>}
      ></Sheet.Trigger>
      <Sheet.Panel label="Project filters">
        <Sheet.Header>
          <Sheet.Title>Project filters</Sheet.Title>
        </Sheet.Header>
        <Sheet.Body>
          <Checkbox defaultIsChecked>In progress</Checkbox>
          <Checkbox>Archived</Checkbox>
        </Sheet.Body>
        <Sheet.Footer>
          <Sheet.Close render={<Button>Apply filters</Button>}></Sheet.Close>
        </Sheet.Footer>
      </Sheet.Panel>
    </Sheet>
  );
}
