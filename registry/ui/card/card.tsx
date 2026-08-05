import { forwardRef, useId, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * The inset that makes a 24px-radius surface work — identical to Popover's,
 * and for the same reason: bare text sitting flush at the padding crowds the
 * corner arc, while a boxed child's own edge already reads as an edge.
 *
 * Header and Footer carry it so a consumer gets the alignment by composing.
 */
const UNBOXED_INSET = "px-sm";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

/**
 * A titled surface that groups related controls.
 *
 * Renders a `<section>`, so a card with a heading is navigable structure
 * rather than a styled `<div>`. It becomes a named region only when the
 * consumer supplies `aria-labelledby` — an unnamed `<section>` is generic, so
 * this adds no landmark noise to a page full of cards.
 *
 * The surface is deliberately the same as Popover's panel: radius-xl over a
 * radius-md boxed child plus p-lg is concentric (8 + 16 = 24), and a card and
 * a popover appearing on one screen should not disagree about what a surface
 * looks like.
 */
const CardRoot = forwardRef<HTMLElement, CardProps>(function Card(
  { children, className, ...rest },
  ref,
) {
  return (
    <section
      ref={ref}
      data-slot="card"
      className={cn(
        "flex w-full min-w-80 flex-col gap-lg rounded-xl p-lg",
        "bg-elevated border border-edge-subtle text-ink-primary shadow-md",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
});

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** The card's title. */
  children: ReactNode;
  /**
   * Slot: controls that act on the whole card — an Edit button, a delete
   * button. Never wrapped (§3), so each keeps its own accessible name.
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
  actions,
  headingLevel = 3,
  className,
  ...rest
}: CardHeaderProps) {
  const Heading = `h${headingLevel}` as const;
  const titleId = useId();

  return (
    <div
      data-slot="card-header"
      className={cn(UNBOXED_INSET, "flex items-center justify-between gap-sm", className)}
      {...rest}
    >
      <Heading
        id={titleId}
        data-slot="card-title"
        className="min-w-0 flex-1 truncate text-title-sm font-body font-bold leading-normal tracking-tight text-ink-primary"
      >
        {children}
      </Heading>
      {actions && (
        <div data-slot="card-actions" className="flex shrink-0 items-center gap-sm">
          {actions}
        </div>
      )}
    </div>
  );
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * The action row. `justify-between` is the sheet's layout — a dismissing
 * action left and a committing one right, never adjacent.
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
  Footer: CardFooter,
});
