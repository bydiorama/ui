/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Sparkline } from "./sparkline.tsx";

const DATA = [1, 3, 2, 5];

export function Valid() {
  return (
    <>
      <Sparkline data={DATA} label="Orders" description="Rose from 1 to 5." />
      <Sparkline data={DATA} label="Orders" description="Rose from 1 to 5." variant="area" series={4} size="sm" />
      <Sparkline data={DATA} label="Orders" description="Rose from 1 to 5." variant="column" hasEndMarker={false} />
      <Sparkline data={[]} label="Orders" description="Loading." isLoading className="ms-sm" />
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error description is required — it is what stands in for the data table (ADR 0023 §4) */
  const a = <Sparkline data={DATA} label="Orders" />;
  /* @ts-expect-error label is required — an unnamed image announces nothing */
  const b = <Sparkline data={DATA} description="Rose." />;
  /* @ts-expect-error there are eight categorical slots, not nine */
  const c = <Sparkline data={DATA} label="Orders" description="Rose." series={9} />;
  /* @ts-expect-error series is a slot number, never a colour */
  const d = <Sparkline data={DATA} label="Orders" description="Rose." series="#ff0000" />;
  /* @ts-expect-error a sparkline has one series; data is a flat number list */
  const e = <Sparkline data={[[1, 2], [3, 4]]} label="Orders" description="Rose." />;
  /* @ts-expect-error the component owns its role */
  const f = <Sparkline data={DATA} label="Orders" description="Rose." role="figure" />;
  /* @ts-expect-error sizes are md | sm */
  const g = <Sparkline data={DATA} label="Orders" description="Rose." size="lg" />;
  return [a, b, c, d, e, f, g];
}
