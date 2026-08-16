import {
  forwardRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { composeEventHandlers } from "@/lib/compose-event-handlers";
import { useControllableState } from "@/hooks/use-controllable-state";

interface SwitchOwnProps {
  /**
   * The label. Required, and it IS the accessible name — the whole row is one
   * `<label>`, so there is no way to render a nameless switch.
   */
  children: ReactNode;
  /** Renders the label visually hidden rather than omitting it. */
  isLabelHidden?: boolean;
  isChecked?: boolean;
  defaultIsChecked?: boolean;
  isDisabled?: boolean;
  onCheckedChange?: (isChecked: boolean) => void;
}

export interface SwitchProps
  extends SwitchOwnProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      keyof SwitchOwnProps | "type" | "checked" | "defaultChecked" | "disabled" | "size"
    > {}

/**
 * A control that takes effect immediately, unlike a Checkbox, which states an
 * intention the surrounding form later submits.
 *
 * Built on a native `<input type="checkbox">` with `role="switch"`, not a
 * `<div>`: that keeps Space activation, form participation and `:disabled` for
 * free. `role="switch"` changes only how it is ANNOUNCED — "on/off" rather than
 * "checked" — which is the whole difference from Checkbox at the a11y layer.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    children,
    isLabelHidden = false,
    isChecked,
    defaultIsChecked = false,
    isDisabled = false,
    onCheckedChange,
    onChange,
    className,
    ...rest
  },
  ref,
) {
  const [checked, setChecked] = useControllableState({
    ...(isChecked !== undefined ? { value: isChecked } : {}),
    defaultValue: defaultIsChecked,
    ...(onCheckedChange ? { onChange: onCheckedChange } : {}),
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
  };

  return (
    <label
      data-slot="switch"
      data-state={checked ? "on" : "off"}
      data-disabled={isDisabled || undefined}
      className={cn(
        // items-center matches the sheet and keeps the label beside the track
        // rather than at the top of the 24px target (the Checkbox lesson).
        "group inline-flex min-h-6 items-center gap-sm",
        isDisabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <input
        {...rest}
        ref={ref}
        type="checkbox"
        role="switch"
        data-slot="input"
        className="peer sr-only"
        checked={checked}
        disabled={isDisabled}
        onChange={composeEventHandlers(onChange, handleChange)}
      />

      <span
        data-slot="track"
        aria-hidden="true"
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border",
          "transition-[background-color,border-color,box-shadow]", motionMicro,
          // The sheet fills the OFF track with --ui-text-placeholder, a text
          // role used as a background. `edge-strong` is the same value on a
          // non-text role and clears the 3:1 a control boundary needs — see
          // knownGaps: a dedicated track role is probably the right answer.
          checked ? "bg-accent-legible border-accent-legible" : "bg-edge-strong border-edge-strong",
          !isDisabled && !checked && "group-hover:bg-edge-control group-hover:border-edge-control",
          !isDisabled && checked && "group-hover:bg-accent-hover group-hover:border-accent-hover",
          isDisabled && "bg-sunken border-edge-subtle",
          "peer-focus-visible:shadow-(--ui-focus-ring) peer-focus-visible:forced-colors:outline peer-focus-visible:forced-colors:outline-2",
        )}
      >
        <span
          data-slot="thumb"
          className={cn(
            "absolute top-px size-4 rounded-full bg-surface shadow-sm",
            // Travel, not a layout change: transform animates on the compositor
            // and leaves the track's geometry untouched.
            "transition-transform", motionMicro,
            checked ? "translate-x-4" : "translate-x-px",
          )}
        />
      </span>

      <span
        data-slot="label"
        className={cn(
          "text-label-md font-body font-medium leading-snug",
          isLabelHidden && "sr-only",
          isDisabled ? "text-ink-disabled" : "text-ink-primary",
        )}
      >
        {children}
      </span>
    </label>
  );
});
