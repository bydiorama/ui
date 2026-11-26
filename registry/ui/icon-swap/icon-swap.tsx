"use client";

import { forwardRef, type HTMLAttributes, type ReactElement, type Ref } from "react";

import { cn } from "@/lib/cn";

import type { OwnedSlot } from "@/lib/data-slot";

/**
 * IconSwap — one glyph becoming another in place (ADR 0028 §6; craft rule 10;
 * the Icon Swap sheet).
 *
 * Every glyph is rendered once and kept, stacked in one grid cell; `show`
 * picks the visible one. The new glyph fades in on `--ui-duration-base` while
 * growing from the travelled scale to 1, the old one fades out on
 * `--ui-duration-fast` while shrinking to it. The state is an attribute and
 * the motion a CSS transition, so nothing mounts or unmounts, a second change
 * mid-swap turns both glyphs around, and the first render is still.
 *
 * The whole swap is aria-hidden: the host's accessible name (an icon-only
 * Button's aria-label, or the label beside the icon) carries the state.
 */
export interface IconSwapProps<K extends string = string>
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children">,
    OwnedSlot {
  /**
   * Every glyph the swap can show, by name. All of them are rendered; size
   * them from the host (a Button's `[&_svg]:size-4` reaches through).
   */
  icons: Record<K, ReactElement>;
  /** The name of the glyph to show. Changing it is the swap. */
  show: NoInfer<K>;
}

/**
 * The scale a hidden glyph sits at: 0.5 at Full, 1 at Reduced and Off, where
 * `--ui-motion-travel` is 0 and the swap becomes a plain cross-fade. 0.5 is
 * the sheet's Derived reading — the only number IconSwap invents (a glyph is
 * 16px; --ui-enter-scale's 0.98 would move it a third of a pixel).
 */
const HIDDEN_SCALE = "[--icon-swap-scale:calc(1-0.5*var(--ui-motion-travel))]";

function IconSwapInner<K extends string>(
  { icons, show, className, ...rest }: IconSwapProps<K>,
  ref: Ref<HTMLSpanElement>,
) {
  return (
    <span
      {...rest}
      ref={ref}
      aria-hidden="true"
      data-slot="icon-swap"
      className={cn("inline-grid shrink-0 place-items-center", HIDDEN_SCALE, className)}
    >
      {(Object.keys(icons) as K[]).map((name) => {
        const shown = name === show;
        return (
          <span
            key={name}
            data-slot="icon-swap-glyph"
            data-state={shown ? "shown" : "hidden"}
            className={cn(
              "col-start-1 row-start-1 inline-grid place-items-center",
              "transition-[opacity,scale] ease-(--ui-ease-out)",
              // The destination state's duration is the one a transition
              // runs on: arriving is base, leaving is fast.
              shown
                ? "scale-100 opacity-100 duration-(--ui-duration-base)"
                : "scale-(--icon-swap-scale) opacity-0 duration-(--ui-duration-fast)",
            )}
          >
            {icons[name]}
          </span>
        );
      })}
    </span>
  );
}

export const IconSwap = forwardRef(IconSwapInner) as <K extends string>(
  props: IconSwapProps<K> & { ref?: Ref<HTMLSpanElement> },
) => ReactElement;
