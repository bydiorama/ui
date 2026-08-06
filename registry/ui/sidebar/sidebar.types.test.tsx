/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Sidebar } from "./sidebar.tsx";

export function Valid() {
  return (
    <>
      <Sidebar label="Primary">
        <Sidebar.Item href="/exports">Exports</Sidebar.Item>
      </Sidebar>
      <Sidebar label="Primary" isLabelHidden className="h-full">
        <Sidebar.Group>
          <button type="button">Back</button>
        </Sidebar.Group>
        <Sidebar.Section label="Brand" isCollapsible icon={<svg aria-hidden="true" />}>
          <Sidebar.Item href="/brand/guidelines" trailing={<span>3</span>}>Guidelines</Sidebar.Item>
        </Sidebar.Section>
        <Sidebar.Section label="Most recent" defaultIsOpen onOpenChange={() => {}}>
          <Sidebar.Item href="/settings/team">Team</Sidebar.Item>
        </Sidebar.Section>
        <Sidebar.Spacer />
        {/* A row is a SLOT, not a link — the sheet puts a search field in one
            and a progress bar in another, so href is optional by design. */}
        <Sidebar.Item>
          <progress value={0.4} aria-label="Storage used" />
        </Sidebar.Item>
      </Sidebar>
    </>
  );
}

export function Invalid() {
  {/* Several <nav> landmarks on a page are indistinguishable unnamed. */}
  /* @ts-expect-error label is required */
  const a = <Sidebar><Sidebar.Item href="/">Home</Sidebar.Item></Sidebar>;

  /* @ts-expect-error an item needs children — a row with nothing in it is not a row */
  const b = <Sidebar label="P"><Sidebar.Item href="/" /></Sidebar>;

  /* @ts-expect-error a section needs a label */
  const c = <Sidebar label="P"><Sidebar.Section><Sidebar.Item href="/">x</Sidebar.Item></Sidebar.Section></Sidebar>;

  {/* The header band holds controls; it has no label of its own. */}
  /* @ts-expect-error Group takes no label */
  const d = <Sidebar label="P"><Sidebar.Group label="Brand" /></Sidebar>;

  return [a, b, c, d];
}
