import { useState } from "react";
import { ContextMenu } from "@/ui/context-menu";
import { Menu } from "@/ui/menu";

export function Example() {
  const [message, setMessage] = useState(
    "Right-click, or focus and press Shift+F10",
  );
  return (
    <ContextMenu>
      <ContextMenu.Trigger
        tabIndex={0}
        className="w-full cursor-pointer rounded-md border border-edge-subtle bg-surface p-lg text-body-sm"
      >
        <p>Brand guidelines</p>
        <p className="mt-sm text-caption text-ink-muted" role="status">
          {message}
        </p>
      </ContextMenu.Trigger>
      <ContextMenu.Panel>
        <Menu.Item onSelect={() => setMessage("Project duplicated")}>
          Duplicate
        </Menu.Item>
        <Menu.Item onSelect={() => setMessage("Project archived")}>
          Archive
        </Menu.Item>
      </ContextMenu.Panel>
    </ContextMenu>
  );
}
