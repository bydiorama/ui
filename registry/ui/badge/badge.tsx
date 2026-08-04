import { forwardRef, type HTMLAttributes, type ReactElement, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type BadgeVariant = "selected" | "unselected" | "success" | "danger";
export type BadgeSize = "md" | "sm";
export type BadgeShape = "pill" | "rounded";

const SIZE = {
  md: "gap-xs px-sm py-xs text-label-sm [&_svg]:size-4",
  sm: "gap-xs px-sm py-xs text-label-sm [&_svg]:size-3",
} as const satisfies Record<BadgeSize, string>;

/**
 * The status variants carry no border in the design: their tint alone
 * separates them from the page, which is what makes a row of them read as
 * data rather than as controls.
 */
const VARIANT = {
  selected: "bg-accent border-accent text-ink-on-accent",
  unselected: "bg-base border-edge-subtle text-ink-muted",
  success: "bg-success-subtle border-transparent text-success",
  danger: "bg-danger-subtle border-transparent text-ink-on-danger-subtle",
} as const satisfies Record<BadgeVariant, string>;

/**
 * Interaction props are removed from the type, not merely discouraged in the
 * docs. Badge renders a `<span>`: an `onClick` there has no role, no focus and
 * no keyboard path, and a `tabIndex` invents a tab stop that announces
 * nothing. The doc said "don't" while the types said "go ahead" — the same
 * doc/type disagreement caught once before, so it graduates to a type.
 * Interactivity belongs in `iconEnd`, or wrap the badge in a real control.
 */
type FakeInteractionProps =
  | "onClick"
  | "onDoubleClick"
  | "onMouseDown"
  | "onMouseUp"
  | "onKeyDown"
  | "onKeyUp"
  | "tabIndex";

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, FakeInteractionProps> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  /** Slot: trailing mark — an external-link arrow, a check, a remove glyph. */
  iconEnd?: ReactElement;
  children: ReactNode;
}

/**
 * A label, not a control.
 *
 * Badge renders a `<span>` and takes no interaction props. The sheet draws
 * variants carrying a `×` or a check, which look like buttons — those are
 * *slots*: pass a real `<button>` with its own accessible name into `iconEnd`.
 * Making the badge itself clickable would give a non-interactive element a
 * click handler with no role, no focus and no keyboard path, which is the most
 * common accessibility defect in tag components.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = "unselected", size = "sm", shape = "pill", iconEnd, className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      data-slot="badge"
      data-variant={variant}
      data-size={size}
      className={cn(
        "inline-flex w-fit shrink-0 items-center border-[1.5px]",
        "font-body font-bold leading-flat tracking-tight whitespace-nowrap",
        shape === "pill" ? "rounded-full" : "rounded-sm",
        SIZE[size],
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {children}
      {iconEnd}
    </span>
  );
});
