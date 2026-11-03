/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Slider } from "./slider.tsx";

export function Valid() {
  return (
    <>
      <Slider label="Logo size" defaultValue={62} />
      <Slider label="Logo size" value={62} onValueChange={(v) => v + 1} hasValueText />
      <Slider label="Rating" defaultValue={4} min={0} max={10} step={2} size="sm" isDisabled />
      <Slider label="Logo size" defaultValue={1} isLabelHidden className="max-w-sm" />
      <Slider label="Logo size" size="md" defaultValue={62} />
      <Slider label="Logo size" size="xl" defaultValue={62} />
      <Slider label="Formality" defaultValue={70} getAriaValueText={(v) => (v > 60 ? "Mostly formal" : "Mostly casual")} />
      <Slider
        label="Logo size"
        size="xl"
        defaultValue={62}
        hasSteppers
        decrementLabel="Smaller"
        incrementLabel="Larger"
        valueControl={<span>62</span>}
      />
      {/* Inline: label and value inside the bar, on the field ladder. */}
      <Slider label="Dot size" variant="inline" defaultValue={12} formatValue={(v) => `${v} px`} />
      <Slider label="Dot size" variant="inline" size="sm" defaultValue={12} isDisabled />
      {/* Balance: an origin and two poles. */}
      <Slider label="Formality" origin={50} startLabel="Casual" endLabel="Formal" formatValue={(v) => (v > 50 ? "Formal" : "Casual")} hasValueText />
      <Slider label="Temperature" variant="inline" min={-50} max={50} origin={0} defaultValue={-12} />
      {/* Poles without an origin are endpoint labels: "Small" … "Large". */}
      <Slider label="Logo size" startLabel="Small" endLabel="Large" defaultValue={62} />
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error label is required — a slider with no name announces a number */
  const a = <Slider defaultValue={62} />;
  /* @ts-expect-error one thumb means a number, never an array */
  const b = <Slider label="x" value={[10, 20]} />;
  /* @ts-expect-error onValueChange receives a number, not an array */
  const c = <Slider label="x" onValueChange={(v: number[]) => v.length} />;
  /* @ts-expect-error sizes are a closed set */
  const d = <Slider label="x" size="huge" />;
  /* Two icon-only buttons with no names announce as "button, button", so the
     labels are required BY THE TYPE alongside the steppers rather than by a
     line in the docs. */
  /* @ts-expect-error hasSteppers requires both stepper labels */
  const e = <Slider label="x" hasSteppers />;
  /* @ts-expect-error a stepper label without the steppers is a name for nothing */
  const f = <Slider label="x" decrementLabel="Smaller" />;
  /* aria-valuetext is a string; a number would announce nothing new. */
  /* @ts-expect-error getAriaValueText must return a string */
  const g = <Slider label="x" getAriaValueText={(v: number) => v * 2} />;
  /* Our shape, not Base UI's (formattedValue: string, value, index). */
  /* @ts-expect-error getAriaValueText receives the NUMBER, not a formatted string */
  const h = <Slider label="x" getAriaValueText={(formatted: string) => formatted} />;
  /* The inline bar sits on the FIELD ladder; xl is a track-only size. */
  /* @ts-expect-error inline has no xl */
  const i = <Slider label="x" variant="inline" size="xl" />;
  /* The inline bar has no lane beside or under it. These are typed `never`
     on the inline member — omitting them would let the excess-property check
     wave them through as "a prop some member of the union has". */
  /* @ts-expect-error inline has no steppers */
  const j = <Slider label="x" variant="inline" hasSteppers decrementLabel="a" incrementLabel="b" />;
  /* @ts-expect-error inline has no poles row */
  const k = <Slider label="x" variant="inline" startLabel="Casual" />;
  /* @ts-expect-error inline has no value-control slot */
  const l = <Slider label="x" variant="inline" valueControl={<span />} />;
  /* formatValue is shown AND announced — it must produce text. */
  /* @ts-expect-error formatValue must return a string */
  const m = <Slider label="x" formatValue={(v: number) => v} />;
  /* @ts-expect-error origin is a value on the scale, not a keyword */
  const n = <Slider label="x" origin="center" />;
  /* @ts-expect-error variants are a closed set */
  const o = <Slider label="x" variant="bar" />;
  return [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o];
}
