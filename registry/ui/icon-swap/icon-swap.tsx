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
 * Where a hidden glyph sits: a subtle dip to 0.8 and a 2px blur at Full, so a
 * swap reads as one glyph shrinking, softening and re-forming (decided in
 * review, 2026-11-27). Both ride `--ui-motion-travel`, so at Reduced and Off
 * they are 1 and 0px and the swap is a plain cross-fade. The only numbers
 * IconSwap invents; not tokens, because nothing else scales or blurs a glyph.
 */
const HIDDEN_STATE = [
  "[--icon-swap-scale:calc(1-0.2*var(--ui-motion-travel))]",
  "[--icon-swap-blur:calc(2px*var(--ui-motion-travel))]",
];

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
      className={cn("inline-grid shrink-0 place-items-center", HIDDEN_STATE, className)}
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
              "transition-[opacity,scale,filter] ease-(--ui-ease-out)",
              // The destination state's duration is the one a transition
              // runs on: arriving is base, leaving is fast. The shown glyph
              // has NO filter (not blur(0)): a filter left at rest keeps the
              // glyph on its own layer and softens it (craft rule 23).
              shown
                ? "scale-100 opacity-100 duration-(--ui-duration-base)"
                : "blur-(--icon-swap-blur) scale-(--icon-swap-scale) opacity-0 duration-(--ui-duration-fast)",
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
