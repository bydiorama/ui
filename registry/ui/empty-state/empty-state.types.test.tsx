/**
 * Compile-time assertions. Run by `tsc --noEmit`: an `@ts-expect-error` that
 * stops erroring fails the build, so these are as binding as a runtime test.
 */
import { Inbox } from "griddy-icons";

import { EmptyState } from "./empty-state.tsx";

export function TitleIsRequired() {
  return (
    <>
      {/* @ts-expect-error — an empty state with a picture and no sentence is a shrug. */}
      <EmptyState icon={<Inbox />} />
      <EmptyState title="No designers match this filter" />
    </>
  );
}

export function SlotsTakeElements() {
  return (
    <>
      {/* @ts-expect-error — `icon` is a slot, not a name. The component owns the well. */}
      <EmptyState title="Nothing here" icon="inbox" />
      {/* @ts-expect-error — `action` is a real control, not a label to render one from. */}
      <EmptyState title="Nothing here" action="Clear Filter" />
      <EmptyState title="Nothing here" icon={<Inbox />} action={<button type="button">Clear</button>} />
    </>
  );
}

export function StringsStayStrings() {
  return (
    <>
      {/* @ts-expect-error — `description` is prose, not markup. There is no i18n runtime here. */}
      <EmptyState title="Nothing here" description={<em>none</em>} />
      <EmptyState title="Nothing here" description="Clear the status filter." />
    </>
  );
}

export function ForwardsNativeDivProps() {
  // The container may need the live region here rather than on itself, so the
  // native props are genuinely open. This asserts the OPPOSITE of the rules
  // above: it must keep compiling.
  return <EmptyState title="Nothing here" role="status" aria-live="polite" id="empty" />;
}
