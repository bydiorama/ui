"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";

/**
 * Absorbs one impedance mismatch, in one place — see the identical note in
 * `popover.tsx`. This repo compiles with `exactOptionalPropertyTypes`; Base UI
 * declares its props the looser way, so spreading our optionals into its parts
 * fails to type-check even when every value is right at runtime. Contained to
 * the one file `check:boundaries` already isolates.
 */
const forBaseUI = <T,>(props: object) => props as T;

/**
 * The shape of Base UI's change-event details that we actually rely on,
 * restated locally. Importing its type would put a third-party type in this
 * file's signatures and is exactly what `check:boundaries` guards against.
 */
interface DismissDetails {
  reason?: string;
  cancel: () => void;
}

export type ModalSize = "md" | "lg";

/**
 * Widths, not heights: a modal grows with its content and scrolls if it must.
 *
 * These were `max-w-md` and `max-w-xl`, which LOOK like Tailwind's container
 * scale and are not: v4 falls back to `--spacing-*` when no `--container-*`
 * exists, so they compiled to 12px and 24px caps. `min-w-80` beat both, and
 * every modal rendered at 320px whatever its size — with valid CSS, a real
 * variable, and every gate green. `check:utilities` now refuses a bare
 * spacing step in a sizing utility.
 */
const SIZE = {
  md: "max-w-dialog-md",
  lg: "max-w-dialog-lg",
} as const satisfies Record<ModalSize, string>;

export interface ModalProps {
  children: ReactNode;
  /** Controlled open state. Omit to let the modal own it. */
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  /** Always `onOpenChange(isOpen)` — never a separate onOpen/onClose (§1). */
  onOpenChange?: (isOpen: boolean) => void;
  /**
   * Allow dismissal by Escape and by clicking the scrim. On by default,
   * because trapping someone in a dialog is a last resort — turn it off only
   * when losing the work would be worse than the friction.
   */
  isDismissable?: boolean;
}

/**
 * A dialog that takes over the page: scrim behind, focus trapped inside,
 * focus restored to the trigger on close.
 *
 * Second component on the Base UI behaviour layer (ADR 0012), and deliberately
 * the same shape as Popover — Root/Trigger/Surface/Title/Description/Close with
 * our own props on the outside and no Base UI type in any exported signature.
 * If that pattern only worked once it was not a pattern.
 *
 * Modal is ALWAYS modal: unlike Popover it does not take `isModal`, because a
 * non-modal dialog with a scrim is a popover wearing a costume.
 */
function ModalRoot({ children, isOpen, defaultIsOpen, onOpenChange, isDismissable = true }: ModalProps) {
  return (
    <BaseDialog.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Root>>({
        ...(isOpen !== undefined ? { open: isOpen } : {}),
        ...(defaultIsOpen !== undefined ? { defaultOpen: defaultIsOpen } : {}),
        onOpenChange: (open: boolean, details: DismissDetails) => {
          // There is no `dismissible` prop on Base UI's Dialog — passing one
          // was silently ignored, and Escape closed a modal that had opted
          // out. Dismissal is refused by CANCELLING the two incidental
          // reasons; an explicit Modal.Close (`close-press`) and a programmatic
          // change must still work, or the dialog becomes unclosable.
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

export interface ModalTriggerProps {
  children?: ReactNode;
  /** Slot: the element that opens the modal. Passed through, never wrapped (§3). */
  render?: ReactElement;
  className?: string;
}

function ModalTrigger({ children, render, className }: ModalTriggerProps) {
  return (
    <BaseDialog.Trigger
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Trigger>>({
        "data-slot": "modal-trigger",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BaseDialog.Trigger>
  );
}

export interface ModalSurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  size?: ModalSize;
  /**
   * Where to portal the dialog. Defaults to `document.body`.
   *
   * Theme tokens are INHERITED custom properties, so a surface portalled to
   * the body leaves any brand scope on a wrapper and paints theme zero. Pass
   * the themed element to bring it back inside. See the fuller note in
   * `sheet.tsx` on why this is a prop and not resolved automatically.
   */
  container?: HTMLElement | null;
}

function ModalSurface({ children, className, size = "md", container, ...rest }: ModalSurfaceProps) {
  return (
    <BaseDialog.Portal {...(container ? { container } : {})}>
      {/*
        The scrim is a scheme-only role: a warm 16% veil in light, a heavier
        black in dark. It had no utility until this component needed one.
      */}
      <BaseDialog.Backdrop
        data-slot="modal-scrim"
        className={cn(
          "fixed inset-0 bg-scrim",
          "transition-opacity", motionMicro,
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        )}
      />
      <BaseDialog.Popup
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Popup>>(rest)}
        data-slot="modal-surface"
        data-size={size}
        className={cn(
          "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          // `w-full` against the containing block, floored so it cannot collapse.
          // 100vw was wrong: a `fixed` element resolves against the nearest
          // TRANSFORMED ancestor, not the viewport, and Storybook's docs blocks
          // transform their preview — so the dialog took the width of a docs
          // cell instead of the screen.
          //
          // There is no second max-width here. A `max-w-[calc(100vw-2rem)]`
          // sat in this list and never once applied: tailwind-merge keeps the
          // LAST max-width, which is always the size below it. `w-full` is
          // what actually holds the dialog inside its containing block.
          "flex w-full min-w-80 flex-col gap-2xl rounded-lg p-lg",
          SIZE[size],
          // bg-surface, not bg-elevated: the scrim already separates the
          // dialog from the page, so the surface carries only the shadow the
          // sheet draws.
          "bg-surface text-ink-primary shadow-sm",
          // Long content scrolls inside the dialog rather than the page, which
          // would otherwise scroll behind a fixed, focus-trapped surface.
          "max-h-[calc(100vh-2rem)] overflow-y-auto",
          // `scale`, not `transform`: v4's scale-* sets the standalone `scale`
          // property, so a list naming transform transitioned nothing and the
          // dialog snapped in at full size while only opacity eased.
          "transition-[opacity,scale]", motionMicro,
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          "data-[starting-style]:scale-98 data-[ending-style]:scale-98",
          className,
        )}
      >
        {children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export type ModalTitleProps = HTMLAttributes<HTMLHeadingElement>;

function ModalTitle({ className, ...rest }: ModalTitleProps) {
  return (
    <BaseDialog.Title
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Title>>(rest)}
      data-slot="modal-title"
      className={cn(
        "text-title-lg font-body font-medium leading-normal tracking-tight text-ink-primary",
        className,
      )}
    />
  );
}

export type ModalDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

function ModalDescription({ className, ...rest }: ModalDescriptionProps) {
  return (
    <BaseDialog.Description
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Description>>(rest)}
      data-slot="modal-description"
      className={cn(
        "text-body-md font-body font-medium leading-relaxed tracking-tight text-ink-secondary",
        className,
      )}
    />
  );
}

export type ModalFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * The action row. `justify-between` is the sheet's own layout — the dismissing
 * action sits left and the committing one right, so the primary action lands
 * under the thumb on a narrow screen and the two are never adjacent.
 */
function ModalFooter({ className, ...rest }: ModalFooterProps) {
  return (
    <div
      data-slot="modal-footer"
      className={cn("flex items-center justify-between gap-md", className)}
      {...rest}
    />
  );
}

export interface ModalCloseProps {
  children?: ReactNode;
  /** Slot: the control that dismisses. Never wrapped (§3). */
  render?: ReactElement;
  className?: string;
}

function ModalClose({ children, render, className }: ModalCloseProps) {
  return (
    <BaseDialog.Close
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseDialog.Close>>({
        "data-slot": "modal-close",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BaseDialog.Close>
  );
}

export const Modal = Object.assign(ModalRoot, {
  Trigger: ModalTrigger,
  Surface: ModalSurface,
  Title: ModalTitle,
  Description: ModalDescription,
  Footer: ModalFooter,
  Close: ModalClose,
});
