/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Sidebar } from "./sidebar.tsx";

export function Valid() {
  return (
    <>
      <Sidebar label="Primary">
        <Sidebar.Item href="/exports">Exports</Sidebar.Item>
        <Sidebar.Item href="/reports" render={<a href="/reports" />}>Reports</Sidebar.Item>
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

export function TwoLayers() {
  return (
    <Sidebar label="Primary" defaultLayer={null} onLayerChange={(layer: string | null) => void layer}>
      <Sidebar.Main>
        <Sidebar.Profile name="Jakub" email="j@d.com" avatar={<svg />} layer="profile" />
        <Sidebar.Search label="Search" placeholder="Find a brand" />
        <Sidebar.Slot>
          <button type="button">New chat</button>
        </Sidebar.Slot>
        <Sidebar.Heading>Most recent</Sidebar.Heading>
      </Sidebar.Main>
      <Sidebar.Layer id="profile" title="Profile Settings" backLabel="Back to navigation">
        <Sidebar.Item href="#x" isCurrent>Ohpen</Sidebar.Item>
      </Sidebar.Layer>
    </Sidebar>
  );
}

export function LayerContract() {
  {/* A layer with no id cannot be opened by anything. */}
  /* @ts-expect-error id is required */
  const a = <Sidebar.Layer title="Profile" backLabel="Back">x</Sidebar.Layer>;

  {/* "Back" alone leaves a screen-reader user to guess what they return to,
      and a rail may hold more than one layer — so it is required, not
      defaulted. */}
  /* @ts-expect-error backLabel is required */
  const b = <Sidebar.Layer id="profile" title="Profile">x</Sidebar.Layer>;

  {/* A placeholder is not a label (§10). */}
  /* @ts-expect-error Search requires a label */
  const c = <Sidebar.Search placeholder="Search" />;

  {/* §1: `default*`, never `initial*`. */}
  /* @ts-expect-error the uncontrolled prop is defaultLayer */
  const d = <Sidebar label="Primary" initialLayer="profile" />;

  {/* A name is the whole point of the row. */}
  /* @ts-expect-error Profile requires a name */
  const e = <Sidebar.Profile email="j@d.com" />;

  return [a, b, c, d, e];
}
