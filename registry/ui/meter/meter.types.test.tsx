/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Meter } from "./meter.tsx";

export function Valid() {
  return (
    <>
      <Meter label="Paper stock" value={68} />
      <Meter label="Ink reserve" value={84} status="warning" statusText="near limit" />
      <Meter label="Sheets bound" value={62} target={75} targetText="Target 75%" />
      <Meter label="Sheets" value={412} max={600} valueText="412 of 600" isLabelHidden />
      <Meter label="Paper stock" value={68} shape="radial" />
      <Meter label="Paper stock" value={null} emptyText="No reading yet" />
      <Meter label="Paper stock" value={0} isLoading className="max-w-sm" />
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error label is required — an unnamed meter announces only a number */
  const a = <Meter value={68} />;
  /* @ts-expect-error a status without words is colour alone (SC 1.4.1) */
  const b = <Meter label="Ink" value={84} status="warning" />;
  /* @ts-expect-error no reading needs words, or the empty bar reads as zero */
  const c = <Meter label="Ink" value={null} />;
  /* @ts-expect-error a target needs its label */
  const d = <Meter label="Sheets" value={62} target={75} />;
  /* @ts-expect-error the radial shape draws no target, so it refuses one */
  const e = <Meter label="Sheets" value={62} shape="radial" target={75} targetText="Target" />;
  /* @ts-expect-error "success" is not a meter status */
  const f = <Meter label="Ink" value={84} status="success" statusText="fine" />;
  /* @ts-expect-error the component owns its role */
  const g = <Meter label="Ink" value={84} role="progressbar" />;
  return [a, b, c, d, e, f, g];
}
