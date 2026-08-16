import { Children, forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { Close } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";

const childrenToArray = Children.toArray;

interface ThumbnailBaseProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  src: string;
  /**
   * The picture is still arriving.
   *
   * A separate state rather than something inferred from `src`, because the
   * component cannot know: an <img> that has not loaded and one whose URL is
   * wrong look identical from here, and only the caller knows which it has.
   * While it is set the tile shows a spinner on the well and the picture is
   * not drawn at all — a half-painted image under a spinner reads as a broken
   * one.
   */
  isLoading?: boolean;
  /**
   * What the attachment IS. Empty string only if a sibling label already names
   * it — a row of thumbnails with no names is a row of identical grey squares
   * to anyone not looking at it.
   */
  alt: string;
}

/**
 * The remove control and its label travel together or not at all.
 *
 * A cross with no accessible name announces as "button", and a list of five of
 * them announces as five buttons called "button". The label is required BY THE
 * TYPE the moment `onRemove` is passed, the same shape `isIconOnly` uses for
 * `aria-label`, rather than being a line in the docs.
 */
type ThumbnailRemoveProps =
  | { onRemove?: undefined; removeLabel?: undefined }
  | { onRemove: () => void; removeLabel: string };

export type ThumbnailProps = ThumbnailBaseProps & ThumbnailRemoveProps;

const ThumbnailRoot = forwardRef<HTMLSpanElement, ThumbnailProps>(function Thumbnail(
  { src, alt, isLoading = false, onRemove, removeLabel, className, ...rest },
  ref,
) {
  return (
    // Two nodes rather than one, for Avatar's reason: the tile is
    // `overflow-clip` so the picture takes the radius, and the remove control
    // sits ON the corner — a descendant would be cut in half by that clip.
    // `group/thumbnail` is named, so a Group's own hover cannot be mistaken
    // for this one when the two are nested.
    <span
      ref={ref}
      data-slot="thumbnail"
      data-loading={isLoading || undefined}
      className={cn("group/thumbnail relative inline-flex size-12 shrink-0", className)}
      {...rest}
    >
      <span
        data-slot="thumbnail-frame"
        className={cn(
          "size-full overflow-clip rounded-md",
          // The well AND the hairline are the same role, which is what the
          // sheet draws: the fill is what shows through before the picture
          // loads, and the inset ring keeps a photograph's own white edge from
          // bleeding into the page. See needsDesign — in a stacked group this
          // means no seam between neighbours, which Avatar solves differently.
          "bg-sunken outline-[1.5px] outline-offset-[-1.5px] outline-sunken",
        )}
      >
        {isLoading ? (
          <span
            // `status`, so a screen reader is told the tile is working rather
            // than being handed an empty box. The name is the file's, because
            // "Loading" five times over says nothing about which five.
            role="status"
            aria-label={alt}
            data-slot="thumbnail-loading"
            className="flex size-full items-center justify-center"
          >
            {/* CSS, not an icon: griddy has no spinner glyph and check:icons
                forbids a private SVG — a non-icon visual state is exactly what
                it says to draw with CSS. Under prefers-reduced-motion the
                token layer stops it, and the ring remains as a static mark. */}
            <span
              aria-hidden="true"
              data-slot="thumbnail-spinner"
              className={cn(
                "size-4 shrink-0 rounded-full",
                "border-[1.5px] border-solid border-edge-subtle border-t-(--ui-text-muted)",
                "motion-safe:animate-spin",
              )}
            />
          </span>
        ) : (
          /* A real <img>: alt text exists, and a broken URL degrades to it
             rather than to an empty square. */
          <img src={src} alt={alt} data-slot="thumbnail-image" className="size-full object-cover" />
        )}
      </span>

      {onRemove && (
        <button
          type="button"
          data-slot="thumbnail-remove"
          aria-label={removeLabel}
          onClick={onRemove}
          className={cn(
            "absolute top-0 right-0 inline-flex items-center justify-center",
            "rounded-sm bg-sunken p-0.5 text-ink-muted",
            "[&_svg]:size-3 [&_svg]:shrink-0",
            "cursor-pointer",
            // 16px of paint, 24px of target. SC 2.5.8's floor is 24 and the
            // sheet draws 16, so the difference is a pseudo-element rather
            // than a bigger box — 16 + 4 on every side is exactly 24. The
            // arithmetic is written down so the next person can check it
            // without re-deriving it.
            "before:absolute before:-inset-1 before:content-['']",
            // Revealed on hover, and ALSO on focus. The sheet draws hover
            // only, which means a keyboard user can tab to a control that is
            // invisible while it holds focus (SC 2.4.7) — and if it had been
            // conditionally rendered instead, could not reach it at all
            // (SC 2.1.1). Opacity rather than mounting, so it stays in the tab
            // order and focus is never lost.
            "opacity-0 group-hover/thumbnail:opacity-100 focus-visible:opacity-100",
            "transition-opacity", motionMicro,
            // The ring is a box-shadow, which forced-colors mode forces to
            // `none` — the outline is what survives there.
            "focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none",
            "focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2",
          )}
        >
          {/* `Close`, not `X` — in griddy, `X` is the X/Twitter wordmark and
              hard-codes fill="black" (CONVENTIONS §7). */}
          <Close aria-hidden="true" />
        </button>
      )}
    </span>
  );
});

interface ThumbnailGroupBaseProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  /**
   * Overlap the tiles instead of spacing them.
   *
   * The sheet draws both and they answer different questions: a spaced row is
   * a gallery of things you are looking at, a stack is "there are attachments
   * here". A stack SPREADS to the spaced layout on hover, which is how it
   * stays usable — an overlapped tile's remove control is under its neighbour.
   */
  isStacked?: boolean;
}

/**
 * `max` and `overflowLabel` travel together, exactly as Avatar.Group's do.
 * "+4" is a glyph and a number; without a sentence beside it a screen reader
 * reads "plus four" and the user learns nothing about what those four are.
 */
export type ThumbnailGroupProps = ThumbnailGroupBaseProps &
  ({ max?: undefined; overflowLabel?: undefined } | { max: number; overflowLabel: string });

function ThumbnailGroup({
  children,
  isStacked = false,
  max,
  overflowLabel,
  className,
  ...rest
}: ThumbnailGroupProps) {
  // `Children.toArray` rather than a hand-rolled branch: it flattens
  // fragments, drops null/false from a conditional child, and keys what it
  // returns. A `{cond && <Thumbnail/>}` would otherwise count toward `max` as
  // a falsy item and silently hide a real attachment.
  const items = childrenToArray(children);
  const shown = typeof max === "number" ? items.slice(0, max) : items;
  const hidden = items.length - shown.length;

  return (
    <span
      data-slot="thumbnail-group"
      data-stacked={isStacked || undefined}
      className={cn(
        "group/thumbnail-group inline-flex items-start",
        isStacked
          // The sheet's 4px overlap, applied from the CONTAINER rather than by
          // cloning children — a slot's contents are never rewritten (§3).
          //
          // It spreads to TOUCHING rather than to the sheet's +4px gap. That is
          // half the travel, and it is all the travel the interaction needs:
          // what the overlap hides is the next tile's top-right corner, which
          // is exactly where the remove control sits, and at a zero gap nothing
          // overlaps anything. Recorded in needsDesign.
          ? "-space-x-xs hover:space-x-0 focus-within:space-x-0"
          : "gap-xs",
        // Named `margin-inline-start`, not `margin`: `space-x-*` sets exactly
        // that one property, and a transition list has to name the property
        // that actually changes or it animates nothing.
        //
        // Slow and easing OUT, not the standard curve: this is an unfolding
        // rather than a state flip, and at 200ms on `ease-default` a stack of
        // four read as a snap. `--ui-duration-slow` with `--ui-ease-out`
        // decelerates into place, which is what makes it read as settling.
        isStacked &&
          "[&>*]:transition-[margin-inline-start] [&>*]:duration-(--ui-duration-slow) [&>*]:ease-(--ui-ease-out)",
        className,
      )}
      {...rest}
    >
      {shown}
      {hidden > 0 && (
        // The same tile as a thumbnail, on purpose: it sits in the row, so it
        // has to carry the same well, radius and hairline or it reads as a
        // different kind of object.
        <span
          data-slot="thumbnail-overflow"
          className={cn(
            "relative inline-flex size-12 shrink-0 items-center justify-center",
            "rounded-md bg-sunken text-ink-muted",
            "outline-[1.5px] outline-offset-[-1.5px] outline-sunken",
            "font-body text-label-sm font-semibold leading-flat tracking-tight",
          )}
        >
          <span aria-hidden="true">{`+${hidden}`}</span>
          <span className="sr-only">{overflowLabel}</span>
        </span>
      )}
    </span>
  );
}

export const Thumbnail = Object.assign(ThumbnailRoot, { Group: ThumbnailGroup });
