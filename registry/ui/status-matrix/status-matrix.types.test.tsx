/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { createRef } from "react";

import { StatusMatrix } from "./status-matrix.tsx";

export function Valid() {
  const ref = createRef<SVGSVGElement>();
  return (
    <>
      <StatusMatrix status="thinking" />
      <StatusMatrix status="working" size="sm" isHeld />
      <StatusMatrix status="progress" value={48} />
      <StatusMatrix status="progress" value={2} max={3} label="Rendering 2 of 3" />
      <StatusMatrix status="done" ref={ref} className="me-xs" />
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error status is required — the matrix has no neutral state */
  const a = <StatusMatrix />;
  /* @ts-expect-error a progress matrix needs its value, or it cannot say how full it is */
  const b = <StatusMatrix status="progress" />;
  /* @ts-expect-error "loading" is not a status — say which kind of wait it is */
  const c = <StatusMatrix status="loading" />;
  /* @ts-expect-error 32px is a sheet specimen, not a size */
  const d = <StatusMatrix status="thinking" size="lg" />;
  /* @ts-expect-error the component owns its role */
  const e = <StatusMatrix status="thinking" role="progressbar" />;
  /* @ts-expect-error the component owns the grid's coordinate system */
  const f = <StatusMatrix status="thinking" viewBox="0 0 24 24" />;
  return [a, b, c, d, e, f];
}
