"use client";

import { forwardRef, useCallback, useRef, type HTMLAttributes, type RefObject } from "react";
import { Check } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionLevel } from "@/lib/motion";

import type { OwnedSlot } from "@/lib/data-slot";

/**
 * Feedback — the one-shots (ADR 0028 §6; the Feedback sheet): an error shake
 * that says no, and a success check that is written in. Each plays once, at
 * the moment it answers. Both belong beside a static cue — a danger outline
 * and message, a success label — because motion is never the only feedback
 * channel (CONVENTIONS §8).
 */

/**
 * The shake's swings, as multiples of `--ui-space-xs`: three decaying swings,
 * 4 → 2.5 → 1px at the default scale (decided 2026-11-27). Evenly spaced
 * over `--ui-duration-slow`, each segment on `--ui-ease-default`.
 */
const SWINGS = [0, -1, 1, -0.625, 0.625, -0.25, 0];

/** A duration token in ms, resolved where the element sits (motion levels change it). */
function durationMs(el: Element, token: string) {
  const raw = getComputedStyle(el).getPropertyValue(token).trim();
  return raw.endsWith("ms") ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
}

export interface Shake<T extends HTMLElement> {
  /** Attach to the element that shakes — usually the field, not its label. */
  ref: RefObject<T | null>;
  /**
   * Play the shake once. Call it when the answer is no: a wrong code, a
   * rejected submit. Calling it again mid-shake restarts it. At Reduced and
   * Off it does nothing — the shake is travel, and the static cue carries the
   * error (decided 2026-11-27).
   */
  shake: () => void;
}

/**
 * The error shake. JavaScript because a one-shot must replay on demand and a
 * CSS keyframe does not restart when its class is re-added; the Web
 * Animations API is the browser's own, not a runtime (ADR 0018). As JS-driven
 * motion it asks `motionLevel()` first (ADR 0028).
 */
export function useShake<T extends HTMLElement = HTMLElement>(): Shake<T> {
  const ref = useRef<T | null>(null);
  const running = useRef<Animation | null>(null);

  const shake = useCallback(() => {
    const el = ref.current;
    if (!el || motionLevel(el) !== "full") return;
    running.current?.cancel();
    const easing = getComputedStyle(el).getPropertyValue("--ui-ease-default").trim() || "ease-in-out";
    running.current = el.animate(
      SWINGS.map((k) => ({ translate: `calc(var(--ui-space-xs) * ${k}) 0`, easing })),
      { duration: durationMs(el, "--ui-duration-slow") },
    );
  }, []);

  return { ref, shake };
}

export interface SuccessCheckProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children">, OwnedSlot {}

/**
 * The success check, written in left to right on `--ui-duration-slow` with
 * `--ui-ease-out` — a clip-path wipe over the shared Check glyph, because the
 * repository bans dashed strokes (check:strokes) and private glyphs
 * (check:icons). It plays when it mounts: render it when success happens. At
 * Reduced it fades in whole (on base, the capped slow); at Off it is there.
 *
 * Decorative: aria-hidden, so the label beside it ("Saved", "Verified")
 * carries the meaning. 16px and the success ink by default; a className
 * (`size-5`, `text-ink-primary`) overrides either.
 */
export const SuccessCheck = forwardRef<HTMLSpanElement, SuccessCheckProps>(function SuccessCheck(
  { className, ...rest },
  ref,
) {
  return (
    <span
      {...rest}
      ref={ref}
      aria-hidden="true"
      data-slot="success-check"
      className={cn(
        // 16px by default, like every icon slot; size it with size-* on the span.
        "inline-flex size-4 shrink-0 text-success [&>svg]:size-full",
        "transition-[clip-path,opacity] duration-(--ui-duration-slow) ease-(--ui-ease-out)",
        "[clip-path:inset(0_0_0_0)]",
        "motion-safe:starting:[clip-path:inset(0_100%_0_0)]",
        "motion-reduce:starting:opacity-0",
        className,
      )}
    >
      <Check />
    </span>
  );
});
