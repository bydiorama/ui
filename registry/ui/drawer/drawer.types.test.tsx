/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Drawer } from "./drawer.tsx";

export function Valid() {
  return (
    <>
      <Drawer>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Panel label="Complete profile">
          <Drawer.Body>
            <Drawer.Title>Complete profile</Drawer.Title>
          </Drawer.Body>
        </Drawer.Panel>
      </Drawer>
      <Drawer defaultIsOpen isDismissable={false} onOpenChange={() => {}}>
        <Drawer.Trigger render={<button type="button">Open</button>} />
        <Drawer.Panel label="Account" handleLabel="Dismiss account panel" container={null}>
          <Drawer.Body>Content</Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close render={<button type="button">Done</button>} />
          </Drawer.Footer>
        </Drawer.Panel>
      </Drawer>
    </>
  );
}

export function Invalid() {
  {/* A dialog with no accessible name is announced as "dialog" and nothing else. */}
  /* @ts-expect-error label is required on the panel */
  const a = <Drawer><Drawer.Panel>Content</Drawer.Panel></Drawer>;

  {/* `label` sets aria-label, so a second one would be silently discarded. */}
  /* @ts-expect-error aria-label is not accepted; label is the name */
  const b = <Drawer><Drawer.Panel label="N" aria-label="Other">Content</Drawer.Panel></Drawer>;

  {/* §1: one callback for both directions, never onOpen/onClose. */}
  /* @ts-expect-error there is no onClose */
  const c = <Drawer onClose={() => {}}><Drawer.Panel label="N">Content</Drawer.Panel></Drawer>;

  {/* A Drawer comes from the bottom. Sides are Sheet's business (§7a). */}
  /* @ts-expect-error there is no side prop */
  const d = <Drawer><Drawer.Panel label="N" side="left">Content</Drawer.Panel></Drawer>;

  return [a, b, c, d];
}

export function Detents() {
  return (
    <>
      <Drawer>
        <Drawer.Panel label="Complete profile" snapPoints={[0.5, 0.9]}>
          <p>Body</p>
        </Drawer.Panel>
      </Drawer>
      <Drawer>
        <Drawer.Panel
          label="Complete profile"
          snapPoints={[0.4, 0.7, 0.95]}
          snapPoint={1}
          onSnapPointChange={(index: number) => void index}
        >
          <p>Body</p>
        </Drawer.Panel>
      </Drawer>
    </>
  );
}

export function DetentMisuse() {
  {/* The detent is an INDEX into snapPoints, not the fraction itself. */}
  /* @ts-expect-error snapPoint is a number index, not a string */
  const a = <Drawer.Panel label="x" snapPoints={[0.5]} snapPoint="0.5" />;

  {/* §1: one callback, named for the value it reports. */}
  /* @ts-expect-error there is no onExpand */
  const b = <Drawer.Panel label="x" snapPoints={[0.5]} onExpand={() => {}} />;

  /* @ts-expect-error snapPoints is a list of numbers */
  const c = <Drawer.Panel label="x" snapPoints={["half", "full"]} />;

  return [a, b, c];
}
