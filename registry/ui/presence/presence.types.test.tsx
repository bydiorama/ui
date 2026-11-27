/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { Presence } from "./presence.tsx";

export const valid = (
  <>
    {/* No props: fade, and items present at mount do not animate. */}
    <Presence>
      <li key="a">One</li>
    </Presence>

    {/* The sheet's three kinds, and the first-render opt-in. */}
    <Presence kind="rise">
      <div key="a" />
    </Presence>
    <Presence kind="collapse" appear>
      <li key="a" />
    </Presence>

    {/* An empty list is a list that has not filled yet. */}
    <Presence kind="fade">{[]}</Presence>
  </>
);

export const invalid = (
  <>
    {/* Timing is not a choice the caller makes: there are three kinds. */}
    {/* @ts-expect-error — "slide" is not a kind */}
    <Presence kind="slide" />

    {/* There is no element to put a className on; it belongs on the items. */}
    {/* @ts-expect-error — Presence renders no element */}
    <Presence className="gap-md" />

    {/* Nor a ref: each item keeps its own. */}
    {/* @ts-expect-error — Presence renders no element */}
    <Presence ref={null} />
  </>
);
