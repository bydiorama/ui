"use client";

import { Tabs as BaseTabs } from "@base-ui-components/react/tabs";
import type { ComponentPropsWithoutRef, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

export interface TabsProps {
  children: ReactNode;
  /** Controlled selection, by tab value. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/**
 * A segmented control that switches which panel is shown.
 *
 * Roving `tabindex`, arrow-key navigation, Home/End and the
 * `aria-controls`/`aria-labelledby` pairing between each tab and its panel all
 * come from Base UI (ADR 0012). Those are the parts a hand-rolled tab strip
 * gets wrong: it usually leaves every tab in the tab order, so a keyboard user
 * must Tab through all of them to reach the content.
 */
function TabsRoot({ children, value, defaultValue, onValueChange, className }: TabsProps) {
  return (
    <BaseTabs.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTabs.Root>>({
        ...(value !== undefined ? { value } : {}),
        ...(defaultValue !== undefined ? { defaultValue } : {}),
        // Narrowed from Base UI's (value, eventDetails) and its `any` value
        // type, so no third-party shape reaches the signature.
        ...(onValueChange
          ? { onValueChange: (next: unknown) => onValueChange(String(next)) }
          : {}),
        "data-slot": "tabs",
        className: cn("flex w-full flex-col gap-lg", className),
      })}
    >
      {children}
    </BaseTabs.Root>
  );
}

export type TabsListProps = HTMLAttributes<HTMLDivElement>;

function TabsList({ className, ...rest }: TabsListProps) {
  return (
    <BaseTabs.List
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTabs.List>>(rest)}
      data-slot="tabs-list"
      className={cn(
        "flex items-center gap-xs rounded-md p-xs",
        "bg-surface border border-edge-subtle",
        className,
      )}
    />
  );
}

export interface TabsTabProps extends Omit<HTMLAttributes<HTMLButtonElement>, "children"> {
  value: string;
  children: ReactNode;
  /** A count beside the label, as the sheet draws it on the selected tab. */
  count?: number;
  isDisabled?: boolean;
}

function TabsTab({ value, children, count, isDisabled = false, className, ...rest }: TabsTabProps) {
  return (
    <BaseTabs.Tab
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTabs.Tab>>(rest)}
      value={value}
      disabled={isDisabled}
      data-slot="tabs-tab"
      className={cn(
        // flex-1 so the strip divides evenly, as the sheet draws it.
        "flex min-h-6 flex-1 items-center justify-center gap-xs rounded-sm px-sm py-xs",
        "text-button-sm font-body font-bold leading-flat tracking-tight whitespace-nowrap",
        "transition-[background-color,color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
        "text-ink-muted",
        // The SELECTED tab is darker than its container here, not lighter —
        // the sheet inverts the usual raised-pill treatment.
        "aria-selected:bg-sunken aria-selected:text-ink-primary",
        !isDisabled && "cursor-pointer not-aria-selected:hover:text-ink-secondary",
        "disabled:cursor-not-allowed disabled:text-ink-disabled",
        // Base UI leaves only the selected tab in the tab order (roving
        // tabindex), so the ring is the only thing telling a keyboard user
        // where they are.
        "focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none",
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span
          data-slot="tabs-count"
          className={cn(
            "flex min-w-4 shrink-0 items-center justify-center rounded-full px-xs",
            // 12px, not the sheet's 11px: below the scale's own floor, which
            // ADR 0009 set after an 11px label pushed a control under the
            // WCAG target size.
            "text-label-sm font-body font-bold leading-flat",
            "bg-elevated text-ink-primary",
          )}
        >
          {count}
        </span>
      )}
    </BaseTabs.Tab>
  );
}

export interface TabsPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

function TabsPanel({ value, className, ...rest }: TabsPanelProps) {
  return (
    <BaseTabs.Panel
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTabs.Panel>>(rest)}
      value={value}
      data-slot="tabs-panel"
      className={cn("focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none", className)}
    />
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
});
