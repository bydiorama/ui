import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { useControllableState } from "@/hooks/use-controllable-state";

/**
 * Rows inside a Section are list items; rows outside one are not.
 *
 * A Section IS a list of links, so `ul`/`li` is right there. A top-level row
 * may hold a search field or a progress bar, and calling those "list items"
 * would announce furniture as content.
 */
const InSection = createContext(false);

export interface SidebarProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children: ReactNode;
  /**
   * Required — a page may carry several navigations (primary, breadcrumb, a
   * footer), and `<nav>` landmarks are indistinguishable without names.
   */
  label: string;
  /**
   * Hidden by DEFAULT: the sheet draws no heading on the rail, so the label
   * exists to name the landmark rather than to be read.
   */
  isLabelHidden?: boolean;
}

/**
 * The navigation rail: a scaffold of rows at two levels.
 *
 * The sheet's layer names are the contract — `Primary Level Item`,
 * `Second Level Item`, `Nav Group`, `Spacer` — and they describe SLOTS, not
 * links. One `Primary Level Item` in the sheet holds a search button; one
 * `Second Level Item` holds an entire Progress bar. So a row is a row, and it
 * becomes a link only when given an `href`.
 *
 * What is constant is the scaffold: the 24px text inset built from the body's
 * 8 plus each row's 16, the two-level type pair, and the row rhythm. What goes
 * in the rows is the caller's.
 */
const SidebarNav = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { children, label, isLabelHidden = true, className, ...rest },
  ref,
) {
  const labelId = useId();

  return (
    <nav
      ref={ref}
      aria-labelledby={labelId}
      data-slot="sidebar"
      className={cn(
        // No padding on the rail itself — the sheet builds the inset from the
        // body (8) plus each row (12). w-nav is --ui-nav-width (17rem).
        "flex w-nav flex-col overflow-clip rounded-lg",
        "bg-nav text-ink-nav",
        className,
      )}
      {...rest}
    >
      {/*
        NO gap between rows. The sheet stacks them flush — six 46px rows measure
        exactly 276 — and the rhythm comes from each row's own 12px padding.
        A gap on top of that reads as a second, competing spacing system.

        The 8px block padding IS ours: the sheet lets the first and last rows
        touch the rail's edges, which left a collapsed final section jammed
        against the bottom.
      */}
      <div data-slot="sidebar-body" className="flex min-h-0 flex-1 flex-col p-sm">
        {/*
          Inside the body, not beside it: the rail has no padding of its own, so
          a shown label out here could not reach the rows' 20px inset with one
          spacing step. In here the body's 8 plus the label's 12 is the same 20.
        */}
        <span
          id={labelId}
          data-slot="sidebar-label"
          className={cn(
            isLabelHidden
              ? "sr-only"
              : "px-md pt-xs pb-sm text-label-sm font-body font-bold tracking-tight text-ink-nav-muted uppercase",
          )}
        >
          {label}
        </span>
        {children}
      </div>
    </nav>
  );
});

export type SidebarGroupProps = HTMLAttributes<HTMLDivElement>;

/**
 * The header band — the sheet's `Nav Group`. Holds controls rather than
 * navigation: a back button, a close button. Its children are slots.
 */
function SidebarGroup({ className, ...rest }: SidebarGroupProps) {
  return (
    <div
      data-slot="sidebar-group"
      className={cn("flex items-center justify-between gap-sm p-sm", className)}
      {...rest}
    />
  );
}

export interface SidebarSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  children: ReactNode;
  label: string;
  /**
   * Adds a chevron and makes the header a disclosure. OFF by default: the
   * sheet draws a chevron on some sections ("Brand") and none on others
   * ("Most recent"), so collapsibility is a property of a section, not the
   * definition of one.
   */
  isCollapsible?: boolean;
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  icon?: ReactElement;
}

/** A primary-level label with its second-level rows beneath. */
function SidebarSection({
  children,
  label,
  isCollapsible = false,
  isOpen,
  defaultIsOpen = true,
  onOpenChange,
  icon,
  className,
  ...rest
}: SidebarSectionProps) {
  const listId = useId();
  const [open, setOpen] = useControllableState({
    ...(isOpen !== undefined ? { value: isOpen } : {}),
    defaultValue: defaultIsOpen,
    ...(onOpenChange ? { onChange: onOpenChange } : {}),
  });
  const expanded = isCollapsible ? open : true;

  const heading = (
    <span className="flex min-w-0 items-center gap-sm [&_svg]:size-4 [&_svg]:shrink-0">
      {icon}
      <span data-slot="sidebar-text" className="truncate">
        {label}
      </span>
    </span>
  );

  /**
   * 16px/600 in primary ink, per the sheet.
   *
   * body-lg, NOT title-sm. Both peak at 16px, but the title roles are FLUID —
   * `clamp(…vw…)` — and the rail is a fixed 272px surface whose width never
   * changes with the viewport. title-sm rendered at 12.17px in the browser
   * suite, and worst of all on a phone, which is the one viewport where the
   * sheet actually draws this rail at 16.
   */
  const headingClass =
    "flex min-h-9 w-full items-center justify-between gap-sm rounded-sm p-md " +
    "text-body-lg font-body font-bold leading-normal tracking-tight text-ink-nav";

  return (
    <div data-slot="sidebar-section" className={cn("flex flex-col", className)} {...rest}>
      {isCollapsible ? (
        <button
          type="button"
          data-slot="sidebar-section-label"
          data-open={expanded || undefined}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setOpen(!open)}
          className={cn(
            headingClass,
            "cursor-pointer transition-[background-color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
            "hover:bg-nav-active",
            "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
          )}
        >
          {heading}
          <Chevron isOpen={expanded} />
        </button>
      ) : (
        // Not collapsible: a heading, not a button that does nothing.
        <span data-slot="sidebar-section-label" className={headingClass}>
          {heading}
        </span>
      )}

      <ul
        id={listId}
        data-slot="sidebar-sublist"
        hidden={!expanded}
        // NOT indented, and no padding or gap of its own: the sheet puts both
        // levels at the same 20px inset and stacks the rows flush, carrying
        // the hierarchy in type and colour. An indent would be a second,
        // redundant signal costing room on a narrow rail.
        className="flex list-none flex-col"
      >
        <InSection.Provider value={true}>{children}</InSection.Provider>
      </ul>
    </div>
  );
}

export interface SidebarItemProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  children: ReactNode;
  /**
   * Makes the row a link. WITHOUT it the row is a plain slot — the sheet puts
   * a search field and a progress bar in these.
   */
  href?: string;
  /**
   * Marks the current page. Sets aria-current, which is what is announced —
   * the fill alone conveys nothing (WCAG 1.4.1), and the rail's active fill
   * measures barely over 1:1 against it.
   */
  isCurrent?: boolean;
  /**
   * Unavailable. The row STAYS in the tab order and keeps its link role — it
   * is announced as disabled rather than hidden, because a row a screen-reader
   * user cannot reach is one they cannot be told the reason for. Navigation is
   * prevented on the click, not by quietly dropping the href, so nothing looks
   * like a link that silently does nothing.
   */
  isDisabled?: boolean;
  icon?: ReactElement;
  trailing?: ReactElement;
}

function SidebarItem({
  children,
  href,
  isCurrent = false,
  isDisabled = false,
  icon,
  trailing,
  className,
  ...rest
}: SidebarItemProps) {
  const inSection = useContext(InSection);
  const isLink = href !== undefined;
  const Row = isLink ? "a" : "div";

  const row = (
    <Row
      {...(href !== undefined ? { href } : {})}
      data-slot="sidebar-item"
      data-current={isCurrent || undefined}
      data-disabled={isDisabled || undefined}
      {...(isCurrent && !isDisabled ? { "aria-current": "page" as const } : {})}
      {...(isDisabled
        ? {
            "aria-disabled": true as const,
            // Keeps the link role and the tab stop, and stops the navigation.
            // NOT pointer-events-none, which would take the row out of
            // hit-testing and kill any tooltip explaining why it is off.
            onClick: (event: { preventDefault: () => void }) => event.preventDefault(),
          }
        : {})}
      className={cn(
        // The sheet's row: p-md (12+12) around a 16px line at leading-normal
        // (21.6px) measures 45.6 — its drawn 46. min-h-9 (36px) is a floor for
        // a caller who puts something shorter in the slot, and still clears
        // SC 2.5.8's 24px.
        "flex min-h-9 items-center justify-between gap-sm rounded-sm p-md",
        // Same 16px size as the section heading (see headingClass on why it is
        // body-lg and not the fluid title-sm); the levels differ by weight and
        // ink, since they share an inset.
        "text-body-lg font-body font-medium leading-normal tracking-tight no-underline",
        inSection ? "text-ink-nav-muted" : "text-ink-nav",
        isLink && [
          "cursor-pointer transition-[background-color,color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
          "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
        ],
        // Hover and current are gated on `not-[[data-disabled]]` so an
        // unavailable row cannot light up as if it were reachable.
        isLink && !isDisabled && [
          "hover:bg-nav-active hover:text-ink-nav",
          // The fill is barely visible, so weight and ink carry the state too.
          "data-[current]:bg-nav-active data-[current]:text-ink-nav-active data-[current]:font-bold",
        ],
        // The sheet draws this row in --ui-text-disabled. That is the page's
        // disabled ink, not the rail's, and it does not follow a brand that
        // re-skins its nav — so the rail gets its own step.
        isDisabled && "cursor-not-allowed text-ink-nav-disabled",
        className,
      )}
      {...(rest as HTMLAttributes<HTMLElement>)}
    >
      {isLink || icon || trailing ? (
        <>
          <span className="flex min-w-0 items-center gap-sm [&_svg]:size-4 [&_svg]:shrink-0">
            {icon}
            <span data-slot="sidebar-text" className="truncate">
              {children}
            </span>
          </span>
          {trailing}
        </>
      ) : (
        // A bare slot: a search field or a progress bar fills the row itself
        // rather than being squeezed beside a label it does not have.
        children
      )}
    </Row>
  );

  // `contents` so the <li> adds semantics without a box that would break the
  // row's own layout.
  return inSection ? <li className="contents">{row}</li> : row;
}

/** Flexible gap — the sheet's `Spacer`. Pushes what follows to the bottom. */
function SidebarSpacer() {
  return <div data-slot="sidebar-spacer" aria-hidden="true" className="flex-1" />;
}

/** The sheet's 16px chevron. Rotates rather than swapping glyphs. */
function Chevron({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      data-slot="sidebar-chevron"
      className={cn(
        "size-4 shrink-0 transition-transform duration-(--ui-duration-fast) ease-(--ui-ease-out)",
        isOpen ? "rotate-180" : "rotate-0",
      )}
    >
      <path
        d="M8 10.693c-.213 0-.427-.08-.59-.243L3.48 6.52l.707-.707L8 9.627l3.813-3.814.707.707-3.93 3.93a.83.83 0 0 1-.59.243Z"
        fill="currentColor"
      />
    </svg>
  );
}

export const Sidebar = Object.assign(SidebarNav, {
  Group: SidebarGroup,
  Section: SidebarSection,
  Item: SidebarItem,
  Spacer: SidebarSpacer,
});
