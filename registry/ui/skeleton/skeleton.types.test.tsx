/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { createRef } from "react";

import { Skeleton } from "./skeleton.tsx";

export const valid = (
  <>
    {/* The whole point: no props at all still renders something visible. */}
    <Skeleton />

    {/* className is the API. */}
    <Skeleton className="h-8 w-48" />
    <Skeleton className="size-10 rounded-full" />

    {/* Native div props pass through. */}
    <Skeleton id="title-placeholder" style={{ opacity: 0.5 }} data-testid="bar" />

    {/* aria-hidden is a DEFAULT, not an invariant — a caller standing one
        skeleton in for one named thing may label it instead. The doc says why
        this is the exception to §5. */}
    <Skeleton aria-hidden={false} aria-label="Loading title" />

    <Skeleton ref={createRef<HTMLDivElement>()} />
  </>
);

export const invalid = (
  <>
    {/* The layout is written at the call site, not configured. Every one of
        these is a prop somebody will reach for, and the doc explains why
        composing them from className is the trade being made. */}
    {/* @ts-expect-error — there is no `lines` prop; compose several instead */}
    <Skeleton lines={3} />

    {/* @ts-expect-error — there is no shape vocabulary; `rounded-full` is a class */}
    <Skeleton shape="circle" />

    {/* @ts-expect-error — there is no size scale; className carries the box */}
    <Skeleton size="lg" />

    {/* A placeholder is not media and takes none of its props. `src` on a div
        is dropped silently by JSX, which is exactly why this is a type test
        rather than a runtime one. */}
    {/* @ts-expect-error — src is not a div attribute */}
    <Skeleton src="/cover.jpg" />

    {/* The single node is a div; a ref typed for anything else cannot hold it. */}
    {/* @ts-expect-error — the ref is HTMLDivElement, not HTMLSpanElement */}
    <Skeleton ref={createRef<HTMLSpanElement>()} />
  </>
);
