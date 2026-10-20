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
  return [a, b, c, d, e, f, g, h];
}
