/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { InfoCircle } from "griddy-icons";

import { Accordion } from "./accordion.tsx";

export function Valid() {
  return (
    <>
      <Accordion>
        <Accordion.Item value="a">
          <Accordion.Trigger>Question</Accordion.Trigger>
          <Accordion.Panel>Answer</Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Accordion variant="card" headingLevel={2} isMultiple defaultValue={["a"]}>
        <Accordion.Item value="a" isDisabled>
          <Accordion.Trigger icon={<InfoCircle />}>Question</Accordion.Trigger>
          <Accordion.Panel>Answer</Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Accordion value={["a"]} onValueChange={(next) => next.join(",")} isDisabled>
        <Accordion.Item>
          <Accordion.Trigger>Question</Accordion.Trigger>
          <Accordion.Panel>Answer</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
}

export function Invalid() {
  return (
    <>
      {/* The open set is an array in BOTH modes. A bare string is the mistake
          worth catching, because it reads perfectly and would silently open
          nothing. */}
      {/* @ts-expect-error value is string[], not string */}
      <Accordion value="a">
        <Accordion.Item value="a">
          <Accordion.Trigger>Q</Accordion.Trigger>
          <Accordion.Panel>A</Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Heading levels are a closed set. h1 is excluded on purpose: a page
          has one, and it is not a row of an accordion. */}
      {/* @ts-expect-error headingLevel does not include 1 */}
      <Accordion headingLevel={1}>
        <Accordion.Item>
          <Accordion.Trigger>Q</Accordion.Trigger>
          <Accordion.Panel>A</Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* @ts-expect-error unknown variant */}
      <Accordion variant="bordered">
        <Accordion.Item>
          <Accordion.Trigger>Q</Accordion.Trigger>
          <Accordion.Panel>A</Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Booleans are is*-named here (§1); the behaviour layer's own spelling
          must not leak out through the wrapper. */}
      {/* @ts-expect-error use isMultiple, not the behaviour layer's multiple */}
      <Accordion multiple>
        <Accordion.Item>
          <Accordion.Trigger>Q</Accordion.Trigger>
          <Accordion.Panel>A</Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Same for disabled, on both the root and the item. */}
      {/* @ts-expect-error use isDisabled, not disabled */}
      <Accordion disabled>
        <Accordion.Item>
          <Accordion.Trigger>Q</Accordion.Trigger>
          <Accordion.Panel>A</Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Accordion>
        {/* @ts-expect-error use isDisabled, not disabled */}
        <Accordion.Item disabled>
          <Accordion.Trigger>Q</Accordion.Trigger>
          <Accordion.Panel>A</Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* The callback is ours, so it takes the value and nothing else — a
          second parameter would mean a behaviour-layer type had leaked. */}
      <Accordion
        // @ts-expect-error onValueChange receives only the value
        onValueChange={(value: string[], details: unknown) => [value, details]}
      >
        <Accordion.Item>
          <Accordion.Trigger>Q</Accordion.Trigger>
          <Accordion.Panel>A</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
}
