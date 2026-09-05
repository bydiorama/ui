import {
  createContext,
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  useCallback,
  useContext,
  useId,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

import { Menu } from "griddy-icons";
import { useRender } from "@base-ui/react/use-render";

import { chromeControl } from "@/lib/chrome-control";
import { cn } from "@/lib/cn";
import { Fade } from "@/ui/fade";
import { useIsStuck } from "@/hooks/use-is-stuck";
import { motionMicro, motionStandard } from "@/lib/motion";

/** Rows inside Header.Nav are list items; controls in Start/End are not. */
const InNav = createContext(false);

export interface HeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children: ReactNode;
  /**
   * Pins the bar to the top of its scroll container and lets it change into
   * its AFFIX state once the page has moved under it.
   *
   * One prop, not two, and not a controlled `isAffixed`. The pinning and the
   * appearance are the same decision — a bar that changes without being
   * pinned is describing something that did not happen — and a controlled
   * flag would put a scroll listener in every consumer, which is the
   * duplication this library exists to avoid.
   *
   * The state itself is observed, never listened for: see the effect below.
   *
   * `{ fade: true }` is the VARIANT (CONVENTIONS §3: a boolean prop that
   * sometimes needs configuration takes `boolean | {…}`): the affix state
   * swaps its edge-and-elevation treatment for a Fade hung below the bar —
   * the page dissolves under the bar instead of sliding beneath a hairline.
   * The Header sheet (05 Affix · Fade variant) and the Fade sheet's
   * Pinned-header pattern both draw it: the ramp REPLACES the hairline and
   * the shadow, and the bar keeps `bg-affix` and the backdrop blur.
   */
  affix?: boolean | { fade?: boolean };
}

/**
 * The page's top bar: leading controls, an optional row of navigation items,
 * trailing controls.
 *
 * A `<header>` rather than a `<div>`, so it is the banner landmark a screen
 * reader can jump to. It deliberately does NOT wrap its children in a nav —
 * the bar holds a brand switcher and an avatar menu as well as links, and
 * calling all of that "navigation" would make the landmark useless. The nav
 * row names itself (`Header.Nav`).
 *
 * Three slots, no layout opinions beyond the bar: what goes in Start and End
 * is the caller's, exactly as the sheet composes it from Buttons and an
 * Avatar.
 */
const HeaderRoot = forwardRef<HTMLElement, HeaderProps>(function Header(
  { children, className, affix = false, ...rest },
  ref,
) {
  // The node in STATE rather than a ref, because the effect below has to run
  // when the element attaches and a ref mutation does not re-run an effect.
  const [node, setNode] = useState<HTMLElement | null>(null);

  // `affix={{}}` means "pinned, classic treatment" — the object form exists
  // for its keys, but an empty one still opts into pinning, same as `true`.
  const isAffixEnabled = Boolean(affix);
  const isAffixFade = typeof affix === "object" && affix.fade === true;

  const attachRef = useCallback(
    (el: HTMLElement | null) => {
      setNode(el);
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  /**
   * OBSERVED, not listened for — and the observation now lives in
   * `useIsStuck`, which is this bar's own technique lifted out whole.
   *
   * It was inlined here while the bar was the only thing asking the question.
   * A consumer then wrote the same IntersectionObserver six times, on both
   * axes, which is the second-consumer condition `fade.doc.ts` set for
   * sharing it. The hook is the same geometry — `threshold: [1]`, a root
   * margin pulled in by the sticky offset plus a pixel, rooted at the nearest
   * scrolling ancestor rather than the viewport — plus one guard this copy
   * never had: a `display: none` bar reports as stuck, because an empty rect
   * has an intersection ratio of 0.
   *
   * Passing `null` when affix is off RESETS rather than merely skipping: a
   * bar toggled out of affix while stuck would otherwise keep its floating
   * ground with nothing underneath it to float over.
   */
  const isAffixed = useIsStuck(isAffixEnabled ? node : null);

  return (
    <header
      ref={attachRef}
      data-slot="header"
      data-affixed={isAffixed || undefined}
      className={cn(
        // Named group, so Header.Item can answer the bar's state in CSS
        // rather than through a context only this file could read.
        "group/header",
        // 48px, PINNED rather than emergent. It used to be py-sm around
        // whatever the tallest child happened to be, which silently assumed a
        // 32px control was present: a bar whose tallest child is a 24px
        // Header.Item rendered at 40px, so one route in an app had a shorter
        // app bar than every other and nothing said so. Both public call sites
        // had already worked around it with their own `h-12`. The component
        // owns the height its own sheet specifies.
        //
        // py-sm stays: with the height fixed it is the 32px content lane the
        // sheet draws the controls in, and it keeps a taller child from
        // sitting flush against the edge.
        "flex h-12 items-center gap-sm px-lg py-sm",
        // `bg-base`, the PAGE ground — not `bg-surface`. The bar was the only
        // piece of the shell answering a different role than the page it sits
        // on, and Sidebar already paints `bg-base`. In light that was invisible
        // (#FDFCFB against #FFFFFF, 0.4% apart); in dark the two are 20% apart
        // and the bar sat BELOW the page ground, so the chrome receded behind
        // the content it frames. Nothing had drawn a bar and a page together,
        // which is why it survived.
        //
        // It also fixes the hover ramp rather than costing one. `bg-elevated`
        // against this bar is DARKER in both schemes — 1.105 light, 1.168 dark
        // — where against `bg-surface` it was darker in light and lighter in
        // dark. The direction is now the same in both, which is what the
        // four-step ramp this replaced never managed.
        "bg-base text-ink-primary",
        // THE HAIRLINE IS ALWAYS THERE, and only its colour changes.
        //
        // Declaring it only in the affix state would move the content lane at
        // the moment the state flips, and a bar whose contents jog as you
        // scroll is a worse defect than the one the hairline fixes.
        //
        // An INSET SHADOW, not a border — corrected 2026-08-25. `border-b` was
        // costing a pixel of the content lane permanently: border-box keeps
        // h-12 at 48, so 1px of border + 8px of py-sm left 31 for a 32px chrome
        // control, and `items-center` paid the difference out as **7.50 above
        // and 8.50 below**, measured. That is Tabs' defect with a different
        // number, and it was invisible because the bar's own height never
        // changed. A shadow costs no layout, so the lane is a true 32 and the
        // inset is a true 8/8.
        //
        // `inset-shadow-*` rather than `shadow-[inset_…]`: v4 gives the inset a
        // slot of its own, so this composes with the `shadow-lg` the affix
        // state adds instead of one of them winning.
        "inset-shadow-[0_-1px_0_transparent]",
        isAffixEnabled && "sticky top-0 z-(--ui-z-sticky)",
        // A surface arriving, not interaction feedback — `motionStandard` is
        // documented for exactly this ("a bar's fill").
        // `border-color` is gone from this list with the border: a transition on
        // a property nothing changes animates no state that exists.
        "transition-[background-color,box-shadow]", motionStandard,
        // THE AFFIX STATE. Four channels, and each says a different thing:
        //
        //   ground   `bg-affix` — the page's own fill at AFFIX_BG_ALPHA, so
        //            the bar stays the page's colour while the page shows
        //            through it. 0.90 is a conformance floor, not taste; the
        //            token's own comment carries the measurement.
        //   backdrop an 8px blur, so what shows through reads as texture
        //            rather than as competing text. `supports-` guarded:
        //            without it, a browser with no backdrop-filter renders a
        //            translucent bar over sharp content, which is strictly
        //            worse than the opaque bar it replaced.
        //   depth    `shadow-lg` — a surface floating free of the layout with
        //            no anchor (ADR 0016). Not `md`: md is a panel attached to
        //            the thing that opened it, and nothing opens this bar.
        //   edge     the hairline above, coloured. An edge is not elevation
        //            (ADR 0016 §6) — the hairline says where the surface ends,
        //            the shadow says how far off the page it is.
        // In the FADE variant the ramp is the separation, so the depth and
        // edge channels stay off: no shadow-lg, and the hairline keeps its
        // resting transparent colour. Ground and backdrop apply in both
        // modes — the fade replaces the edge, not the bar's own fill.
        "data-[affixed]:bg-affix",
        !isAffixFade && "data-[affixed]:shadow-lg",
        !isAffixFade && "data-[affixed]:inset-shadow-[0_-1px_0_var(--ui-border-subtle)]",
        // THE BLUR IS ON THE TEXT-BEARING ELEMENT ON PURPOSE, and it costs
        // the labels nothing — measured 2026-09-04, because ui-craft rule 23
        // said it should and the rule was wrong.
        //
        //   backdrop-filter: blur(4px)   0 glyph pixels changed
        //   filter: blur(0.4px)          9.31% changed, peak delta 139/255
        //
        // `filter` filters the element, its own text included; this filters
        // only what is BEHIND it and composites the bar's content on top
        // untouched. And it is doing real work rather than decorating:
        // --ui-bg-affix is the page fill at AFFIX_BG_ALPHA = 0.9, so a tenth
        // of whatever scrolls under the bar shows through, and blurring it
        // moves ~9.7/255 on average over hard-edged content. Rule 23 now
        // carries the measurement.
        "supports-[backdrop-filter:blur(0px)]:data-[affixed]:backdrop-blur-sm",
        className,
      )}
      {...rest}
    >
      {children}
      {isAffixFade && (
        // The variant's whole treatment: the page dissolves under the bar.
        // `top-full` hangs the band below whatever the bar's height is
        // (className merges over side="top"'s own top-0); ground=base because
        // what scrolls under the bar is the PAGE, never the bar's translucent
        // fill; md depth per the sheet's Fade-variant row. Visible only while
        // affixed — Fade's own opacity transition carries the flip, and the
        // band is aria-hidden, pointer-events-none paint either way, so it
        // adds nothing to the banner landmark and steals no clicks.
        <Fade side="top" ground="base" className="top-full" isVisible={isAffixed} />
      )}
    </header>
  );
});

export type HeaderStartProps = HTMLAttributes<HTMLDivElement>;
export type HeaderEndProps = HTMLAttributes<HTMLDivElement>;

/** Leading controls — a brand switcher, a back button. */
function HeaderStart({ className, ...rest }: HeaderStartProps) {
  return <div data-slot="header-start" className={cn("flex shrink-0 items-center gap-sm", className)} {...rest} />;
}

/** Trailing controls — a menu toggle, an avatar. */
function HeaderEnd({ className, ...rest }: HeaderEndProps) {
  return <div data-slot="header-end" className={cn("flex shrink-0 items-center gap-sm", className)} {...rest} />;
}

export interface HeaderMenuButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /**
   * Required — it is the accessible name, and "Menu" is not one. Say what it
   * opens: "Open primary navigation".
   */
  label: string;
}

/**
 * The control the navigation collapses INTO.
 *
 * This is the pattern, not a convenience. There is no collapsed rail: below
 * the breakpoint the Sidebar is not narrowed, it is removed, and this button
 * is what remains of it — so it has to carry the whole affordance. A rail can
 * be introduced later without changing this, because a rail is a different
 * answer to the same question rather than a step on the way to one.
 *
 * It renders the chrome control, which is what the sheet draws for it: a 32px
 * square filled with --ui-bg-elevated and no edge. Forwarded and spread, so
 * `<Sheet.Trigger render={<Header.MenuButton label="…" />} />` gets its ARIA
 * wiring — aria-expanded and aria-controls — from the Sheet rather than from
 * a second source that could disagree with it.
 */
const HeaderMenuButton = forwardRef<HTMLButtonElement, HeaderMenuButtonProps>(
  function HeaderMenuButton({ label, className, type = "button", ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        data-slot="header-menu-button"
        aria-label={label}
        className={chromeControl(className)}
        {...rest}
      >
        <Menu />
      </button>
    );
  },
);

/**
 * The flexible gap between regions. The sheet draws it as a named `Spacer`
 * on both sides of the nav row, which is what centres the row while leaving
 * the two control groups pinned to their edges.
 */
function HeaderSpacer() {
  return <div data-slot="header-spacer" aria-hidden="true" className="flex-1" />;
}

export interface HeaderNavProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children: ReactNode;
  /**
   * Required — a page carries several navigations and `<nav>` landmarks are
   * indistinguishable without names. The Sidebar's rule, for the same reason.
   */
  label: string;
}

/** The row of navigation items. Hidden below the breakpoint by the caller. */
function HeaderNav({ children, label, className, ...rest }: HeaderNavProps) {
  const labelId = useId();
  return (
    <nav
      aria-labelledby={labelId}
      data-slot="header-nav"
      className={cn("flex items-center", className)}
      {...rest}
    >
      <span id={labelId} className="sr-only">
        {label}
      </span>
      <ul data-slot="header-nav-list" className="flex list-none items-center gap-xs p-xs">
        <InNav.Provider value={true}>{children}</InNav.Provider>
      </ul>
    </nav>
  );
}

/**
 * Anchor attributes, not merely element attributes.
 *
 * `HTMLAttributes<HTMLElement>` has no `target`, no `rel`, no `download` and
 * no `referrerPolicy` — so an item that navigates OFF the app could not open
 * in a new tab through its own API, and the only way out was the `render`
 * slot, which means writing the href twice and keeping the two in step. An
 * item is an `<a>` whenever it has an href; its props should say so.
 *
 * `type` is removed because the two branches disagree about it: on the button
 * branch it is the `type="button"` that stops a nav item submitting a form
 * around it, and on an anchor it is a MIME hint nothing here wants.
 */
export interface HeaderItemProps
  extends Omit<AnchorHTMLAttributes<HTMLElement>, "children" | "href" | "type"> {
  children: ReactNode;
  /** Makes the item a link. Without it the item is a button — the sheet draws
   *  two that open menus rather than navigate, and they carry a chevron.
   *
   *  `target`/`rel` come with it: an external destination opens in a new tab
   *  through this API rather than through `render`. They are inert on the
   *  button branch, exactly as they are on any `<button>`. */
  href?: string;
  /**
   * Marks the current page. Sets aria-current, which is what is announced —
   * a fill alone conveys nothing (WCAG 1.4.1). DERIVED: the sheet draws every
   * item in one state, so the current styling is this library's.
   */
  isCurrent?: boolean;
  icon?: ReactElement;
  /** Trailing slot — the sheet puts a chevron here on the two menu items. */
  trailing?: ReactElement;
  /**
   * Slot: renders as this element instead of the default `<a>`/`<button>`.
   * Passed through, never wrapped (§3) — pass `render={<Link href={href} />}`
   * so an internal href gets `next/link`'s client-side transition instead of
   * a full document navigation. The item's own wiring (data-slot,
   * aria-current, its className, its click handling) merges onto the element
   * rather than replacing what it already carries.
   */
  render?: ReactElement;
}

function HeaderItem({ children, href, isCurrent = false, icon, trailing, render, className, ...rest }: HeaderItemProps) {
  const inNav = useContext(InNav);
  const isLink = href !== undefined;

  const row = useRender({
    render,
    defaultTagName: isLink ? "a" : "button",
    props: {
      ...(isLink ? { href } : { type: "button" as const }),
      "data-slot": "header-item",
      "data-current": isCurrent || undefined,
      ...(isCurrent ? { "aria-current": "page" as const } : {}),
      className: cn(
        // Compact-control anatomy: an 8px inline / 4px block inset around a
        // 12px label, with the same soft radius and 16px glyph as Button sm.
        // min-h-6 keeps the target at SC 2.5.8's 24px floor.
        "inline-flex min-h-6 cursor-pointer items-center justify-center gap-xs rounded-sm px-sm py-xs",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        "text-button-sm font-body font-bold leading-flat tracking-tight whitespace-nowrap no-underline",
        "text-ink-primary",
        "transition-[background-color,color]", motionMicro,
        // TWO CHANNELS, not one, and they are separate on purpose: FILL answers
        // the pointer, INK says where you are.
        //
        // The current page RECEDES. It carries no fill and steps its ink back
        // to muted, because you cannot go there — the items worth pointing at
        // are the ones at full strength, and an emphasised fill on the page you
        // are already on spends the loudest thing in the bar on the least
        // actionable item.
        //
        // This replaces a four-step FILL ramp, and it dissolves that ramp's
        // whole problem rather than tuning it. Those four steps existed because
        // hover and current shared a fill; then they INVERTED in dark, because
        // `--ui-bg-elevated` raised 0.06 against `bg-hover`'s 0.05 and a
        // surface role landed between two interaction ones (hover 1.247,
        // current 1.210 against the bar — 1.031 apart, and backwards). That was
        // a resolver defect and is fixed there. But with only ONE fill left
        // there is no ramp to order, in either scheme, and nothing for the
        // surface scale's inversion to catch.
        //
        // Hover applies to the current item too. "Hovering the current item did
        // nothing at all" was the original defect and it stays fixed — the fill
        // answers the pointer, the muted ink persists underneath it.
        //
        // The ink pair needs no `not-data-[current]:` guard the way the fills
        // did. `data-[current]:text-ink-muted` compiles to a class-plus-
        // attribute selector, which outranks the bare `text-ink-primary` by
        // specificity rather than by the order Tailwind happens to sort
        // variants in — and tailwind-merge keeps both, because their modifiers
        // differ.
        "hover:bg-elevated",
        "data-[current]:text-ink-muted",
        // ON THE AFFIX BAR THE CURRENT ITEM STEPS UP, and this is a
        // CONFORMANCE step rather than a stylistic one.
        //
        // `text-ink-muted` is body text with the least headroom in the whole
        // bar, and the affix bar's worst ground is not the page — it is
        // `--ui-bg-affix-floor`, the fill over whatever has scrolled under it.
        // Muted measures 4.75:1 there in light and 3.66:1 in DARK, under AA,
        // and NO alpha closes it: 0.96 still measures 4.43:1 and an opaque bar
        // is 4.94:1, the ceiling this component already had the least headroom
        // on. Dark's two surfaces sit close together — ADR 0016 point 4,
        // arriving somewhere new. So the fix is the ink, and it is the ink
        // ONLY while affixed: on the resting bar muted is measured, approved
        // and unchanged.
        //
        // `secondary` rather than `primary` because RECEDING is the whole
        // point of the state (you cannot navigate to the page you are on). It
        // is still a step back from the items around it, and it measures
        // 11.12:1 light / 5.86:1 dark on the same floor.
        //
        // Read off the bar's own `data-affixed` through the named group, not
        // through a context: a context would make this file the only thing
        // that could ever answer the question, and a consumer restyling the
        // current item needs the same hook the component uses.
        "group-data-[affixed]/header:data-[current]:text-ink-secondary",
        "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
        className,
      ),
      ...(rest as HTMLAttributes<HTMLElement>),
      children: (
        <>
          {icon}
          {children}
          {trailing}
        </>
      ),
    },
  });

  // `contents` so the <li> adds semantics without a box that changes layout.
  return inNav ? <li className="contents">{row}</li> : row;
}

export const Header = Object.assign(HeaderRoot, {
  Start: HeaderStart,
  Nav: HeaderNav,
  Item: HeaderItem,
  Spacer: HeaderSpacer,
  MenuButton: HeaderMenuButton,
  End: HeaderEnd,
});
