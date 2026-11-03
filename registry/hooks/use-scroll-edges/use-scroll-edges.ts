"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

/** Which edges a scroll container has content beyond, on both axes. */
export interface ScrollEdges {
  top: boolean;
  bottom: boolean;
  /** Physical left, not inline-start — see the RTL note in the hook. */
  left: boolean;
  /** Physical right, not inline-end. */
  right: boolean;
}

const NONE: ScrollEdges = { top: false, bottom: false, left: false, right: false };

/** How far, in CSS pixels, a scroll container's content runs past each edge. */
export type ScrollDistances = Record<keyof ScrollEdges, number>;

/**
 * The measurement under `useScrollEdges`, exported for the callers that need
 * the DISTANCE rather than the boolean — a `Fade` bound to its container eases
 * out over the last stretch of scroll instead of switching off at the end.
 * Pure and synchronous: it reads layout and returns, so a caller decides when
 * to pay for the read (a scroll listener, a frame, a commit).
 *
 * Every value is clamped at zero — a container scrolled past its end by an
 * elastic overscroll reports a negative remainder, and "−3px of content below"
 * is not a state any consumer should have to handle.
 */
export function scrollDistances(node: HTMLElement): ScrollDistances {
  const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = node;

  // THE HORIZONTAL AXIS IS NOT `Math.abs(scrollLeft)` AND DONE.
  //
  // An RTL container scrolls to a NEGATIVE scrollLeft in Chromium and
  // Firefox, so taking the magnitude is necessary — and on its own it is
  // still wrong, which is the part that only shows up when measured. The
  // magnitude is the distance from the container's INLINE START, and in
  // RTL the inline start is the physical RIGHT. Reporting it as `left`
  // swaps the two fades: an RTL list at rest is flush right with all its
  // content off to the left, and the abs-only version says the opposite.
  //
  // These edges are PHYSICAL because Fade's sides are physical — the band
  // tracks the container's box, the geometry a scrollbar has, not the
  // writing direction. So the inline distance is mapped onto the box here,
  // where the container's direction is known, rather than left to every
  // caller to get wrong separately.
  const isRtl = getComputedStyle(node).direction === "rtl";
  const fromInlineStart = Math.abs(scrollLeft);
  const maxInline = scrollWidth - clientWidth;

  const clamp = (n: number) => Math.max(0, n);
  return {
    top: clamp(scrollTop),
    bottom: clamp(scrollHeight - clientHeight - scrollTop),
    left: clamp(isRtl ? maxInline - fromInlineStart : fromInlineStart),
    right: clamp(isRtl ? fromInlineStart : maxInline - fromInlineStart),
  };
}

/**
 * Where a scroll container currently sits between its ends.
 *
 * The state a `Fade` binds to: a ramp at an edge means "there is more this
 * way", so it must be visible exactly when the container is scrolled away
 * from that edge, and hidden when the content fits or sits flush against it.
 *
 * A SCROLL LISTENER, unlike `useIsStuck` — and the difference is the
 * question, not a change of mind. "Am I parked?" is a boolean an
 * IntersectionObserver can answer by watching one element cross one line.
 * "How far from each end am I?" is the offset itself, and the observer
 * equivalent needs a sentinel node pinned at every edge you care about: four
 * extra DOM nodes inside the caller's content, which is worse than one
 * passive listener that never reads layout it did not already need.
 *
 * `passive: true` matters: a non-passive scroll listener blocks the browser
 * from starting the scroll until it has run.
 *
 * Three things move the answer, and a naive implementation misses two:
 *
 *   the container scrolls        the listener
 *   the container resizes        a ResizeObserver on it
 *   the CONTENT changes          neither of the above
 *
 * That last one is the trap, found in use. Rows appended to a list that is
 * already at its scroll height resize nothing — the container's box is
 * identical — so a ResizeObserver alone never fires and the bottom fade
 * stays hidden over content that is now scrollable. Re-measuring at commit
 * covers it, because a content change is a render.
 */
export function useScrollEdges(node: HTMLElement | null): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(NONE);

  const measure = useCallback(() => {
    if (!node) return setEdges(NONE);

    // ONE PIXEL OF SLACK, because these are fractional. A container at its
    // true end reports a scrollTop of, say, 412.5 against a scrollHeight
    // minus clientHeight of 413 — so an exact comparison leaves a fade
    // painted permanently at an edge the user has already reached.
    const slack = 1;
    const distance = scrollDistances(node);

    const next: ScrollEdges = {
      top: distance.top > slack,
      bottom: distance.bottom > slack,
      left: distance.left > slack,
      right: distance.right > slack,
    };

    // BAIL OUT WHEN NOTHING MOVED, by returning the previous object rather
    // than an equal new one. The commit-time re-measure below runs on every
    // render, so a `setEdges(next)` that always allocates is an infinite
    // loop: new object, re-render, measure, new object. React bails out on
    // an identical reference and only on that.
    setEdges((prev) =>
      prev.top === next.top &&
      prev.bottom === next.bottom &&
      prev.left === next.left &&
      prev.right === next.right
        ? prev
        : next,
    );
  }, [node]);

  // Commit-time, so the FIRST paint is already correct: a container that
  // overflows on mount must not flash without its fade. This is also the
  // re-measure that catches a content change resizing nothing.
  // Measuring layout and storing it is what a layout effect is for; the
  // bail-out above is what makes the synchronous set safe.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useLayoutEffect(measure);

  useEffect(() => {
    if (!node) return;

    node.addEventListener("scroll", measure, { passive: true });

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(node);

    return () => {
      node.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [node, measure]);

  return edges;
}
