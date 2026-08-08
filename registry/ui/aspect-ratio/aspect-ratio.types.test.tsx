/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { AspectRatio } from "./aspect-ratio.tsx";

const img = <img src="/cover.jpg" alt="Cover" />;

export const valid = (
  <>
    <AspectRatio>{img}</AspectRatio>
    <AspectRatio ratio="screen">{img}</AspectRatio>
    <AspectRatio ratio="card" className="max-w-dialog-md" id="hero">
      {img}
    </AspectRatio>
  </>
);

export const invalid = (
  <>
    {/* The vocabulary is closed. "16/9" is the shape written as a number, and
        the whole reason the union exists is that nobody agrees which way round
        to write it. */}
    {/* @ts-expect-error — "16/9" is not one of the six named ratios */}
    <AspectRatio ratio="16/9">{img}</AspectRatio>

    {/* @ts-expect-error — nor is a number */}
    <AspectRatio ratio={1.586}>{img}</AspectRatio>

    {/* The frame is not a media element and takes none of its props. `src` on
        a div is dropped silently by JSX, which is exactly why this is a type
        test and not a runtime one. */}
    {/* @ts-expect-error — the media goes in as a child, not as a prop */}
    <AspectRatio src="/cover.jpg">{img}</AspectRatio>

    {/* A frame with nothing in it is a well with no purpose. `children` is
        required so the empty case has to be written deliberately. */}
    {/* @ts-expect-error — children is required */}
    <AspectRatio ratio="square" />
  </>
);
