/**
 * Compile-time contract tests. `tsc --noEmit` is the runner — a
 * `@ts-expect-error` that stops erroring fails the build.
 */

import { Input } from "./input.tsx";

export function Valid() {
  return (
    <>
      <Input label="Company name" />
      <Input label="Company name" isLabelHidden placeholder="Company name" />
      <Input label="Task title" size="sm" helperText="Shown under the field" />
      <Input label="Email" errorText="This field is required" />
      <Input label="Email" isInvalid />
      <Input label="Password" type="password" iconEnd={<svg />} />
      <Input label="Amount" isRequired isDisabled defaultValue="0" />
      <Input label="Search" value="" onChange={() => {}} />
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* A field with no accessible name is unusable to a screen reader and
          looks perfectly fine in review — so the type system refuses it. */}
      {/* @ts-expect-error label is required */}
      <Input placeholder="Company name" />

      {/* `disabled` is omitted from the native props so there is exactly one
          way to express the state (CONVENTIONS §1). */}
      {/* @ts-expect-error use isDisabled, not the native disabled */}
      <Input label="Company name" disabled />

      {/* Same for required. */}
      {/* @ts-expect-error use isRequired, not the native required */}
      <Input label="Company name" required />

      {/* The native `size` attribute (a character count) is shadowed by the
          design-system size scale — passing a number is a mistake worth
          catching, since it would silently mean neither thing. */}
      {/* @ts-expect-error size is the scale, not the native character count */}
      <Input label="Company name" size={40} />

      {/* Sizes are a closed set. */}
      {/* @ts-expect-error unknown size */}
      <Input label="Company name" size="xl" />
    </>
  );
}
