import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type FadeSide = "top" | "bottom" | "left" | "right";
export type FadeSize = "sm" | "md" | "lg";
export type FadeGround = "base" | "surface" | "elevated" | "sunken";

/**
 * Where the band pins and which way the ramp runs. The gradient always runs
 * FROM the ground at 0% alpha TOWARD the pinned edge, so the solid end sits
 * against the edge the content disappears under and the transparent end
 * dissolves into the content. Physical sides on purpose, like Sheet's: the
 * band tracks the container's box — the geometry a scrollbar has — not the
 * writing direction. RTL flipping is a recorded gap in the doc.
 */
const SIDE = {
  top: { placement: "inset-x-0 top-0", axis: "block", ramp: "bg-linear-to-t" },
  bottom: { placement: "inset-x-0 bottom-0", axis: "block", ramp: "bg-linear-to-b" },
  left: { placement: "inset-y-0 left-0", axis: "inline", ramp: "bg-linear-to-l" },
  right: { placement: "inset-y-0 right-0", axis: "inline", ramp: "bg-linear-to-r" },
} as const satisfies Record<FadeSide, { placement: string; axis: "block" | "inline"; ramp: string }>;

/**
 * Ramp depth on the spacing scale — never new size tokens. md is the same
 * 32px ramp ImageOverlay ships (deliberate, sheet § Depth); sm suits dense
 * chrome, lg display-scale content. `block` sizes a top/bottom band's height,
 * `inline` a left/right band's width.
 */
const SIZE = {
  // Widths spell the token out in the parens form: `w-lg` is refused by
  // check:utilities because a bare step name on a WIDTH reads as the
  // container scale (the Modal max-w-md trap) — here the depth genuinely IS
  // spacing semantics, so the utility names the spacing token explicitly.
  sm: { block: "h-lg", inline: "w-(--ui-space-lg)" },
  md: { block: "h-2xl", inline: "w-(--ui-space-2xl)" },
  lg: { block: "h-4xl", inline: "w-(--ui-space-4xl)" },
} as const satisfies Record<FadeSize, { block: string; inline: string }>;

/**
 * Both stops name the SAME role, so the solid end always tracks the
 * container's ground — that is the point of the pair. The `/0` stop compiles
 * through color-mix and computes to transparent BLACK (`oklab(0 0 0 / 0)`),
 * which is fine: CSS gradients interpolate with premultiplied alpha, so a
 * fully transparent stop's hue cannot grey the mid-band — the browser test
 * pins the alpha, not the hue. The sheet's Ramp rule ("never the transparent
 * keyword") is really about the SOLID stop naming the ground role; the
 * transparent end is equivalent by construction.
 */
const GROUND = {
  base: "from-base/0 to-base",
  surface: "from-surface/0 to-surface",
  elevated: "from-elevated/0 to-elevated",
  sunken: "from-sunken/0 to-sunken",
} as const satisfies Record<FadeGround, string>;

export type FadeProps = {
  /**
   * The edge the content disappears under. Bottom is the default because
   * truncation reads downward; top pairs with pinned headers, left/right
   * with horizontal overflow (chip rows, tab strips).
   */
  side?: FadeSide;
  /** Ramp depth: sm 16px (space-lg), md 32px (space-2xl), lg 64px (space-4xl). */
  size?: FadeSize;
  /**
   * The bg role the ramp ends on — the CONTAINER's own ground. A fade painted
   * in the wrong ground reads as a smudge; over media or mixed grounds no
   * overlay colour is right, which is ImageOverlay's job (media) or a mask's
   * (doc, knownGaps).
   */
  ground?: FadeGround;
  /**
   * The overflow state, owned by the caller: hidden when content fits or the
   * container is scrolled flush to this edge. Visual only — opacity over
   * --ui-duration-fast, never a ramp resize (which reads as content moving).
   * The band keeps its box either way, so nothing reflows.
   */
  isVisible?: boolean;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

/**
 * An edge fade — the gradient that dissolves overflowing content into the
 * ground it sits on, signalling continuation: under a pinned header, above a
 * composer bar, at the cut of a truncated preview. Elsewhere this pattern is
 * a "scroll scrim" or "ScrollShadow"; here `--ui-scrim` already names the
 * modal veil, so the fade keeps its own name.
 *
 * It is paint, not a surface. The CONTAINER is the caller's: it owns
 * `position: relative`, the clipping (`overflow-clip` or a max-height), the
 * ground the ramp ends on, and the route to the full content — Show more, an
 * expand control, or the scroll itself. A fade with no route to the content
 * is a defect, not a style (sheet § Behaviour, Affordance).
 *
 * Nothing under the band leaves the accessibility tree — a screen reader
 * reads the whole paragraph; only its paint is veiled. Nothing interactive
 * may live inside the band: mid-ramp ground fails every contrast floor by
 * design, so an action slot sits past the solid end, composed by the caller.
 */
export const Fade = forwardRef<HTMLSpanElement, FadeProps>(function Fade(
  { side = "bottom", size = "md", ground = "surface", isVisible = true, className, ...rest },
  ref,
) {
  const at = SIDE[side];
  return (
    <span
      ref={ref}
      data-slot="fade"
      data-side={side}
      data-size={size}
      data-ground={ground}
      className={cn(
        // The layer never intercepts the pointer — content under it stays
        // selectable and clickable, which is half the reason it may not hold
        // targets of its own.
        "pointer-events-none absolute",
        at.placement,
        SIZE[size][at.axis],
        at.ramp,
        GROUND[ground],
        // Appears and disappears by opacity, retargetable mid-flight
        // (CONVENTIONS §8: transitions for interaction).
        "transition-opacity duration-(--ui-duration-fast) ease-(--ui-ease-out)",
        !isVisible && "opacity-0",
        className,
      )}
      {...rest}
      /*
       * AFTER the spread — §5's contract-props-win. Same reasoning as
       * DotPattern: a texture never names anything, so there is no
       * legitimate override to preserve.
       */
      aria-hidden="true"
    />
  );
});

/* ------------------------------------------------------------------ *
 * MASK MODE
 * ------------------------------------------------------------------ */

/**
 * The ramp depth as a length, for the mask mode — the same three steps the
 * painted band uses, spelled as tokens rather than utilities because these
 * land in a `style` object.
 */
const DEPTH = {
  sm: "var(--ui-space-lg)",
  md: "var(--ui-space-2xl)",
  lg: "var(--ui-space-4xl)",
} as const satisfies Record<FadeSize, string>;

/** Which way each side's ramp runs, from transparent AT the edge inward. */
const MASK_DIRECTION = {
  top: "to bottom",
  bottom: "to top",
  left: "to right",
  right: "to left",
} as const satisfies Record<FadeSide, string>;

export interface FadeMaskOptions {
  /**
   * Which edges currently ramp. Shaped to take `useScrollEdges`' return
   * directly, because "where is this container between its ends" is the
   * question this answers: `style={fadeMask({ sides: edges })}`.
   */
  sides: Partial<Record<FadeSide, boolean>>;
  /** Ramp depth, matching the painted band's scale. */
  size?: FadeSize;
}

/**
 * The GROUND-AGNOSTIC fade: mask declarations for a scrolling container.
 *
 * `Fade` paints a ramp from a known `--ui-bg-*` role, which is exact and
 * cheap and requires knowing the ground. Two cases have no correct value for
 * it — a brand-scoped surface whose fill is a project token rather than one
 * of the four roles, and a canvas whose ground is document-defined — and for
 * those a painted ramp is wrong at every setting. Masking cuts the content's
 * own alpha instead, so it works over any ground, over media, and over mixed
 * content.
 *
 * NOT A PROP ON `Fade`, and that is the constraint rather than an omission.
 * `mask-image` applies to the element being masked; the thing that must fade
 * is the CALLER'S SCROLLING CONTAINER, not a span layered above it. There is
 * no drop-in span form, which is what the component's `knownGaps` has said
 * since it shipped. So this is a style helper the container spreads.
 *
 * The trade, stated because it is the reason `Fade` is still the default:
 * a mask cuts EVERYTHING in the container including any child that overlaps
 * the band, it forces a compositing layer, and it cannot be transitioned as
 * cheaply as the painted band's opacity. Reach for the painted `Fade` when
 * the ground is a known role, and for this when it is not.
 *
 * @example
 * const edges = useScrollEdges(node);
 * <div ref={attach} style={fadeMask({ sides: edges })} className="overflow-auto">
 */
export function fadeMask({ sides, size = "md" }: FadeMaskOptions): CSSProperties {
  const depth = DEPTH[size];

  const layers = (Object.keys(MASK_DIRECTION) as FadeSide[])
    .filter((side) => sides[side])
    .map(
      (side) =>
        `linear-gradient(${MASK_DIRECTION[side]}, transparent 0, black ${depth})`,
    );

  // No active edge means NO mask at all rather than an empty list: an empty
  // `mask-image` is `none` in some engines and a fully-transparent layer in
  // others, and the second one hides the container's entire content.
  if (layers.length === 0) return {};

  const image = layers.join(", ");

  // PREFIXED FIRST, STANDARD LAST — this order is load-bearing, not style.
  // React writes these in insertion order, and in Chromium the prefixed and
  // unprefixed composites are the same underlying property with different
  // keyword sets, so whichever is written last wins. With the standard one
  // first the computed value came back `source-in, source-in`: the legacy
  // spelling had silently taken over in a browser that supports the modern
  // one. It happens to mean the same thing here, and relying on that is how
  // a fallback quietly becomes the implementation.
  return {
    WebkitMaskImage: image,
    // INTERSECT, not the default `add`. Two ramps composited additively
    // produce an opaque UNION — each layer is opaque exactly where the other
    // fades — so a container ramping at both top and bottom shows no fade at
    // all. `source-in` is the legacy spelling of the same operation.
    WebkitMaskComposite: "source-in",
    maskImage: image,
    maskComposite: "intersect",
  } as CSSProperties;
}
