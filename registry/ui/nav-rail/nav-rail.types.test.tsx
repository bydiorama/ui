/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { NavRail } from "./nav-rail.tsx";

export function Valid() {
  return (
    <>
      <NavRail label="Primary">
        <NavRail.Section label="Workspace">
          <NavRail.Item icon={<svg aria-hidden="true" />} label="Overview" href="/overview" />
          {/* No href — a row that ACTS rather than navigates. */}
          <NavRail.Item icon={<svg aria-hidden="true" />} label="Search everything" onClick={() => {}} />
        </NavRail.Section>
      </NavRail>
      <NavRail label="Secondary" className="h-full">
        <NavRail.Slot>
          <button type="button" aria-label="Expand navigation" />
        </NavRail.Slot>
        <NavRail.Section label="Brand">
          <NavRail.Item icon={<svg aria-hidden="true" />} label="Colours" href="/colours" isCurrent />
          <NavRail.Item icon={<svg aria-hidden="true" />} label="Members" href="/members" isDisabled />
          <NavRail.Item
            icon={<svg aria-hidden="true" />}
            label="Reports"
            href="/reports"
            render={<a href="/reports" />}
          />
        </NavRail.Section>
        <NavRail.Spacer />
      </NavRail>
    </>
  );
}

export function Invalid() {
  {/* Several <nav> landmarks on a page are indistinguishable unnamed. */}
  /* @ts-expect-error label is required */
  const a = <NavRail><NavRail.Section label="S" /></NavRail>;

  {/* The glyph is the ONLY thing rendered. A row without one is a blank
      square, which is why this is a type and not a doc note. */}
  /* @ts-expect-error an item needs an icon */
  const b = <NavRail label="P"><NavRail.Item label="Overview" href="/" /></NavRail>;

  {/* The label is the row's accessible name — nothing else supplies one. */}
  /* @ts-expect-error an item needs a label */
  const c = <NavRail label="P"><NavRail.Item icon={<svg />} href="/" /></NavRail>;

  /* @ts-expect-error a section needs a label */
  const d = <NavRail label="P"><NavRail.Section><NavRail.Item icon={<svg />} label="x" /></NavRail.Section></NavRail>;

  {/* A row renders its icon and nothing else — there is no room for content,
      and accepting children would invite exactly what does not fit. */}
  /* @ts-expect-error an item takes no children */
  const e = <NavRail label="P"><NavRail.Item icon={<svg />} label="x">Overview</NavRail.Item></NavRail>;

  {/* 48px has no room for a heading, so unlike Sidebar there is no option to
      show the landmark's name. */}
  /* @ts-expect-error there is no isLabelHidden — the label is always hidden */
  const f = <NavRail label="P" isLabelHidden><NavRail.Section label="S" /></NavRail>;

  {/* Collapsibility is Sidebar's; a rail has no second level to disclose. */}
  /* @ts-expect-error a section is not collapsible */
  const g = <NavRail label="P"><NavRail.Section label="S" isCollapsible /></NavRail>;

  return [a, b, c, d, e, f, g];
}
