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
  /* @ts-expect-error "md" is not a progress size */
  const d = <Progress label="Usage" value={1} size="md" />;
  /* @ts-expect-error "brand" is not a progress variant */
  const e = <Progress label="Usage" value={1} variant="brand" />;
  return [a, b, c, d, e];
}
