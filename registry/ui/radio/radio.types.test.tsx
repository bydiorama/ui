/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { useRef } from "react";

import { Radio, RadioGroup } from "./radio.tsx";

export function Valid() {
  const group = useRef<HTMLFieldSetElement>(null);
  const option = useRef<HTMLInputElement>(null);

  return (
    <>
      <RadioGroup label="Reviewer">
        <Radio value="a">Josef Müller-Brockmann</Radio>
      </RadioGroup>

      <RadioGroup label="Reviewer" defaultValue="a">
        <Radio value="a">Uncontrolled</Radio>
      </RadioGroup>

      <RadioGroup label="Reviewer" value="a" onValueChange={(next) => next.toUpperCase()}>
        <Radio value="a">Controlled — onValueChange gives a string, never Base UI's shape</Radio>
      </RadioGroup>

      <RadioGroup label="Status" orientation="horizontal" isDisabled>
        <Radio value="a">Disabled group</Radio>
      </RadioGroup>

      <RadioGroup label="Licence" isInvalid errorText="Choose one." helperText="Bundling depends on it.">
        <Radio value="a" description="Typeset to the twelve-column module.">
          With a description
        </Radio>
        <Radio value="b" isDisabled>
          One option disabled
        </Radio>
      </RadioGroup>

      {/* The group's ref is the fieldset; the option's is its input (§5). */}
      <RadioGroup label="Reviewer" ref={group} className="w-full" name="reviewer">
        <Radio value="a" ref={option} className="opacity-70" required>
          Native input props still forward
        </Radio>
      </RadioGroup>

      <RadioGroup label="Reviewer" isLabelHidden>
        <Radio value="a" onChange={(event) => event.target.value}>
          Native onChange still forwards
        </Radio>
      </RadioGroup>
    </>
  );
}

export function Invalid() {
  const wrongGroupRef = useRef<HTMLDivElement>(null);
  const wrongOptionRef = useRef<HTMLLabelElement>(null);

  return (
    <>
      {/* A group with no legend announces each option with no idea what it is
          an option FOR. Required, like every field's label (§10). */}
      {/* @ts-expect-error label is required */}
      <RadioGroup>
        <Radio value="a">A</Radio>
      </RadioGroup>

      <RadioGroup label="Reviewer">
        {/* An option with no value contributes nothing to the group and cannot
            be compared against its selection. */}
        {/* @ts-expect-error value is required */}
        <Radio>A</Radio>
      </RadioGroup>

      <RadioGroup label="Reviewer">
        {/* Two names in one set is two sets, and the arrow keys would tell you. */}
        {/* @ts-expect-error the GROUP owns name */}
        <Radio value="a" name="other">
          A
        </Radio>
      </RadioGroup>

      <RadioGroup label="Reviewer">
        {/* A Radio that renders a checkbox is a Checkbox with the wrong
            keyboard contract. */}
        {/* @ts-expect-error type is not configurable */}
        <Radio value="a" type="checkbox">
          A
        </Radio>
      </RadioGroup>

      <RadioGroup label="Reviewer">
        {/* Selection is the GROUP's, through value / defaultValue. */}
        {/* @ts-expect-error checked would be a second author of the selection */}
        <Radio value="a" checked>
          A
        </Radio>
      </RadioGroup>

      <RadioGroup label="Reviewer">
        {/* @ts-expect-error use isDisabled, not disabled */}
        <Radio value="a" disabled>
          A
        </Radio>
      </RadioGroup>

      {/* @ts-expect-error orientation is a closed union */}
      <RadioGroup label="Reviewer" orientation="diagonal">
        <Radio value="a">A</Radio>
      </RadioGroup>

      {/* onValueChange reports a string, never Base UI's or the DOM's shape. */}
      {/* @ts-expect-error onValueChange receives a string */}
      <RadioGroup label="Reviewer" onValueChange={(next: number) => next}>
        <Radio value="a">A</Radio>
      </RadioGroup>

      {/* @ts-expect-error the group's ref is a fieldset, not a div */}
      <RadioGroup label="Reviewer" ref={wrongGroupRef}>
        <Radio value="a">A</Radio>
      </RadioGroup>

      <RadioGroup label="Reviewer">
        {/* A ref to the wrapping label could not be focused or read for a
            value, which is every reason a caller takes one (§5). */}
        {/* @ts-expect-error the option's ref is its input */}
        <Radio value="a" ref={wrongOptionRef}>
          A
        </Radio>
      </RadioGroup>
    </>
  );
}
