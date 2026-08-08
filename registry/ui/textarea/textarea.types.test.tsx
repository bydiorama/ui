/**
 * Compile-time contract tests. `tsc --noEmit` is the runner — a
 * `@ts-expect-error` that stops erroring fails the build.
 */

import { Textarea } from "./textarea.tsx";

export function Valid() {
  return (
    <>
      <Textarea label="Message" />
      <Textarea label="Message" isLabelHidden placeholder="Your message" />
      <Textarea label="Message" helperText="Up to 120 words" />
      <Textarea label="Message" errorText="This field is required" />
      <Textarea label="Message" isInvalid />
      <Textarea label="Message" isRequired isDisabled defaultValue="" />
      <Textarea label="Message" isResizable={false} />
      <Textarea label="Message" size="md" />
      <Textarea label="Message" size="sm" rows={4} />
      {/* `rows` is the native attribute and stays native — the component only
          supplies a default, it does not shadow the meaning. */}
      <Textarea label="Message" rows={3} maxLength={480} />
      <Textarea label="Message" value="" onChange={() => {}} />
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* A field with no accessible name is unusable to a screen reader and
          looks perfectly fine in review — so the type system refuses it. */}
      {/* @ts-expect-error label is required */}
      <Textarea placeholder="Your message" />

      {/* `disabled` is omitted from the native props so there is exactly one
          way to express the state (CONVENTIONS §1). */}
      {/* @ts-expect-error use isDisabled, not the native disabled */}
      <Textarea label="Message" disabled />

      {/* Same for required. */}
      {/* @ts-expect-error use isRequired, not the native required */}
      <Textarea label="Message" required />

      {/* Resizing is a boolean, not the CSS keyword — and never "horizontal",
          which is the whole reason the prop exists rather than a passthrough.
          Note the name: `resize` IS a DOM event handler's cousin but not an
          attribute, so a wrong-shaped `isResizable` is the checkable form. */}
      {/* @ts-expect-error isResizable is a boolean, not a CSS keyword */}
      <Textarea label="Message" isResizable="vertical" />

      {/* Sizes are a closed set, and the same set Input exports. */}
      {/* @ts-expect-error unknown size */}
      <Textarea label="Message" size="xl" />

      {/* `cols` is refused rather than ignored. It is a real textarea
          attribute that this component makes inert — the control is w-full,
          so a character count never reaches layout. Accepting it silently is
          how a prop comes to look supported while doing nothing. */}
      {/* @ts-expect-error cols has no effect here; size the field with className */}
      <Textarea label="Message" cols={40} />
    </>
  );
}
