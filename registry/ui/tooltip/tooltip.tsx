"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { createContext, useContext, useId } from "react";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/cn";
import {
  motionMicro,
  HOVER_INTENT_DELAY_MS,
  HOVER_INTENT_CLOSE_MS,
  HOVER_INTENT_SKIP_MS,
} from "@/lib/motion";

/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

/**
 * Our own placement vocabulary, deliberately restated rather than re-exported
 * — the same reason Popover restates it. Base UI's `Side`/`Align` would work
 * identically and would also mean every consumer's code is typed against Base
 * UI, which is exactly what makes a behaviour layer unswappable (ADR
 * 0002/0012). `check:boundaries` fails the build if one of its types reaches an
 * exported signature.
 */
export type TooltipSide = "top" | "right" | "bottom" | "left";
export type TooltipAlign = "start" | "center" | "end";

/**
 * The id that joins the trigger to the chip — and the one thing on this
 * component that the behaviour layer does NOT do.
 *
 * MEASURED against `@base-ui/react@1.7.0`: an open tooltip popup carries
 * `data-open`, `data-side`, `data-align` and a `tabindex`, and it carries no
 * `role`. The trigger gets an `id` and `data-popup-open`, and no
 * `aria-describedby`. So a tooltip built on the primitive alone is decoration —
 * visible to a pointer and absent to a screen reader, which is the one failure
 * mode a tooltip cannot afford, because its entire job is to say the thing the
 * control does not.
 *
 * ADR 0012 says reach for the behaviour layer only where the platform does not
 * already do the work. Where the behaviour layer does not do it either, we do:
 * `role="tooltip"` on the chip and `aria-describedby` on the trigger, joined by
 * one id from `useId`.
 *
 * The reference is set whether or not the chip is mounted. A dangling
 * `aria-describedby` resolves to nothing and is ignored — where a reference
 * that appears only on open would have to be driven by open state the trigger
 * cannot see without reading a Base UI internal, which `check:boundaries`
 * refuses and which would break on their next release.
 */
const TooltipContentId = createContext<string>("");

export interface TooltipProviderProps {
  children: ReactNode;
}

/**
 * The delay group.
 *
 * Once one tooltip in a subtree has opened, its neighbours open instantly for
 * `HOVER_INTENT_SKIP_MS` after the last one closed — which is what makes a
 * toolbar readable rather than a row of separate 600ms waits. It takes no
 * props: the timings belong to `@/lib/motion`, not to a call site.
 *
 * It is optional and it is the first thing in this library that a consumer can
 * forget with nothing failing — without it every tooltip simply waits on its
 * own. Put it at the app root.
 */
function TooltipProvider({ children }: TooltipProviderProps) {
  return (
    <BaseTooltip.Provider
      delay={HOVER_INTENT_DELAY_MS}
      closeDelay={HOVER_INTENT_CLOSE_MS}
      timeout={HOVER_INTENT_SKIP_MS}
    >
      {children}
    </BaseTooltip.Provider>
  );
}

export interface TooltipProps {
  children: ReactNode;
  /** Controlled open state. Omit to let the tooltip own it. */
  isOpen?: boolean;
  /** Starting state when uncontrolled. */
  defaultIsOpen?: boolean;
  /** Always `onOpenChange(isOpen)` — never a separate onOpen/onClose (§1). */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Stops it opening at all, without touching the trigger. For a control whose
   * label is already visible at some breakpoints and not at others.
   */
  isDisabled?: boolean;
}

/**
 * A short label that appears on hover or focus and names a control that cannot
 * name itself.
 *
 * The smallest surface in the library and the only one that is never
 * interactive: a pointer leaving the trigger dismisses it, so anything inside
 * it that had to be reached could not be. That single fact is what the content
 * rules in the doc follow from, and why this is a chip rather than a panel.
 *
 * Positioning, the hover and focus wiring, the delay group and
 * `aria-describedby` come from Base UI (ADR 0012). What lives here is the API,
 * the anatomy and every pixel of the design.
 *
 * Open state is NOT run through `useControllableState`: the behaviour layer
 * already implements the controlled/uncontrolled contract, and running two
 * implementations over one piece of state is how they drift. CONVENTIONS §4
 * bans a *bespoke* implementation, which this is the opposite of.
 */
function TooltipRoot({ children, isOpen, defaultIsOpen, onOpenChange, isDisabled }: TooltipProps) {
  const contentId = useId();
  return (
    <BaseTooltip.Root
      {...(isOpen !== undefined ? { open: isOpen } : {})}
      {...(defaultIsOpen !== undefined ? { defaultOpen: defaultIsOpen } : {})}
      {...(onOpenChange ? { onOpenChange: (open: boolean) => onOpenChange(open) } : {})}
      {...(isDisabled !== undefined ? { disabled: isDisabled } : {})}
    >
      <TooltipContentId.Provider value={contentId}>{children}</TooltipContentId.Provider>
    </BaseTooltip.Root>
  );
}

export interface TooltipTriggerProps {
  /**
   * Slot: the control the tooltip explains. REQUIRED, and it is the one prop
   * on this component that is not negotiable — a tooltip describes something
   * that already exists, so there is no such thing as a trigger that is not
   * already a control. Passed straight through, never wrapped (§3), so it
   * keeps its own type, ref and accessible name and gains only the wiring.
   *
   * Without it Base UI renders a bare `<button>`, which is how a library ends
   * up shipping a second, unstyled control nobody chose.
   */
  render: ReactElement;
  className?: string;
}

function TooltipTrigger({ render, className }: TooltipTriggerProps) {
  const contentId = useContext(TooltipContentId);
  return (
    <BaseTooltip.Trigger
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTooltip.Trigger>>({
        "data-slot": "tooltip-trigger",
        // Merged onto the caller's own element by the same mechanism that puts
        // `data-slot` there — the slot is still not wrapped (§3).
        "aria-describedby": contentId,
        render,
        // Set here as well as on the Provider, so a tooltip outside a provider
        // still waits the right amount rather than falling back to whatever
        // the behaviour layer's default happens to be this release.
        delay: HOVER_INTENT_DELAY_MS,
        closeDelay: HOVER_INTENT_CLOSE_MS,
        ...(className ? { className } : {}),
      })}
    />
  );
}

export interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Preferred side. Flips automatically when it would collide. */
  side?: TooltipSide;
  align?: TooltipAlign;
  /** Distance from the trigger, in px. Defaults to `--ui-space-sm` worth. */
  sideOffset?: number;
  alignOffset?: number;
  /**
   * Where to portal the chip. Defaults to `document.body`.
   *
   * Theme tokens are INHERITED custom properties, so a chip portalled to the
   * body leaves any brand scope on a wrapper and paints theme zero. Pass the
   * themed element to bring it back inside. See the fuller note in `sheet.tsx`
   * on why this is a prop and not resolved automatically.
   */
  container?: HTMLElement | null;
}

function TooltipContent({
  children,
  className,
  side = "top",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  container,
  ...rest
}: TooltipContentProps) {
  const contentId = useContext(TooltipContentId);
  return (
    <BaseTooltip.Portal {...(container ? { container } : {})}>
      <BaseTooltip.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        // Keeps the chip off the viewport edge when it flips or shifts.
        collisionPadding={8}
      >
        <BaseTooltip.Popup
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTooltip.Popup>>(rest)}
          id={contentId}
          role="tooltip"
          data-slot="tooltip"
          className={cn(
            "flex min-h-6 items-center rounded-md px-sm py-xs",
            // Never larger than the space Base UI measured. Flipping and
            // shifting reposition a chip; they cannot shrink one (§7c).
            "max-h-(--available-height) max-w-(--available-width) overflow-y-auto",
            // An OPAQUE near-black fill, no border, the smallest shadow. The
            // fill is the decision: nothing else in the library is a dark chip,
            // so it is unmistakable at a glance and in peripheral vision, which
            // is where a tooltip is read. Drawn as an elevated panel instead it
            // is a one-row Menu, and it teaches the reader that the surface can
            // be clicked — the one thing a tooltip must never imply.
            //
            // --ui-bg-emphasis is #1D1B19 in BOTH schemes, so the one surface
            // that must not be mistaken for a menu is the one that does not
            // move when the surface scale inverts.
            "bg-emphasis text-ink-on-emphasis shadow-sm",
            "text-caption font-body font-medium leading-normal tracking-normal",
            // `scale`, not `transform` — see the identical note in modal.tsx.
            "transition-[opacity,scale]",
            motionMicro,
            // Base UI stamps these while the enter/exit transition runs.
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "data-[starting-style]:scale-98 data-[ending-style]:scale-98",
            "origin-(--transform-origin)",
            className,
          )}
        >
          {/*
            The measure lives on the TEXT, not on the chip, and the two caps are
            on different elements on purpose: `max-w-64` beside
            `max-w-(--available-width)` is one declaration and tailwind-merge
            keeps only the last, which is how Modal's viewport cap sat above its
            size class and never once applied.
          */}
          <span data-slot="tooltip-text" className="max-w-64">
            {children}
          </span>
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

export const Tooltip = Object.assign(TooltipRoot, {
  Provider: TooltipProvider,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
});
