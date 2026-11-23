import { useState } from "react";
import { Menu } from "@/ui/menu";
import { Button } from "@/ui/button";

export function Example() {
  const [message, setMessage] = useState("Choose an action");
  return (
    <div className="specimen-stack">
      <Menu>
        <Menu.Trigger
          render={<Button variant="outline">Project actions</Button>}
        ></Menu.Trigger>
        <Menu.Panel>
          <Menu.Item onSelect={() => setMessage("Project duplicated")}>
            Duplicate
          </Menu.Item>
          <Menu.Item onSelect={() => setMessage("Project archived")}>
            Archive
          </Menu.Item>
        </Menu.Panel>
      </Menu>
      <p className="text-caption text-ink-muted" role="status">
        {message}
      </p>
    </div>
  );
}
