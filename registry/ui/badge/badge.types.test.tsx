/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { Badge } from "./badge.tsx";

export function Valid() {
  return (
    <>
      <Badge>Unselected</Badge>
      <Badge variant="selected" size="md">Selected</Badge>
      <Badge variant="success" shape="rounded">Ready</Badge>
      <Badge variant="danger">Failed</Badge>
      <Badge iconEnd={<svg aria-hidden="true" />}>Selected</Badge>
      <Badge
        iconEnd={
          <button type="button" aria-label="Remove Brand Guidelines">
            <svg aria-hidden="true" />
          </button>
        }
      >
        Brand Guidelines
      </Badge>
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* A badge with no label is a coloured pill with no meaning. */}
      {/* @ts-expect-error children is required */}
      <Badge variant="selected" />

      {/* @ts-expect-error unknown variant */}
      <Badge variant="warning">Careful</Badge>

      {/* @ts-expect-error unknown size */}
      <Badge size="lg">Selected</Badge>

      {/* A click handler on a span has no role, no focus and no keyboard
          path. The doc said "don't"; now the type says it too. */}
      {/* @ts-expect-error Badge is not interactive — put the control in iconEnd */}
      <Badge onClick={() => {}}>Selected</Badge>

      {/* A tab stop that announces nothing is worse than no tab stop. */}
      {/* @ts-expect-error Badge takes no tabIndex */}
      <Badge tabIndex={0}>Selected</Badge>
    </>
  );
}
