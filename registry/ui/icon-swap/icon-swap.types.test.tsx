/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { createRef } from "react";
import { Check, Copy } from "griddy-icons";

import { IconSwap } from "./icon-swap.tsx";

const icons = { copy: <Copy />, check: <Check /> };

export const valid = (
  <>
    <IconSwap icons={icons} show="copy" />
    <IconSwap icons={icons} show="check" className="text-ink-muted" id="state" />
    <IconSwap ref={createRef<HTMLSpanElement>()} icons={icons} show="copy" />
  </>
);

export const invalid = (
  <>
    {/* @ts-expect-error — show must name one of the icons */}
    <IconSwap icons={icons} show="paste" />

    {/* @ts-expect-error — icons are required */}
    <IconSwap show="copy" />

    {/* @ts-expect-error — data-slot is the component's own */}
    <IconSwap icons={icons} show="copy" data-slot="state" />

    {/* @ts-expect-error — children are not glyphs; use icons */}
    <IconSwap icons={icons} show="copy">
      <Copy />
    </IconSwap>
  </>
);
