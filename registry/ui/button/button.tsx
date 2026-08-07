import { forwardRef, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "lg" | "md" | "sm";
/**
 * `soft` is the DEFAULT, and that is the whole point of this axis.
 *
 * It shipped the other way round — pill by default, soft opt-in — and that one
 * inversion is why Header, Sheet and Calendar all appeared to need a button
 * "nobody had defined": every Button placed anywhere came out a pill, so the
 * soft control the design actually draws looked like an invention each time.
 */
export type ButtonShape = "soft" | "pill";

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
  // px-lg, not px-xl: three of the four large buttons in the sheet draw
  // `paddingInline: space-lg` and only Ghost draws xl, which is a slip.
  // ring-[1.5px] at EVERY size — the sheet's outline is 1.5 throughout, and
  // md/sm shipped at ring-1.
  lg: "gap-sm py-md px-lg text-button-lg ring-[1.5px]",
  md: "gap-sm py-sm px-md text-button-sm ring-[1.5px]",
  sm: "gap-xs py-xs px-sm text-button-sm ring-[1.5px]",
} as const satisfies Record<ButtonSize, string>;

/**
 * The soft radius SCALES with the size: 4px at small, 8px above it.
 *
 * Both values are drawn — `radius-sm` in the sheet's own "Small Rounded"
 * column, `radius-md` at 32px in Header, Sheet and Calendar. Only large is
 * derived, and it follows medium rather than inventing a third step.
 */
const SOFT_RADIUS = {
  lg: "rounded-md",
  md: "rounded-md",
  sm: "rounded-sm",
} as const satisfies Record<ButtonSize, string>;

/** Icon-only buttons are square at the size's own height, so a row of mixed
 *  buttons keeps one baseline. All three clear the 24px WCAG 2.5.8 floor. */
const ICON_SIZE = {
  lg: "size-11 p-0 gap-0 ring-[1.5px]",
  md: "size-8 p-0 gap-0 ring-[1.5px]",
  sm: "size-6 p-0 gap-0 ring-[1.5px]",
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
  // A CONFORMANT edge, which is the whole reason this type exists next to
  // secondary. DERIVED — the sheet draws no Outline row — and the first
  // attempt used border-default, which measures 2.14:1 against the page and
  // fails the 3:1 SC 1.4.11 asks of a control boundary. border-control is the
  // step ADR 0010 defines for exactly this: an edge something depends on
  // being able to identify. secondary keeps the quiet hairline.
  outline:
    "ring-edge-control text-ink-secondary enabled:hover:ring-edge-strong enabled:hover:text-ink-primary enabled:active:bg-hover",
  ghost: "ring-transparent text-ink-secondary enabled:hover:bg-hover enabled:active:bg-active",
  danger:
    "bg-danger-subtle ring-danger-border text-ink-on-danger-subtle enabled:hover:bg-danger-subtle-hover",
} as const satisfies Record<ButtonVariant, string>;

interface ButtonBaseProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * `soft` is the default (see ButtonShape). `pill` is the fully rounded form
   * the sheet labels "Rounded Full".
   */
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
 * user. A typed API beats a documented one, because a doc is advisory and a
 * type is not.
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
    shape = "soft",
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
        // The icon slot is SIZED, at 16px for every button size — which is what
        // the sheet draws at all four (a 44px lg button and a 24px sm button
        // both carry a 16px glyph). Without this the slot inherits whatever the
        // icon library defaults to: griddy's IconBase sets width/height="24" as
        // attributes, so every icon rendered 50% oversize, and at sm a 24px
        // glyph exactly filled the 24px button. A CSS rule beats a presentation
        // attribute, which is why one class is enough.
        "[&_svg]:size-4 [&_svg]:shrink-0",
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
        shape === "pill" ? "rounded-full" : SOFT_RADIUS[size],
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
      {/*
        A spinner REPLACES the leading icon rather than joining it, so the
        button does not change width mid-submit and shift the layout under a
        pointer that is still on it. Both are 16px, so the swap is silent.

        DERIVED — the sheet draws no busy state. `isBusy` shipped as a prop
        that set `aria-busy` and nothing else, which is worse than not having
        it: a sighted user got no signal at all while a screen-reader user was
        told the control was busy.
      */}
      {isBusy ? <Spinner /> : icon}
      {!isIconOnly && children}
      {iconEnd}
    </button>
  );
});

/**
 * The busy indicator. Ours, at the icon slot's own 16px.
 *
 * `aria-hidden` because `aria-busy` on the button already carries the meaning
 * — a screen reader announcing both would say it twice. Under
 * prefers-reduced-motion it stops spinning and stays a broken ring, which is
 * still a visible difference from the resting icon; a spinner that keeps
 * turning is exactly what that preference is asking us not to do.
 */
function Spinner() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      data-slot="button-spinner"
      className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
      fill="none"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
