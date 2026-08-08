"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { ChevronRight } from "griddy-icons";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/cn";
import { menuPanel, menuItem, menuSeparator, menuGroupLabel } from "@/lib/menu-surface";

/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

/**
 * Our own placement vocabulary, deliberately restated rather than re-exported
 * — the same decision as Popover's, for the same reason (ADR 0002/0012).
 */
export type MenuSide = "top" | "right" | "bottom" | "left";
export type MenuAlign = "start" | "center" | "end";

export interface MenuProps {
  children: ReactNode;
  /** Controlled open state. Omit and the menu owns it. */
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  /** Always `onOpenChange(isOpen)` — never onOpen + onClose (§1). */
  onOpenChange?: (isOpen: boolean) => void;
  /** Traps focus and blocks the page behind. A menu is not modal by default. */
  isModal?: boolean;
}

/**
 * A list of commands, opened from a trigger.
 *
 * The whole ARIA menu contract — `role="menu"` and `menuitem`, roving focus,
 * typeahead, Escape and outside-press dismissal, submenu timing and the
 * `aria-haspopup`/`aria-expanded` wiring — comes from the Base UI behaviour
 * layer (ADR 0012), wrapped so no third-party type reaches a public prop
 * signature. What lives here is the API, the anatomy, and every pixel.
 *
 * A menu is for ACTIONS. For navigation between pages, a list of links inside
 * a Popover reads correctly to assistive tech and a `role="menu"` full of
 * links does not — the Sidebar is the shape for that.
 */
function MenuRoot({ children, isOpen, defaultIsOpen, onOpenChange, isModal }: MenuProps) {
  return (
    <BaseMenu.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseMenu.Root>>({
        ...(isOpen !== undefined ? { open: isOpen } : {}),
        ...(defaultIsOpen !== undefined ? { defaultOpen: defaultIsOpen } : {}),
        ...(onOpenChange ? { onOpenChange: (open: boolean) => onOpenChange(open) } : {}),
        ...(isModal !== undefined ? { modal: isModal } : {}),
      })}
    >
      {children}
    </BaseMenu.Root>
  );
}

export interface MenuTriggerProps {
  children?: ReactNode;
  /**
   * Slot: the control that opens the menu — usually a `<Button>`. Passed
   * straight through, never wrapped (§3), so it keeps its own type, ref and
   * accessible name and gains only the ARIA wiring.
   */
  render?: ReactElement;
  className?: string;
}

function MenuTrigger({ children, render, className }: MenuTriggerProps) {
  return (
    <BaseMenu.Trigger
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseMenu.Trigger>>({
        "data-slot": "menu-trigger",
        ...(render ? { render } : {}),
        ...(className ? { className } : {}),
      })}
    >
      {children}
    </BaseMenu.Trigger>
  );
}

export interface MenuPanelProps extends HTMLAttributes<HTMLDivElement> {
  side?: MenuSide;
  align?: MenuAlign;
  sideOffset?: number;
  alignOffset?: number;
  /**
   * Where to portal the panel. Defaults to `document.body`.
   *
   * Theme tokens are INHERITED custom properties, so a panel portalled to the
   * body leaves any brand scope on a wrapper and paints theme zero. Pass the
   * themed element to bring it back inside.
   */
  container?: HTMLElement | null;
}

function MenuPanel({
  children,
  className,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  alignOffset = 0,
  container,
  ...rest
}: MenuPanelProps) {
  return (
    <BaseMenu.Portal {...forBaseUI<ComponentPropsWithoutRef<typeof BaseMenu.Portal>>(container ? { container } : {})}>
      <BaseMenu.Positioner
        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseMenu.Positioner>>({
          side,
          align,
          sideOffset,
          alignOffset,
          // Keeps the panel off the window edge once it flips or shifts (§7c).
          collisionPadding: 8,
          className: "z-50",
        })}
      >
        <BaseMenu.Popup
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseMenu.Popup>>(rest)}
          data-slot="menu-panel"
          className={menuPanel(cn(className))}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export interface MenuItemProps {
  children: ReactNode;
  /** Slot: a leading glyph. The component sizes it to 16 (§7). */
  icon?: ReactElement;
  /** Slot: a trailing mark — a shortcut hint, a check, a count. */
  trailing?: ReactElement;
  isDisabled?: boolean;
  /**
   * Fires when the row is chosen, by click or by Enter/Space.
   *
   * Named for the verb (§1). NOT `onClick`: a menu row is chosen by the
   * keyboard as often as by the pointer, and a handler named for one input is
   * how the other gets forgotten.
   */
  onSelect?: () => void;
  /** Slot: renders the row as something else — an `<a>` for a link. */
  render?: ReactElement;
  className?: string;
}

function MenuItemPart({ children, icon, trailing, isDisabled = false, onSelect, render, className }: MenuItemProps) {
  return (
    <BaseMenu.Item
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseMenu.Item>>({
        "data-slot": "menu-item",
        disabled: isDisabled,
        ...(onSelect ? { onClick: () => onSelect() } : {}),
        ...(render ? { render } : {}),
        className: menuItem(cn(className)),
      })}
    >
      <span className="flex min-w-0 items-center gap-sm">
        {icon}
        <span data-slot="menu-item-label" className="truncate">
          {children}
        </span>
      </span>
      {trailing}
    </BaseMenu.Item>
  );
}

export type MenuSeparatorProps = HTMLAttributes<HTMLDivElement>;

function MenuSeparatorPart({ className, ...rest }: MenuSeparatorProps) {
  return (
    <BaseMenu.Separator
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseMenu.Separator>>(rest)}
      data-slot="menu-separator"
      className={menuSeparator(cn(className))}
    />
  );
}

export interface MenuGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Names the group for assistive tech and draws its heading. */
  label?: string;
}

function MenuGroupPart({ label, children, className, ...rest }: MenuGroupProps) {
  return (
    <BaseMenu.Group
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseMenu.Group>>(rest)}
      data-slot="menu-group"
      className={cn(className)}
    >
      {label && (
        <BaseMenu.GroupLabel
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel>>({
            "data-slot": "menu-group-label",
            className: menuGroupLabel(),
          })}
        >
          {label}
        </BaseMenu.GroupLabel>
      )}
      {children}
    </BaseMenu.Group>
  );
}

export interface MenuSubProps {
  children: ReactNode;
}

/** A nested menu. Its trigger is a row; its panel is the same panel. */
function MenuSub({ children }: MenuSubProps) {
  return <BaseMenu.SubmenuRoot>{children}</BaseMenu.SubmenuRoot>;
}

export interface MenuSubTriggerProps {
  children: ReactNode;
  icon?: ReactElement;
  isDisabled?: boolean;
  className?: string;
}

function MenuSubTrigger({ children, icon, isDisabled = false, className }: MenuSubTriggerProps) {
  return (
    <BaseMenu.SubmenuTrigger
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger>>({
        "data-slot": "menu-sub-trigger",
        disabled: isDisabled,
        className: menuItem(cn(className)),
      })}
    >
      <span className="flex min-w-0 items-center gap-sm">
        {icon}
        <span data-slot="menu-item-label" className="truncate">
          {children}
        </span>
      </span>
      {/*
        A chevron pointing RIGHT, where the sheet draws one pointing DOWN.
        Down means "expands below, in place"; right means "opens beside", and
        beside is what a submenu does. Recorded in needsDesign — if the drawing
        is the intent, the surface is a Sidebar section rather than a menu.
      */}
      <ChevronRight aria-hidden="true" />
    </BaseMenu.SubmenuTrigger>
  );
}

export const Menu = Object.assign(MenuRoot, {
  Trigger: MenuTrigger,
  Panel: MenuPanel,
  Item: MenuItemPart,
  Separator: MenuSeparatorPart,
  Group: MenuGroupPart,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
});
