"use client";

import { useEffect, useState } from "react";

/**
 * Is a `position: sticky` element currently parked at its offset?
 *
 * The question every pinned bar asks in order to change appearance once the
 * page has moved under it — a shadow, a translucent ground, the `Fade` that
 * replaces a hairline. CSS cannot answer it: there is no `:stuck`.
 *
 * OBSERVED, NOT LISTENED FOR. A scroll listener is the obvious
 * implementation and the wrong one. It fires on every frame of every scroll,
 * on the thread that is already busiest during a scroll, and answering "am I
 * stuck?" from it means reading `getBoundingClientRect` — a forced
 * synchronous layout, per frame. An IntersectionObserver answers off the main
 * thread and only when the answer CHANGES.
 *
 * The geometry is the standard stuck-detection trick and BOTH halves are
 * load-bearing: `threshold: [1]` fires when the element stops being fully
 * visible, and a root margin pulled in by the sticky offset plus one pixel
 * makes "flush against its parking position" count as clipped. Without the
 * margin an element pinned at `top: 0` is still 100% visible and the observer
 * never fires; without the threshold it fires when the element leaves the
 * screen entirely, which for a pinned bar is never.
 *
 * No sentinel node. An earlier draft of Header's copy of this put a
 * zero-height span before the bar, which works and adds a node to the banner
 * landmark's neighbourhood for no reason.
 *
 * @param node    the sticky element, from a state ref so the effect re-runs
 *                when it mounts. A plain `useRef` never re-triggers.
 * @param offset  the element's own sticky offset in pixels — whatever `top`
 *                its CSS sets. The default of 0 matches `top-0`.
 */
export function useIsStuck(node: HTMLElement | null, offset = 0): boolean {
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    // RESET, don't just skip. `null` is the caller's off-switch — Header
    // passes `isAffixEnabled ? node : null` — and a bar switched off WHILE
    // STUCK must not keep its floating ground with nothing underneath it to
    // float over. Returning early here leaves the last `true` in state
    // forever, which is a bar wearing its scrolled treatment at scroll top.
    // Setting the value it already holds is free: React bails out on an
    // unchanged state, so this cannot loop.
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsStuck(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry === undefined) return;

        // A DISPLAY:NONE ELEMENT REPORTS AS STUCK unless it is excluded
        // here. A hidden element has an empty rect, an empty rect has an
        // intersection ratio of 0, and 0 < 1 — so the bare ratio test
        // answers "stuck" for something that is not on the page at all.
        // Found in use: a bar hidden at one breakpoint came back wearing
        // its scrolled ground.
        //
        // THE TEST IS THE RECT, NOT `isIntersecting` — measured, because
        // the obvious guard is wrong in a way that reads as correct. With
        // `threshold: [1]`, Chromium reports a parked bar as
        // `intersectionRatio 0.979, isIntersecting FALSE`: the flag tracks
        // whether the ratio has reached the lowest threshold, so under this
        // threshold it means "fully visible", not "overlapping at all".
        // `isIntersecting && ratio < 1` is therefore never true, and the
        // hook silently never fires. An empty rect is the thing that
        // actually distinguishes hidden from parked.
        const box = entry.boundingClientRect;
        const isRendered = box.width > 0 || box.height > 0;

        setIsStuck(isRendered && entry.intersectionRatio < 1);
      },
      {
        // THE ROOT IS THE SCROLL CONTAINER, NOT THE VIEWPORT, and leaving
        // it at the default is a bug that hides: an element pinned inside a
        // scrolling panel sits at a FIXED position in the viewport, so a
        // viewport-rooted observer watches it never move and the state never
        // flips — while the identical code works on a page that scrolls as a
        // whole.
        root: scrollParent(node),
        threshold: [1],
        rootMargin: `${-(offset + 1)}px 0px 0px 0px`,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, offset]);

  return isStuck;
}

/**
 * The nearest ancestor that actually scrolls, or `null` for the viewport —
 * which is what an IntersectionObserver wants as its `root`.
 *
 * `document.scrollingElement` is deliberately NOT returned: an observer
 * rooted at the document element is not the same as one rooted at the
 * viewport, and the difference shows up as a state that never flips.
 */
function scrollParent(el: HTMLElement): Element | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) break;
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") return node;
  }
  return null;
}
