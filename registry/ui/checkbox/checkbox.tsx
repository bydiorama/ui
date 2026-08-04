import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Check, Minus } from "griddy-icons";

import { cn } from "@/lib/cn";
import { useControllableState } from "@/hooks/use-controllable-state";

export type CheckboxState = "checked" | "unchecked" | "mixed";

/**
 * Box geometry, transcribed from the approved design.
 *
 * 18px box with a 14px glyph. `size-4.5` resolves through Tailwind's spacing
 * scale rather than an arbitrary `[18px]`, so it stays inside the theme.
 */
const BOX = "size-4.5";
const GLYPH_PX = 14;

interface CheckboxOwnProps {
  /**
   * The label. Required, and it *is* the accessible name — the whole row is
   * one `<label>`, so there is no way to render a nameless checkbox.
   */
  children: ReactNode;
  /** Controlled checked state. Omit to let the component own it. */
  isChecked?: boolean;
  /** Starting state when uncontrolled. */
  defaultIsChecked?: boolean;
  /**
   * The mixed state of a parent whose children are partly selected. Always
   * controlled: only the caller knows what the children are doing. Clicking a
   * mixed checkbox reports `true` — resolving mixed is the caller's job.
   */
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  /** Fires with the new state on every change, controlled or not. */
  onCheckedChange?: (isChecked: boolean) => void;
}

export interface CheckboxProps
  extends CheckboxOwnProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      keyof CheckboxOwnProps | "type" | "checked" | "defaultChecked" | "disabled" | "size"
    > {}

/**
 * A single checkbox with its label as one control.
 *
 * The whole row is the `<label>`, which makes the label part of the target
 * rather than a separate thing to aim at, and gives the input its accessible
 * name natively — no `aria-label`, nothing to keep in sync.
 *
 * The native `<input type="checkbox">` is present and focusable; it is only
 * visually replaced. That keeps implicit activation (Space), form
 * participation, `:disabled`, and the `indeterminate` → `aria-checked="mixed"`
 * mapping for free, none of which survive a `<div role="checkbox">`.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    children,
    isChecked,
    defaultIsChecked = false,
    isIndeterminate = false,
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

  // `indeterminate` is a DOM PROPERTY with no HTML attribute — React will not
  // set it from JSX, so it has to be written to the node directly. This is the
  // whole reason the component keeps an internal ref.
  const innerRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = isIndeterminate;
  }, [isIndeterminate]);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
    // Ours first, then the consumer's (CONVENTIONS §5).
    onChange?.(event);
  };

  const state: CheckboxState = isIndeterminate ? "mixed" : checked ? "checked" : "unchecked";

  return (
    <label
      data-slot="checkbox"
      data-state={state}
      data-disabled={isDisabled || undefined}
      className={cn(
        "group inline-flex items-start gap-sm",
        // The visible box is 18px and the text line is 17px, so the row would
        // be a 19px target — under the 24px floor of WCAG 2.5.8. The label is
        // the target and it is padded out to 24px; the box stays 18px.
        "min-h-6",
        isDisabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      {/*
        Visually hidden, NOT `display:none` or `hidden`: the input must stay
        focusable, tabbable and in the form. `sr-only` clips it instead.
      */}
      <input
        ref={setRefs}
        type="checkbox"
        data-slot="input"
        className="peer sr-only"
        checked={checked}
        disabled={isDisabled}
        onChange={handleChange}
        {...rest}
      />

      <span
        data-slot="control"
        aria-hidden="true"
        className={cn(
          BOX,
          "mt-px flex shrink-0 items-center justify-center rounded-sm border",
          "transition-[background-color,border-color,box-shadow] duration-(--ui-duration-fast) ease-(--ui-ease-out)",

          state === "unchecked" && "bg-surface border-edge-control",
          state === "checked" && "bg-accent border-accent text-ink-on-accent",
          state === "mixed" && "bg-sunken border-edge-strong text-ink-primary",

          // Hover is DERIVED — the sheet draws no hover state. Unchecked
          // deepens its edge; the filled states step to the accent's hover
          // role, mirroring Button.
          !isDisabled && state === "unchecked" && "group-hover:border-edge-strong",
          !isDisabled &&
            state === "checked" &&
            "group-hover:bg-accent-hover group-hover:border-accent-hover",

          isDisabled && "bg-sunken border-edge-subtle text-ink-disabled",

          // The ring is drawn on the box because the real input is clipped.
          // Border colour alone would not clear SC 1.4.11 against the resting
          // edge, so the ring carries the indicator.
          "peer-focus-visible:border-edge-focus peer-focus-visible:shadow-(--ui-focus-ring)",
        )}
      >
        {state === "checked" && <Check size={GLYPH_PX} aria-hidden="true" />}
        {state === "mixed" && <Minus size={GLYPH_PX} aria-hidden="true" />}
      </span>

      <span
        data-slot="label"
        className={cn(
          "text-label-md font-body font-medium leading-snug",
          isDisabled ? "text-ink-disabled" : "text-ink-primary",
        )}
      >
        {children}
      </span>
    </label>
  );
});
