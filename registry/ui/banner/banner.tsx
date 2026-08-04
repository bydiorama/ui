import { forwardRef, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import { Close } from "griddy-icons";

import { cn } from "@/lib/cn";

export type BannerVariant = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * Intent roles, never palette steps. The sheet drew `--ui-blue-90` on
 * `--ui-red-40`; the roles below resolve to exactly those values and re-skin
 * with a brand, which the raw steps do not.
 *
 * Measured in both schemes — light 4.87 / 4.82 / 5.05 / 5.03 / 4.79:1,
 * dark 7.11 / 5.64 / 5.68 / 4.92 / 5.93:1. All clear AA.
 */
const VARIANT = {
  neutral: "bg-sunken text-ink-muted",
  info: "bg-info-subtle text-info",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
} as const satisfies Record<BannerVariant, string>;

interface BannerBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The message. Kept a slot rather than a string so it can carry a link. */
  children: ReactNode;
  variant?: BannerVariant;
  /**
   * Slot: leading glyph, never wrapped (§3). Decorative — the message carries
   * the meaning, so pass it `aria-hidden` and do not rely on colour alone
   * (WCAG 1.4.1).
   */
  icon?: ReactElement;
  /**
   * Announce the banner when it appears. Off by default on purpose: a banner
   * rendered with the page is not news, and a live region that fires on mount
   * talks over whatever the user was already reading. Turn it on when the
   * banner appears in response to something.
   */
  isLive?: boolean;
}

/**
 * A dismissible banner needs a NAME for its dismiss button, so the two props
 * travel together at the type level rather than in a doc note that can be
 * skipped. An icon-only control with no accessible name is the single most
 * common a11y defect this library gates against.
 */
type DismissProps =
  | { onDismiss: () => void; dismissLabel: string }
  | { onDismiss?: never; dismissLabel?: never };

export type BannerProps = BannerBaseProps & DismissProps;

/**
 * An inline message attached to the surface it belongs to — not a toast, not a
 * dialog. Five intents; the leading glyph and the dismiss control are optional.
 *
 * Composes inside a Popover panel as a boxed child, which means it sits flush
 * at the panel's padding rather than taking the unboxed inset (§6).
 */
export const Banner = forwardRef<HTMLDivElement, BannerProps>(function Banner(
  { children, variant = "neutral", icon, isLive = false, onDismiss, dismissLabel, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="banner"
      data-variant={variant}
      {...(isLive ? { role: "status", "aria-live": "polite" } : {})}
      className={cn(
        "flex w-full items-center gap-sm rounded-md p-lg",
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      <p data-slot="banner-message" className="min-w-0 flex-1 text-body-sm font-body font-medium leading-normal">
        {children}
      </p>
      {onDismiss && (
        <button
          type="button"
          data-slot="banner-dismiss"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className={cn(
            "flex shrink-0 cursor-pointer items-center justify-center rounded-sm",
            // 24px target (SC 2.5.8) around a 16px glyph — the glyph alone
            // would be a 16px target.
            "size-6",
            // The glyph stays at FULL strength. Dimming it to 70% measured
            // 2.77-2.89:1 against every light variant's fill — under the 3:1
            // floor of SC 1.4.11 for a meaningful graphic. Hover is carried by
            // a tint of the ink instead, which never touches the glyph.
            "text-current",
            "transition-colors duration-(--ui-duration-fast) ease-(--ui-ease-out)",
            "hover:bg-current/10",
          )}
        >
          <Close size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
