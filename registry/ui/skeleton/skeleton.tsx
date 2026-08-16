import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * A placeholder standing in for content that has not arrived.
 *
 * Deliberately the smallest component in the library: one element, no
 * variants, sized entirely from the outside. A skeleton is a rectangle whose
 * only job is to be the shape of the thing that is loading, and every attempt
 * to give that a vocabulary — `SkeletonText`, `SkeletonAvatar`, a `lines`
 * prop — ends up re-describing the layout it is standing in for. `className`
 * already says `h-4 w-32` better than a prop can, which is why shadcn/ui's
 * Skeleton is shaped this way too and why this one stays compatible with it.
 *
 * NO DESIGN SPEC EXISTS. `design/paper/README.md` lists Skeleton among the
 * sheets still to be drawn, alongside motion sign-off, so every value here is
 * derived and declared in `needsDesign`. The two that are not guesses are the
 * fill and the radius: Table already ships a skeleton bar internally
 * (`data-slot="table-skeleton"`), and matching it is what stops this library
 * having two answers to one question — the mistake `@/lib/chrome-control`
 * exists to record.
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="skeleton"
      /*
       * Before the spread, not after — the one deliberate exception to §5's
       * "contract props win".
       *
       * A skeleton is decorative by default: a screen reader announcing a
       * dozen empty boxes says nothing a user can act on, and the honest
       * announcement belongs on the REGION that is loading, as `aria-busy`,
       * which only the caller can place. But a caller who has one skeleton
       * standing for one named thing may legitimately want to label it, and a
       * contract prop that wins here would make that impossible rather than
       * merely unusual. So this is a default, and the doc says which attribute
       * to reach for instead.
       */
      aria-hidden="true"
      className={cn(
        // A visible default. `<Skeleton />` with no className renders a
        // full-width line at body height rather than collapsing to a 0px box
        // that looks like a broken component — the footgun in every
        // className-sized placeholder. Both are displaced cleanly by
        // tailwind-merge, so `className="size-10 rounded-full"` is an avatar.
        "h-4 w-full rounded-sm",
        // The same well Table's own skeleton bar is drawn with, and the same
        // one AspectRatio, Thumbnail and Avatar put behind absent media. A
        // placeholder is a recessed surface; it is not a disabled control, and
        // reaching for a state role here is the mistake ADR 0017 records.
        "bg-sunken",
        // The pulse is what separates "loading" from "empty" — a static grey
        // box is indistinguishable from a blank slot, which is the one thing a
        // skeleton must never look like.
        //
        // `motion-safe:`, because a KEYFRAME carries its own timing and the
        // token layer's duration collapse cannot reach it (ADR 0018). Under
        // prefers-reduced-motion this settles to a plain recessed rectangle,
        // and the shape carries the meaning on its own — §8's rule that motion
        // is never the only feedback channel, read in the direction that
        // matters here.
        // `animate-pulse` for the keyframes, then the timing taken back off
        // Tailwind and given to the token layer. The utility bakes 2s and its
        // own curve into its NAME, which is a hard-coded duration in the one
        // place `check:motion` cannot look and no brand can reach.
        "motion-safe:animate-pulse",
        "motion-safe:[animation-duration:var(--ui-duration-loop)]",
        "motion-safe:[animation-timing-function:var(--ui-ease-default)]",
        className,
      )}
      {...rest}
    />
  );
});
