/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { Avatar } from "./avatar.tsx";

export function Valid() {
  return (
    <>
      <Avatar name="Miroslava Vrbová" />
      <Avatar name="Miroslava Vrbová" src="/photo.jpg" />
      <Avatar name="Miroslava Vrbová" initials="MV" shape="soft" size="lg" />
      <Avatar name="Diorama" size="sm" shape="full" />
      <Avatar name="Mira Vance" status="success" statusLabel="Online" />
      <Avatar name="Mira Vance" src="/photo.jpg" status="danger" statusLabel="Do not disturb" />

      <Avatar.Group>
        <Avatar name="Mira Vance" />
        <Avatar name="Peter Roth" />
      </Avatar.Group>
      <Avatar.Group max={2} overflowLabel="3 more people" size="lg">
        <Avatar name="Mira Vance" size="lg" />
        <Avatar name="Peter Roth" size="lg" />
        <Avatar name="Dana Ilic" size="lg" />
      </Avatar.Group>
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

      {/* The old vocabulary. `circle`/`rounded` were synonyms for shapes that
          already had names on Button — the rename is the whole point, so the
          old values must stop compiling rather than quietly mean nothing. */}
      {/* @ts-expect-error shape is soft | full, not circle | rounded */}
      <Avatar name="Miroslava Vrbová" shape="circle" />

      {/* @ts-expect-error unknown shape */}
      <Avatar name="Miroslava Vrbová" shape="squircle" />

      {/* A dot with no label is colour as the only channel — WCAG 1.4.1. The
          type refuses it rather than a reviewer catching it. */}
      {/* @ts-expect-error status requires statusLabel */}
      <Avatar name="Mira Vance" status="success" />

      {/* And a label with no dot is a sentence about nothing. */}
      {/* @ts-expect-error statusLabel requires status */}
      <Avatar name="Mira Vance" statusLabel="Online" />

      {/* @ts-expect-error unknown status */}
      <Avatar name="Mira Vance" status="away" statusLabel="Away" />

      {/* Same rule one level up: "+4" needs its sentence. */}
      {/* @ts-expect-error max requires overflowLabel */}
      <Avatar.Group max={2}>
        <Avatar name="Mira Vance" />
      </Avatar.Group>
    </>
  );
}
