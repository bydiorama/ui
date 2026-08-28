/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { createRef } from "react";

import { Fade } from "./fade.tsx";

export const valid = (
  <>
    {/* No props is the sheet's default cell: bottom, md (32px), surface. */}
    <Fade />

    {/* The three axes the sheet draws. */}
    <Fade side="top" size="sm" ground="base" />
    <Fade side="left" size="lg" ground="elevated" />
    <Fade side="right" ground="sunken" />

    {/* The caller-owned overflow state. */}
    <Fade isVisible={false} />

    {/* Placement nudges are className, in tokens/utilities — the doc's
        pinned-header composition hangs a top fade below a 48px bar. */}
    <Fade side="top" className="top-12" />

    {/* Native span props pass through. */}
    <Fade id="preview-fade" style={{ zIndex: 1 }} data-testid="fade" />

    <Fade ref={createRef<HTMLSpanElement>()} />
  </>
);

export const invalid = (
  <>
    {/* @ts-expect-error — sides are the four physical edges; there is no x/y shorthand */}
    <Fade side="vertical" />

    {/* Physical sides on purpose (Sheet's precedent; the band tracks the box,
        not the writing direction) — start/end would be a different decision,
        recorded in the doc's knownGaps. */}
    {/* @ts-expect-error — side is left/right, not start/end */}
    <Fade side="start" />

    {/* @ts-expect-error — depth is the sm/md/lg scale, never a raw length */}
    <Fade size={64} />

    {/* Media is deliberately absent: text over an image is ImageOverlay's
        contract, and unknown grounds want a mask, not a painted colour. */}
    {/* @ts-expect-error — ground has no media value */}
    <Fade ground="media" />

    {/* A colour prop is an invitation to raw hex; the ground prop moves both
        gradient stops together, which is the point. `rampColor` is not a DOM
        attribute, so this is checkable where `color` would not be. */}
    {/* @ts-expect-error — there is no rampColor prop */}
    <Fade rampColor="#FDFCFB" />

    {/* The band is paint. Content inside it would sit on unreadable ground
        and violate the no-targets rule, so the type refuses it. */}
    {/* @ts-expect-error — children are typed out */}
    <Fade>
      <button type="button">Show more</button>
    </Fade>

    {/* No wrong-element ref case, and the absence is the finding: the host is
        a span, and HTMLSpanElement is structurally bare HTMLElement — it adds
        no members — so TypeScript's covariant property check accepts EVERY
        element ref (div, input, anything) against Ref<HTMLSpanElement>. A
        directive there reports as unused, which is how this was learned. The
        runtime half — the ref really reaching the span — is asserted in
        fade.browser.test.tsx instead. */}
  </>
);
