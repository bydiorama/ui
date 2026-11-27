/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { createRef } from "react";

import { SuccessCheck, useShake } from "./feedback.tsx";

export function Valid() {
  const { ref, shake } = useShake<HTMLInputElement>();
  return (
    <>
      <input ref={ref} onInvalid={shake} />
      <SuccessCheck />
      <SuccessCheck className="size-5 text-ink-primary" ref={createRef<HTMLSpanElement>()} />
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* The check is a glyph, not a container. */}
      {/* @ts-expect-error — SuccessCheck takes no children */}
      <SuccessCheck>Saved</SuccessCheck>

      {/* @ts-expect-error — data-slot is the component's own */}
      <SuccessCheck data-slot="done" />
    </>
  );
}
