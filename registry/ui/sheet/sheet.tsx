"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Absorbs one impedance mismatch, in one place — see the identical note in
 * `modal.tsx`. This repo compiles with `exactOptionalPropertyTypes`; Base UI
 * declares its props the looser way, so spreading our optionals into its parts
 * fails to type-check even when every value is right at runtime. Contained to
 * the one file `check:boundaries` already isolates.
 */
const forBaseUI = <T,>(props: object) => props as T;

/** The shape of Base UI's change-event details we rely on, restated locally so
 *  no third-party type reaches an exported signature (ADR 0002). */
interface DismissDetails {
  reason?: string;
  cancel: () => void;
}

export type SheetSide = "left" | "right";

/**
 * The panel is flush against three viewport edges and only the INNER two
 * corners are rounded — the sheet draws `borderTopRightRadius` and
 * `borderBottomRightRadius` for a left drawer and the mirror for a right one.
 * A fully rounded panel would leave four slivers of scrim in the screen
 * corners, which is what a modal looks like, not a drawer.
 */
const SIDE = {
  left: {
    edge: "left-0 rounded-r-lg",
    // `translate`, never `transform`: Tailwind v4's translate-* writes the
    // standalone property, so a transition naming transform animates nothing
    // and the drawer would appear fully open. `check:utilities` enforces this.
    offscreen: "data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
  },
  right: {
    edge: "right-0 rounded-l-lg",
    offscreen: "data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
  },
} as const satisfies Record<SheetSide, { edge: string; offscreen: string }>;

export interface SheetProps {
  children: ReactNode;
  /** Controlled open state. Omit to let the sheet own it. */
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  /** Always `onOpenChange(isOpen)` — never a separate onOpen/onClose (§1). */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Allow dismissal by Escape and by tapping the scrim. On by default: a
   * drawer is a navigation surface, and tapping outside to leave is the
   * gesture every phone user already has.
   */
  isDismissable?: boolean;
}

/**
 * A panel that slides in from the edge of the screen — the mobile counterpart
 * to a Sidebar, which is what it usually holds.
 *
 * Third component on the Base UI behaviour layer (ADR 0012) and deliberately
 * Modal's shape: focus trapping, scroll locking, Escape, outside-press and
 * focus restoration are the same problem, and a drawer that solved them again
 * by hand would solve them worse. What differs is only where the panel sits.
 *
 * Sheet holds no chrome of its own. The design's drawer draws its back and
 * close buttons inside the navigation's own header band, so a Sheet-level
 * header would be a second, competing one.
 */
function SheetRoot({ children, isOpen, defaultIsOpen, onOpenChange, isDismissable = true }: SheetProps) {
  return (
    <BaseDialog.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Root>>({
        ...(isOpen !== undefined ? { open: isOpen } : {}),
        ...(defaultIsOpen !== undefined ? { defaultOpen: defaultIsOpen } : {}),
        onOpenChange: (open: boolean, details: DismissDetails) => {
          // Base UI has no `dismissible` prop; opting out means CANCELLING the
          // two incidental reasons. An explicit Sheet.Close (`close-press`)
          // and a programmatic change must still work, or it cannot be closed.
          if (
            !isDismissable &&
            !open &&
            (details?.reason === "escape-key" || details?.reason === "outside-press")
          ) {
            details.cancel();
            return;
          }
          onOpenChange?.(open);
        },
      })}
    >
      {children}
    </BaseDialog.Root>
  );
}

export interface SheetTriggerProps {
  children?: ReactNode;
  /** Slot: the control that opens it. Passed through, never wrapped (§3). */
  render?: ReactElement;
  className?: string;
}

function SheetTrigger({ children, render, className }: SheetTriggerProps) {
  return (
    <BaseDialog.Trigger
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Trigger>>({
        "data-slot": "sheet-trigger",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BaseDialog.Trigger>
  );
}

export interface SheetPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "aria-label"> {
  /**
   * Refused, not overridden. `label` sets aria-label, so a second one would be
   * silently discarded, and a dialog quietly announcing the wrong name is the
   * exact failure `label` exists to prevent.
   *
   * It must be DECLARED as never rather than merely omitted: TypeScript lets
   * any undeclared hyphenated attribute through on a JSX component — that is
   * how `data-*` works — so omitting it made the prop MORE permissive, which
   * the type test caught by reporting an unused @ts-expect-error.
   */
  "aria-label"?: never;
  /**
   * Required — a dialog with no accessible name is announced as "dialog" and
   * nothing else. Sheet has no Title part because the design draws no heading
   * inside the panel, so the name is a prop rather than a slot. A visible
   * heading, if a design grows one, is ordinary content the caller supplies.
   */
  label: string;
  side?: SheetSide;
  /**
   * Where to portal the panel. Defaults to `document.body`.
   *
   * Theme tokens are INHERITED custom properties, so a panel portalled to the
   * body leaves any brand scope applied to a wrapper and paints theme zero —
   * visible as a drawer that stays Diorama-blue inside a client's yellow
   * portal. Pass the themed element and the panel inherits from it again.
   *
   * It is a prop rather than something resolved automatically because the
   * container becomes the panel's containing block: an ancestor with a
   * transform or `overflow: hidden` would clip a full-height fixed drawer, and
   * only the caller knows whether theirs is safe.
   */
  container?: HTMLElement | null;
}

function SheetPanel({ children, className, label, side = "left", container, ...rest }: SheetPanelProps) {
  return (
    <BaseDialog.Portal {...(container ? { container } : {})}>
      <BaseDialog.Backdrop
        data-slot="sheet-scrim"
        className={cn(
          "fixed inset-0 bg-scrim",
          "transition-opacity duration-(--ui-duration-base) ease-(--ui-ease-out)",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        )}
      />
      <BaseDialog.Popup
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Popup>>(rest)}
        aria-label={label}
        data-slot="sheet-panel"
        data-side={side}
        className={cn(
          // Full height, flush to one edge. `inset-y-0` rather than a height:
          // a drawer is as tall as the screen, and 100vh lies on mobile.
          "fixed inset-y-0 flex flex-col overflow-y-auto",
          // 80% of the viewport, as drawn (256 of 320). Floored at that same
          // 256 because a `fixed` element resolves against the nearest
          // TRANSFORMED ancestor — Storybook's docs blocks transform their
          // preview, so a percentage silently scopes to a docs cell. Capped at
          // the rail's own width, since a Sidebar is what this usually holds.
          "w-4/5 min-w-64 max-w-nav",
          SIDE[side].edge,
          "bg-base text-ink-primary shadow-sm",
          "transition-[translate,opacity] duration-(--ui-duration-base) ease-(--ui-ease-out)",
          SIDE[side].offscreen,
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          className,
        )}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export interface SheetCloseProps {
  children?: ReactNode;
  /** Slot: the control that dismisses. Never wrapped (§3). */
  render?: ReactElement;
  className?: string;
}

function SheetClose({ children, render, className }: SheetCloseProps) {
  return (
    <BaseDialog.Close
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Close>>({
        "data-slot": "sheet-close",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BaseDialog.Close>
  );
}

export const Sheet = Object.assign(SheetRoot, {
  Trigger: SheetTrigger,
  Panel: SheetPanel,
  Close: SheetClose,
});
