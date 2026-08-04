/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { Popover } from "./popover.tsx";
import { Button } from "@/ui/button/button.tsx";

export function Valid() {
  return (
    <>
      <Popover>
        <Popover.Trigger render={<Button>Open popover</Button>} />
        <Popover.Panel>
          <Popover.Title>Popover contents</Popover.Title>
          <Popover.Description>Exports use the template set in Brand profile.</Popover.Description>
        </Popover.Panel>
      </Popover>

      <Popover defaultIsOpen isModal onOpenChange={(isOpen) => isOpen}>
        <Popover.Trigger>Inline trigger</Popover.Trigger>
        <Popover.Panel side="top" align="start" sideOffset={12} alignOffset={-4} className="w-96">
          <Popover.Title>Placed</Popover.Title>
          <Popover.Close render={<Button variant="ghost">Dismiss</Button>} />
        </Popover.Panel>
      </Popover>

      <Popover isOpen onOpenChange={() => {}}>
        <Popover.Trigger>Controlled</Popover.Trigger>
        <Popover.Panel aria-label="Untitled panel">
          <div>Boxed content sits flush</div>
        </Popover.Panel>
      </Popover>
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* The open/close vocabulary is fixed by CONVENTIONS §1. */}
      {/* @ts-expect-error use isOpen, not open */}
      <Popover open>
        <Popover.Trigger>x</Popover.Trigger>
      </Popover>

      {/* @ts-expect-error use defaultIsOpen, not defaultOpen */}
      <Popover defaultOpen>
        <Popover.Trigger>x</Popover.Trigger>
      </Popover>

      {/* Never onClose + onOpen — one callback, both directions. */}
      {/* @ts-expect-error there is no onClose */}
      <Popover onClose={() => {}}>
        <Popover.Trigger>x</Popover.Trigger>
      </Popover>

      {/* onOpenChange is narrowed to a boolean; Base UI's event details are
          deliberately not part of our signature (ADR 0002). */}
      <Popover
        // @ts-expect-error onOpenChange takes (isOpen: boolean), not an event
        onOpenChange={(event: MouseEvent) => event.type}
      >
        <Popover.Trigger>x</Popover.Trigger>
      </Popover>

      {/* Placement is our own closed union, not Base UI's Side type. */}
      <Popover>
        <Popover.Trigger>x</Popover.Trigger>
        {/* @ts-expect-error "middle" is not a side */}
        <Popover.Panel side="middle" />
      </Popover>

      <Popover>
        <Popover.Trigger>x</Popover.Trigger>
        {/* @ts-expect-error "justify" is not an alignment */}
        <Popover.Panel align="justify" />
      </Popover>
    </>
  );
}
