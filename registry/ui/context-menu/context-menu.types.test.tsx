/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { ContextMenu } from "./context-menu.tsx";
import { Menu } from "@/ui/menu/menu.tsx";

export function Valid() {
  return (
    <ContextMenu defaultIsOpen onOpenChange={(isOpen: boolean) => void isOpen}>
      <ContextMenu.Trigger tabIndex={0} aria-label="Asset">
        A right-clickable region
      </ContextMenu.Trigger>
      <ContextMenu.Panel container={null}>
        {/* Menu's own parts, by construction — Base UI re-exports them. */}
        <Menu.Item onSelect={() => {}}>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Group label="Danger">
          <Menu.Item isDisabled>Delete</Menu.Item>
        </Menu.Group>
      </ContextMenu.Panel>
    </ContextMenu>
  );
}

export function Invalid() {
  {/* §1 again — one pair, never two callbacks. */}
  /* @ts-expect-error there is no onClose */
  const a = <ContextMenu onClose={() => {}} />;

  {/* A context menu is anchored to the POINTER, so it has no side to prefer.
      Offering the prop would be offering a lie. */}
  /* @ts-expect-error the panel takes no side — it follows the cursor */
  const b = <ContextMenu.Panel side="bottom" />;

  /* @ts-expect-error the panel takes no align either */
  const c = <ContextMenu.Panel align="start" />;

  {/* isModal belongs to Menu; a context menu is never modal. */}
  /* @ts-expect-error there is no isModal on ContextMenu */
  const d = <ContextMenu isModal />;

  return [a, b, c, d];
}
