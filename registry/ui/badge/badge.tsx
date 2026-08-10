import { forwardRef, type HTMLAttributes, type ReactElement, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type BadgeVariant = "selected" | "unselected" | "neutral" | "success" | "warning" | "danger";
export type BadgeSize = "md" | "sm";
/**
 * One vocabulary with Button (§2): `full` is `rounded-full`, `soft` is the
 * component's own smaller radius. Badge called these `pill` and `rounded`,
 * which named the same two shapes differently from the only other component
 * that has them — and "pill" described the drawing rather than the token.
 */
export type BadgeShape = "soft" | "full";

/**
 * Both sizes share a 12px label and the same padding — the sheet draws them
 * that way. The difference is height: 22px and 28px.
 *
 * The sheet reaches those heights by inflating the md line-height to 145%,
 * which is off the leading scale (flat/tight/snug/normal/relaxed) and makes a
 * control's height depend on font metrics. Pinning `min-h` instead lands on the
 * designed numbers exactly, keeps `leading-flat` for both, and survives a font
 * swap. The padding scale cannot express it: py-xs gives 22px and py-sm 30px.
 *
 * These were previously identical apart from the icon, so a badge with no icon
 * rendered the same at both sizes.
 */
const SIZE = {
  md: "gap-xs px-sm py-xs text-label-sm min-h-7 [&_svg]:size-4",
  sm: "gap-xs px-sm py-xs text-label-sm min-h-5.5 [&_svg]:size-3",
} as const satisfies Record<BadgeSize, string>;

/**
 * The status variants carry no border in the design: their tint alone
 * separates them from the page, which is what makes a row of them read as
 * data rather than as controls.
 */
const VARIANT = {
  selected: "bg-accent border-accent text-ink-on-accent",
  unselected: "bg-base border-edge-subtle text-ink-muted",
  /**
   * Status data that carries no INTENT — an industry, a type, a plan tier.
   * The commonest badge in an admin table, and the set had no answer for it:
   * `unselected` is a choice state wearing an outline, and tinting a category
   * green or blue teaches nothing when the value never varies. The Patterns
   * index sheet draws exactly this and says so ("Don't colour a category that
   * never varies").
   *
   * The same two roles Banner's own `neutral` uses, because it is the same
   * concept and §2 says a concept gets one vocabulary — measured 4.87:1 light
   * and 7.11:1 dark, the numbers in Banner's own note.
   *
   * The sheet drew it as `--ui-bg-active`, which is an INTERACTION role: a
   * resting badge would then be the exact colour of a pressed table row, and
   * a row of them would change meaning under the pointer.
   *
   * The EDGE is what makes it work in dark, and it is the half that was open
   * until 2026-08-10. The fill alone measures 1.188 against a table row in
   * light — level with the status tints at 1.201 and 1.176, so the family
   * reads as one thing — but only 1.098 in dark, where those same tints hold
   * 1.629. Six categories down a dark table read as faint holes beside chips
   * that read fine. Raising the FILL in dark was the obvious fix and the wrong
   * one: the nearest role that lands at 1.63 drops `--ui-text-muted` on it to
   * 3.86, under AA, so the ground and the ink would have had to move together
   * and neither has a role for where they land.
   *
   * `border-edge-subtle` instead, which is not a new value and not a new idea:
   * `unselected` above already pairs a quiet fill with a hairline. It reads
   * 1.391 against a dark row and 1.434 against a light one — the same job in
   * both schemes, where the fill only ever did it in one — and the ink is
   * untouched at 7.11:1. It also makes the split structural rather than
   * tonal: a CATEGORY is outlined, an INTENT is tinted.
   */
  neutral: "bg-sunken border-edge-subtle text-ink-muted",
  success: "bg-success-subtle border-transparent text-success",
  // The sheet's "Warning" row, added to all three sizes. It completes the
  // intent set the token layer already carried — success, warning and danger
  // all existed as roles, and only two of the three had ever been drawn.
  warning: "bg-warning-subtle border-transparent text-warning",
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
  { variant = "unselected", size = "sm", shape = "full", iconEnd, className, children, ...rest },
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
        shape === "full" ? "rounded-full" : "rounded-sm",
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
