"use client";

import { ContextMenu as BaseContextMenu } from "@base-ui-components/react/context-menu";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { menuPanel } from "@/lib/menu-surface";

/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

export interface ContextMenuProps {
  children: ReactNode;
  /** Controlled open state. Omit and the menu owns it. */
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  /** Always `onOpenChange(isOpen)` — never onOpen + onClose (§1). */
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * The same menu, opened by a right-click on a region rather than by a button.
 *
 * Only three parts live here — Root, Trigger and Panel. Everything inside is
 * `Menu.Item`, `Menu.Separator`, `Menu.Group` and `Menu.Sub`, because Base UI's
 * ContextMenu re-exports Menu's parts verbatim: they are the same rows in the
 * same popup, and the only difference is what opens it. Duplicating them here
 * would create two drawings of one surface, which is exactly how the 32px
 * chrome control ended up existing four times.
 *
 * The keyboard path matters more here than anywhere else in this library: a
 * surface that ONLY opens on right-click is unreachable without a pointer.
 * Base UI opens it on the context-menu KEY and on Shift+F10 as well, which is
 * the platform contract, and the browser test drives it that way.
 */
function ContextMenuRoot({ children, isOpen, defaultIsOpen, onOpenChange }: ContextMenuProps) {
  return (
    <BaseContextMenu.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseContextMenu.Root>>({
        ...(isOpen !== undefined ? { open: isOpen } : {}),
        ...(defaultIsOpen !== undefined ? { defaultOpen: defaultIsOpen } : {}),
        ...(onOpenChange ? { onOpenChange: (open: boolean) => onOpenChange(open) } : {}),
      })}
    >
      {children}
    </BaseContextMenu.Root>
  );
}

export interface ContextMenuTriggerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  /** Slot: the region that responds to a right-click. Never wrapped (§3). */
  render?: ReactElement;
}

/**
 * The region a right-click opens the menu over.
 *
 * It renders a `<div>` rather than wrapping in one, so the area the user aims
 * at is the element the caller already has.
 */
function ContextMenuTrigger({ children, render, className, ...rest }: ContextMenuTriggerProps) {
  return (
    <BaseContextMenu.Trigger
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseContextMenu.Trigger>>({
        ...rest,
        "data-slot": "context-menu-trigger",
        ...(render ? { render } : {}),
        className: cn(className),
      })}
    >
      {children}
    </BaseContextMenu.Trigger>
  );
}

export interface ContextMenuPanelProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Where to portal the panel. Defaults to `document.body`.
   *
   * Theme tokens are INHERITED custom properties, so a panel portalled to the
   * body leaves any brand scope on a wrapper and paints theme zero.
   */
  container?: HTMLElement | null;
}

function ContextMenuPanel({ children, className, container, ...rest }: ContextMenuPanelProps) {
  return (
    <BaseContextMenu.Portal
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseContextMenu.Portal>>(container ? { container } : {})}
    >
      <BaseContextMenu.Positioner
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseContextMenu.Positioner>>({
          // No side or align: a context menu is anchored to the POINTER, not
          // to an element, so Base UI positions it at the click point.
          // `collisionPadding` still applies, and matters more here — a
          // right-click near the window edge is the common case (§7c).
          collisionPadding: 8,
          className: "z-50",
        })}
      >
        <BaseContextMenu.Popup
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseContextMenu.Popup>>(rest)}
          data-slot="context-menu-panel"
          className={menuPanel(cn(className))}
        >
          {children}
        </BaseContextMenu.Popup>
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  );
}

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Panel: ContextMenuPanel,
});
