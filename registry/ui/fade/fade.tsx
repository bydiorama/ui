"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";
import { maskRamp, paintRamp, type FadeRampDirection } from "@/lib/fade-ramp";
import { scrollDistances } from "@/hooks/use-scroll-edges";

export type FadeSide = "top" | "bottom" | "left" | "right";
export type FadeSize = "sm" | "md" | "lg";
export type FadeGround = "base" | "surface" | "elevated" | "sunken" | "affix";

/**
 * Where the band pins, which axis its depth runs on, and which way the ramp
 * runs — always TOWARD the pinned edge, so the solid end sits against the
 * edge the content disappears under. Physical sides on purpose, like Sheet's:
 * the band tracks the container's box — the geometry a scrollbar has — not
 * the writing direction. RTL flipping is a recorded gap in the doc.
 */
const SIDE = {
  top: { placement: "inset-x-0 top-0", axis: "block", toward: "to top" },
  bottom: { placement: "inset-x-0 bottom-0", axis: "block", toward: "to bottom" },
  left: { placement: "inset-y-0 left-0", axis: "inline", toward: "to left" },
  right: { placement: "inset-y-0 right-0", axis: "inline", toward: "to right" },
} as const satisfies Record<
  FadeSide,
  { placement: string; axis: "block" | "inline"; toward: FadeRampDirection }
>;

/**
 * Ramp depth, on the spacing scale — no new size tokens.
 *
 * One step deeper than the two-stop ramp it replaced (16/32/64), because the
 * Gaussian ramp spends its first quarter under 9% alpha: a 48px eased ramp
 * covers about what a 32px linear one did, and dissolves where that one
 * ghosted. lg is the top of the scale and half again — the deepest token is
 * 64, and a three-line dissolve of body-md wants ~96 (measured, doc
 * knownGaps "Ramp research").
 */
const DEPTH = {
  sm: "var(--ui-space-xl)",
  md: "var(--ui-space-3xl)",
  lg: "calc(var(--ui-space-4xl) * 1.5)",
} as const satisfies Record<FadeSize, string>;

/**
 * The bg role the ramp is painted in. `affix` is the translucent pinned-bar
 * ground (the page at 90%): a ramp in it ends at the bar's own alpha, so a
 * band hung under that bar meets it without the bright seam a solid ramp
 * left there.
 */
const GROUND = {
  base: "var(--ui-bg-base)",
  surface: "var(--ui-bg-surface)",
  elevated: "var(--ui-bg-elevated)",
  sunken: "var(--ui-bg-sunken)",
  affix: "var(--ui-bg-affix)",
} as const satisfies Record<FadeGround, string>;

/**
 * Built once per side × ground and reused: the ramp is seventeen stops, each
 * switching per scheme, and every band in a list would otherwise rebuild the
 * same 2KB string on every render.
 */
const RAMPS = new Map<string, string>();
function rampFor(side: FadeSide, ground: FadeGround): string {
  const key = `${side}:${ground}`;
  let ramp = RAMPS.get(key);
  if (!ramp) {
    ramp = paintRamp(SIDE[side].toward, GROUND[ground]);
    RAMPS.set(key, ramp);
  }
  return ramp;
}

export type FadeProps = {
  /**
   * The edge the content disappears under. Bottom is the default because
   * truncation reads downward; top pairs with pinned headers, left/right
   * with horizontal overflow (chip rows, tab strips).
   */
  side?: FadeSide;
  /** Ramp depth: sm 24px (space-xl), md 48px (space-3xl), lg 96px (1.5 × space-4xl). */
  size?: FadeSize;
  /**
   * The bg role the ramp ends on — the CONTAINER's own ground, or `affix`
   * under a translucent pinned bar. A fade painted in the wrong ground reads
   * as a smudge; over media or mixed grounds no overlay colour is right,
   * which is ImageOverlay's job (media) or `fadeMask`'s (unknown grounds).
   */
  ground?: FadeGround;
  /**
   * Whether the band shows at all. Opacity over --ui-duration-fast, never a
   * ramp resize (which reads as content moving); the band keeps its box
   * either way, so nothing reflows. With `scrollContainer` it is a gate on
   * top of the scroll-linked strength.
   */
  isVisible?: boolean;
  /**
   * The scroll container this band belongs to. Given one, the fade binds
   * itself: its strength follows how much content runs past its edge,
   * easing out over the last band-depth of scroll instead of switching off
   * at the end — so arriving at the end reveals the last lines as they
   * arrive, not in a 120ms pop. It also keeps off a classic scrollbar: a
   * band that is not inside the container is inset by the scrollbar's
   * width, so it never veils the track or its arrows.
   *
   * Renders hidden until measured, so a server-rendered page never shows a
   * fade at an edge the content sits flush against.
   */
  scrollContainer?: HTMLElement | null;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

/** Hermite smoothstep: the strength eases in and out, no corner at either end. */
const ease = (p: number) => p * p * (3 - 2 * p);

/**
 * An edge fade — the gradient that dissolves overflowing content into the
 * ground it sits on, signalling continuation: under a pinned header, above a
 * composer bar, at the cut of a truncated preview. Elsewhere this pattern is
 * a "scroll scrim" or "ScrollShadow"; here `--ui-scrim` already names the
 * modal veil, so the fade keeps its own name.
 *
 * The ramp is perceptual, not linear — a Gaussian penumbra with a
 * dark-scheme correction, from `@/lib/fade-ramp`, whose header records why.
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
  {
    side = "bottom",
    size = "md",
    ground = "surface",
    isVisible = true,
    scrollContainer,
    className,
    style,
    ...rest
  },
  ref,
) {
  const at = SIDE[side];
  const bandRef = useRef<HTMLSpanElement | null>(null);
  const isScrollLinked = scrollContainer != null;

  const attachRef = useCallback(
    (el: HTMLSpanElement | null) => {
      bandRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  /**
   * Written straight to the band's own style, never through React state: a
   * scroll-linked value set as state would re-render the caller's tree on
   * every scroll frame. React does not touch these again — the strength's
   * initial "0" below is a constant, and React only rewrites a style key
   * whose value CHANGED between renders.
   */
  const sync = useCallback(() => {
    const band = bandRef.current;
    if (!band || !scrollContainer) return;

    const depth = at.axis === "block" ? band.offsetHeight : band.offsetWidth;
    const distance = scrollDistances(scrollContainer)[side];
    // One pixel of slack, as useScrollEdges has: a container at its true end
    // reports a fractional remainder, and a band at 0.02 is still a band.
    const progress = depth > 0 ? Math.min(1, Math.max(0, distance - 1) / depth) : 0;
    band.style.setProperty("--ui-fade-band-strength", String(+ease(progress).toFixed(3)));

    // KEEP OFF THE SCROLLBAR. A band that is a sibling of its scroller spans
    // the container's box, and a classic scrollbar sits inside that box — so
    // the ramp veiled the track and its arrows, a control painted over with
    // ground. Inset the cross axis by whatever lies between the scroller's
    // padding box and its border box on that side. Overlay scrollbars
    // measure zero and change nothing. A band INSIDE the scroller (a sticky
    // region) is already in its content box and needs no inset.
    if (scrollContainer.contains(band)) return;
    const sc = scrollContainer;
    const cs = getComputedStyle(sc);
    const outer = sc.getBoundingClientRect();
    const innerLeft = outer.left + sc.clientLeft;
    const innerRight = innerLeft + sc.clientWidth;
    const innerBottom = outer.top + sc.clientTop + sc.clientHeight;
    const parent = band.offsetParent;
    if (!(parent instanceof HTMLElement)) return;
    const box = parent.getBoundingClientRect();
    const padLeft = box.left + parent.clientLeft;
    const padRight = padLeft + parent.clientWidth;
    const padBottom = box.top + parent.clientTop + parent.clientHeight;

    const px = (n: number) => (n > 0.5 ? `${Math.round(n * 100) / 100}px` : "");
    if (at.axis === "block") {
      // clientLeft includes an RTL container's left-hand scrollbar, which is
      // what lets one formula serve both directions.
      const barLeft = sc.clientLeft - parseFloat(cs.borderLeftWidth) > 0.5;
      const barRight = outer.right - parseFloat(cs.borderRightWidth) - innerRight > 0.5;
      band.style.left = barLeft ? px(innerLeft - padLeft) : "";
      band.style.right = barRight ? px(padRight - innerRight) : "";
    } else {
      const barBottom = outer.bottom - parseFloat(cs.borderBottomWidth) - innerBottom > 0.5;
      band.style.bottom = barBottom ? px(padBottom - innerBottom) : "";
    }
  }, [scrollContainer, side, at.axis]);

  // Every commit, not once: content appended to an already-full scroller
  // resizes nothing, so neither the scroll listener nor the observer below
  // would see it — a re-render is the only signal (the useScrollEdges trap).
  useLayoutEffect(sync);

  useEffect(() => {
    if (!scrollContainer) return;
    scrollContainer.addEventListener("scroll", sync, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    observer?.observe(scrollContainer);
    return () => {
      scrollContainer.removeEventListener("scroll", sync);
      observer?.disconnect();
    };
  }, [scrollContainer, sync]);

  // Clear any inset a previous container left behind.
  useEffect(() => {
    const band = bandRef.current;
    if (!band || scrollContainer) return;
    band.style.left = band.style.right = band.style.bottom = "";
  }, [scrollContainer]);

  return (
    <span
      ref={attachRef}
      data-slot="fade"
      data-side={side}
      data-size={size}
      data-ground={ground}
      data-scroll-linked={isScrollLinked || undefined}
      className={cn(
        // The layer never intercepts the pointer — content under it stays
        // selectable and clickable, which is half the reason it may not hold
        // targets of its own.
        "pointer-events-none absolute",
        at.placement,
        at.axis === "block" ? "h-(--ui-fade-band-depth)" : "w-(--ui-fade-band-depth)",
        // Appears and disappears by opacity, retargetable mid-flight
        // (CONVENTIONS §8). Scroll-linked strength rides the same transition,
        // which reads as the veil settling a beat after a fling stops.
        "transition-opacity duration-(--ui-duration-fast) ease-(--ui-ease-out)",
        isScrollLinked && "opacity-(--ui-fade-band-strength)",
        !isVisible && "opacity-0",
        className,
      )}
      style={
        {
          backgroundImage: rampFor(side, ground),
          // §6's override surface: a caller who needs a dissolve sized to a
          // type role (three lines of body-lg) sets this, and both the paint
          // and the scroll-linked strength follow it.
          "--ui-fade-band-depth": DEPTH[size],
          ...style,
          // Hidden until the first measure, on the server too. A constant, so
          // React never rewrites it over the value `sync` writes.
          ...(isScrollLinked ? { "--ui-fade-band-strength": "0" } : {}),
        } as CSSProperties
      }
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

/** Which way each side's MASK runs: away from the edge, from cut to opaque. */
const MASK_DIRECTION = {
  top: "to bottom",
  bottom: "to top",
  left: "to right",
  right: "to left",
} as const satisfies Record<FadeSide, FadeRampDirection>;

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
 * of the roles, and a canvas whose ground is document-defined — and for those
 * a painted ramp is wrong at every setting. Masking cuts the content's own
 * alpha instead, so it works over any ground, over media, and over mixed
 * content. It is the painted ramp's complement, stop for stop, so over an
 * opaque ground the two land on the same pixels — dark correction included.
 *
 * NOT A PROP ON `Fade`, and that is the constraint rather than an omission.
 * `mask-image` applies to the element being masked; the thing that must fade
 * is the CALLER'S SCROLLING CONTAINER, not a span layered above it. So this
 * is a style helper the container spreads.
 *
 * The trade, stated because it is the reason `Fade` is still the default:
 * a mask cuts EVERYTHING in the container, its own scrollbar included, it
 * forces a compositing layer, and it cannot be transitioned as cheaply as the
 * painted band's opacity. Reach for the painted `Fade` when the ground is a
 * known role, and for this when it is not.
 *
 * @example
 * const edges = useScrollEdges(node);
 * <div ref={attach} style={fadeMask({ sides: edges })} className="overflow-auto">
 */
export function fadeMask({ sides, size = "md" }: FadeMaskOptions): CSSProperties {
  const depth = DEPTH[size];

  const layers = (Object.keys(MASK_DIRECTION) as FadeSide[])
    .filter((side) => sides[side])
    .map((side) => maskRamp(MASK_DIRECTION[side], depth));

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
