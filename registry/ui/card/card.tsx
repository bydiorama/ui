import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useLayoutEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { ChevronDown } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { useControllableState } from "@/hooks/use-controllable-state";
import { useScrollEdges } from "@/hooks/use-scroll-edges";
import { Button } from "@/ui/button";
import { Fade } from "@/ui/fade";

/**
 * The inset that makes a 16px-radius surface work — identical to Popover's,
 * and for the same reason: bare text sitting flush at the padding crowds the
 * corner arc, while a boxed child's own edge already reads as an edge.
 *
 * Header and Footer carry it so a consumer gets the alignment by composing.
 */
const UNBOXED_INSET = "px-sm";

/**
 * How the surface separates from the page. `raised` is the hairline plus
 * shadow-md; `outlined` is the hairline alone — for houses whose rule is "a
 * surface takes a border OR a shadow, never both" (issue #10). The edge stays
 * in both: the fill alone is 1.11:1 against the page.
 */
export type CardSurface = "raised" | "outlined";

const SURFACE: Record<CardSurface, string> = {
  raised: "shadow-md",
  outlined: "shadow-none",
};

interface CardContextValue {
  bodyId: string;
  subtitleId: string;
  titleId: string;
  isCollapsible: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setHasSubtitle: (hasSubtitle: boolean) => void;
}

const CardContext = createContext<CardContextValue | null>(null);

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** @default "raised" */
  surface?: CardSurface | undefined;
  /**
   * Makes `Card.Body` a disclosure the header toggles (CONVENTIONS §3's
   * `boolean | {…}` shape). The trigger is a ghost chevron button placed LAST
   * in the header's actions; the footer stays visible when collapsed.
   */
  collapsible?: boolean | { defaultIsOpen?: boolean } | undefined;
  /** Controlled open state. Only meaningful with `collapsible`. */
  isOpen?: boolean | undefined;
  onOpenChange?: ((isOpen: boolean) => void) | undefined;
}

/**
 * A titled surface that groups related controls.
 *
 * Renders a `<section>`, so a card with a heading is navigable structure
 * rather than a styled `<div>`. It becomes a named region only when the
 * consumer supplies `aria-labelledby` — an unnamed `<section>` is generic, so
 * this adds no landmark noise to a page full of cards.
 *
 * The surface is deliberately the same as Popover's panel — radius-lg, p-lg,
 * the hairline and shadow-md — because a card and a popover appearing on one
 * screen should not disagree about what a surface looks like. radius-lg over
 * a radius-md boxed child at p-lg is not concentric (16 ≠ 8 + 16); the
 * 2026-10-29 owner review accepted that for the flatter corner (issue #40).
 *
 * No minimum width: Card is in flow, so its container decides its width. The
 * old min-w-80 overflowed narrow chat columns and `minmax(280px, 1fr)` grids
 * (issue #10); a caller that wants the floor adds `min-w-80` itself.
 */
const CardRoot = forwardRef<HTMLElement, CardProps>(function Card(
  { children, surface = "raised", collapsible, isOpen: isOpenProp, onOpenChange, className, ...rest },
  ref,
) {
  const bodyId = useId();
  const subtitleId = useId();
  const titleId = useId();
  const [hasSubtitle, setHasSubtitle] = useState(false);
  const defaultIsOpen = typeof collapsible === "object" ? (collapsible.defaultIsOpen ?? true) : true;
  const [isOpen, setIsOpen] = useControllableState({
    value: isOpenProp,
    defaultValue: defaultIsOpen,
    onChange: onOpenChange,
  });
  const isCollapsible = Boolean(collapsible);

  return (
    <CardContext.Provider
      value={{
        bodyId,
        subtitleId,
        titleId,
        isCollapsible,
        isOpen: isCollapsible ? isOpen : true,
        setIsOpen,
        setHasSubtitle,
      }}
    >
      <section
        ref={ref}
        data-slot="card"
        data-surface={surface}
        data-open={isCollapsible ? (isOpen ? "" : undefined) : undefined}
        // The subtitle describes the region; a consumer's own wins.
        aria-describedby={hasSubtitle ? subtitleId : undefined}
        className={cn(
          "flex w-full flex-col gap-lg rounded-lg p-lg",
          "bg-elevated border border-edge-subtle text-ink-primary",
          SURFACE[surface],
          className,
        )}
        {...rest}
      >
        {children}
      </section>
    </CardContext.Provider>
  );
});

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** The card's title. */
  children: ReactNode;
  /**
   * A line under the title — who shared it, when it changed. Rendered as a
   * `<p>` OUTSIDE the heading, so the heading's accessible name stays the
   * title, and wired to the card with `aria-describedby`.
   */
  subtitle?: ReactNode;
  /**
   * Slot: controls that act on the whole card — an Edit button, a delete
   * button. Never wrapped (§3), so each keeps its own accessible name. On a
   * collapsible card the disclosure trigger follows them.
   */
  actions?: ReactNode;
  /**
   * The heading level. A card nested in a page section is rarely an `<h2>`,
   * and a wrong level is worse than a plain one — this is a prop rather than a
   * guess because only the page knows its own outline.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

function CardHeader({
  children,
  subtitle,
  actions,
  headingLevel = 3,
  className,
  ...rest
}: CardHeaderProps) {
  const Heading = `h${headingLevel}` as const;
  const card = useContext(CardContext);
  const fallbackTitleId = useId();
  const fallbackSubtitleId = useId();
  const titleId = card?.titleId ?? fallbackTitleId;
  const subtitleId = card?.subtitleId ?? fallbackSubtitleId;
  const hasSubtitle = subtitle !== undefined && subtitle !== null && subtitle !== false;

  // Tell the root whether to point aria-describedby at the subtitle: a
  // reference to an id that is not on the page is a broken description.
  const setHasSubtitle = card?.setHasSubtitle;
  useLayoutEffect(() => {
    setHasSubtitle?.(hasSubtitle);
    return () => setHasSubtitle?.(false);
  }, [setHasSubtitle, hasSubtitle]);

  const trigger = card?.isCollapsible ? (
    // Accordion's disclosure: a chevron only, the title is not the hit
    // target. Named BY the title, so no "Show details" string has to be a
    // prop; aria-expanded carries the state.
    <Button
      variant="ghost"
      size="md"
      isIconOnly
      // Button's type requires a label on an icon-only button; the empty
      // one is overridden by aria-labelledby, which wins in the name
      // computation (accname §2B before §2C).
      aria-label=""
      aria-labelledby={titleId}
      aria-expanded={card.isOpen}
      aria-controls={card.bodyId}
      data-slot="card-trigger"
      onClick={() => card.setIsOpen(!card.isOpen)}
      icon={
        <ChevronDown
          aria-hidden="true"
          className={cn(
            // `rotate`, not `transform` — see Accordion's identical note.
            "transition-[rotate]", motionMicro,
            card.isOpen && "rotate-180",
          )}
        />
      }
    />
  ) : null;

  return (
    <div
      data-slot="card-header"
      className={cn(
        UNBOXED_INSET,
        "flex justify-between gap-sm",
        // With a subtitle the actions align to the title's line, not to the
        // middle of the two-line block.
        hasSubtitle ? "items-start" : "items-center",
        className,
      )}
      {...rest}
    >
      <div
        data-slot="card-heading"
        className={cn("flex min-w-0 flex-1 flex-col gap-xs", hasSubtitle && "pt-xs")}
      >
        <Heading
          id={titleId}
          data-slot="card-title"
          className="min-w-0 truncate text-title-sm font-body text-ink-primary"
        >
          {children}
        </Heading>
        {hasSubtitle && (
          <p id={subtitleId} data-slot="card-subtitle" className="text-body-sm font-body text-ink-muted">
            {subtitle}
          </p>
        )}
      </div>
      {(actions || trigger) && (
        <div data-slot="card-actions" className="flex shrink-0 items-center gap-sm">
          {actions}
          {trigger}
        </div>
      )}
    </div>
  );
}

export type CardBodyProps = HTMLAttributes<HTMLDivElement>;

/**
 * The region between header and footer. Optional for a short card — boxed
 * children can sit directly in Card — and what `collapsible` collapses.
 *
 * Cap its height (`className="max-h-60"`) and it scrolls, dissolving into the
 * card under a bottom Fade while there is more below. That is how this system
 * separates long content from the footer: no ruled divider (#10, decided in
 * review — the footer-divider ask is answered by the Fade).
 */
function CardBody({ children, className, ...rest }: CardBodyProps) {
  const card = useContext(CardContext);
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const isOpen = card?.isOpen ?? true;
  const edges = useScrollEdges(node);

  /**
   * A tab stop ONLY while it actually scrolls — Sheet.Body's and Table's
   * rule. A capped body of static text has no focusable child to scroll it
   * into view, so without this the content past the cap is unreachable from
   * the keyboard (SC 2.1.1). Unconditional focus would put a silent tab stop
   * in every card that fits. Found on CI: Linux fonts set the States story
   * a few pixels taller than macOS, and only there did the body overflow.
   */
  const isScrollable = edges.top || edges.bottom;

  return (
    <div
      id={card?.bodyId}
      data-slot="card-body"
      // Kept in the DOM while collapsed, so aria-controls always resolves.
      hidden={!isOpen}
      className={cn("relative flex min-h-0 flex-col overflow-clip", className)}
      {...rest}
    >
      <div
        ref={setNode}
        data-slot="card-body-scroll"
        data-scrollable={isScrollable || undefined}
        // role / name / tabIndex together or not at all, as in Sheet.Body.
        // Named by the card's title; a Card with no Header has no title to
        // point at, and still gets the tab stop, which is the part SC 2.1.1
        // needs.
        {...(isScrollable
          ? { tabIndex: 0, ...(card ? { role: "region", "aria-labelledby": card.titleId } : {}) }
          : {})}
        // `max-h-[inherit]`: the caller caps the region, the scroller takes
        // that cap — one height for the consumer to set, not two.
        // Children never shrink: in a capped column a flex child would
        // otherwise squash to fit instead of overflowing into the scroll.
        // The focus outline is INSET: the body is clipped by its own
        // overflow-clip wrapper, which would cut an outward ring.
        className={cn(
          "flex max-h-[inherit] min-h-0 flex-col gap-lg overflow-y-auto *:shrink-0",
          "focus-visible:outline-focus focus-visible:-outline-offset-focus focus-visible:outline-edge-focus",
        )}
      >
        {children}
      </div>
      {/* Bound to the scroller itself: the fade eases out over the last
          48px of scroll as the final rows arrive, and stays off a classic
          scrollbar instead of veiling its track. */}
      <Fade side="bottom" size="md" ground="elevated" scrollContainer={node} />
    </div>
  );
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * The action row. `justify-between` is the sheet's layout — a dismissing
 * action left and a committing one right, never adjacent. It stays visible
 * when a collapsible card is closed.
 */
function CardFooter({ className, ...rest }: CardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center justify-between gap-md p-sm", className)}
      {...rest}
    />
  );
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
