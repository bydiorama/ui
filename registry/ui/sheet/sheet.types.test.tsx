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
      <Sheet>
        <Sheet.Trigger>Open</Sheet.Trigger>
        <Sheet.Panel label="Filters" size="md">
          <Sheet.Header>
            <Sheet.Close render={<button type="button">Close</button>} />
          </Sheet.Header>
          <Sheet.Body>
            <Sheet.Title>Discipline</Sheet.Title>
          </Sheet.Body>
          <Sheet.Footer>
            <button type="button">Show results</button>
          </Sheet.Footer>
        </Sheet.Panel>
      </Sheet>
      <Sheet>
        <Sheet.Panel label="Record" size="lg">Content</Sheet.Panel>
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

  {/* Three caps, all of them existing width tokens — not an open scale. */}
  /* @ts-expect-error size is a closed union */
  const f = <Sheet><Sheet.Panel label="N" size="xl">Content</Sheet.Panel></Sheet>;

  {/* The width cap is a token, not a number the caller invents. */}
  /* @ts-expect-error size does not take a length */
  const g = <Sheet><Sheet.Panel label="N" size={416}>Content</Sheet.Panel></Sheet>;

  return [a, b, c, d, e, f, g];
}
