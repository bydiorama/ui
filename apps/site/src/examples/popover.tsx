import { Popover } from "@/ui/popover";
import { Button } from "@/ui/button";
import { Switch } from "@/ui/switch";

export function Example() {
  return (
    <Popover>
      <Popover.Trigger
        render={<Button variant="outline">Project settings</Button>}
      ></Popover.Trigger>
      <Popover.Panel>
        <Popover.Title>Notifications</Popover.Title>
        <Popover.Description>
          Choose what reaches your inbox.
        </Popover.Description>
        <Switch defaultIsChecked>Email updates</Switch>
      </Popover.Panel>
    </Popover>
  );
}
