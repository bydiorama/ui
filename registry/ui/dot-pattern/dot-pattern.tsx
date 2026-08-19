import { forwardRef, useId, type SVGAttributes } from "react";

import { cn } from "@/lib/cn";

export type DotPatternProps = {
  /**
   * Pitch between dot centres, in px, on both axes. The default transcribes
   * the shipped Paper recipe (DotGrid gapX = gapY = 16). A plain number
   * rather than a spacing token on purpose: density is geometry, not spacing
   * semantics — the sheet's Geometry section records that decision.
   */
  gap?: number;
  /**
   * Dot diameter, in px. The sheet's 2px is the shader's `size: 1` read as a
   * radius — @paper-design/shaders' dot-grid GLSL treats `u_dotSize` as the
   * distance from cell centre to dot edge (sheet, Gaps § Dot size).
   */
  dotSize?: number;
} & Omit<SVGAttributes<SVGSVGElement>, "children">;

/**
 * A decorative dot-grid layer for canvas grounds — the texture behind the
 * Creative Editor stage and the Library's business-card previews.
 *
 * It fills its container absolutely and paints evenly spaced circular dots,
 * nothing else: no ground of its own (the shader both usages were drawn with
 * sets `colorBack` transparent), no edge, no pointer target. The CONTAINER is
 * the caller's — it owns `position: relative`, its background (`bg-sunken` in
 * both shipped usages) and any clipping radius. Content stacks above the grid
 * in normal flow; the layer sits first in source order so no z-index is
 * involved.
 *
 * Paper renders this with a WebGL shader (`@paper-design/shaders` DotGrid).
 * The same geometry as a tiled SVG pattern needs no runtime dependency, is
 * crisp at any DPR, and prints — the sheet's Gaps section records the trade.
 *
 * Dot colour rides on `currentColor`: the default ink is `border-subtle`, the
 * decorative-hairline role the shader hard-codes as #DAD4CE, and a caller
 * retints with any ink utility (`text-ink-*`, `text-edge-*`) in `className`.
 * A background, when one is wanted on the layer itself rather than the
 * container, is a `bg-*` utility the same way.
 */
export const DotPattern = forwardRef<SVGSVGElement, DotPatternProps>(function DotPattern(
  { gap = 16, dotSize = 2, className, ...rest },
  ref,
) {
  // Unique per instance: two grids on one page with a shared pattern id would
  // both draw whichever <pattern> the document defines first.
  const patternId = useId();
  return (
    <svg
      ref={ref}
      data-slot="dot-pattern"
      className={cn(
        "pointer-events-none absolute inset-0 size-full",
        // The decorative hairline role, carried as currentColor so the circle
        // inherits it and className can displace it (text-* colour utilities
        // merge; the browser test pins the override actually winning).
        "text-edge-subtle",
        className,
      )}
      {...rest}
      /*
       * AFTER the spread — §5's contract-props-win, applied rather than
       * excepted. Skeleton leaves aria-hidden overridable because one
       * skeleton can stand for one nameable thing; a texture never names
       * anything, so there is no legitimate override to preserve.
       */
      aria-hidden="true"
    >
      <defs>
        <pattern id={patternId} width={gap} height={gap} patternUnits="userSpaceOnUse">
          {/*
           * Centred in the cell, so the first dot centre sits at
           * (gap/2, gap/2) from the container's top-left and edges clip
           * mid-dot instead of the grid re-centring on resize (sheet,
           * Behaviour § Tiling).
           */}
          <circle cx={gap / 2} cy={gap / 2} r={dotSize / 2} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
});
