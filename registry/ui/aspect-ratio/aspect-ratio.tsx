import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The sheet's six named ratios, in its own order.
 *
 * A vocabulary rather than a number, for the reason CONVENTIONS §2 gives:
 * finite string unions are shared across components, and "story" means the
 * same shape wherever it is written. Anything outside the six is reachable
 * through `className` — `aspect-[21/9]` displaces the default cleanly because
 * tailwind-merge classifies both in the `aspect-ratio` group — so the union
 * costs no expressiveness, it only removes the guesswork about which of
 * `9/16` and `16/9` a portrait is.
 */
export type AspectRatioName =
  | "square"
  | "story"
  | "portrait"
  | "landscape"
  | "card"
  | "screen";

/**
 * Arbitrary values on purpose: these are the component's own vocabulary, not
 * theme lookups, and writing them as a table makes the six readable at once.
 * `aspect-square` and `aspect-video` exist as built-ins and are deliberately
 * NOT used — one row spelled differently from the other five is how a table
 * stops being read.
 *
 * `card` is the ID-1 card ratio (85.60 x 53.98mm = 1.5857), which is what the
 * sheet labels it; the sheet's own frame is drawn 304x192, i.e. 1.5833. The
 * label is the intent and the frame is a rounding, so the label wins — see
 * needsDesign.
 */
const RATIO = {
  square: "aspect-[1/1]",
  story: "aspect-[9/16]",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
  card: "aspect-[1.586/1]",
  screen: "aspect-[16/9]",
} as const satisfies Record<AspectRatioName, string>;

export interface AspectRatioProps extends HTMLAttributes<HTMLDivElement> {
  /** Defaults to the sheet's leading row. */
  ratio?: AspectRatioName;
  /**
   * The media. Typically an `<img>` — the frame sizes and crops one from the
   * outside (§3: a parent styles a slot, it never wraps or rewrites it), so a
   * caller writes `<img src alt />` and nothing else.
   */
  children: ReactNode;
}

/**
 * A media frame whose height comes from its width.
 *
 * Width-driven by design: `w-full` means the frame takes the column it is
 * placed in and the ratio supplies the rest, which is the whole reason to
 * reach for one. The sheet draws fixed pixel widths because a static artboard
 * has no column to take.
 */
export const AspectRatio = forwardRef<HTMLDivElement, AspectRatioProps>(function AspectRatio(
  { ratio = "square", className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="aspect-ratio"
      data-ratio={ratio}
      className={cn(
        "relative w-full overflow-clip rounded-md",
        // A well behind the media, so a slow or broken image shows a recessed
        // tile rather than a hole in the page. The AspectRatio sheet draws no
        // fill; the Thumbnail sheet — the same frame at 48px — draws exactly
        // this one, and Avatar's frame does too. Recorded in needsDesign.
        "bg-sunken",
        // Sizing the media from the outside. Without it every call site
        // repeats `size-full object-cover`, and the one that forgets gets an
        // intrinsically-sized image in a frame that clips it.
        "[&>img]:size-full [&>img]:object-cover",
        RATIO[ratio],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
