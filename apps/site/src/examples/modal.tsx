import { Modal } from "@/ui/modal";
import { Button } from "@/ui/button";

export function Example() {
  return (
    <Modal>
      <Modal.Trigger
        render={<Button variant="outline">Review changes</Button>}
      ></Modal.Trigger>
      <Modal.Surface>
        <Modal.Title>Ready for review?</Modal.Title>
        <Modal.Description>
          Your draft is saved. You can keep editing or return to the project.
        </Modal.Description>
        <Modal.Footer>
          <Modal.Close render={<Button>Keep editing</Button>}></Modal.Close>
        </Modal.Footer>
      </Modal.Surface>
    </Modal>
  );
}
