/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { createRef } from "react";

import { DotPattern } from "./dot-pattern.tsx";

export const valid = (
  <>
    {/* No props at all is the shipped recipe: gap 16, dot 2, border-subtle. */}
    <DotPattern />

    {/* Geometry is props — plain numbers, per the sheet. */}
    <DotPattern gap={8} dotSize={2} />
    <DotPattern gap={24} dotSize={4} />

    {/* Colour and layer background are className, in tokens. */}
    <DotPattern className="text-edge-default" />
    <DotPattern className="bg-sunken text-edge-default" />

    {/* Native SVG props pass through. */}
    <DotPattern id="stage-grid" style={{ opacity: 0.5 }} data-testid="grid" />

    <DotPattern ref={createRef<SVGSVGElement>()} />
  </>
);

export const invalid = (
  <>
    {/* @ts-expect-error — gap is a number of px, not a spacing token name */}
    <DotPattern gap="lg" />

    {/* @ts-expect-error — dotSize is a number of px, not a string */}
    <DotPattern dotSize="2" />

    {/* Colour is className in tokens, never a free-form prop — a colour prop
        is an invitation to raw hex, which §6 exists to prevent. `dotColor` is
        not a DOM attribute, so this is checkable where `color` would not be. */}
    {/* @ts-expect-error — there is no dotColor prop; retint with className */}
    <DotPattern dotColor="#DAD4CE" />

    {/* The tile is generated from gap and dotSize; children inside the <svg>
        would silently not be the pattern, so the type refuses them. */}
    {/* @ts-expect-error — children are typed out */}
    <DotPattern>
      <circle r={4} />
    </DotPattern>

    {/* The single node is an svg; a ref typed for a div cannot hold it. */}
    {/* @ts-expect-error — the ref is SVGSVGElement, not HTMLDivElement */}
    <DotPattern ref={createRef<HTMLDivElement>()} />
  </>
);
