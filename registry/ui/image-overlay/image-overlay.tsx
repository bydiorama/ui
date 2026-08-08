import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";
// The path the CONSUMER will have (`ui/aspect-ratio.tsx`), not this repo's
// folder layout — a distributed file that imports the repo path is a build
// error the moment it is copied out. `check:dependencies` enforces it.
import { AspectRatio, type AspectRatioName } from "@/ui/aspect-ratio";

/**
 * Where the veil sits.
 *
 * `scrim` darkens the bottom of the picture and holds a caption there.
 * `full` covers the whole picture and centres whatever it is given — the
 * sheet fills it with a single action, which is what it is for.
 */
export type ImageOverlayVariant = "scrim" | "full";

export interface ImageOverlayProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  src: string;
  /**
   * Required, and empty for a decorative picture. An image with a caption over
   * it is usually NOT decorative — the caption names it and the alt text says
   * what it looks like — so the two are different sentences, not one.
   */
  alt: string;
  ratio?: AspectRatioName;
  variant?: ImageOverlayVariant;
  /** What sits on the veil: a Badge, a Title, a Description, a Button. */
  children?: ReactNode;
}

/**
 * The veil's strength, and why it is not the drawn value.
 *
 * The sheet ramps `--ui-neutral-0` from 0% to 48%. Over a WHITE photograph
 * that composites to a mid grey where the sheet's own two inks measure
 * 2.81:1 and 2.11:1 — the caption on a bright picture was never readable, and
 * no gate could see it because no token described the ground. 72% is the
 * strength at which the same two inks measure 6.14:1 and 4.62:1.
 *
 * `--ui-bg-media-floor` is that composite as an opaque role, and it is
 * what the doc's contrast pairs are declared against — so the guarantee is
 * measured by `check:contrast` in both schemes rather than asserted here.
 */
const SCRIM = "bg-media/72";

const ImageOverlayRoot = forwardRef<HTMLDivElement, ImageOverlayProps>(function ImageOverlay(
  { src, alt, ratio = "square", variant = "scrim", className, children, ...rest },
  ref,
) {
  return (
    // The SAME frame AspectRatio draws, not a copy of it. The ratio, the
    // radius, the clip and the well all come from there, so the two cannot
    // drift — asserted as a relationship in the browser test rather than as
    // numbers on both sides.
    <AspectRatio
      ref={ref}
      ratio={ratio}
      data-slot="image-overlay"
      data-variant={variant}
      className={className}
      {...rest}
    >
      <img src={src} alt={alt} data-slot="image-overlay-image" />

      {variant === "full" ? (
        <div
          data-slot="image-overlay-veil"
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-sm p-md",
            // A flat veil, not the sheet's 16%->48% ramp. A ramp only makes a
            // guarantee where it is strongest, and this variant centres its
            // content — i.e. exactly where a ramp is weakest. The blur is the
            // sheet's own 8px and is what makes a flat veil read as glass
            // rather than as paint.
            SCRIM,
            "backdrop-blur-sm",
          )}
        >
          {children}
        </div>
      ) : (
        <div
          data-slot="image-overlay-veil"
          className="absolute inset-x-0 bottom-0 flex flex-col justify-end"
        >
          {/*
            The fade lives ABOVE the caption, not behind it.
            A single 0%->72% ramp behind the text is under-strength for every
            line except the last one, because the text spans the ramp: the
            title sits around 40% down the band, where the veil is 40% of the
            way to its guarantee. Splitting the two means the caption sits on
            a ground that is 72% everywhere, and the picture still fades into
            it over 32px.
          */}
          <span
            aria-hidden="true"
            data-slot="image-overlay-fade"
            className="h-2xl w-full bg-linear-to-b from-media/0 to-media/72"
          />
          <div
            data-slot="image-overlay-content"
            className={cn("flex flex-col items-start gap-sm px-sm pb-md", SCRIM)}
          >
            {children}
          </div>
        </div>
      )}
    </AspectRatio>
  );
});

/**
 * The caption's first line.
 *
 * `px-xs` is CONVENTIONS §6's inset rule, encoded here rather than at the call
 * site: unboxed text inside a rounded surface takes a further step of inline
 * padding, while children with their own fill — a Badge — sit flush at the
 * veil's own padding. The sheet draws exactly that difference and it is the
 * kind of 4px that gets lost the moment it has to be remembered.
 */
function ImageOverlayTitle({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="image-overlay-title"
      className={cn(
        // `text-body-lg font-bold`, NOT `text-title-sm` — which is the role
        // whose peak matches the sheet's 16px and is the wrong one anyway.
        // The title roles are FLUID (`clamp(…vw…)`), and a caption lives
        // inside a media frame whose width comes from a grid column, not from
        // the viewport: title-sm computed to 12.17px in the browser while the
        // sheet draws 16, worst on the phone where the picture is widest.
        // body-lg is the fixed 16px role; the weight and leading are set here.
        "px-xs text-body-lg font-display font-bold leading-normal tracking-tight",
        // NOT --ui-text-inverse, which the sheet used. Inverse resolves as
        // "the ink readable on the page's own text colour", so in dark it is
        // near-BLACK and this line would vanish into the veil in one scheme.
        "text-ink-on-media",
        // One line. A caption that wraps to three eats the picture it labels.
        "line-clamp-1",
        className,
      )}
      {...rest}
    />
  );
}

/** The caption's second line — quieter, and still TEXT, so still AA. */
function ImageOverlayDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="image-overlay-description"
      className={cn(
        "px-xs text-label-sm font-body font-medium leading-normal tracking-tight",
        // The sheet reached for a raw --ui-neutral-80 here. Same value, as a
        // role, floored against the veil in both schemes.
        "text-ink-on-media-muted",
        "line-clamp-1",
        className,
      )}
      {...rest}
    />
  );
}

export const ImageOverlay = Object.assign(ImageOverlayRoot, {
  Title: ImageOverlayTitle,
  Description: ImageOverlayDescription,
});
