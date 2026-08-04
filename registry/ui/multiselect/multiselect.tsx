"use client";

import { Combobox as BaseCombobox } from "@base-ui-components/react/combobox";
import { Check, ChevronDown, Close, Search } from "griddy-icons";
import { useId, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";
import { Badge } from "@/ui/badge/badge.tsx";

/** See the identical note in popover.tsx — one shim, one file. */
const forBaseUI = <T,>(props: object) => props as T;

export interface MultiselectItem {
  value: string;
  label: string;
  isDisabled?: boolean;
}

export interface MultiselectProps {
  /**
   * Required — every control has a name (§10). Use `isLabelHidden` when the
   * design shows none; a placeholder is not a label.
   */
  label: string;
  isLabelHidden?: boolean;
  items: readonly MultiselectItem[];
  /** Controlled selection, by item value. */
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: string[]) => void;
  /** Shown in the trigger when nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown in the list when the search matches nothing. */
  emptyMessage?: string;
  isDisabled?: boolean;
  className?: string;
}

/**
 * A filterable list of options where more than one can be chosen, with the
 * selection shown as removable chips beneath the trigger.
 *
 * The hardest ARIA pattern in the library, which is why none of it is written
 * here: the listbox/combobox roles, `aria-multiselectable`, active-descendant
 * management, typeahead, filtering and dismissal all come from Base UI
 * (ADR 0012). What lives here is the API, the anatomy and the design.
 *
 * The rows reuse Checkbox's *visual language* but not the Checkbox component.
 * The row itself is the option and carries the semantics; nesting a real
 * `<input type="checkbox">` inside `role="option"` would put a second control
 * inside the first, which is worse than the duplication it avoids.
 */
export function Multiselect({
  label,
  isLabelHidden = false,
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select",
  searchPlaceholder = "Search",
  emptyMessage = "No matches",
  isDisabled = false,
  className,
}: MultiselectProps) {
  const labelId = useId();
  const byValue = new Map(items.map((item) => [item.value, item]));

  return (
    <BaseCombobox.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Root>>({
        items: items as MultiselectItem[],
        multiple: true,
        disabled: isDisabled,
        itemToStringLabel: (item: MultiselectItem) => item.label,
        ...(value !== undefined ? { value: value.map((v) => byValue.get(v)).filter(Boolean) } : {}),
        ...(defaultValue !== undefined
          ? { defaultValue: defaultValue.map((v) => byValue.get(v)).filter(Boolean) }
          : {}),
        ...(onValueChange
          ? {
              onValueChange: (next: MultiselectItem[]) =>
                onValueChange(next.map((item) => item.value)),
            }
          : {}),
      })}
    >
      <div data-slot="multiselect" className={cn("flex w-full flex-col gap-sm", className)}>
        {/* Bare text inside a rounded surface takes the inset (§6). */}
        <span
          id={labelId}
          data-slot="multiselect-label"
          className={cn(
            "px-sm text-label-md font-body font-medium leading-normal text-ink-secondary",
            isLabelHidden && "sr-only",
          )}
        >
          {label}
        </span>

        <BaseCombobox.Trigger
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Trigger>>({
            "data-slot": "multiselect-trigger",
            "aria-labelledby": labelId,
            className: cn(
              "flex h-12 w-full items-center justify-between gap-sm rounded-md px-lg",
              "border-[1.5px] bg-base border-edge-subtle text-body-md font-body font-medium text-ink-primary",
              "transition-[border-color,box-shadow] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
              "enabled:hover:border-edge-default enabled:cursor-pointer",
              "focus-visible:border-edge-focus focus-visible:shadow-(--ui-focus-ring) focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-disabled",
            ),
          })}
        >
          {/* ComboboxValue takes only `children` — no className — so the
              styling lives on a span around it. */}
          <span data-slot="multiselect-value" className="min-w-0 flex-1 truncate text-left">
            <BaseCombobox.Value>
              {(selected: MultiselectItem[]) =>
                selected.length === 0 ? (
                  <span className="text-ink-placeholder">{placeholder}</span>
                ) : (
                  `${selected.length} selected`
                )
              }
            </BaseCombobox.Value>
          </span>
          <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-ink-secondary" />
        </BaseCombobox.Trigger>

        {/*
          Chips are our own Badge with a real remove button, rather than Base
          UI's Chip parts: a chip here is a label plus one control, and the
          Badge already owns that shape. See knownGaps for what that forgoes.
        */}
        <BaseCombobox.Chips
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Chips>>({
            "data-slot": "multiselect-chips",
            className: "flex flex-wrap items-center gap-sm px-xs empty:hidden",
          })}
        >
          <BaseCombobox.Value>
            {(selected: MultiselectItem[]) =>
              selected.map((item) => (
                // Combobox.Chip supplies the context ChipRemove needs, so the
                // Badge nests inside it. `contents` keeps the wrapper out of
                // the layout — the Badge stays the chip, visually and in the
                // DOM box tree.
                <BaseCombobox.Chip
                  key={item.value}
                  {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Chip>>({
                    value: item,
                    className: "contents",
                  })}
                >
                  <Badge
                    variant="unselected"
                    iconEnd={
                      <BaseCombobox.ChipRemove
                        {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.ChipRemove>>({
                          "aria-label": `Remove ${item.label}`,
                          className:
                            "flex size-4 cursor-pointer items-center justify-center rounded-sm text-current",
                        })}
                      >
                        <Close size={12} aria-hidden="true" />
                      </BaseCombobox.ChipRemove>
                    }
                  >
                    {item.label}
                  </Badge>
                </BaseCombobox.Chip>
              ))
            }
          </BaseCombobox.Value>
        </BaseCombobox.Chips>

        <BaseCombobox.Portal>
          <BaseCombobox.Positioner sideOffset={8} className="z-50">
            <BaseCombobox.Popup
              {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Popup>>({
                "data-slot": "multiselect-panel",
                className: cn(
                  "flex w-(--anchor-width) min-w-64 flex-col overflow-clip rounded-lg",
                  "bg-surface border border-edge-subtle shadow-md",
                  "transition-[opacity] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
                  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
                ),
              })}
            >
              <div className="p-md">
                <div className="flex h-8 items-center gap-sm rounded-md bg-base px-sm py-xs ring-1 ring-edge-subtle focus-within:ring-edge-focus">
                  <BaseCombobox.Input
                    {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Input>>({
                      "data-slot": "multiselect-search",
                      placeholder: searchPlaceholder,
                      "aria-label": `Search ${label}`,
                      className:
                        "min-w-0 flex-1 bg-transparent text-button-sm font-body font-medium tracking-tight text-ink-primary placeholder:text-ink-placeholder outline-none",
                    })}
                  />
                  <Search size={16} aria-hidden="true" className="shrink-0 text-ink-secondary" />
                </div>
              </div>

              <BaseCombobox.List
                {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.List>>({
                  "data-slot": "multiselect-list",
                  className: "flex max-h-64 flex-col gap-sm overflow-y-auto px-sm pb-md",
                })}
              >
                {(item: MultiselectItem) => (
                  <BaseCombobox.Item
                    key={item.value}
                    {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Item>>({
                      value: item,
                      disabled: item.isDisabled,
                      "data-slot": "multiselect-option",
                      className: cn(
                        "flex cursor-pointer items-center gap-sm rounded-sm p-md",
                        "text-button-sm font-body font-medium tracking-tight text-ink-primary",
                        "data-[highlighted]:bg-hover data-[selected]:bg-elevated",
                        "data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-disabled",
                      ),
                    })}
                  >
                    {/*
                      Checkbox's visual language, not the Checkbox component —
                      the option itself is the control.
                    */}
                    <span
                      aria-hidden="true"
                      data-slot="multiselect-option-box"
                      className={cn(
                        "flex size-4.5 shrink-0 items-center justify-center rounded-sm border",
                        "bg-surface border-edge-control",
                        "group-data-[disabled]:bg-sunken",
                        "in-data-[selected]:bg-accent in-data-[selected]:border-accent in-data-[selected]:text-ink-on-accent",
                      )}
                    >
                      <BaseCombobox.ItemIndicator>
                        <Check size={14} aria-hidden="true" />
                      </BaseCombobox.ItemIndicator>
                    </span>
                    <span className="flex-1">{item.label}</span>
                  </BaseCombobox.Item>
                )}
              </BaseCombobox.List>

              <BaseCombobox.Empty
                {...forBaseUI<ComponentPropsWithoutRef<typeof BaseCombobox.Empty>>({
                  "data-slot": "multiselect-empty",
                  className: "px-lg pb-md text-button-sm font-body font-medium text-ink-muted",
                })}
              >
                {emptyMessage}
              </BaseCombobox.Empty>
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
      </div>
    </BaseCombobox.Root>
  );
}
