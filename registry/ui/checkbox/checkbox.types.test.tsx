/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { useRef } from "react";

import { Checkbox } from "./checkbox.tsx";

export function Valid() {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Checkbox>Select all</Checkbox>
      <Checkbox defaultIsChecked>Uncontrolled</Checkbox>
      <Checkbox isChecked onCheckedChange={() => {}}>
        Controlled
      </Checkbox>
      <Checkbox isIndeterminate onCheckedChange={() => {}}>
        Mixed
      </Checkbox>
      <Checkbox isDisabled>Disabled</Checkbox>
      {/* The ref goes to the input, not a wrapper — it must be focusable and
          readable by a form library (CONVENTIONS §5). */}
      <Checkbox ref={ref} name="terms" value="accepted">
        Accept the terms
      </Checkbox>
      <Checkbox className="w-full" onChange={(event) => event.target.checked}>
        Native onChange still forwards
      </Checkbox>
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* The label IS the accessible name. There is no nameless form. */}
      {/* @ts-expect-error children is required */}
      <Checkbox />

      {/* `checked` is the native prop; the contract prop is `isChecked`, so
          the two cannot be set independently and drift (CONVENTIONS §1). */}
      {/* @ts-expect-error use isChecked, not checked */}
      <Checkbox checked>Select all</Checkbox>

      {/* @ts-expect-error use defaultIsChecked, not defaultChecked */}
      <Checkbox defaultChecked>Select all</Checkbox>

      {/* @ts-expect-error use isDisabled, not disabled */}
      <Checkbox disabled>Select all</Checkbox>

      {/* type is fixed — a Checkbox that renders type="radio" is a bug. */}
      {/* @ts-expect-error type is not configurable */}
      <Checkbox type="radio">Select all</Checkbox>

      {/* Mixed describes OTHER checkboxes, so the component cannot own it. */}
      {/* @ts-expect-error there is no uncontrolled indeterminate */}
      <Checkbox defaultIsIndeterminate>Select all</Checkbox>

      {/* @ts-expect-error onCheckedChange receives a boolean, not an event */}
      <Checkbox onCheckedChange={(event: React.ChangeEvent) => event.type}>Select all</Checkbox>
    </>
  );
}
