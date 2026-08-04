/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { Banner } from "./banner.tsx";

export function Valid() {
  return (
    <>
      <Banner>Exports use the template set in Brand profile.</Banner>
      <Banner variant="info">Exports use the template set in Brand profile.</Banner>
      <Banner variant="danger" onDismiss={() => {}} dismissLabel="Dismiss export notice">
        Exports use the template set in Brand profile.
      </Banner>
      <Banner variant="success" icon={<svg aria-hidden="true" />} isLive>
        Saved.
      </Banner>
      <Banner variant="warning" className="mt-lg">
        A message with <a href="/settings">a link</a> in it.
      </Banner>
    </>
  );
}

export function Invalid() {
  {
    /* A banner with no message is a coloured rectangle. */
  }
  /* @ts-expect-error children is required */
  const noMessage = <Banner variant="info" />;

  /* @ts-expect-error unknown variant */
  const badVariant = <Banner variant="error">Something failed</Banner>;

  {
    /* The dismiss button would have no accessible name — the two props travel
       together, so this cannot compile. */
  }
  /* @ts-expect-error onDismiss requires dismissLabel */
  const unnamedDismiss = <Banner onDismiss={() => {}}>Message</Banner>;

  {
    /* A label with nothing to label. */
  }
  /* @ts-expect-error dismissLabel requires onDismiss */
  const orphanLabel = <Banner dismissLabel="Dismiss">Message</Banner>;

  return [noMessage, badVariant, unnamedDismiss, orphanLabel];
}
