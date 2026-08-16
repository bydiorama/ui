"use client";

import { Popover as BasePopover } from "@base-ui/react/popover";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";

/**
 * Absorbs one impedance mismatch, in one place.
 *
 * This repo compiles with `exactOptionalPropertyTypes`, so `prop?: string`
 * means "absent or a string" — never `undefined`. Base UI declares its props
 * the looser way, so spreading our own optionals into its parts fails to
 * type-check even when every value is correct at runtime.
 *
 * Absorbing that here is exactly what a wrapper is for: the alternative is
 * relaxing the flag library-wide, which would weaken every component to suit
 * one dependency. It stays inside this file, which `check:boundaries` already
 * isolates from everything else.
 */
const forBaseUI = <T,>(props: object) => props as T;

/**
 * Our own placement vocabulary, deliberately restated rather than re-exported.
 *
 * Base UI's `Side`/`Align` types would work identically — and would also mean
 * every consumer's code is typed against Base UI, which is exactly what makes
 * a behaviour layer unswappable (ADR 0002/0012). `check:boundaries` fails the
 * build if one of its types reaches an exported signature.
 */
export type PopoverSide = "top" | "right" | "bottom" | "left";
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverProps {
  children: ReactNode;
  /** Controlled open state. Omit to let the popover own it. */
  isOpen?: boolean;
  /** Starting state when uncontrolled. */
  defaultIsOpen?: boolean;
  /** Always `onOpenChange(isOpen)` — never a separate onOpen/onClose (§1). */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Traps focus and blocks the page behind. A menu or a hint is not modal; a
   * short form inside a popover usually is.
   */
  isModal?: boolean;
}

/**
 * A panel anchored to a trigger, for secondary content that should not take
 * over the page the way a Modal does.
 *
 * Positioning, focus restoration, outside-click and Escape dismissal, and the
 * `aria-expanded`/`aria-controls` wiring come from Base UI (ADR 0012). What
 * lives here is the API, the anatomy, and every pixel of the design.
 *
 * Open state is NOT run through `useControllableState`: the behaviour layer
 * already implements the controlled/uncontrolled contract, and running two
 * implementations over one piece of state is how they drift. CONVENTIONS §4
 * bans a *bespoke* implementation, which this is the opposite of.
 */
function PopoverRoot({ children, isOpen, defaultIsOpen, onOpenChange, isModal }: PopoverProps) {
  return (
    <BasePopover.Root
      {...(isOpen !== undefined ? { open: isOpen } : {})}
      {...(defaultIsOpen !== undefined ? { defaultOpen: defaultIsOpen } : {})}
      {...(onOpenChange ? { onOpenChange: (open: boolean) => onOpenChange(open) } : {})}
      {...(isModal !== undefined ? { modal: isModal } : {})}
    >
      {children}
    </BasePopover.Root>
  );
}

export interface PopoverTriggerProps {
  children?: ReactNode;
  /**
   * Slot: the element that opens the popover — usually a `<Button>`. Passed
   * straight through, never wrapped (§3), so the trigger keeps its own type,
   * ref and accessible name and gains only the ARIA wiring.
   */
  render?: ReactElement;
  className?: string;
}

function PopoverTrigger({ children, render, className }: PopoverTriggerProps) {
  return (
    <BasePopover.Trigger
      {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Trigger>>({
        "data-slot": "popover-trigger",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BasePopover.Trigger>
  );
}

export interface PopoverPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Preferred side. Flips automatically when it would collide. */
  side?: PopoverSide;
  align?: PopoverAlign;
  /** Distance from the trigger, in px. Defaults to `--ui-space-sm` worth. */
  sideOffset?: number;
  alignOffset?: number;
  /**
   * Where to portal the panel. Defaults to `document.body`.
   *
   * Theme tokens are INHERITED custom properties, so a panel portalled to the
   * body leaves any brand scope on a wrapper and paints theme zero. Pass the
   * themed element to bring it back inside. See the fuller note in `sheet.tsx`
   * on why this is a prop and not resolved automatically.
   */
  container?: HTMLElement | null;
}

function PopoverPanel({
  children,
  className,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  container,
  ...rest
}: PopoverPanelProps) {
  return (
    <BasePopover.Portal {...(container ? { container } : {})}>
      <BasePopover.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        // Keeps the panel off the viewport edge when it flips or shifts.
        collisionPadding={8}
      >
        <BasePopover.Popup
          {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Popup>>(rest)}
          data-slot="popover-panel"
          className={cn(
            // radius-xl (24) with a radius-md (8) boxed child and p-lg (16):
            // 8 + 16 = 24, concentric exactly (§6). The sheet previously drew
            // a 32px panel around a 16px well, which was also concentric but
            // read as too round.
            "flex min-w-80 flex-col gap-lg rounded-xl p-lg",
            // Never larger than the space Base UI measured. Flipping and
            // shifting reposition a panel; they cannot shrink one, so a tall
            // popover on a short window runs off the bottom without this (§7c).
            "max-h-(--available-height) max-w-(--available-width) overflow-y-auto",
            "bg-elevated border border-edge-subtle shadow-md",
            // The panel is the thing that must be identifiable against the
            // page (SC 1.4.11): bg-elevated alone measures 1.11:1 on white,
            // so the hairline and the shadow carry the boundary, not the fill.
            "text-ink-primary",
            // `scale`, not `transform` — see the identical note in modal.tsx.
            "transition-[opacity,scale]", motionMicro,
            // Base UI stamps these while the enter/exit transition runs.
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "data-[starting-style]:scale-98 data-[ending-style]:scale-98",
            "origin-(--transform-origin)",
            className,
          )}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

/**
 * The inset that makes a 32px-radius panel work.
 *
 * Bare text sitting flush at the panel's own padding crowds the corner arc, so
 * unboxed content steps in by one space unit while boxed content (an info
 * well, an input) stays flush. Encoding it here rather than documenting it
 * means a consumer gets the alignment right by composing, not by reading.
 */
const UNBOXED_INSET = "px-sm";

export type PopoverTitleProps = HTMLAttributes<HTMLHeadingElement>;

function PopoverTitle({ className, ...rest }: PopoverTitleProps) {
  return (
    <BasePopover.Title
      {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Title>>(rest)}
      data-slot="popover-title"
      className={cn(
        UNBOXED_INSET,
        "py-xs text-title-sm font-body font-bold leading-normal tracking-tight text-ink-primary",
        className,
      )}
    />
  );
}

export type PopoverDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

function PopoverDescription({ className, ...rest }: PopoverDescriptionProps) {
  return (
    <BasePopover.Description
      {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Description>>(rest)}
      data-slot="popover-description"
      className={cn(
        UNBOXED_INSET,
        // From the actions sheet: body-md at the relaxed leading, in secondary
        // ink. Weight is `medium`, not the sheet's 600 — the only description
        // drawn anywhere sits in a destructive confirmation, and that emphasis
        // does not generalise to ordinary body copy. Confirmed with design.
        "py-xs text-body-md font-body font-medium leading-relaxed tracking-tight text-ink-secondary",
        className,
      )}
    />
  );
}

export interface PopoverCloseProps {
  children?: ReactNode;
  /** Slot: the control that dismisses the popover. Never wrapped (§3). */
  render?: ReactElement;
  className?: string;
}

function PopoverClose({ children, render, className }: PopoverCloseProps) {
  return (
    <BasePopover.Close
      {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Close>>({
        "data-slot": "popover-close",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BasePopover.Close>
  );
}

export const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Panel: PopoverPanel,
  Title: PopoverTitle,
  Description: PopoverDescription,
  Close: PopoverClose,
});
