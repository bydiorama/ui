import { forwardRef, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "lg" | "md" | "sm";
export type ButtonShape = "pill" | "rounded";

/**
 * Geometry per size, transcribed from the approved design.
 *
 * The resting ring is an *inset* ring rather than a border: the design draws it
 * as an outline (outside the box), so a real border would add 3px to a 44px
 * button. Inset costs no layout and leaves `outline` free for focus, which is
 * where it belongs — an outline survives forced-colors mode, a box-shadow does
 * not.
 */
const SIZE = {
  lg: "gap-sm py-md px-xl text-button-lg ring-[1.5px]",
  md: "gap-sm py-sm px-md text-button-sm ring-1",
  sm: "gap-xs py-xs px-sm text-button-sm ring-1",
} as const satisfies Record<ButtonSize, string>;

/** Icon-only buttons are square at the size's own height, so a row of mixed
 *  buttons keeps one baseline. All three clear the 24px WCAG 2.5.8 floor. */
const ICON_SIZE = {
  lg: "size-11 p-0 gap-0 ring-[1.5px]",
  md: "size-8 p-0 gap-0 ring-1",
  sm: "size-6 p-0 gap-0 ring-1",
} as const satisfies Record<ButtonSize, string>;

/**
 * Variants. Hover and active are the designed states, not tints of rest:
 * `secondary` gains presence from BOTH sides — its ink darkens
 * (muted → secondary) as its ring strengthens (subtle → default).
 */
const VARIANT = {
  primary:
    "bg-accent ring-accent text-ink-on-accent enabled:hover:bg-accent-hover enabled:hover:ring-accent-hover enabled:active:bg-accent-active enabled:active:ring-accent-active",
  secondary:
    "ring-edge-subtle text-ink-muted enabled:hover:ring-edge-default enabled:hover:text-ink-secondary enabled:active:bg-hover",
  ghost: "ring-transparent text-ink-secondary enabled:hover:bg-hover enabled:active:bg-active",
  danger:
    "bg-danger-subtle ring-danger-border text-ink-on-danger-subtle enabled:hover:bg-danger-subtle-hover",
} as const satisfies Record<ButtonVariant, string>;

interface ButtonBaseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** `pill` is the default; `rounded` is the squared-off small control. */
  shape?: ButtonShape;
  /** Non-interactive and out of the tab order. Distinct from `isBusy`. */
  isDisabled?: boolean;
  /**
   * Visual only: keeps focus, stays operable to assistive tech, announces via
   * `aria-busy`. A control that leaves the tab order mid-submit strands the
   * keyboard user who was standing on it (CONVENTIONS §4).
   */
  isBusy?: boolean;
  /** Stretches to the container — the designed full-width action. */
  isFullWidth?: boolean;
  /** Opt out of press feedback where even 4% of scale reads as noise. */
  staticTap?: boolean;
  /** Slot: rendered before the label. Never wrapped (CONVENTIONS §3). */
  icon?: ReactElement;
  /** Slot: rendered after the label. Chevrons, external-link marks. */
  iconEnd?: ReactElement;
}

/**
 * An icon-only button MUST carry an accessible name. Making that a type error
 * rather than a lint rule or a doc note is the cheapest place to catch it —
 * the failure is invisible in every visual check and total for a screen-reader
 * user (Astryx: typed APIs beat prompt docs).
 */
interface IconOnlyProps {
  isIconOnly: true;
  "aria-label": string;
  children?: never;
}

interface LabelledProps {
  isIconOnly?: false;
  children: ReactNode;
}

export type ButtonProps = ButtonBaseProps & (IconOnlyProps | LabelledProps);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const {
    variant = "primary",
    size = "md",
    shape = "pill",
    isDisabled = false,
    isBusy = false,
    isFullWidth = false,
    staticTap = false,
    isIconOnly = false,
    icon,
    iconEnd,
    className,
    children,
    type = "button",
    ...rest
  } = props;

  return (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={isDisabled}
      aria-busy={isBusy || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center ring-inset",
        "font-body font-bold leading-flat tracking-tight whitespace-nowrap",
        // A <button> has NO pointer cursor by default — the UA default is the
        // arrow, and Tailwind's preflight does not add one. Verified in a real
        // browser: without this the computed cursor is `default`. The pointer
        // is the only pre-click signal that a thing is clickable, so it is
        // part of the contract, not decoration.
        "cursor-pointer disabled:cursor-not-allowed",
        // Enumerated properties, never `all` (CONVENTIONS §8). Scale is left
        // out deliberately: press feedback should snap, not ease.
        // Custom properties use the PARENS syntax — `duration-(--x)` compiles
        // to var(--x); the bracket form emits the bare property name, which is
        // invalid CSS and silently zeroes the transition.
        "transition-[background-color,box-shadow,color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
        // Focus lives on the outline layer so it can never be confused with a
        // variant's resting ring, and no variant can suppress it. There is
        // deliberately NO `outline-none` base: it poisons `--tw-outline-style`
        // with `none`, which `focus-visible:outline-2` then inherits — a
        // 2px-wide ring drawn in style:none, i.e. an invisible focus
        // indicator at a perfect contrast ratio. The UA outline needs no
        // suppressing: ours overrides it whenever :focus-visible matches.
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-edge-focus",
        !staticTap && "enabled:active:scale-(--ui-press-scale) motion-reduce:active:scale-100",
        shape === "pill" ? "rounded-full" : "rounded-sm",
        isIconOnly ? ICON_SIZE[size] : SIZE[size],
        VARIANT[variant],
        isFullWidth && "w-full",
        // Last, so it wins over every variant's colours by order rather than
        // by specificity arithmetic.
        //
        // Deliberately NOT `pointer-events-none`: the native `disabled`
        // attribute already blocks activation and removes the control from the
        // tab order, so suppressing pointer events adds nothing except making
        // the button unhoverable — which kills the tooltip that would explain
        // WHY it is disabled. Hover states are gated with `enabled:` instead.
        "disabled:bg-sunken disabled:text-ink-disabled disabled:ring-edge-subtle",
        className,
      )}
      {...rest}
    >
      {icon}
      {!isIconOnly && children}
      {iconEnd}
    </button>
  );
});
