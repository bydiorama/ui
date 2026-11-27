/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { Stagger } from "./stagger.tsx";

export const valid = (
  <>
    <Stagger>
      <li key="a">One</li>
      <li key="b">Two</li>
    </Stagger>
    <Stagger kind="fade">{[]}</Stagger>
  </>
);

export const invalid = (
  <>
    {/* A group arriving is never a fold: collapse is Presence's, for leaving rows. */}
    {/* @ts-expect-error — "collapse" is not a Stagger kind */}
    <Stagger kind="collapse" />

    {/* The rhythm is the token's, not the caller's. */}
    {/* @ts-expect-error — there is no step prop */}
    <Stagger step={50} />

    {/* @ts-expect-error — Stagger renders no element */}
    <Stagger className="gap-md" />
  </>
);
