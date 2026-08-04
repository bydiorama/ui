/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { Avatar } from "./avatar.tsx";

export function Valid() {
  return (
    <>
      <Avatar name="Miroslava Vrbová" />
      <Avatar name="Miroslava Vrbová" src="/photo.jpg" />
      <Avatar name="Miroslava Vrbová" initials="MV" shape="rounded" size="lg" />
      <Avatar name="Diorama" size="sm" />
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* An avatar with no name has no accessible name and no initials to
          derive — it is a coloured circle claiming to be a person. */}
      {/* @ts-expect-error name is required */}
      <Avatar src="/photo.jpg" />

      {/* `initials` belongs to the no-image form; with a photo it would be
          silently ignored, which is worse than a compile error. */}
      {/* @ts-expect-error initials cannot be combined with src */}
      <Avatar name="Miroslava Vrbová" src="/photo.jpg" initials="MV" />

      {/* @ts-expect-error unknown size */}
      <Avatar name="Miroslava Vrbová" size="xl" />

      {/* @ts-expect-error unknown shape */}
      <Avatar name="Miroslava Vrbová" shape="squircle" />
    </>
  );
}
