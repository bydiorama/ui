"use client";

import { createContext, forwardRef, useContext, type ReactElement, type ReactNode } from "react";
import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { ChevronDown } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro, motionStandard } from "@/lib/motion";

export type AccordionVariant = "plain" | "card";
/** The heading level the trigger's <h*> renders at. No default is guessed. */
export type AccordionHeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * Variant geometry, transcribed from the approved design.
 *
 * `plain` is the bare disclosure list; `card` gives each item its own raised
 * tile. Only the ITEM differs between them — header, trigger and panel are
 * identical in both, which is why the variant travels by context rather than
 * being threaded through every part.
 *
 * `py-sm` rather than `py-xs`: with 8px here the card's inset reads **20px on
 * all four sides** — 8 + the trigger's `p-md` at the top, 8 + the panel
 * inner's `p-md` at the bottom, and the same 8 + 12 horizontally from the
 * header's and the panel's own `px-sm`. At `py-xs` the vertical inset was 16
 * against a horizontal 20, which is the asymmetry the review found.
 *
 * The HOVER fill lives here, on the tile, and not on the trigger — the card
 * is one object and a fill inset inside it reads as a second, smaller card.
 * It is driven by `:has()` off the TRIGGER's hover rather than the item's own,
 * so an open panel holding form controls does not tint the tile when the
 * pointer is in a text field. `data-disabled` is the item's own attribute
 * (the behaviour layer sets it alongside the trigger's `aria-disabled`), so
 * the guard needs no attribute-value match.
 */
const ITEM_VARIANT = {
  plain: "",
  card: cn(
    "rounded-md bg-elevated py-sm",
    "transition-[background-color]",
    motionMicro,
    "not-data-disabled:has-[[data-slot=accordion-trigger]:hover]:bg-hover",
  ),
} as const satisfies Record<AccordionVariant, string>;

interface AccordionContextValue {
  variant: AccordionVariant;
  headingLevel: AccordionHeadingLevel;
}

const AccordionContext = createContext<AccordionContextValue>({
  variant: "plain",
  headingLevel: 3,
});

export interface AccordionProps {
  children: ReactNode;
  className?: string;
  variant?: AccordionVariant;
  /**
   * The heading level each trigger renders at. A prop with no clever default,
   * for the same reason Card's is: the right level depends on what surrounds
   * the accordion, and a component cannot see that. 3 is the common case, not
   * a guess about yours.
   */
  headingLevel?: AccordionHeadingLevel;
  /**
   * Open item values. An ARRAY in both modes, including single — restated
   * here rather than re-exported, because no behaviour-layer type may appear
   * in a public signature (§9). In single mode it holds at most one value.
   */
  value?: string[];
  defaultValue?: string[];
  /** Fires with the full open set, never with the event object. */
  onValueChange?: (value: string[]) => void;
  /**
   * Allow more than one panel open at once. Off by default, which is what the
   * sheet draws and what the behaviour layer defaults to.
   */
  isMultiple?: boolean;
  isDisabled?: boolean;
}

/**
 * A list of disclosures.
 *
 * Built on the Base UI accordion (ADR 0012) — and unusually, the DESIGN was
 * drawn against that anatomy too: the sheet's layers are named "Accordion
 * Root", "Accordion Item", "Accordion Header", "Accordion Trigger",
 * "Accordion Panel" and "Accordion Panel Inner Container". The DOM here is
 * that structure one-for-one, so a value on the sheet has exactly one place
 * to land.
 *
 * The platform's `<details>`/`<summary>` was the alternative and does a real
 * share of this job — toggle, keyboard, and single-open via `name`. Four
 * things decided it (§9), and NOT the one that first looked obvious:
 *
 *  - `<summary>` is not a button. Its ARIA mapping is inconsistent across
 *    screen readers, and the sheet's row is a heading CONTAINING a control,
 *    which is the shape the accordion pattern asks for.
 *  - The panel's height has to animate, and Base UI publishes the measurement
 *    (`--accordion-panel-height`). Doing it natively needs
 *    `::details-content` plus `interpolate-size`, which is one engine today.
 *  - Controlled/uncontrolled with a single/multiple switch, against `name`,
 *    which is markup-level and cannot be driven from state.
 *  - `hiddenUntilFound`, so find-in-page can open a closed panel.
 *
 * What it does NOT buy is arrow-key navigation between headers. That was the
 * first reason written down here and it was wrong: `loopFocus` is accepted as
 * a prop but no key handler exists in the accordion, verified in the source
 * and then in the browser — Tab moves between triggers, arrows do nothing.
 * Arrow keys are OPTIONAL in the APG accordion pattern, so this conforms; it
 * is recorded in the doc rather than papered over.
 */
function AccordionRoot({
  children,
  className,
  variant = "plain",
  headingLevel = 3,
  value,
  defaultValue,
  onValueChange,
  isMultiple = false,
  isDisabled = false,
}: AccordionProps) {
  return (
    <AccordionContext.Provider value={{ variant, headingLevel }}>
      <BaseAccordion.Root
        data-slot="accordion"
        data-variant={variant}
        className={cn("flex w-full flex-col gap-xs", className)}
        multiple={isMultiple}
        disabled={isDisabled}
        {...(value !== undefined && { value })}
        {...(defaultValue !== undefined && { defaultValue })}
        // The behaviour layer hands back (value, eventDetails). Only the first
        // is ours to promise — forwarding the callback whole would put a
        // Base UI type in a public signature, which check:boundaries refuses.
        {...(onValueChange && { onValueChange: (next: string[]) => onValueChange(next) })}
      >
        {children}
      </BaseAccordion.Root>
    </AccordionContext.Provider>
  );
}

export interface AccordionItemProps {
  children: ReactNode;
  className?: string;
  /** Identifies the item in `value`. Defaults to its index if omitted. */
  value?: string;
  isDisabled?: boolean;
}

const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { children, className, value, isDisabled = false },
  ref,
) {
  const { variant } = useContext(AccordionContext);
  return (
    <BaseAccordion.Item
      ref={ref}
      data-slot="accordion-item"
      className={cn("flex w-full flex-col", ITEM_VARIANT[variant], className)}
      disabled={isDisabled}
      {...(value !== undefined && { value })}
    >
      {children}
    </BaseAccordion.Item>
  );
});

export interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
  /**
   * Slot: the leading mark. The sheet puts an icon here in two of its three
   * rows and a numbered step badge in the third — so this takes an ELEMENT
   * and is never wrapped (§3). The component only reserves the 16px lane.
   */
  icon?: ReactElement;
}

/**
 * The heading and its button, together.
 *
 * Base UI wants `<Header><Trigger/></Header>` and both appear on the sheet;
 * they are rendered as one part here because the header carries nothing of
 * its own — it is the heading element the trigger has to sit inside for the
 * accordion to be navigable structure rather than a stack of buttons. Both
 * `data-slot`s are present, so the DOM still matches the sheet layer for
 * layer.
 */
const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  function AccordionTrigger({ children, className, icon }, ref) {
    const { headingLevel, variant } = useContext(AccordionContext);
    const Heading = `h${headingLevel}` as const;

    return (
      <BaseAccordion.Header
        data-slot="accordion-header"
        // `render` rather than a wrapper: the heading level is dynamic, and
        // nesting an <h3> inside Base UI's own <h3> would be two headings for
        // one row.
        render={<Heading />}
        className="flex w-full items-center justify-between gap-sm px-sm"
      >
        <BaseAccordion.Trigger
          ref={ref}
          data-slot="accordion-trigger"
          className={cn(
            // `group` so the chevron can react to the TRIGGER's state. The
            // indicator is a child, and `data-[panel-open]:` on a child reads
            // the child's own attribute — which it never has, so the chevron
            // silently never turned.
            "group flex flex-1 cursor-pointer items-center gap-sm p-md text-start",
            "text-body-sm font-body font-bold leading-normal text-ink-primary",
            // The sheet draws every mark in this row at 16px, leading and
            // trailing alike. griddy renders width/height="24" as ATTRIBUTES,
            // so an unsized slot ships 24px whatever the sheet says.
            "[&_svg]:size-4 [&_svg]:shrink-0",
            "rounded-sm",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-edge-focus",
            // The hover fill is the ITEM's in the card variant, so the whole
            // tile lights rather than a smaller rectangle inset inside it. The
            // trigger keeps it only where there is no tile to light — and the
            // transition goes with it, because a `transition-[background-color]`
            // on an element whose background never changes animates nothing and
            // reads in review as a decision.
            //
            // ARIA-disabled, not the native attribute. The behaviour layer
            // keeps a disabled trigger FOCUSABLE (tabindex 0, aria-disabled
            // true) so assistive tech can still find it — which means
            // `disabled:` and `enabled:` match nothing here. Both were
            // written that way first and were dead classes: the cursor never
            // changed and the hover fill painted on a disabled row.
            variant === "plain" && cn("transition-[background-color]", motionMicro, "not-aria-disabled:hover:bg-hover"),
            "aria-disabled:cursor-not-allowed aria-disabled:text-ink-disabled",
            className,
          )}
        >
          {icon}
          {/* The label lane. `min-w-0` so a long title clamps instead of
              pushing the chevron out of the row. */}
          <span data-slot="accordion-label" className="min-w-0 flex-1 line-clamp-1">
            {children}
          </span>
          <ChevronDown
            aria-hidden="true"
            data-slot="accordion-indicator"
            className={cn(
              "shrink-0 text-ink-muted",
              // v4 writes the STANDALONE `rotate` property, so the transition
              // has to name `rotate` — `transform` would cover nothing and the
              // chevron would snap.
              "transition-[rotate]", motionMicro,
              "group-data-[panel-open]:rotate-180",
            )}
          />
        </BaseAccordion.Trigger>
      </BaseAccordion.Header>
    );
  },
);

export interface AccordionPanelProps {
  children: ReactNode;
  className?: string;
}

/**
 * The disclosed content.
 *
 * Two nodes, exactly as the sheet has them: the panel animates its HEIGHT and
 * therefore has to clip, and the inner container carries the padding. Padding
 * on the animating element would be added to every intermediate height and
 * the content would jump at the end of the transition.
 */
const AccordionPanel = forwardRef<HTMLDivElement, AccordionPanelProps>(function AccordionPanel(
  { children, className },
  ref,
) {
  return (
    <BaseAccordion.Panel
      ref={ref}
      data-slot="accordion-panel"
      className={cn(
        "overflow-hidden px-sm",
        // The measurement the behaviour layer publishes, rather than a
        // constant — `height: auto` cannot be transitioned and a fixed height
        // would clip whatever does not fit.
        "h-(--accordion-panel-height)",
        "transition-[height]", motionStandard,
        "data-[starting-style]:h-0 data-[ending-style]:h-0",
      )}
    >
      <div
        data-slot="accordion-panel-inner"
        className={cn(
          "flex flex-col gap-lg p-md",
          "text-body-sm font-body font-medium leading-normal text-ink-secondary",
          className,
        )}
      >
        {children}
      </div>
    </BaseAccordion.Panel>
  );
});

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Panel: AccordionPanel,
});
