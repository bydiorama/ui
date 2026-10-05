import {
  forwardRef,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";

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
export type ButtonShape = "soft" | "full";

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
  // ring-hairline at EVERY size — the sheet's outline is 1.5 throughout, and
  // md/sm shipped at ring-1.
  // The explicit block size is intentional. Padding plus line-height produced
  // 40/28/20px controls even though the documented and drawn contract is
  // 44/32/24px. Keep padding for label geometry; own the hit area directly.
  lg: "h-control-lg gap-sm py-md px-control-inset-lg text-button-lg ring-hairline",
  md: "h-control-md gap-sm py-sm px-control-inset-md text-button-sm ring-hairline",
  sm: "h-control-sm gap-xs py-xs px-control-inset-sm text-button-sm ring-hairline",
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
  lg: "size-control-lg p-0 gap-0 ring-hairline",
  md: "size-control-md p-0 gap-0 ring-hairline",
  sm: "size-control-sm p-0 gap-0 ring-hairline",
} as const satisfies Record<ButtonSize, string>;

/**
 * Variants. Hover and active are the designed states, not tints of rest:
 * `secondary` gains presence from BOTH sides — its ink darkens
 * (muted → secondary) as its ring strengthens (subtle → default).
 *
 * PRESSED PAINTS NO NEW FILL on the three edge-on-nothing types. The sheet
 * draws eleven button frames — five variants, their five hovers, and disabled —
 * and no pressed row at all, so every active treatment here is derived. What
 * the derivation reached for was `--ui-bg-active` (#DAD4CE), a value that
 * appears ZERO times in the whole Button artboard: an edge-only control grew a
 * neutral chip under the pointer, heavier than any fill the design draws for a
 * button.
 *
 * Press instead firms the channels each type already uses — the ring, the ink —
 * and keeps whatever hover painted. A pointer press is necessarily also a
 * hover, so `:hover`'s fill is already applied and `:active` adding a second,
 * darker one is what produced the chip. The ink step is not decoration: §8
 * requires a static cue beside the press-scale, and without it press would be
 * motion alone.
 */
const VARIANT = {
  primary:
    "bg-accent ring-accent text-ink-on-accent enabled:hover:bg-accent-hover enabled:hover:ring-accent-hover enabled:active:bg-accent-active enabled:active:ring-accent-active",
  secondary:
    "ring-edge-subtle text-ink-muted enabled:hover:ring-edge-default enabled:hover:text-ink-secondary enabled:active:ring-edge-strong enabled:active:text-ink-primary",
  // A CONFORMANT edge, which is the whole reason this type exists next to
  // secondary. DERIVED — the sheet draws no Outline row — and the first
  // attempt used border-default, which measures 2.14:1 against the page and
  // fails the 3:1 SC 1.4.11 asks of a control boundary. border-control is the
  // step ADR 0010 defines for exactly this: an edge something depends on
  // being able to identify. secondary keeps the quiet hairline.
  outline:
    "ring-edge-control text-ink-secondary enabled:hover:ring-edge-strong enabled:active:text-ink-primary",
  ghost: "ring-transparent text-ink-secondary enabled:hover:bg-elevated enabled:active:text-ink-primary",
  danger:
    "bg-danger-subtle ring-danger-border text-ink-on-danger-subtle enabled:hover:bg-danger-subtle-hover",
} as const satisfies Record<ButtonVariant, string>;

/**
 * Disabled, PER VARIANT. The sheet's Disabled frame fills with --ui-neutral-95
 * and rings itself with that same value, so a filled or edged control reads as
 * flattened rather than as a filled chip. It shipped as `bg-sunken`
 * (neutral-90) with a subtle edge — one step darker than drawn, and the same
 * off-by-one ghost's hover had. This is the state seen most: a form disables
 * its secondary actions while it submits, so a whole column goes grey at once.
 *
 * GHOST IS THE EXCEPTION (#27). It has no fill and no ring at rest, so the one
 * shared chip turned it into a grey slab the moment it disabled — the heaviest
 * thing in a row of quiet actions, for an action that is UNAVAILABLE. A ghost
 * keeps its absence of chrome and takes only the disabled ink; its ring stays
 * the `ring-transparent` it rests with.
 */
const DISABLED_CHIP = "disabled:bg-elevated disabled:text-ink-disabled disabled:ring-elevated";
const DISABLED = {
  primary: DISABLED_CHIP,
  secondary: DISABLED_CHIP,
  outline: DISABLED_CHIP,
  ghost: "disabled:text-ink-disabled",
  danger: DISABLED_CHIP,
} as const satisfies Record<ButtonVariant, string>;

interface ButtonBaseProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "aria-busy"> {
  /**
   * A composed component may give the atom its higher-level part name, as
   * CardSorting does for its handle. State and ARIA contracts remain owned by
   * Button; this one structural attribute is an explicit composition seam.
   */
  "data-slot"?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * `soft` is the default (see ButtonShape). `full` is the fully rounded form
   * the sheet labels "Rounded Full".
   */
  shape?: ButtonShape;
  /** Non-interactive and out of the tab order. Distinct from `isBusy`. */
  isDisabled?: boolean;
  /**
   * BUSY SWALLOWS ACTIVATION. Keeps focus and its place in the tab order, but
   * a click, Enter or Space does nothing: `onClick` is not called and a
   * `type="submit"` button does not submit its form — including the implicit
   * submission Enter triggers from a text field. That makes `isBusy` the
   * double-submit guard on its own; it needs no `isDisabled` beside it.
   *
   * It is still NOT `isDisabled`: no disabled styling, and it does not leave
   * the tab order, because a control that disappears mid-submit strands the
   * keyboard user who was standing on it (CONVENTIONS §4). Announced with
   * `aria-busy` and `aria-disabled`.
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
    "data-slot": dataSlot = "button",
    onClick,
    ...rest
  } = props;

  // A busy button is still focusable but not ACTIVATABLE (#8). This is a
  // safety invariant, not optional behaviour, so it is an unconditional
  // wrapper rather than `composeEventHandlers` (CONVENTIONS §5): nothing a
  // consumer does can re-enable activation mid-flight.
  //
  // Cancelling the click is the whole mechanism, and it reaches further than
  // `onClick`. A submit button's activation behaviour runs only if its click
  // event is not cancelled, and implicit submission — Enter in a text field —
  // works by firing a synthetic click at the form's default button. So the one
  // `preventDefault()` refuses the pointer, Enter and Space on the button, and
  // Enter from any field whose default button this is. The native way to
  // refuse implicit submission is `disabled` on the default button; this gets
  // the same result while keeping focus.
  const handleClick = isBusy
    ? (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
      }
    : onClick;

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      data-slot={dataSlot}
      data-variant={variant}
      data-size={size}
      disabled={isDisabled}
      onClick={handleClick}
      aria-busy={isBusy || undefined}
      // aria-disabled, because activation is now genuinely unavailable and
      // aria-busy alone does not say so: on a button, most screen readers do
      // not announce aria-busy at all. aria-disabled is the attribute AT
      // reads as "present, focusable, cannot be activated right now" — the
      // pattern Calendar, Accordion and Menu already use for a control that
      // must stay reachable. Spread conditionally so a caller's own
      // aria-disabled survives on a button that is not busy.
      {...(isBusy ? { "aria-disabled": true as const } : {})}
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
        //
        // BUSY shows `progress`: the pointer would promise a click that is
        // now swallowed, and not-allowed is disabled's signal, which busy
        // deliberately is not. `progress` is the platform's own "working, you
        // can still interact with the page" cursor. Disabled still wins.
        isBusy && !isDisabled ? "cursor-progress" : "cursor-pointer disabled:cursor-not-allowed",
        // Enumerated properties, never `all` (CONVENTIONS §8). Scale is left
        // out deliberately: press feedback should snap, not ease.
        // Custom properties use the PARENS syntax — `duration-(--x)` compiles
        // to var(--x); the bracket form emits the bare property name, which is
        // invalid CSS and silently zeroes the transition.
        "transition-[background-color,box-shadow,color]", motionMicro,
        // Focus lives on the outline layer so it can never be confused with a
        // variant's resting ring, and no variant can suppress it. There is
        // deliberately NO `outline-none` base: it poisons `--tw-outline-style`
        // with `none`, which `focus-visible:outline-focus` then inherits — a
        // 2px-wide ring drawn in style:none, i.e. an invisible focus
        // indicator at a perfect contrast ratio. The UA outline needs no
        // suppressing: ours overrides it whenever :focus-visible matches.
        "focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-edge-focus",
        // No press-scale while busy: pressing a busy button activates nothing,
        // and motion that acknowledges a press nobody acted on is a false cue.
        !staticTap && !isBusy && "enabled:active:scale-(--ui-press-scale) motion-reduce:active:scale-100",
        shape === "full" ? "rounded-full" : SOFT_RADIUS[size],
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
        // The treatment is per variant — see DISABLED for why ghost differs.
        DISABLED[variant],
        className,
      )}
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
    <span
      aria-hidden="true"
      data-slot="button-spinner"
      className="size-4 shrink-0 animate-spin rounded-full border-thick border-current/30 border-r-current motion-reduce:animate-none"
    />
  );
}
