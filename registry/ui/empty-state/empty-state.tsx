import { forwardRef, type HTMLAttributes, type ReactElement } from "react";

import { cn } from "@/lib/cn";

interface EmptyStateOwnProps {
  /**
   * Slot: the mark. The component owns the 32px well it sits on and sizes the
   * glyph to 16 — griddy renders `width="24"` as a presentation attribute, so
   * an unsized slot ships 24px whatever the sheet draws (§7).
   *
   * Decorative by contract: the well is `aria-hidden`, because everything the
   * icon means is already in the title. An icon that carries meaning the
   * sentence does not is a sentence that needs rewriting.
   */
  icon?: ReactElement;
  /**
   * What is not here, in the reader's terms. Required: an empty region with a
   * picture and no sentence is a shrug.
   */
  title: string;
  /** Why it is not here, and what would change that. */
  description?: string;
  /**
   * Slot: the recovery. A real Button from the call site, never wrapped (§3) —
   * so its variant, size and handler stay visible where they are written.
   */
  action?: ReactElement;
}

export interface EmptyStateProps
  extends EmptyStateOwnProps,
    Omit<HTMLAttributes<HTMLDivElement>, keyof EmptyStateOwnProps> {}

/**
 * The absence of content, explained.
 *
 * Three parts and a way out: a mark, a sentence saying what is missing, a
 * second saying why, and the control that fixes it. The sheet draws it inside
 * a Table's body, but nothing here knows about tables — it is the same block
 * for a filtered list, an empty inbox or a search with no results.
 *
 * It announces nothing on its own. An empty state that REPLACES content the
 * reader was just looking at needs a live region, and only the container knows
 * whether that happened: Table marks its own empty body `role="status"` for
 * exactly that reason, and a caller swapping this in on the page should do the
 * same.
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { icon, title, description, action, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-lg p-lg text-center",
        className,
      )}
      {...rest}
    >
      <div
        data-slot="empty-state-prompt"
        className="flex flex-col items-center justify-center gap-sm"
      >
        {icon ? (
          <span
            data-slot="empty-state-icon"
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              "bg-sunken text-ink-secondary",
              "[&_svg]:size-4 [&_svg]:shrink-0",
            )}
          >
            {icon}
          </span>
        ) : null}

        <p
          data-slot="empty-state-title"
          className="font-body text-label-md leading-normal font-medium text-ink-secondary"
        >
          {title}
        </p>

        {description ? (
          <p
            data-slot="empty-state-description"
            className={cn(
              // The DRAFT reached for `--ui-text-button-sm` here — a BUTTON
              // role on a line of prose — at `leading-flat`. Same 12px, but a
              // description wraps and a control label does not, so 100% leading
              // collides the moment the sentence is two lines long. `caption`
              // is the role for this, at the leading prose is set in. The
              // handoff sheet adopted this reading; see its Gaps section.
              "font-body text-caption leading-normal font-medium tracking-tight text-ink-muted",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>

      {action}
    </div>
  );
});
