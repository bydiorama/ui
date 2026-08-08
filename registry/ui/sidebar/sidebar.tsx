import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "griddy-icons";
import { useRender } from "@base-ui/react/use-render";

import { cn } from "@/lib/cn";
import { chromeControl } from "@/lib/chrome-control";
import { useControllableState } from "@/hooks/use-controllable-state";

/**
 * Rows inside a Section are list items; rows outside one are not.
 *
 * A Section IS a list of links, so `ul`/`li` is right there. A top-level row
 * may hold a search field or a progress bar, and calling those "list items"
 * would announce furniture as content.
 */
const InSection = createContext(false);

/**
 * Which secondary layer is showing, if any.
 *
 * The rail is TWO surfaces in one: the navigation, and a second layer reached
 * by pressing the profile row — "Profile Settings", with a brand switcher
 * under it. The sheet draws them as separate screens with a back button, not
 * as a flyout, so the second layer REPLACES the first in place. That is the
 * same shape as Calendar's month and year selects, and it is chosen for the
 * same reason: on the narrow screen this rail lives on, a panel over a panel
 * is two surfaces where the drawing has one.
 */
const LayerContext = createContext<{
  active: string | null;
  open: (id: string) => void;
  close: () => void;
}>({ active: null, open: () => {}, close: () => {} });

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
  /**
   * Which secondary layer is showing. `null` is the navigation itself.
   *
   * Controlled/uncontrolled through the shared hook (§4) rather than left to
   * each part, because the layer has to CLOSE from a back button that lives
   * inside it and open from a row that does not.
   */
  layer?: string | null;
  defaultLayer?: string | null;
  /** Always `onLayerChange(layer)` — never onOpen + onClose (§1). */
  onLayerChange?: (layer: string | null) => void;
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
  { children, label, isLabelHidden = true, layer, defaultLayer = null, onLayerChange, className, ...rest },
  ref,
) {
  const labelId = useId();
  const rail = useRef<HTMLElement | null>(null);
  const previous = useRef<string | null>(null);

  const [active, setActive] = useControllableState<string | null>({
    ...(layer !== undefined ? { value: layer } : {}),
    defaultValue: defaultLayer,
    ...(onLayerChange ? { onChange: onLayerChange } : {}),
  });

  const open = useCallback((id: string) => setActive(id), [setActive]);
  const close = useCallback(() => setActive(null), [setActive]);

  /**
   * Hand focus back to the row that opened the layer, AFTER the re-render.
   *
   * Not in `close()`: the profile row is unmounted while the layer is showing,
   * so focusing the remembered node there focuses a detached element and the
   * browser silently puts focus on <body> instead — which is exactly what the
   * test caught. The row is found again by the layer it opens, because the
   * node that comes back is a new one.
   */
  useEffect(() => {
    const closed = previous.current;
    previous.current = active;
    if (closed === null || active !== null) return;
    rail.current?.querySelector<HTMLElement>(`[data-opens-layer="${closed}"]`)?.focus();
  }, [active]);

  const layers = { active, open, close };

  return (
    <nav
      ref={(node) => {
        rail.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.RefObject<HTMLElement | null>).current = node;
      }}
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
        <LayerContext.Provider value={layers}>{children}</LayerContext.Provider>
      </div>
    </nav>
  );
});

export type SidebarMainProps = HTMLAttributes<HTMLDivElement>;

/**
 * The navigation itself — everything the rail shows at rest.
 *
 * It exists so the two-layer swap has exactly two participants to check, and
 * every other part stays ignorant of it. Without a wrapper, each row would
 * have to ask "is a layer open?" for itself, which is the kind of rule that
 * holds until someone adds the twelfth part.
 */
function SidebarMain({ className, ...rest }: SidebarMainProps) {
  const { active } = useContext(LayerContext);
  if (active !== null) return null;
  return <div data-slot="sidebar-main" className={cn("flex min-h-0 flex-1 flex-col", className)} {...rest} />;
}

export interface SidebarLayerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  children: ReactNode;
  /** Matched against the Sidebar's `layer`, and against Profile's `layer`. */
  id: string;
  /** The layer's own heading — "Profile Settings" in the sheet. */
  title: string;
  /**
   * The back control's accessible name. Required, and NOT defaulted to
   * "Back": a rail can hold more than one layer, and "Back" alone leaves a
   * screen-reader user to guess what they are returning to.
   */
  backLabel: string;
}

/** A secondary screen, replacing the navigation until its back button is used. */
function SidebarLayer({ children, id, title, backLabel, className, ...rest }: SidebarLayerProps) {
  const { active, close } = useContext(LayerContext);
  const backRef = useRef<HTMLButtonElement>(null);
  const hasRendered = useRef(false);
  const isActive = active === id;

  useEffect(() => {
    // Opening moves focus INTO the layer, or a keyboard user presses the
    // profile row and stays on a row that no longer exists.
    //
    // But only on an OPEN, never on the first render. A rail mounted with
    // `defaultLayer` already showing would otherwise pull focus out of the
    // page on load — the same class of rudeness as a menu that opens itself,
    // and visible in the visual baseline as a focus ring nobody asked for.
    if (isActive && hasRendered.current) backRef.current?.focus();
    hasRendered.current = true;
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      data-slot="sidebar-layer"
      data-layer={id}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      {...rest}
    >
      {/* The sheet's 56px `Button Slot` band, holding a 32px chrome control. */}
      <div data-slot="sidebar-layer-back" className="flex items-center px-sm py-md">
        <button ref={backRef} type="button" aria-label={backLabel} onClick={close} className={chromeControl()}>
          <ChevronLeft aria-hidden="true" />
        </button>
      </div>
      <p
        data-slot="sidebar-layer-title"
        className="flex min-h-9 items-center p-md text-body-lg font-body font-medium leading-normal tracking-tight text-ink-nav"
      >
        {/* Same `sidebar-text` slot every other labelled part uses, so the
            lane is one selector away for a test and for a consumer. */}
        <span data-slot="sidebar-text" className="truncate">
          {title}
        </span>
      </p>
      {children}
    </div>
  );
}

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
  /**
   * Slot: renders as this element instead of the default `<a>`/`<div>`.
   * Passed through, never wrapped (§3) — pass `render={<Link href={href} />}`
   * so an internal href gets `next/link`'s client-side transition instead of
   * a full document navigation. The row's own wiring (data-slot,
   * aria-current, the disabled invariant, its className) merges onto the
   * element rather than replacing what it already carries.
   */
  render?: ReactElement;
}

function SidebarItem({
  children,
  href,
  isCurrent = false,
  isDisabled = false,
  icon,
  trailing,
  render,
  className,
  onClick,
  ...rest
}: SidebarItemProps) {
  const inSection = useContext(InSection);
  const isLink = href !== undefined;

  const row = useRender({
    render,
    defaultTagName: isLink ? "a" : "div",
    props: {
      ...(rest as HTMLAttributes<HTMLElement>),
      ...(href !== undefined ? { href } : {}),
      "data-slot": "sidebar-item",
      "data-current": isCurrent || undefined,
      "data-disabled": isDisabled || undefined,
      ...(isCurrent && !isDisabled ? { "aria-current": "page" as const } : {}),
      ...(isDisabled ? { "aria-disabled": true as const } : {}),
      onClick:
        isDisabled
          ? ((event) => {
              // Non-navigation is an invariant rather than optional component
              // behaviour: a consumer handler cannot re-enable this link.
              event.preventDefault();
              onClick?.(event);
            }) as MouseEventHandler<HTMLElement>
          : onClick,
      className: cn(
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
      ),
      children:
        isLink || icon || trailing ? (
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
          // A bare slot: a search field or a progress bar fills the row
          // itself rather than being squeezed beside a label it does not have.
          children
        ),
    },
  });

  // `contents` so the <li> adds semantics without a box that would break the
  // row's own layout.
  return inSection ? <li className="contents">{row}</li> : row;
}

export interface SidebarProfileProps extends Omit<HTMLAttributes<HTMLButtonElement>, "children"> {
  /** The person's name. 16px/600 in primary nav ink, clamped to one line. */
  name: string;
  /**
   * Their address, beneath the name.
   *
   * The sheet draws it in `--ui-text-disabled`, which measures 2.14:1 in light
   * and 2.51:1 in dark. An address is CONTENT, not a disabled control, so
   * WCAG's disabled exemption does not apply — it ships as `text-ink-muted`
   * (5.93 / 4.94) and the sheet is corrected.
   */
  email?: string;
  /** Slot: an Avatar. 32px, and never wrapped (§3). */
  avatar?: ReactElement;
  /**
   * The layer this row opens. Without it the row is a plain button and the
   * caller wires `onClick` themselves.
   */
  layer?: string;
}

/**
 * The person, and the way into the second layer.
 *
 * A real `<button>` rather than a row with a click handler: it opens a screen,
 * which is an action, and the trailing chevron is the affordance the sheet
 * draws for it. `aria-expanded` would be wrong here — nothing expands; the
 * rail REPLACES its contents, so this is navigation between two screens.
 */
const SidebarProfile = forwardRef<HTMLButtonElement, SidebarProfileProps>(function SidebarProfile(
  { name, email, avatar, layer, className, onClick, ...rest },
  ref,
) {
  const { open } = useContext(LayerContext);

  return (
    <div className="px-sm py-xs">
      <button
        ref={ref}
        type="button"
        data-slot="sidebar-profile"
        // How the rail finds this row again after the layer closes. The row is
        // unmounted while the layer shows, so a remembered NODE would be
        // detached by then — see the effect in the root.
        {...(layer !== undefined ? { "data-opens-layer": layer } : {})}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || layer === undefined) return;
          open(layer);
        }}
        className={cn(
          "flex w-full items-center gap-sm rounded-sm p-xs text-left",
          "cursor-pointer transition-[background-color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
          "hover:bg-nav-active",
          "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
          className,
        )}
        {...rest}
      >
        {avatar && (
          <span data-slot="sidebar-profile-avatar" className="flex size-8 shrink-0 items-center">
            {avatar}
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-xs">
          <span data-slot="sidebar-profile-name" className="truncate text-body-lg font-body font-bold leading-normal tracking-tight text-ink-nav">
            {name}
          </span>
          {email && (
            <span data-slot="sidebar-profile-email" className="truncate text-button-sm font-body font-medium leading-flat tracking-tight text-ink-muted">
              {email}
            </span>
          )}
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-ink-nav-muted" />
      </button>
    </div>
  );
});

export interface SidebarSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /**
   * Required — it is the accessible name, and it is VISUALLY HIDDEN by
   * default because the sheet draws a placeholder and no label. A placeholder
   * is not a label (§10): it disappears the moment anything is typed.
   */
  label: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * The rail's search field.
 *
 * Its own control, not Input's: the sheet draws 40px tall at radius-sm with a
 * 1px edge, where Input's field is 48px at radius-md with 1.5px. A rail is a
 * denser surface than a form, and forcing Input's geometry in here would make
 * the row taller than every nav row beside it.
 */
function SidebarSearch({ label, className, placeholder = "Search", ref, ...rest }: SidebarSearchProps) {
  const id = useId();
  return (
    // px-xs, not px-sm. The field carries its own px-sm, so the BOX sits 8px
    // inside the lane and its placeholder lands exactly on it — measured at
    // worldX -813 in the sheet, the same lane as every row label.
    <div className="px-xs py-md">
      <div
        data-slot="sidebar-search"
        className={cn(
          "flex h-10 items-center gap-sm rounded-sm px-sm py-xs",
          // An OUTLINE for the resting edge, not a border — and the sheet
          // draws it that way for a reason that only shows up when you
          // measure. A border takes layout space, so the input's text lands
          // 1px inside the 20px lane every other label in the rail sits on.
          // An outline costs nothing, and the field's own px-sm then puts the
          // placeholder exactly on it.
          "bg-base outline outline-edge-subtle",
          "transition-[outline-color,box-shadow] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
          // The WRAPPER draws the ring, so the input inside can safely carry
          // outline-none — the one place that is safe (§6).
          "focus-within:outline-edge-focus focus-within:shadow-(--ui-focus-ring)",
          "focus-within:forced-colors:outline focus-within:forced-colors:outline-2",
          className,
        )}
      >
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          type="search"
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none",
            "text-body-md font-body font-medium text-ink-nav",
            "placeholder:text-ink-placeholder",
          )}
          {...rest}
        />
        {/* The sheet boxes the glyph in 4px of its own (node LFN-0), which is
            what sets the field's right inset — without it the icon sits 4px
            closer to the edge than drawn. TRAILING, as the sheet orders its
            children: text first, then the glyph. */}
        <span className="flex shrink-0 items-center p-[4px] text-ink-nav-muted">
          <Search aria-hidden="true" className="size-4 shrink-0" />
        </span>
      </div>
    </div>
  );
}

export type SidebarSlotProps = HTMLAttributes<HTMLDivElement>;

/**
 * A row that holds a CONTROL rather than a label — a Button, an Input, a
 * Progress bar. The sheet fills several rows this way.
 *
 * It is the row's inset and nothing else: no icon, no trailing, no link
 * behaviour, so whatever goes in keeps its own semantics and its own focus
 * ring instead of competing with the row's.
 */
function SidebarSlot({ className, ...rest }: SidebarSlotProps) {
  // px-xs so a boxed control — a Button, an Input — sits on the same box lane
  // as the search field, 8px inside the text lane the labels use.
  return <div data-slot="sidebar-slot" className={cn("flex flex-col px-xs py-xs", className)} {...rest} />;
}

export type SidebarHeadingProps = HTMLAttributes<HTMLParagraphElement>;

/**
 * A standalone group label — the sheet's "Select brand".
 *
 * Drawn in `--ui-text-disabled` (2.14:1); ships as `text-ink-nav-muted`
 * (10.66 / 6.97), which is the rail's own muted step and follows a brand that
 * re-skins its nav. Corrected in Paper.
 */
function SidebarHeading({ children, className, ...rest }: SidebarHeadingProps) {
  return (
    <p
      data-slot="sidebar-heading"
      className={cn(
        "flex p-md text-button-sm font-body font-bold leading-flat tracking-tight text-ink-nav-muted",
        className,
      )}
      {...rest}
    >
      <span data-slot="sidebar-text" className="truncate">
        {children}
      </span>
    </p>
  );
}

/** Flexible gap — the sheet's `Spacer`. Pushes what follows to the bottom. */
function SidebarSpacer() {
  return <div data-slot="sidebar-spacer" aria-hidden="true" className="flex-1" />;
}

/** The sheet's 16px chevron. Rotates rather than swapping glyphs. */
function Chevron({ isOpen }: { isOpen: boolean }) {
  return (
    <ChevronDown
      size={16}
      aria-hidden="true"
      data-slot="sidebar-chevron"
      className={cn(
        "size-4 shrink-0 transition-transform duration-(--ui-duration-fast) ease-(--ui-ease-out)",
        isOpen ? "rotate-180" : "rotate-0",
      )}
    />
  );
}

export const Sidebar = Object.assign(SidebarNav, {
  Main: SidebarMain,
  Layer: SidebarLayer,
  Group: SidebarGroup,
  Profile: SidebarProfile,
  Search: SidebarSearch,
  Slot: SidebarSlot,
  Heading: SidebarHeading,
  Section: SidebarSection,
  Item: SidebarItem,
  Spacer: SidebarSpacer,
});
