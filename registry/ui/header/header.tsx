import {
  createContext,
  forwardRef,
  type ButtonHTMLAttributes,
  useContext,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

import { Menu } from "griddy-icons";

import { chromeControl } from "@/lib/chrome-control";
import { cn } from "@/lib/cn";

/** Rows inside Header.Nav are list items; controls in Start/End are not. */
const InNav = createContext(false);

export interface HeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children: ReactNode;
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
  { children, className, ...rest },
  ref,
) {
  return (
    <header
      ref={ref}
      data-slot="header"
      className={cn(
        // 48px tall: py-sm around a 32px control. px-lg, not the sheet's raw
        // 20px — 20 is off the spacing scale entirely, and the mobile drawing
        // of this same bar uses 12. Recorded as a design defect.
        "flex items-center gap-sm px-lg py-sm",
        "bg-surface text-ink-primary",
        className,
      )}
      {...rest}
    >
      {children}
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

export interface HeaderItemProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: ReactNode;
  /**
   * Forwarded to the row itself, which is what lets the item BE a trigger:
   * `<Menu.Trigger render={<Header.Item trailing={<ChevronDown/>}>Create</Header.Item>} />`.
   *
   * The sheet draws exactly that — "Create ⌄" and "Work ⌄" are nav items
   * that open a menu rather than navigate — and without a ref the behaviour
   * layer cannot anchor its panel to the row or restore focus to it. Note
   * that composing through `render` means the TRIGGER's data-slot wins over
   * `header-item`, which is true of every render slot here.
   */
  ref?: Ref<HTMLElement>;
  /** Makes the item a link. Without it the item is a button — the sheet draws
   *  two that open menus rather than navigate, and they carry a chevron. */
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
}

function HeaderItem({ children, href, isCurrent = false, icon, trailing, className, ref, ...rest }: HeaderItemProps) {
  const inNav = useContext(InNav);
  const isLink = href !== undefined;
  const Row = isLink ? "a" : "button";

  const row = (
    <Row
      ref={ref as Ref<HTMLAnchorElement> & Ref<HTMLButtonElement>}
      {...(isLink ? { href } : { type: "button" as const })}
      data-slot="header-item"
      data-current={isCurrent || undefined}
      {...(isCurrent ? { "aria-current": "page" as const } : {})}
      className={cn(
        // Compact-control anatomy: an 8px inline / 4px block inset around a
        // 12px label, with the same soft radius and 16px glyph as Button sm.
        // min-h-6 keeps the target at SC 2.5.8's 24px floor.
        "inline-flex min-h-6 cursor-pointer items-center justify-center gap-xs rounded-sm px-sm py-xs",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        "text-button-sm font-body font-bold leading-flat tracking-tight whitespace-nowrap no-underline",
        "text-ink-primary",
        "transition-[background-color,color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
        "hover:bg-hover",
        "data-[current]:bg-hover",
        "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
        className,
      )}
      {...(rest as HTMLAttributes<HTMLElement>)}
    >
      {icon}
      {children}
      {trailing}
    </Row>
  );

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
