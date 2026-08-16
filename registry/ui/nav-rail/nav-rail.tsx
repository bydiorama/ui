import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type HTMLAttributes,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
} from "react";
import { useRender } from "@base-ui/react/use-render";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";

/** Rows inside a Section are list items; rows outside one are not. */
const InSection = createContext(false);

export interface NavRailProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children: ReactNode;
  /**
   * Required, and — unlike Sidebar's — it can never be shown. There is no room
   * for a heading at 48px, so the prop exists purely to name the landmark and
   * there is deliberately no `isLabelHidden` escape hatch to get that wrong
   * with.
   */
  label: string;
}

/**
 * The navigation rail at its narrow width: one icon per row, 48px wide.
 *
 * A SIBLING of Sidebar, not a mode of it, and the anatomy is why. Six of
 * Sidebar's ten parts change what they MEAN at this width rather than what
 * they measure: Search is a 40px field with a placeholder and has to become a
 * control, Profile is an avatar with a name, an address and a chevron and has
 * to become an avatar, Heading and Slot have nowhere to put a Progress bar or
 * the words "Select brand", and a Section's label-plus-chevron disclosure has
 * no room for either. CONVENTIONS §7a already splits Sheet from Drawer on
 * exactly this test — when the CONTRACT differs rather than the appearance,
 * it is a different component (ADR 0015).
 *
 * The one-line version of the difference: **at full width a row is a slot; at
 * rail width a row is a control.** Sidebar.Item takes an optional href and
 * renders a `<div>` without one, because the design fills two of its rows with
 * a search field and a progress bar. Nothing like that fits in a 32px square,
 * so a NavRail row is an `<a>` when it navigates and a `<button>` when it acts,
 * and never a container.
 *
 * What the two DO share is the `--ui-nav-*` family and the row rhythm, so a
 * layout can swap one for the other without the navigation changing colour.
 * Neither knows about the other: which one renders is the caller's decision,
 * exactly as it already was between Sidebar and Header.MenuButton.
 */
const NavRailRoot = forwardRef<HTMLElement, NavRailProps>(function NavRail(
  { children, label, className, ...rest },
  ref,
) {
  const labelId = useId();

  return (
    <nav
      ref={ref}
      aria-labelledby={labelId}
      data-slot="nav-rail"
      className={cn(
        // w-nav-rail is --ui-nav-rail-width, and 3rem is MEASURED rather than
        // chosen: the artboard declares no width, it is fit-content around
        // space-sm padding on the shared 32px chrome control. 8 + 32 + 8 = 48.
        "flex w-nav-rail flex-col overflow-clip rounded-lg",
        "bg-nav text-ink-nav",
        className,
      )}
      {...rest}
    >
      {/*
        OUTSIDE the body, where Sidebar puts its own label inside one.
        `sr-only` is `position: absolute`, so this span is out of FLOW — but a
        structural pseudo-class counts DOM position regardless, which made
        every Section `:nth-child(2)` and `first:border-t-0` match nothing. The
        divider it suppresses is the only thing telling a group apart from the
        one above it, so the bug was silent and visible at the same time.

        Sidebar can keep its label in the body because it has no rule to
        suppress, and it NEEDS to: the 8 there plus the row's 12 is its text
        inset. This rail's label is never shown at any width, so it has no
        inset to belong to.
      */}
      <span id={labelId} data-slot="nav-rail-label" className="sr-only">
        {label}
      </span>
      {/*
        p-sm here is the same 8px Sidebar's body carries, which is what makes
        the two rails interchangeable in a layout: the row box lands on the
        same lane in both.

        The gap is also what GROUPS the rows, which is why it is `md` here and
        `xs` inside a Section. This shipped with a hairline between sections
        and that was wrong: a rule inside a 48px control is clutter, and this
        library had already said so once — Menu.Separator is "SPACE, not a
        rule — 8px above and below, and nothing painted". Space groups; lines
        decorate.

        A gap at all would be wrong in Sidebar, where rows carry 12px of their
        own padding and a second spacing system would compete with it. A rail
        row is a bare 32px square, so the gap is the only rhythm there is.
      */}
      <div data-slot="nav-rail-body" className="flex min-h-0 flex-1 flex-col gap-md p-sm">
        {children}
      </div>
    </nav>
  );
});

export interface NavRailItemProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "title"> {
  /**
   * REQUIRED, and required because the label is invisible. A row with no glyph
   * at this width is a blank square — there is no text to fall back to, which
   * is the whole reason both this and `label` are types rather than doc notes.
   */
  icon: ReactElement;
  /**
   * The accessible name, and the only name this row has. Rendered as
   * `aria-label` and as `title`, so a pointer user gets the platform's own
   * tooltip; see knownGaps for why that is a placeholder rather than an answer.
   */
  label: string;
  /** Makes the row a link. Without it the row is a button — an action. */
  href?: string;
  /**
   * Marks the current page. Sets aria-current AND draws the marker: at this
   * width there is no weight or ink change available to carry the state the
   * way Sidebar's 16px label does, so the fill would be doing it alone — and
   * the fill is the same one hover paints.
   */
  isCurrent?: boolean;
  /**
   * Unavailable. Stays in the tab order and keeps its role, announced as
   * disabled — Sidebar's rule, for Sidebar's reason: a row a screen-reader
   * user cannot reach is one they cannot be told the reason for.
   */
  isDisabled?: boolean;
  /** Slot: renders as this element instead of the default `<a>`/`<button>`. */
  render?: ReactElement;
}

function NavRailItem({
  icon,
  label,
  href,
  isCurrent = false,
  isDisabled = false,
  render,
  className,
  onClick,
  ...rest
}: NavRailItemProps) {
  const inSection = useContext(InSection);
  const isLink = href !== undefined;

  const row = useRender({
    render,
    defaultTagName: isLink ? "a" : "button",
    props: {
      ...(rest as HTMLAttributes<HTMLElement>),
      ...(isLink ? { href } : { type: "button" as const }),
      "aria-label": label,
      title: label,
      "data-slot": "nav-rail-item",
      "data-current": isCurrent || undefined,
      "data-disabled": isDisabled || undefined,
      ...(isCurrent && !isDisabled ? { "aria-current": "page" as const } : {}),
      ...(isDisabled ? { "aria-disabled": true as const } : {}),
      onClick: isDisabled
        ? ((event) => {
            // The same invariant Sidebar holds: non-navigation is the
            // component's, not something a consumer handler can re-enable.
            event.preventDefault();
            onClick?.(event);
          }) as MouseEventHandler<HTMLElement>
        : onClick,
      className: cn(
        // The shared chrome control's geometry — 32px square, radius-md, a
        // 16px glyph — and none of its colour. `relative` is for the marker.
        "relative flex size-8 shrink-0 items-center justify-center rounded-md",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        "text-ink-nav-muted",
        "transition-[background-color,color]", motionMicro,
        // Three fills, and they have to be three. This shipped with hover and
        // current painting the SAME square and a 2px bar down the leading edge
        // telling them apart — a rule inside a control, which reads as clutter
        // and is exactly what Menu.Separator's "SPACE, not a rule" already
        // ruled out. The missing channel was depth, so `--ui-nav-hover-bg` was
        // added to the family rather than a marker to the row.
        !isDisabled && [
          "cursor-pointer",
          // Fill only, in both states — the ink does not move. Sidebar took
          // the same step on 2026-08-10 and the two have to stay
          // interchangeable, which is the whole reason they share a token
          // family. On a 48px rail there is no label to change weight, so the
          // ink was the only other channel and it was spending itself to say
          // something the fill already said.
          "not-data-[current]:hover:bg-nav-hover",
          "data-[current]:bg-nav-active",
        ],
        isDisabled && "cursor-not-allowed text-ink-nav-disabled",
        "focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none",
        "focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2",
        className,
      ),
      children: icon,
    },
  });

  // `contents` so the <li> adds semantics without a box that would break the
  // row's own layout — Sidebar's trick, for the same reason.
  return inSection ? <li className="contents">{row}</li> : row;
}

export interface NavRailSectionProps extends Omit<HTMLAttributes<HTMLUListElement>, "title"> {
  children: ReactNode;
  /**
   * Required, and always invisible. This is where Sidebar's first level GOES:
   * a primary label with a chevron cannot exist at 48px, so the group keeps
   * its name for assistive tech and shows a hairline instead. The two-level
   * tree does not survive the width — the second level becomes the only level,
   * and the first becomes a named group.
   */
  label: string;
}

/** A named group of rows, separated from the one above by a hairline. */
function NavRailSection({ children, label, className, ...rest }: NavRailSectionProps) {
  return (
    <ul
      aria-label={label}
      data-slot="nav-rail-section"
      // gap-xs INSIDE, against the body's gap-md between: the grouping is
      // carried by the difference between the two, and by nothing painted.
      // No rule, no `first:` special case, and no positional selector to get
      // wrong — which is what the hairline version needed and mis-set, because
      // `sr-only` is out of flow but still counts as `:first-child`.
      className={cn("flex list-none flex-col gap-xs", className)}
      {...rest}
    >
      <InSection.Provider value={true}>{children}</InSection.Provider>
    </ul>
  );
}

export type NavRailSlotProps = HTMLAttributes<HTMLDivElement>;

/**
 * A row holding a CONTROL the caller supplies — the expand toggle that swaps
 * the rail for a Sidebar, an Avatar that opens the account menu.
 *
 * It is the row's box and nothing else: no role, no tab stop, no name of its
 * own, so whatever goes in keeps its semantics and its focus ring. This is
 * where `@/lib/chrome-control` belongs — a 32px chrome control drops in at
 * exactly the row's size, because that is the size the row was built from.
 */
function NavRailSlot({ className, ...rest }: NavRailSlotProps) {
  return (
    <div
      data-slot="nav-rail-slot"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...rest}
    />
  );
}

/** Flexible gap. Pushes what follows to the bottom of the rail. */
function NavRailSpacer() {
  return <div data-slot="nav-rail-spacer" aria-hidden="true" className="flex-1" />;
}

export const NavRail = Object.assign(NavRailRoot, {
  Section: NavRailSection,
  Item: NavRailItem,
  Slot: NavRailSlot,
  Spacer: NavRailSpacer,
});
