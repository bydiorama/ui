/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Progress } from "./progress.tsx";

export function Valid() {
  return (
    <>
      <Progress label="Usage" value={62} />
      <Progress label="Files" value={3} max={4} hasValueText />
      <Progress label="Usage" value={62} size="sm" isLabelHidden className="max-w-sm" />
      <Progress label="Usage" value={62} variant="gradient" />
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error value is required */
  const a = <Progress label="Usage" />;
  /* @ts-expect-error label is required — a bar with no name announces a number */
  const b = <Progress value={62} />;
  /* @ts-expect-error value is a number, not a string */
  const c = <Progress label="Usage" value="62" />;
  /* The old vocabulary. `lg` meant 20px here and would mean 24px on Slider,
     which is the synonym problem §2 forbids — so it has to stop compiling
     rather than quietly resolve to a different bar. */
  /* @ts-expect-error sizes are md | sm; lg was renamed and resized */
  const d = <Progress label="Usage" value={1} size="lg" />;
  /* @ts-expect-error "brand" is not a progress variant */
  const e = <Progress label="Usage" value={1} variant="brand" />;
  return [a, b, c, d, e];
}
