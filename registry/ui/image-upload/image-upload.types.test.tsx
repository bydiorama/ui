/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { ImageUpload } from "./image-upload.tsx";

export const valid = (
  <>
    <ImageUpload label="Cover image" />
    <ImageUpload label="Cover image" status="busy" busyText="Uploading" onSelect={() => {}} />
    <ImageUpload label="Cover image" errorText="Too large" errorDetail="The limit is 10 MB." />
    <ImageUpload.File name="a.jpg" />
    <ImageUpload.File name="a.jpg" value={62} onCancel={() => {}} cancelLabel="Cancel upload of a.jpg" />
    <ImageUpload.Grid>
      <ImageUpload.Add label="Add images" />
    </ImageUpload.Grid>
  </>
);

export const invalid = (
  <>
    {/* @ts-expect-error — label is required; a drop target with no name says nothing */}
    <ImageUpload />

    {/* The union is closed. "dragging" is a state the COMPONENT owns — whether
        a file is currently over the target is not something a caller knows. */}
    {/* @ts-expect-error — "dragging" is not a caller-settable status */}
    <ImageUpload label="Cover image" status="dragging" />

    {/* @ts-expect-error — nor is "error"; the state is called rejected */}
    <ImageUpload label="Cover image" status="error" />

    {/* @ts-expect-error — name is required on a file row */}
    <ImageUpload.File value={10} />

    {/* Same discriminated-union shape Thumbnail and Avatar use: five rows of
        "Cancel" announce as five identical buttons. */}
    {/* @ts-expect-error — onCancel without cancelLabel */}
    <ImageUpload.File name="a.jpg" onCancel={() => {}} />

    {/* @ts-expect-error — the add tile is a plus glyph and nothing else */}
    <ImageUpload.Add />

    {/* `onUpload` is not a DOM event, so this really fails to compile — a name
        the DOM does have would be accepted from HTMLAttributes and report the
        directive as unused. */}
    {/* @ts-expect-error — the callback is onSelect */}
    <ImageUpload label="Cover image" onUpload={() => {}} />
  </>
);
