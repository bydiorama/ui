"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronDown } from "griddy-icons";
import { useId, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";

/**
 * Absorbs one impedance mismatch, in one place — see the identical note in
 * `modal.tsx`. This repo compiles with `exactOptionalPropertyTypes`; Base UI
 * declares its props the looser way, so spreading our optionals into its parts
 * fails to type-check even when every value is right at runtime. Contained to
 * the one file `check:boundaries` already isolates.
 */
const forBaseUI = <T,>(props: object) => props as T;

export type SelectSize = "lg" | "md" | "sm";

/**
 * Input's control geometry, character for character.
 *
 * Copied rather than imported because the registry ships components as files a
 * consumer owns — Select cannot reach into Input's module for a private
 * constant. The browser test renders both and compares their COMPUTED height,
 * radius, border and colour, so the two cannot drift apart quietly; asserting
 * `48px` on each would pass while they diverged, which is the only failure
 * that matters here.
 */
const SIZE = {
  lg: "h-12 gap-sm px-md py-sm text-body-md",
  md: "h-10 gap-xs p-sm text-caption",
  sm: "h-8 gap-xs px-sm py-xs text-caption",
} as const satisfies Record<SelectSize, string>;

export interface SelectItem {
  value: string;
  label: string;
  isDisabled?: boolean;
}

export interface SelectProps {
  /**
   * Required — a placeholder is not a label. It disappears the moment a value
   * is chosen, taking the field's name with it (CONVENTIONS §10).
   */
  label: string;
  isLabelHidden?: boolean;
  items: SelectItem[];
  /** Controlled. `null` means nothing is chosen. */
  value?: string | null;
  defaultValue?: string | null;
  /** Always `onValueChange(value)` — never onSelect/onChange (§1). */
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  size?: SelectSize;
  isDisabled?: boolean;
  /** Persistent guidance. Stays visible alongside an error. */
  helperText?: string;
  /** The error message. Its presence marks the field invalid. */
  errorText?: string;
  /** Where to portal the panel. See the fuller note in `sheet.tsx`. */
  container?: HTMLElement | null;
  className?: string;
}

/**
 * Choose ONE value from a list.
 *
 * The trigger is Input's control surface, exactly as Multiselect's is: a field
 * is a field, and three components inventing three variants of the same box is
 * how a system stops looking like one.
 *
 * Listbox ARIA, typeahead, roving focus, the value/trigger pairing and
 * dismissal all come from the Base UI behaviour layer (ADR 0012), wrapped so
 * no third-party type reaches a public prop signature.
 */
export function Select({
  label,
  isLabelHidden = false,
  items,
  value,
  defaultValue = null,
  onValueChange,
  placeholder = "Select…",
  size = "lg",
  isDisabled = false,
  helperText,
  errorText,
  container,
  className,
}: SelectProps) {
  const labelId = useId();
  const helperId = useId();
  const errorId = useId();
  const invalid = Boolean(errorText);

  // Both are announced when both exist: an error rarely makes the guidance
  // irrelevant, and dropping it mid-correction is exactly when it is needed.
  const describedBy =
    [errorText ? errorId : null, helperText ? helperId : null].filter(Boolean).join(" ") || undefined;

  return (
    <BaseSelect.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSelect.Root>>({
        items,
        ...(value !== undefined ? { value } : {}),
        ...(defaultValue !== undefined ? { defaultValue } : {}),
        disabled: isDisabled,
        ...(onValueChange ? { onValueChange: (next: string | null) => onValueChange(next) } : {}),
      })}
    >
      <div data-slot="select" className={cn("flex w-full min-w-56 flex-col gap-sm", className)}>
        {/* Bare text inside a rounded surface takes the inset (§6). */}
        <span
          id={labelId}
          data-slot="select-label"
          className={cn(
            "px-sm text-label-md font-body font-medium leading-normal text-ink-secondary",
            isLabelHidden && "sr-only",
          )}
        >
          {label}
        </span>

        <BaseSelect.Trigger
          {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSelect.Trigger>>({
            "data-slot": "select-trigger",
            "aria-labelledby": labelId,
            ...(describedBy ? { "aria-describedby": describedBy } : {}),
            ...(invalid ? { "aria-invalid": true } : {}),
            className: cn(
              "flex w-full items-center justify-between gap-sm rounded-md",
              SIZE[size],
              "border-[1.5px] bg-field border-edge-subtle text-body-md font-body font-medium text-ink-primary",
              "transition-[border-color,box-shadow]", motionMicro,
              "enabled:hover:border-edge-default enabled:cursor-pointer",
              invalid && "border-danger",
              "focus-visible:border-edge-focus focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-disabled",
            ),
          })}
        >
          <span data-slot="select-value" className="min-w-0 flex-1 truncate text-left">
            <BaseSelect.Value>
              {(selected: string | null) => {
                const chosen = items.find((item) => item.value === selected);
                return chosen ? (
                  chosen.label
                ) : (
                  // A placeholder is NOT the accessible name — the label is.
                  // This is only what the box shows while empty.
                  <span className="text-ink-placeholder">{placeholder}</span>
                );
              }}
            </BaseSelect.Value>
          </span>
          <BaseSelect.Icon
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSelect.Icon>>({
              "data-slot": "select-icon",
              className: "shrink-0 text-ink-muted [&_svg]:size-4 [&_svg]:shrink-0",
            })}
          >
            <ChevronDown />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>

        <BaseSelect.Portal {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSelect.Portal>>(container ? { container } : {})}>
          <BaseSelect.Positioner
            {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSelect.Positioner>>({
              // Base UI defaults this to TRUE: the panel overlaps the trigger
              // so the selected row's text sits on the trigger's value, iOS
              // style. The sheet draws the panel below the field, and the
              // default also ignores sideOffset — which reads as "the offset
              // prop does nothing" rather than as a positioning mode.
              //
              // Worse for testing: the docs say it "only applies to mouse
              // input", so the panel lands in one place from a click and
              // another from the keyboard. Every test here opened with a real
              // click and passed, because none asserted WHERE it landed.
              alignItemWithTrigger: false,
              sideOffset: 8,
              // Keep the panel off the viewport edge when Base UI flips or
              // shifts it. Flipping and shifting are on by default; what they
              // cannot do is make a panel SMALLER than the space it lands in,
              // which is what `--available-height` below is for (§7c).
              collisionPadding: 8,
              className: "z-50",
            })}
          >
            <BaseSelect.Popup
              {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSelect.Popup>>({
                "data-slot": "select-panel",
                className: cn(
                  // radius-md over a 4px inset around radius-sm rows:
                  // 4 + 4 = 8, concentric exactly (§6).
                  //
                  // The sheet draws radius-md over an EIGHT-px inset, which
                  // does not close — 4 + 8 wants a 12px outer radius and no
                  // 12px token exists. Of the three numbers, the inset is the
                  // one that carries the least meaning, so it is the one that
                  // moved; both radii are the sheet's own.
                  "min-w-(--anchor-width) rounded-md p-xs",
                  // Never taller or wider than the space Base UI measured.
                  // `max-h-64` was a fixed 256px that knew nothing about the
                  // viewport, so on a short window the panel simply ran off it.
                  "max-h-(--available-height) max-w-(--available-width) overflow-y-auto",
                  "border bg-surface border-edge-subtle shadow-md",
                  "transition-[opacity,scale]", motionMicro,
                  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
                  "data-[starting-style]:scale-98 data-[ending-style]:scale-98",
                ),
              })}
            >
              {items.map((item) => (
                <BaseSelect.Item
                  key={item.value}
                  {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSelect.Item>>({
                    value: item.value,
                    disabled: item.isDisabled ?? false,
                    "data-slot": "select-option",
                    className: cn(
                      // p-md — 12px on every side, as three of the sheet's
                      // four rows draw it and as both of Multiselect's do.
                      // The fourth (GVO-0) is drawn py-lg and is the outlier;
                      // flagged rather than followed.
                      "flex cursor-pointer items-center gap-sm rounded-sm p-md",
                      "text-body-md font-body font-medium text-ink-primary",
                      "data-[highlighted]:bg-hover",
                      "data-[selected]:font-bold",
                      "data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-disabled",
                    ),
                  })}
                >
                  <BaseSelect.ItemText
                    {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSelect.ItemText>>({
                      className: "min-w-0 flex-1 truncate",
                    })}
                  >
                    {item.label}
                  </BaseSelect.ItemText>
                  {/*
                    A tick, not colour alone. The selected row also goes bold —
                    two channels, because conveying selection by fill only is
                    WCAG 1.4.1, and the highlighted row already owns a fill.
                  */}
                  <BaseSelect.ItemIndicator
                    {...forBaseUI<ComponentPropsWithoutRef<typeof BaseSelect.ItemIndicator>>({
                      "data-slot": "select-indicator",
                      className: "shrink-0 text-ink-primary [&_svg]:size-4 [&_svg]:shrink-0",
                    })}
                  >
                    <Check />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>

        {errorText && (
          <p data-slot="select-error" id={errorId} className="px-sm text-caption font-body text-danger">
            {errorText}
          </p>
        )}
        {helperText && (
          <p data-slot="select-helper" id={helperId} className="px-sm text-caption font-body text-ink-muted">
            {helperText}
          </p>
        )}
      </div>
    </BaseSelect.Root>
  );
}
