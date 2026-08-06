/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Sheet } from "./sheet.tsx";

export function Valid() {
  return (
    <>
      <Sheet>
        <Sheet.Trigger>Open</Sheet.Trigger>
        <Sheet.Panel label="Primary navigation">Content</Sheet.Panel>
      </Sheet>
      <Sheet defaultIsOpen isDismissable={false} onOpenChange={() => {}}>
        <Sheet.Trigger render={<button type="button">Open</button>} />
        <Sheet.Panel label="Account" side="right" className="max-w-nav-rail" container={null}>
          <Sheet.Close render={<button type="button">Done</button>} />
        </Sheet.Panel>
      </Sheet>
    </>
  );
}

export function Invalid() {
  {/* A dialog with no accessible name is announced as "dialog" and nothing else. */}
  /* @ts-expect-error label is required on the panel */
  const a = <Sheet><Sheet.Panel>Content</Sheet.Panel></Sheet>;

  {/* The design draws two edges; a bottom sheet is a different pattern. */}
  /* @ts-expect-error side is a closed union */
  const b = <Sheet><Sheet.Panel label="N" side="bottom">Content</Sheet.Panel></Sheet>;

  {/* §1: one callback for both directions, never onOpen/onClose. */}
  /* @ts-expect-error there is no onClose */
  const c = <Sheet onClose={() => {}}><Sheet.Panel label="N">Content</Sheet.Panel></Sheet>;

  {/* Base UI's own prop name, which does nothing — see modal.tsx. */}
  /* @ts-expect-error dismissible is not the prop; isDismissable is */
  const d = <Sheet dismissible={false}><Sheet.Panel label="N">Content</Sheet.Panel></Sheet>;

  {/* `label` sets aria-label, so a second one would be silently discarded. */}
  /* @ts-expect-error aria-label is not accepted; label is the name */
  const e = <Sheet><Sheet.Panel label="N" aria-label="Other">Content</Sheet.Panel></Sheet>;

  return [a, b, c, d, e];
}
