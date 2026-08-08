/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Menu } from "./menu.tsx";
import { Button } from "@/ui/button/button.tsx";

export function Valid() {
  return (
    <>
      <Menu defaultIsOpen onOpenChange={(isOpen: boolean) => void isOpen} isModal>
        <Menu.Trigger render={<Button>Open</Button>} />
        <Menu.Panel side="top" align="end" sideOffset={12} container={null}>
          <Menu.Item onSelect={() => {}}>Profile</Menu.Item>
          <Menu.Item icon={<svg />} trailing={<span>⌘K</span>} isDisabled>
            Members
          </Menu.Item>
          <Menu.Separator />
          <Menu.Group label="Team">
            <Menu.Item render={<a href="/team" />}>Open team</Menu.Item>
          </Menu.Group>
          <Menu.Sub>
            <Menu.SubTrigger>More</Menu.SubTrigger>
            <Menu.Panel side="right">
              <Menu.Item>Nested</Menu.Item>
            </Menu.Panel>
          </Menu.Sub>
        </Menu.Panel>
      </Menu>
      {/* Controlled open state is a real value, not an omission. */}
      <Menu isOpen={false}>
        <Menu.Trigger render={<Button>Open</Button>} />
        <Menu.Panel>
          <Menu.Item>Only</Menu.Item>
        </Menu.Panel>
      </Menu>
    </>
  );
}

export function Invalid() {
  {/* §1: open state is always the isOpen/onOpenChange pair. */}
  /* @ts-expect-error there is no onClose */
  const a = <Menu onClose={() => {}} />;

  {/* §1: `default*`, never `initial*`. */}
  /* @ts-expect-error the uncontrolled prop is defaultIsOpen */
  const b = <Menu initialIsOpen />;

  {/* A row with no label announces nothing. */}
  /* @ts-expect-error children is required on Menu.Item */
  const c = <Menu.Item icon={<svg />} />;

  {/* The handler is named for the VERB. `onClick` would tie the contract to
      the pointer, and a menu row is chosen by keyboard as often as by mouse.
      NOT a DOM event here, because MenuItemProps does not extend
      HTMLAttributes — which is exactly why this directive is used rather
      than silently accepted, the trap onDrop and onSelect both set. */}
  /* @ts-expect-error Menu.Item takes onSelect, not onClick */
  const d = <Menu.Item onClick={() => {}}>Row</Menu.Item>;

  {/* Our own placement vocabulary, deliberately closed (ADR 0002/0012). */}
  /* @ts-expect-error side is a closed union */
  const e = <Menu.Panel side="above" />;

  /* @ts-expect-error align is a closed union */
  const f = <Menu.Panel align="middle" />;

  {/* A group that is only spacing is a group a screen reader cannot see. */}
  /* @ts-expect-error label must be a string */
  const g = <Menu.Group label={42} />;

  return [a, b, c, d, e, f, g];
}
