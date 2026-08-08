/**
 * Type-level assertions. Runs under `tsc --noEmit`, so an @ts-expect-error that
 * stops erroring fails the build just as loudly as a real type error.
 */
import { Thumbnail } from "./thumbnail.tsx";

export const valid = (
  <>
    <Thumbnail src="/a.png" alt="Brand guidelines.pdf" />
    <Thumbnail src="/a.png" alt="Brand guidelines.pdf" isLoading />
    <Thumbnail src="/a.png" alt="Brand guidelines.pdf" onRemove={() => {}} removeLabel="Remove Brand guidelines.pdf" />
    <Thumbnail.Group>
      <Thumbnail src="/a.png" alt="a" />
      <Thumbnail src="/b.png" alt="b" />
    </Thumbnail.Group>
    <Thumbnail.Group isStacked max={2} overflowLabel="3 more attachments">
      <Thumbnail src="/a.png" alt="a" />
      <Thumbnail src="/b.png" alt="b" />
      <Thumbnail src="/c.png" alt="c" />
    </Thumbnail.Group>
  </>
);

export const invalid = (
  <>
    {/* @ts-expect-error — alt is required; a grey square is not a name */}
    <Thumbnail src="/a.png" />

    {/* A cross with no accessible name announces as "button", and a row of
        five announces as five buttons called "button". The pair is a
        discriminated union, not a documented convention. */}
    {/* @ts-expect-error — onRemove without removeLabel */}
    <Thumbnail src="/a.png" alt="a" onRemove={() => {}} />

    {/* @ts-expect-error — removeLabel without onRemove is a label for nothing */}
    <Thumbnail src="/a.png" alt="a" removeLabel="Remove a" />

    {/* Same shape as Avatar.Group's counter, for the same reason. */}
    {/* @ts-expect-error — max without overflowLabel */}
    <Thumbnail.Group max={2}>
      <Thumbnail src="/a.png" alt="a" />
    </Thumbnail.Group>

    {/* The tile is one size. A scale nobody drew is a scale nobody checked,
        and the remove control's 24px target already fills a quadrant of 48. */}
    {/* @ts-expect-error — there is no size prop */}
    <Thumbnail src="/a.png" alt="a" size="sm" />

    {/* `onDismiss` is not a DOM event, so this really does fail to compile —
        `onSelect` or `onDrop` would have been accepted from HTMLAttributes and
        reported this directive as unused. */}
    {/* @ts-expect-error — the callback is onRemove */}
    <Thumbnail src="/a.png" alt="a" onDismiss={() => {}} />
  </>
);
