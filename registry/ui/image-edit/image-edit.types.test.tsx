/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { ImageEdit } from "./image-edit.tsx";

export const valid = (
  <>
    <ImageEdit src="/a.jpg" alt="Abstract gradient" />
    <ImageEdit src="/a.jpg" alt="" shape="circle" defaultZoom={128} />
    <ImageEdit
      src="/a.jpg"
      alt=""
      hasRotation
      rotation={-12}
      onRotationChange={() => {}}
      zoom={128}
      onZoomChange={() => {}}
    />
  </>
);

export const invalid = (
  <>
    {/* @ts-expect-error — alt is required; the picture is the whole subject */}
    <ImageEdit src="/a.jpg" />

    {/* @ts-expect-error — src is required */}
    <ImageEdit alt="Abstract gradient" />

    {/* The shape vocabulary is closed, and it is about the DESTINATION. */}
    {/* @ts-expect-error — "square" is not one of the two shapes */}
    <ImageEdit src="/a.jpg" alt="" shape="square" />

    {/* The crop window does not resize — the image moves behind it — so there
        is nothing to hand a crop rectangle to. */}
    {/* @ts-expect-error — there is no cropWidth prop */}
    <ImageEdit src="/a.jpg" alt="" cropWidth={240} />

    {/* The pan offset is internal: it is meaningless outside the stage's own
        pixel space, so it is neither a prop nor a callback. */}
    {/* @ts-expect-error — there is no onOffsetChange prop */}
    <ImageEdit src="/a.jpg" alt="" onOffsetChange={() => {}} />

    {/* @ts-expect-error — zoom is a number, not a string with a unit */}
    <ImageEdit src="/a.jpg" alt="" zoom="128%" />
  </>
);
