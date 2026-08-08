"use client";

import { Tabs as BaseTabs } from "@base-ui-components/react/tabs";
import { createContext, useContext, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

export type TabsOrientation = "horizontal" | "vertical";
export type TabsVariant = "enclosed" | "ghost";

/**
 * List and Tab both need to know the orientation and the variant, and neither
 * is a child the caller passes them explicitly — the sheet draws four
 * combinations and a consumer writing `orientation` three times would get one
 * of them wrong. Root owns it; the parts read it.
 */
const TabsShape = createContext<{ orientation: TabsOrientation; variant: TabsVariant }>({
  orientation: "horizontal",
  variant: "enclosed",
});

export interface TabsProps {
  children: ReactNode;
  /** Controlled selection, by tab value. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Vertical stacks the strip and — because it is forwarded to the behaviour
   * layer — swaps the arrow keys from Left/Right to Up/Down. A vertical strip
   * still driven by Left/Right is the usual way this prop is half-implemented.
   */
  orientation?: TabsOrientation;
  /**
   * `enclosed` is the sheet's default: a bordered track around the strip.
   * `ghost` drops the track entirely and lets the selected fill carry it, for
   * a strip that sits inside a surface that already has an edge.
   */
  variant?: TabsVariant;
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
function TabsRoot({
  children,
  value,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  variant = "enclosed",
  className,
}: TabsProps) {
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
        orientation,
        "data-slot": "tabs",
        "data-orientation": orientation,
        "data-variant": variant,
        className: cn("flex w-full flex-col gap-lg", className),
      })}
    >
      <TabsShape.Provider value={{ orientation, variant }}>{children}</TabsShape.Provider>
    </BaseTabs.Root>
  );
}

export type TabsListProps = HTMLAttributes<HTMLDivElement>;

function TabsList({ className, ...rest }: TabsListProps) {
  const { orientation, variant } = useContext(TabsShape);
  return (
    <BaseTabs.List
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTabs.List>>(rest)}
      data-slot="tabs-list"
      data-orientation={orientation}
      data-variant={variant}
      className={cn(
        "flex items-center gap-xs rounded-md",
        // A 2px inset, which is off the spacing scale and does NOT close §6's
        // arithmetic — radius-sm rows plus 2px want a 6px outer radius and the
        // scale has no 6px step. It is here because the sheet's three numbers
        // together produce the drawn control: 24px rows + 2 + 2 + 1.5 + 1.5 is
        // the 32px height it specifies, and of the three the inset is the one
        // the height depends on. Recorded in needsDesign.
        "p-[2px]",
        orientation === "vertical" ? "flex-col" : "h-8 justify-center",
        variant === "enclosed" && "bg-surface border-[1.5px] border-edge-subtle",
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
  const { orientation, variant } = useContext(TabsShape);
  return (
    <BaseTabs.Tab
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseTabs.Tab>>(rest)}
      value={value}
      disabled={isDisabled}
      data-slot="tabs-tab"
      data-variant={variant}
      className={cn(
        "flex min-h-6 items-center gap-xs px-sm py-xs",
        "text-button-sm font-body font-bold leading-flat tracking-tight whitespace-nowrap",
        "transition-[background-color,color] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
        "text-ink-muted",
        // Enclosed divides the track evenly and centres each label; ghost sizes
        // to its content and sits left, because there is no track to divide.
        variant === "enclosed" ? "flex-1 rounded-sm" : "rounded-md",
        orientation === "horizontal" ? "justify-center" : "self-stretch",
        // `bg-selected`, not `bg-sunken`. The sheet draws the selected tab
        // DARKER than its track, and "recessed" is a relative role: below the
        // surface there is room on a light page and almost none on a dark one,
        // where `bg-sunken` measured 1.10:1 against the track and the selected
        // tab read as unselected. `bg-selected` steps away from the surface in
        // whichever direction the scheme reads — 1.19 in light, unchanged from
        // the drawing, and 1.68 in dark instead of 1.10.
        "aria-selected:bg-selected aria-selected:text-ink-primary",
        !isDisabled && "cursor-pointer not-aria-selected:hover:text-ink-secondary",
        // `aria-disabled:`, NOT `disabled:`. Base UI's Tab renders
        // `aria-disabled="true"` and `data-disabled` and never sets the native
        // attribute — deliberately, so a disabled tab stays focusable and can
        // still be announced, the same choice Calendar makes for unavailable
        // dates. Every `disabled:` class here therefore matched nothing, and
        // the row painted identically to an enabled one in both schemes: same
        // ink, same cursor. Shipped that way since Tabs did.
        "aria-disabled:cursor-not-allowed aria-disabled:text-ink-disabled",
        // Base UI leaves only the selected tab in the tab order (roving
        // tabindex), so the ring is the only thing telling a keyboard user
        // where they are.
        "focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <span
          data-slot="tabs-count"
          className={cn(
            // A 16px circle, as drawn — min-h as well as min-w, or a
            // single-digit count renders as a 16x12 lozenge and only a
            // two-digit one looks round.
            "flex min-h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-xs",
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
      className={cn("focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none", className)}
    />
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
});
