/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { createRef } from "react";

import { TextSwap } from "./text-swap.tsx";

export const valid = (
  <>
    <TextSwap>Save changes</TextSwap>
    <TextSwap className="text-ink-muted" id="status" aria-live="polite">
      Queued
    </TextSwap>
    <TextSwap ref={createRef<HTMLSpanElement>()}>Saved</TextSwap>
  </>
);

export const invalid = (
  <>
    {/* The text is the identity of the swap, so it must be a string. */}
    {/* @ts-expect-error — an element is not a label */}
    <TextSwap>
      <b>Saved</b>
    </TextSwap>

    {/* @ts-expect-error — a label is required */}
    <TextSwap />

    {/* @ts-expect-error — data-slot is the component's own */}
    <TextSwap data-slot="status">Saved</TextSwap>
  </>
);
