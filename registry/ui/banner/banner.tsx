import {
  createContext,
  forwardRef,
  useContext,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { Close } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { Button } from "@/ui/button";

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

interface BannerContextValue {
  variant: BannerVariant;
  hasIcon: boolean;
}

const BannerContext = createContext<BannerContextValue | null>(null);

interface BannerBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  /** The message. Kept a slot rather than a string so it can carry a link. */
  children: ReactNode;
  variant?: BannerVariant;
  /**
   * Slot: leading glyph, never wrapped (§3). Decorative — pass it `aria-hidden`
   * and do not rely on colour alone (WCAG 1.4.1).
   */
  icon?: ReactElement;
  /**
   * A line above the message, in the same intent ink at label-md. A `<p>`,
   * not a heading: a banner is an annotation on a surface, not a section of
   * the document, and a heading here would sit in the page outline between
   * whatever headings surround it. With a title the row aligns to the top and
   * the glyph sits on the title's line.
   */
  title?: ReactNode;
  /**
   * Slot: the one thing to do about the message. Fill it with
   * `<Banner.Action>`, which takes the banner's ROLE — the filled primary on
   * info, an outline in the banner's own ink on every other intent (owner's
   * redesign, 2026-11-02). Never wrapped. In a container under 480px it
   * moves under the message, in the text column.
   */
  action?: ReactElement;
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
 * dialog. Five intents; the leading glyph, a title, an action and the dismiss
 * control are optional.
 *
 * Composes inside a Popover panel as a boxed child, which means it sits flush
 * at the panel's padding rather than taking the unboxed inset (§6).
 *
 * TWO LAYOUTS, chosen by content. A message-only banner is the row it always
 * was: one centred flex line, unchanged to the pixel. A banner with a title or
 * an action is a GRID — glyph | text | action | dismiss — because the narrow
 * arrangement has to move the action UNDER the text, into the text's own
 * column, and only a grid can put an item in another item's column without
 * a duplicate element. The root is the `@container` the action queries.
 */
const BannerRoot = forwardRef<HTMLDivElement, BannerProps>(function Banner(
  {
    children,
    variant = "neutral",
    icon,
    title,
    action,
    isLive = false,
    onDismiss,
    dismissLabel,
    className,
    ...rest
  },
  ref,
) {
  const hasTitle = title !== undefined && title !== null && title !== false;
  const isRich = hasTitle || action !== undefined;

  // Same element and classes as ever on the plain path, so a message-only
  // banner renders exactly what it did before titles and actions existed.
  const message = (
    <p data-slot="banner-message" className={cn("text-body-sm font-body", !isRich && "min-w-0 flex-1")}>
      {children}
    </p>
  );

  return (
    <BannerContext.Provider value={{ variant, hasIcon: icon !== undefined }}>
      <div
        ref={ref}
        data-slot="banner"
        data-variant={variant}
        {...(isLive ? { role: "status", "aria-live": "polite" } : {})}
        className={cn(
          "w-full gap-sm rounded-md p-lg",
          // The leading glyph at 16px, matching the dismiss control's own. Only
          // the dismiss was sized before, so a caller's icon arrived at griddy's
          // 24px default and the two glyphs in one banner did not match.
          "[&_svg]:size-4 [&_svg]:shrink-0",
          isRich
            ? [
                "@container grid",
                // An absent glyph must not leave an empty column whose gap
                // indents the text by 8px, so the template follows it.
                icon ? "grid-cols-[auto_minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto_auto]",
                // With a title the glyph sits on the TITLE's line (top);
                // with only an action the row stays centred like a plain one.
                hasTitle ? "items-start" : "items-center",
              ]
            : "flex items-center",
          VARIANT[variant],
          className,
        )}
        {...rest}
      >
        {icon}
        {isRich ? (
          <div data-slot="banner-text" className="flex min-w-0 flex-col gap-xs">
            {hasTitle && (
              <p data-slot="banner-title" className="text-label-md font-body">
                {title}
              </p>
            )}
            {message}
          </div>
        ) : (
          message
        )}
        {action}
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
              // Centred on the block beside an action; in a narrow banner with
              // a title it stays top-right, on the title's line, so the action
              // dropping below never pushes it down.
              isRich && "self-center",
              isRich && hasTitle && "@max-[30rem]:self-start",
              // The glyph stays at FULL strength. Dimming it to 70% measured
              // 2.77-2.89:1 against every light variant's fill — under the 3:1
              // floor of SC 1.4.11 for a meaningful graphic. Hover is carried
              // by a tint of the ink instead, which never touches the glyph.
              "text-current",
              // `background-color` alone, not Tailwind's `transition-colors`
              // group — only one of those properties may ever move here (see
              // above), and the library enumerates (CONVENTIONS §6).
              "transition-[background-color]", motionMicro,
              "hover:bg-current/10",
            )}
          >
            <Close size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </BannerContext.Provider>
  );
});

/**
 * The outline an action takes on each non-info intent: a 1.5px ring and the
 * label in the banner's OWN ink, no fill, hover a 10% tint of that ink (the
 * dismiss control's own hover). Every pair is legible on its ground by
 * construction — it is the banner's text pair — 4.87 / 5.05 / 5.03:1 light,
 * 7.11 / 5.68 / 4.92:1 dark. Danger takes --ui-text-on-danger-subtle, the ink
 * Button's own danger variant uses (8.52:1 light, 5.93:1 dark).
 *
 * Written over Button's `outline` classes in the SAME variant groups
 * (`not-data-disabled:hover:ring-…`), so the merge replaces Button's grey
 * hover ring and pressed ink instead of stacking beside them.
 */
const ACTION_OUTLINE = {
  neutral:
    "ring-ink-muted text-ink-muted not-data-disabled:hover:ring-ink-muted not-data-disabled:hover:bg-ink-muted/10 not-data-disabled:active:text-ink-muted not-data-disabled:active:bg-ink-muted/15",
  success:
    "ring-success text-success not-data-disabled:hover:ring-success not-data-disabled:hover:bg-success/10 not-data-disabled:active:text-success not-data-disabled:active:bg-success/15",
  warning:
    "ring-warning text-warning not-data-disabled:hover:ring-warning not-data-disabled:hover:bg-warning/10 not-data-disabled:active:text-warning not-data-disabled:active:bg-warning/15",
  danger:
    "ring-ink-on-danger-subtle text-ink-on-danger-subtle not-data-disabled:hover:ring-ink-on-danger-subtle not-data-disabled:hover:bg-ink-on-danger-subtle/10 not-data-disabled:active:text-ink-on-danger-subtle not-data-disabled:active:bg-ink-on-danger-subtle/15",
} as const satisfies Record<Exclude<BannerVariant, "info">, string>;

export type BannerActionProps = Omit<
  ComponentPropsWithoutRef<typeof Button>,
  "variant" | "size" | "isIconOnly" | "icon" | "iconEnd" | "isFullWidth"
> & {
  /** The action's label — a verb for what happens: "Review layouts", "Renew licence". */
  children: ReactNode;
};

/**
 * The action a banner's `action` slot is filled with. It takes the banner's
 * role so a call site cannot pick the wrong emphasis:
 *
 *   info                         Button primary — the one filled action,
 *                                and blue is already the info family
 *   neutral / success / warning  a 1.5px outline in the banner's own ink
 *   danger                       the same outline in --ui-text-on-danger-subtle
 *
 * The filled accent was the first proposal for every intent; it measured
 * 1.22-1.26:1 against the tinted grounds in light, a fill with nothing to
 * stand on. An outline has no fill to lose (owner's redesign, Audit #9).
 *
 * Always md (32px) — the banner's 16px padding was drawn around a 32px
 * control. A link is `render={<a href />}`, as on any Button.
 */
const BannerAction = forwardRef<HTMLElement, BannerActionProps>(function BannerAction(
  { className, children, ...rest },
  ref,
) {
  const banner = useContext(BannerContext);
  const variant = banner?.variant ?? "neutral";
  return (
    <Button
      ref={ref}
      data-slot="banner-action"
      variant={variant === "info" ? "primary" : "outline"}
      size="md"
      className={cn(
        variant !== "info" && ACTION_OUTLINE[variant],
        // Beside the message, centred on the block…
        "self-center",
        // …and in a narrow banner, UNDER it, in the text column: row 2, the
        // text's own column, at its own width. The container is the banner.
        "@max-[30rem]:row-start-2 @max-[30rem]:justify-self-start",
        banner?.hasIcon ? "@max-[30rem]:col-start-2" : "@max-[30rem]:col-start-1",
        className,
      )}
      {...rest}
    >
      {children}
    </Button>
  );
});

export const Banner = Object.assign(BannerRoot, { Action: BannerAction });
