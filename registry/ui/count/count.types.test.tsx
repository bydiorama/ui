/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { createRef } from "react";

import { Count } from "./count.tsx";

export const valid = (
  <>
    <Count value={1250} />
    <Count value={0.42} format={{ style: "percent" }} locale="sk-SK" className="text-title-lg" />
    <Count ref={createRef<HTMLSpanElement>()} value={3} aria-label="3 items in cart" />
  </>
);

export const invalid = (
  <>
    {/* @ts-expect-error — the value is a number, not formatted text */}
    <Count value="1,250" />

    {/* @ts-expect-error — a value is required */}
    <Count />

    {/* @ts-expect-error — the value is the content; children are not accepted */}
    <Count value={1}>1</Count>

    {/* @ts-expect-error — data-slot is the component's own */}
    <Count value={1} data-slot="total" />
  </>
);
