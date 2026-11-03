import {
  forwardRef,
  useId,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { composeEventHandlers } from "@/lib/compose-event-handlers";
import { useControllableState } from "@/hooks/use-controllable-state";

export type SwitchLabelPlacement = "end" | "start";

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
  /**
   * Which side of the control the label sits on. `end` (default) is the
   * shipped row: control, then label. `start` is the SETTINGS ROW — label
   * first, the control pinned to the row's end in a fixed lane, the row
   * full-width — so a stack of rows forms one column of controls (#9). Visual
   * order only: the input stays first in the DOM, so the peer styling and the
   * reading order are unchanged, and in RTL the sides mirror with the text.
   */
  labelPlacement?: SwitchLabelPlacement;
  /**
   * A line under the label — what the setting does. body-sm in the muted ink,
   * gap-xs below the label, and part of the hit target (it is inside the
   * <label>). Announced as the input's DESCRIPTION, not its name: the name is
   * pinned to the label text with aria-labelledby, so a long description is
   * not read out as the control's name. With a description the row aligns to
   * the top and the control sits on the label's first line.
   */
  description?: ReactNode;
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
    labelPlacement = "end",
    description,
    onCheckedChange,
    onChange,
    className,
    ...rest
  },
  ref,
) {
  const labelId = useId();
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== null && description !== false;
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
        "group min-h-6 gap-sm",
        // `start` is the settings row: full width, label first, the track
        // pinned to the end in its fixed 36px lane. Reversed VISUALLY only —
        // the input stays before the track for the peer-* selectors.
        labelPlacement === "start" ? "flex w-full flex-row-reverse justify-between" : "inline-flex",
        // With a description the track sits on the label's first line.
        hasDescription ? "items-start" : "items-center",
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
        {...(hasDescription
          ? {
              // The name stays the label TEXT; the description is announced
              // after it rather than read as part of the name.
              "aria-labelledby": rest["aria-labelledby"] ?? labelId,
              "aria-describedby": [descriptionId, rest["aria-describedby"]].filter(Boolean).join(" "),
            }
          : {})}
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
          //
          // ON IS DRAWN FROM `:checked`, NOT FROM REACT STATE (#34): a
          // statically rendered switch still toggles its native input, and
          // painting from `checked` left it visually off until hydration.
          "bg-edge-strong border-edge-strong",
          !isDisabled && "peer-checked:bg-accent-legible peer-checked:border-accent-legible",
          !isDisabled && "group-hover:bg-edge-control group-hover:border-edge-control",
          // Both variants, so it outranks the off hover by specificity.
          !isDisabled && "group-hover:peer-checked:bg-accent-hover group-hover:peer-checked:border-accent-hover",
          isDisabled && "bg-sunken border-edge-subtle",
          // The thumb is the track's child, so the track carries its travel.
          "peer-checked:[&>[data-slot=thumb]]:translate-x-4",
          "peer-focus-visible:shadow-(--ui-focus-ring) peer-focus-visible:forced-colors:outline peer-focus-visible:forced-colors:outline-focus",
        )}
      >
        <span
          data-slot="thumb"
          className={cn(
            "absolute top-px size-4 rounded-full bg-surface shadow-sm",
            // Travel, not a layout change: transform animates on the compositor
            // and leaves the track's geometry untouched.
            "transition-transform", motionMicro,
            "translate-x-px",
          )}
        />
      </span>

      {hasDescription ? (
        <span data-slot="text" className={cn("flex min-w-0 flex-1 flex-col gap-xs", isLabelHidden && "sr-only")}>
          <span
            id={labelId}
            data-slot="label"
            className={cn("text-label-md font-body", isDisabled ? "text-ink-disabled" : "text-ink-primary")}
          >
            {children}
          </span>
          <span
            id={descriptionId}
            data-slot="description"
            className={cn("text-body-sm font-body", isDisabled ? "text-ink-disabled" : "text-ink-muted")}
          >
            {description}
          </span>
        </span>
      ) : (
        <span
          data-slot="label"
          className={cn(
            "text-label-md font-body",
            isLabelHidden && "sr-only",
            labelPlacement === "start" && "min-w-0 flex-1",
            isDisabled ? "text-ink-disabled" : "text-ink-primary",
          )}
        >
          {children}
        </span>
      )}
    </label>
  );
});
