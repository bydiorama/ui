/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { RangeSlider, type RangeSliderValue } from "./range-slider.tsx";

export function Valid() {
  const pair: RangeSliderValue = [1925, 1972];
  return (
    <>
      <RangeSlider label="Active years" startThumbLabel="Earliest year" endThumbLabel="Latest year" />
      <RangeSlider
        label="Active years"
        startThumbLabel="Earliest year"
        endThumbLabel="Latest year"
        min={1800}
        max={2000}
        value={pair}
        onValueChange={([start, end]) => start + end}
        minStepsBetweenValues={1}
        formatValue={String}
        size="xl"
        valueControl={<div />}
      />
      <RangeSlider label="Price" startThumbLabel="Minimum" endThumbLabel="Maximum" defaultValue={[12, 48]} hasValueText={false} isDisabled />
    </>
  );
}

export function Invalid() {
  /* Each thumb is its own input and needs its own name — required BY THE
     TYPE, because two unnamed thumbs announce as "slider, slider". */
  /* @ts-expect-error startThumbLabel is required */
  const a = <RangeSlider label="x" endThumbLabel="b" />;
  /* @ts-expect-error endThumbLabel is required */
  const b = <RangeSlider label="x" startThumbLabel="a" />;
  /* @ts-expect-error label is required — it names the group */
  const c = <RangeSlider startThumbLabel="a" endThumbLabel="b" />;
  /* @ts-expect-error a range is a PAIR, never one number */
  const d = <RangeSlider label="x" startThumbLabel="a" endThumbLabel="b" value={42} />;
  /* @ts-expect-error exactly two ends, not three */
  const e = <RangeSlider label="x" startThumbLabel="a" endThumbLabel="b" defaultValue={[1, 2, 3]} />;
  /* @ts-expect-error onValueChange receives the pair, not a number */
  const f = <RangeSlider label="x" startThumbLabel="a" endThumbLabel="b" onValueChange={(v: number) => v} />;
  /* @ts-expect-error sizes are Slider's closed set */
  const g = <RangeSlider label="x" startThumbLabel="a" endThumbLabel="b" size="huge" />;
  return [a, b, c, d, e, f, g];
}
