/**
 * Compile-time contract tests.
 *
 * These assert things no runtime test can reach: that misuse is a *type error*.
 * `tsc --noEmit` is the runner — a `@ts-expect-error` that stops being an error
 * fails the build, so this file breaks loudly if the API silently loosens.
 *
 * Not covered here: the keyboard interaction contract (CONVENTIONS §10), which
 * needs a DOM harness. Tracked as the next Phase 2 setup item.
 */

import { Button } from "./button.tsx";

export function Valid() {
  return (
    <>
      <Button>Create New</Button>
      <Button variant="danger" size="lg" shape="pill">Delete</Button>
      <Button variant="outline" size="md">Outline</Button>
      <Button variant="secondary" size="sm" shape="soft">Soft is the default</Button>
      <Button isBusy isFullWidth>Saving…</Button>
      <Button isIconOnly aria-label="Bookmark this brief" icon={<svg />} />
      {/* isBusy and isDisabled are distinct and may legitimately co-occur. */}
      <Button isDisabled isBusy>Submitting…</Button>
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* An icon-only button with no accessible name is invisible to a screen
          reader. The failure is total and impossible to see in review, so the
          types refuse it. */}
      {/* @ts-expect-error isIconOnly requires aria-label */}
      <Button isIconOnly icon={<svg />} />

      {/* A labelled button must actually have a label. */}
      {/* @ts-expect-error children is required when not isIconOnly */}
      <Button variant="secondary" />

      {/* @ts-expect-error isIconOnly forbids children — the label would not render */}
      <Button isIconOnly aria-label="Close" icon={<svg />}>Close</Button>

      {/* Variants are a closed set; a fifth one belongs in the component. */}
      {/* @ts-expect-error unknown variant */}
      <Button variant="tertiary">Nope</Button>

      {/* `disabled` is deliberately omitted from the native props so there is
          exactly one way to express the state (CONVENTIONS §1). */}
      {/* @ts-expect-error use isDisabled, not the native disabled */}
      <Button disabled>Nope</Button>
    </>
  );
}
