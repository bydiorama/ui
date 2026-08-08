/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { ImageOverlay } from "./image-overlay.tsx";

export const valid = (
  <>
    <ImageOverlay src="/cover.jpg" alt="Abstract gradient" />
    <ImageOverlay src="/cover.jpg" alt="" variant="full" ratio="screen">
      <ImageOverlay.Title>Abstract background</ImageOverlay.Title>
      <ImageOverlay.Description>Photo Library</ImageOverlay.Description>
    </ImageOverlay>
  </>
);

export const invalid = (
  <>
    {/* A picture with a caption over it is usually not decoration, and the
        caption is a different sentence from the alt text. Required, so the
        decorative case has to be written as alt="" deliberately. */}
    {/* @ts-expect-error — alt is required */}
    <ImageOverlay src="/cover.jpg" />

    {/* @ts-expect-error — src is required; there is no empty-frame form */}
    <ImageOverlay alt="Abstract gradient" />

    {/* The ratio vocabulary is AspectRatio's, not a second scale. */}
    {/* @ts-expect-error — "wide" is not one of the six named ratios */}
    <ImageOverlay src="/cover.jpg" alt="" ratio="wide" />

    {/* @ts-expect-error — the veil has two positions, not four */}
    <ImageOverlay src="/cover.jpg" alt="" variant="top" />

    {/* The veil's strength is the AA guarantee, not a setting. Weakening it
        would be unmeasurable, so there is no prop to weaken it with. */}
    {/* @ts-expect-error — there is no scrimOpacity prop */}
    <ImageOverlay src="/cover.jpg" alt="" scrimOpacity={0.3} />
  </>
);
