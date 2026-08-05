/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Slider } from "./slider.tsx";

export function Valid() {
  return (
    <>
      <Slider label="Logo size" defaultValue={62} />
      <Slider label="Logo size" value={62} onValueChange={(v) => v + 1} hasValueText />
      <Slider label="Rating" defaultValue={4} min={0} max={10} step={2} size="sm" isDisabled />
      <Slider label="Logo size" defaultValue={1} isLabelHidden className="max-w-sm" />
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
  /* @ts-expect-error "md" is not a slider size */
  const d = <Slider label="x" size="md" />;
  return [a, b, c, d];
}
