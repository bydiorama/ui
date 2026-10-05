/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { createRef } from "react";

import { Modal, type ModalFocusTarget } from "./modal.tsx";
import { Button } from "@/ui/button/button.tsx";

export function Valid() {
  return (
    <>
      <Modal>
        <Modal.Trigger render={<Button>New task</Button>} />
        <Modal.Surface>
          <Modal.Title>New task</Modal.Title>
        </Modal.Surface>
      </Modal>

      <Modal defaultIsOpen isDismissable={false} onOpenChange={(isOpen) => isOpen}>
        <Modal.Trigger>Open</Modal.Trigger>
        <Modal.Surface size="lg" className="max-w-2xl">
          <Modal.Title>Sized</Modal.Title>
          <Modal.Description>With a description.</Modal.Description>
          <Modal.Footer>
            <Modal.Close render={<Button variant="secondary">Cancel</Button>} />
          </Modal.Footer>
        </Modal.Surface>
      </Modal>
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error use isOpen, not open */
  const a = <Modal open><Modal.Trigger>x</Modal.Trigger></Modal>;

  /* @ts-expect-error use defaultIsOpen, not defaultOpen */
  const b = <Modal defaultOpen><Modal.Trigger>x</Modal.Trigger></Modal>;

  /* @ts-expect-error there is no onClose — one callback, both directions */
  const c = <Modal onClose={() => {}}><Modal.Trigger>x</Modal.Trigger></Modal>;

  /* A Modal is always modal; a non-modal dialog with a scrim is a Popover. */
  /* @ts-expect-error isModal is not a Modal prop */
  const d = <Modal isModal><Modal.Trigger>x</Modal.Trigger></Modal>;

  const e = (
    <Modal>
      <Modal.Trigger>x</Modal.Trigger>
      {/* @ts-expect-error "sm" is not a modal size */}
      <Modal.Surface size="sm" />
    </Modal>
  );

  return [a, b, c, d, e];
}

const cancelRef = createRef<HTMLButtonElement>();
const modalTarget: ModalFocusTarget = cancelRef;

export function FocusTargets() {
  void modalTarget;
  return (
    <Modal>
      <Modal.Trigger>Delete</Modal.Trigger>
      <Modal.Surface initialFocus={cancelRef} finalFocus={() => document.getElementById("next-row")}>
        <Modal.Title>Delete this row?</Modal.Title>
        <Modal.Close render={<Button ref={cancelRef} variant="secondary">Cancel</Button>} />
      </Modal.Surface>
    </Modal>
  );
}

export function FocusTargetMisuse() {
  /* Not Base UI's boolean form: `false` would leave focus behind the scrim. */
  /* @ts-expect-error initialFocus takes a ref or a function, never a boolean */
  const a = <Modal.Surface initialFocus={false} />;
  /* @ts-expect-error finalFocus does not take a selector */
  const b = <Modal.Surface finalFocus="#next-row" />;
  return [a, b];
}
