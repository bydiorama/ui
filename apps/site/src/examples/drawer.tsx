import { Drawer } from "@/ui/drawer";
import { Button } from "@/ui/button";
import { RadioGroup, Radio } from "@/ui/radio";

export function Example() {
  return (
    <Drawer>
      <Drawer.Trigger
        render={<Button variant="outline">Choose a view</Button>}
      ></Drawer.Trigger>
      <Drawer.Panel label="Project view" handleLabel="Resize project view">
        <Drawer.Header>
          <Drawer.Title>Project view</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body>
          <RadioGroup label="Layout" defaultValue="grid">
            <Radio value="grid">Grid</Radio>
            <Radio value="list">List</Radio>
          </RadioGroup>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close render={<Button>Done</Button>}></Drawer.Close>
        </Drawer.Footer>
      </Drawer.Panel>
    </Drawer>
  );
}
