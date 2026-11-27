"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";
import { Presence } from "@/ui/presence";

import type { OwnedSlot } from "@/lib/data-slot";

/**
 * TextSwap — a short label replaced in place (ADR 0028 §6; the Text Swap sheet).
 *
 * The old words fade out on `--ui-duration-fast`, the new ones arrive on
 * `--ui-duration-base` with Presence's rise, and the box holding them eases
 * between the two measured widths on base, so a button never snaps narrower
 * under the pointer that pressed it. Each label is one Presence item keyed by
 * its text, so a label that comes back mid-swap turns around instead of
 * starting again, and the leaving copy is inert and aria-hidden: a host's
 * accessible name follows the new words from the first frame.
 */
export interface TextSwapProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children">, OwnedSlot {
  /**
   * The label. A string, because its text is its identity: changing it is the
   * swap. A few words on one line — a wrapping label would animate its
   * height as well, which this does not do.
   */
  children: string;
}

/** The label that is not leaving: the one the box is easing towards. */
const CURRENT = ':scope > [data-slot="text-swap-label"]:not([data-presence="leaving"])';

export const TextSwap = forwardRef<HTMLSpanElement, TextSwapProps>(function TextSwap(
  { children, className, ...rest },
  ref,
) {
  const box = useRef<HTMLSpanElement>(null);
  useImperativeHandle(ref, () => box.current!, []);

  // The width the box last settled at. Read before a change commits is not
  // possible — React has already rendered both labels into the box by the
  // time an effect runs — so it is kept from the previous settle instead.
  const settledWidth = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const label = el.querySelector<HTMLElement>(CURRENT);
    if (settledWidth.current === null || !label) {
      // First render: measure, and animate nothing.
      settledWidth.current = el.getBoundingClientRect().width;
      return;
    }
    // Mid-swap the box carries an inline width, and its rect is where that
    // transition has got to: retarget from there rather than jump.
    const from = el.style.width ? el.getBoundingClientRect().width : settledWidth.current;
    const to = label.getBoundingClientRect().width;
    if (Math.abs(from - to) < 0.5) {
      settledWidth.current = to;
      return;
    }
    let cancelled = false;
    el.style.width = `${from}px`;
    void el.offsetWidth; // commit the start before changing it
    el.style.width = `${to}px`;
    void (async () => {
      // One frame: the transition is created at the next style pass.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
      if (cancelled) return;
      el.style.width = "";
      settledWidth.current = to;
    })();
    return () => {
      cancelled = true;
    };
  }, [children]);

  return (
    <span
      {...rest}
      ref={box}
      data-slot="text-swap"
      className={cn(
        // One grid cell holds every layer. overflow-x clips a shrinking box
        // over the fading words; the vertical axis stays visible, so the
        // rise and descenders are never cut.
        "inline-grid overflow-x-clip align-bottom",
        "transition-[width] duration-(--ui-duration-base) ease-(--ui-ease-out)",
        className,
      )}
    >
      <Presence kind="rise">
        <span key={children} data-slot="text-swap-label" className="col-start-1 row-start-1 justify-self-start whitespace-nowrap">
          {children}
        </span>
      </Presence>
    </span>
  );
});
