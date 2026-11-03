import {
  forwardRef,
  useEffect,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type RefObject,
} from "react";
import { PauseCircle, PlayCircle } from "griddy-icons";

import { chromeControl } from "@/lib/chrome-control";
import { cn } from "@/lib/cn";
import { composeEventHandlers } from "@/lib/compose-event-handlers";
import { useControllableState } from "@/hooks/use-controllable-state";

export type MediaToggleSize = "md" | "lg";

export interface MediaToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "aria-label" | "aria-pressed"> {
  /**
   * The video (or audio) this control drives. With it, the toggle calls
   * `play()`/`pause()` itself and follows the element's own `play`/`pause`
   * events, so a video paused some other way never leaves the button lying.
   * Without it, the toggle only reports `onPausedChange` and the caller acts.
   */
  target?: RefObject<HTMLMediaElement | null> | undefined;
  /** Controlled state. */
  isPaused?: boolean | undefined;
  /**
   * Uncontrolled starting state. When omitted, the toggle starts PLAYING —
   * unless the viewer asks for reduced motion, in which case it pauses the
   * target on mount and starts paused.
   */
  defaultIsPaused?: boolean | undefined;
  onPausedChange?: ((isPaused: boolean) => void) | undefined;
  /** Accessible name while playing — what pressing will do. "Pause background video". */
  pauseLabel: string;
  /** Accessible name while paused. "Play background video". */
  playLabel: string;
  /** md 32 (default) or lg 44 for touch. */
  size?: MediaToggleSize | undefined;
}

const SIZE: Record<MediaToggleSize, string> = {
  md: "size-control-md",
  lg: "size-control-lg",
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The pause control WCAG 2.2.2 asks of any video that starts on its own and
 * runs past five seconds — an ambient hero, a background loop (#36).
 *
 * The chrome-control recipe (a fill with no edge, §7b), made round and moved
 * onto the media family: `--ui-bg-media` with `--ui-text-on-media` (15.53:1).
 * Media does not flip with the scheme, so neither does this — it reads the
 * same over the video in light and dark. The caller places it, conventionally
 * bottom-end at space-lg.
 *
 * The glyph and the name both say what pressing WILL do: Pause while playing,
 * Play while paused. That is the media-player convention, and it is why this
 * is a plain button with a changing name rather than a toggle button with
 * aria-pressed — "Pause, pressed" reads as a contradiction.
 */
export const MediaToggle = forwardRef<HTMLButtonElement, MediaToggleProps>(function MediaToggle(
  {
    target,
    isPaused: isPausedProp,
    defaultIsPaused,
    onPausedChange,
    pauseLabel,
    playLabel,
    size = "md",
    className,
    onClick,
    ...rest
  },
  ref,
) {
  const [isPaused, setIsPaused] = useControllableState({
    value: isPausedProp,
    defaultValue: defaultIsPaused ?? false,
    onChange: onPausedChange,
  });

  // Reduced motion: an ambient video should not start moving at all. Only
  // when the caller left the start state to us — an explicit default wins.
  useEffect(() => {
    if (defaultIsPaused !== undefined || isPausedProp !== undefined) return;
    if (!prefersReducedMotion()) return;
    target?.current?.pause();
    setIsPaused(true);
    // Mount-only by design: a preference change mid-visit is the viewer's
    // to act on with this very button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the element, so the button never disagrees with the video —
  // paused by the browser's own controls, ended, or blocked by autoplay.
  useEffect(() => {
    const media = target?.current;
    if (!media) return;
    const onPlay = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);
    media.addEventListener("play", onPlay);
    media.addEventListener("pause", onPause);
    return () => {
      media.removeEventListener("play", onPlay);
      media.removeEventListener("pause", onPause);
    };
  }, [target, setIsPaused]);

  const handleClick = () => {
    const next = !isPaused;
    const media = target?.current;
    if (media) {
      // play() rejects when autoplay policy refuses it; the element then
      // stays paused and its own `pause` state is already what we show.
      if (next) media.pause();
      else void media.play().catch(() => setIsPaused(true));
    }
    setIsPaused(next);
  };

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      data-slot="media-toggle"
      data-state={isPaused ? "paused" : "playing"}
      aria-label={isPaused ? playLabel : pauseLabel}
      onClick={composeEventHandlers<MouseEvent<HTMLButtonElement>>(onClick, handleClick)}
      className={cn(
        chromeControl(),
        SIZE[size],
        "rounded-full bg-media text-ink-on-media",
        "enabled:hover:bg-media-floor enabled:active:bg-media-floor",
        className,
      )}
    >
      {/* The CIRCLE glyphs: griddy's bare Pause hard-codes fill="black" and
          cannot take the ink (check:licensing refuses it). Play is paired
          with PlayCircle so the two states keep one shape. */}
      {isPaused ? <PlayCircle aria-hidden="true" /> : <PauseCircle aria-hidden="true" />}
    </button>
  );
});
