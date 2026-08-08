"use client";

import { Popover as BasePopover } from "@base-ui-components/react/popover";
import { ChevronDown, ChevronUp } from "griddy-icons";
import { useId, useRef, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";
import { Calendar } from "@/ui/calendar";
import { useControllableState } from "@/hooks/use-controllable-state";

/**
 * Absorbs one impedance mismatch, in one place — see the identical note in
 * `select.tsx`. This repo compiles with `exactOptionalPropertyTypes`; Base UI
 * declares its props the looser way, so spreading our optionals into its parts
 * fails to type-check even when every value is right at runtime. Contained to
 * the one file `check:boundaries` already isolates.
 */
const forBaseUI = <T,>(props: object) => props as T;

/**
 * Input's control geometry at `lg`, character for character.
 *
 * Copied rather than imported for the same reason Select copies it: the
 * registry ships components as files a consumer owns, so one cannot reach into
 * another's module for a private constant. The browser test renders a
 * DatePicker beside a Select and compares their COMPUTED height, radius,
 * border and colour — asserting `48px` on each would pass while the two
 * silently drifted apart, which is the only failure that matters here.
 */
const CONTROL = "h-12 gap-sm px-md py-sm";

export interface DatePickerProps {
  /**
   * Required — a placeholder is not a label. It disappears the moment a date
   * is chosen, taking the field's name with it (CONVENTIONS §10).
   */
  label: string;
  isLabelHidden?: boolean;
  /** Controlled selection. `null` means no date is chosen. */
  value?: Date | null;
  defaultValue?: Date | null;
  /** Always `onValueChange(value)` — never onSelect/onChange (§1). */
  onValueChange?: (value: Date | null) => void;
  /** Controlled open state. Omit and the field owns it. */
  isOpen?: boolean;
  defaultIsOpen?: boolean;
  /** Always `onOpenChange(isOpen)` — never onOpen + onClose (§1). */
  onOpenChange?: (isOpen: boolean) => void;
  /** What the field shows while empty. Not the accessible name. */
  placeholder?: string;
  isDisabled?: boolean;
  /** Persistent guidance. Stays visible alongside an error. */
  helperText?: string;
  /** The error message. Its presence marks the field invalid. */
  errorText?: string;
  /**
   * How a chosen date is rendered in the field.
   *
   * Defaults to `Intl` at `dateStyle: "long"`, so a consumer in another locale
   * gets their own format without this library shipping a date library. The
   * sheet draws "August 3rd, 2026"; no `Intl` option produces an English
   * ordinal, and hand-rolling one would be correct in exactly one language.
   */
  formatValue?: (value: Date) => string;
  /** Controlled visible month. Any date within it will do. */
  month?: Date;
  defaultMonth?: Date;
  onMonthChange?: (month: Date) => void;
  /** Marks a date unselectable. It stays focusable, so it can be read. */
  isDateDisabled?: (date: Date) => boolean;
  /** 0 = Sunday, as the sheet draws it. 1 = Monday. */
  weekStartsOn?: 0 | 1;
  /** Which day is "today". See the fuller note on `Calendar`. */
  today?: Date;
  /**
   * Where to portal the panel. Defaults to `document.body`.
   *
   * Theme tokens are INHERITED custom properties, so a panel portalled to the
   * body leaves any brand scope on a wrapper and paints theme zero. Pass the
   * themed element to bring it back inside.
   */
  container?: HTMLElement | null;
  className?: string;
}

/**
 * A date field that opens a Calendar.
 *
 * Two things this system already owns, composed: the field is Input's control
 * surface — a field is a field — and the panel is the Calendar card itself
 * rather than a second surface wrapped around one.
 *
 * Anchoring, dismissal, focus restoration and the `aria-expanded` /
 * `aria-controls` wiring come from the Base UI behaviour layer (ADR 0012),
 * wrapped so no third-party type reaches a public prop signature. The date
 * grid, its ARIA and its keyboard contract are ours (see `calendar.tsx`).
 */
export function DatePicker({
  label,
  isLabelHidden = false,
  value,
  defaultValue = null,
  onValueChange,
  isOpen,
  defaultIsOpen,
  onOpenChange,
  placeholder = "Pick a date",
  isDisabled = false,
  helperText,
  errorText,
  formatValue,
  month,
  defaultMonth,
  onMonthChange,
  isDateDisabled,
  weekStartsOn = 0,
  today,
  container,
  className,
}: DatePickerProps) {
  const labelId = useId();
  const helperId = useId();
  const errorId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const invalid = Boolean(errorText);

  const [selected, setSelected] = useControllableState<Date | null>({
    ...(value !== undefined ? { value } : {}),
    defaultValue,
    ...(onValueChange ? { onChange: onValueChange } : {}),
  });

  /**
   * Open state runs through the shared hook (§4) rather than being left to the
   * behaviour layer as Popover's does, because this component has to CLOSE the
   * panel itself when a date is chosen. A surface you can only open is not a
   * contract you can keep, and Base UI offers no imperative close.
   */
  const [open, setOpen] = useControllableState<boolean>({
    ...(isOpen !== undefined ? { value: isOpen } : {}),
    defaultValue: defaultIsOpen ?? false,
    ...(onOpenChange ? { onChange: onOpenChange } : {}),
  });

  // Both are announced when both exist: an error rarely makes the guidance
  // irrelevant, and dropping it mid-correction is exactly when it is needed.
  const describedBy =
    [errorText ? errorId : null, helperText ? helperId : null].filter(Boolean).join(" ") || undefined;

  const display = selected
    ? (formatValue ?? ((date: Date) => new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date)))(selected)
    : null;

  return (
    <BasePopover.Root
      {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Root>>({
        open,
        onOpenChange: (next: boolean) => setOpen(next),
      })}
    >
      <div data-slot="date-picker" className={cn("flex w-full min-w-56 flex-col gap-sm", className)}>
        <span
          id={labelId}
          data-slot="date-picker-label"
          className={cn(
            "text-label-md font-body font-medium leading-normal text-ink-secondary",
            // Bare text inside a rounded surface takes the inset (§6) — but
            // the two are alternatives, not layers: `sr-only` resets padding
            // to 0 and a later `px-sm` puts 16px of it back, so a "hidden"
            // label ends up a 16px-wide clipped box instead of a 1px one.
            // Harmless, and the kind of harmless that makes the next person
            // doubt the utility works. (Select, Multiselect and Input still
            // compose them the layered way.)
            isLabelHidden ? "sr-only" : "px-sm",
          )}
        >
          {label}
        </span>

        <BasePopover.Trigger
          {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Trigger>>({
            "data-slot": "date-picker-trigger",
            "aria-labelledby": labelId,
            ...(describedBy ? { "aria-describedby": describedBy } : {}),
            ...(invalid ? { "aria-invalid": true } : {}),
            disabled: isDisabled,
            className: cn(
              "flex w-full items-center justify-between rounded-md",
              CONTROL,
              "border-[1.5px] bg-field border-edge-subtle text-body-md font-body font-medium text-ink-primary",
              "transition-[border-color,box-shadow] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
              "enabled:hover:border-edge-default enabled:cursor-pointer",
              "[&_svg]:size-4 [&_svg]:shrink-0",
              invalid && "border-danger",
              "focus-visible:border-edge-focus focus-visible:shadow-(--ui-focus-ring) focus-visible:forced-colors:outline focus-visible:forced-colors:outline-2 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-disabled",
            ),
          })}
        >
          <span data-slot="date-picker-value" className="min-w-0 flex-1 truncate text-left">
            {/* A placeholder is NOT the accessible name — the label is. This
                is only what the box shows while empty. */}
            {display ?? <span className="text-ink-placeholder">{placeholder}</span>}
          </span>
          <span data-slot="date-picker-icon" className="shrink-0 text-ink-muted">
            {open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </span>
        </BasePopover.Trigger>

        <BasePopover.Portal {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Portal>>(container ? { container } : {})}>
          <BasePopover.Positioner
            {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Positioner>>({
              side: "bottom",
              align: "start",
              sideOffset: 8,
              // Keeps the panel off the viewport edge when Base UI flips or
              // shifts it. What flipping cannot do is make a panel SMALLER
              // than the space it lands in, which is what the two caps below
              // are for (§7c).
              collisionPadding: 8,
              className: "z-50",
            })}
          >
            <BasePopover.Popup
              {...forBaseUI<ComponentPropsWithoutRef<typeof BasePopover.Popup>>({
                "data-slot": "date-picker-panel",
                // Base UI gives the popup role="dialog", and a dialog with no
                // accessible name is announced as "dialog" and nothing else.
                // Found by the story-a11y project, not by review — which is
                // the argument for running axe on every story.
                "aria-label": label,
                // Land on the DAY, not on "Previous month".
                //
                // Base UI's default is the first focusable descendant, which
                // is the previous-month arrow — so opening a date field put
                // the keyboard three Tabs away from the thing it exists to
                // choose. The grid already knows which day is its roving tab
                // stop; this hands focus straight to it.
                ref: panelRef,
                initialFocus: () =>
                  panelRef.current?.querySelector<HTMLElement>('[data-slot="calendar-day"][tabindex="0"]') ?? true,
                className: cn(
                  // No fill, no edge, no radius of its own: the Calendar card
                  // IS the panel. Wrapping one surface in another would draw
                  // two boundaries where the sheet draws one.
                  "max-h-(--available-height) max-w-(--available-width) overflow-y-auto",
                  "transition-[opacity,scale] duration-(--ui-duration-fast) ease-(--ui-ease-out)",
                  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
                  "data-[starting-style]:scale-98 data-[ending-style]:scale-98",
                  "origin-(--transform-origin)",
                ),
              })}
            >
              <Calendar
                label={label}
                value={selected}
                onValueChange={(next) => {
                  setSelected(next);
                  // Choosing closes; CLEARING does not. Clicking the selected
                  // day again empties the field, and the next thing that user
                  // wants is another date — closing the panel under them would
                  // make them reopen it to finish one action.
                  if (next) setOpen(false);
                }}
                {...(month !== undefined ? { month } : {})}
                {...(defaultMonth !== undefined ? { defaultMonth } : {})}
                {...(onMonthChange ? { onMonthChange } : {})}
                {...(isDateDisabled ? { isDateDisabled } : {})}
                {...(today !== undefined ? { today } : {})}
                weekStartsOn={weekStartsOn}
              />
            </BasePopover.Popup>
          </BasePopover.Positioner>
        </BasePopover.Portal>

        {errorText && (
          <p data-slot="date-picker-error" id={errorId} className="px-sm text-caption font-body text-danger">
            {errorText}
          </p>
        )}
        {helperText && (
          <p data-slot="date-picker-helper" id={helperId} className="px-sm text-caption font-body text-ink-muted">
            {helperText}
          </p>
        )}
      </div>
    </BasePopover.Root>
  );
}
