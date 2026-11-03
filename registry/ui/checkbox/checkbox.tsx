import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Check, Minus } from "griddy-icons";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { composeEventHandlers } from "@/lib/compose-event-handlers";
import { useControllableState } from "@/hooks/use-controllable-state";

export type CheckboxState = "checked" | "unchecked" | "mixed";
export type CheckboxLabelPlacement = "end" | "start";

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
  /**
   * Which side of the control the label sits on. `end` (default) is the
   * shipped row: control, then label. `start` is the SETTINGS ROW — label
   * first, the control pinned to the row's end in a fixed lane, the row
   * full-width — so a stack of rows forms one column of controls (#9). Visual
   * order only: the input stays first in the DOM, so the peer styling and the
   * reading order are unchanged, and in RTL the sides mirror with the text.
   */
  labelPlacement?: CheckboxLabelPlacement;
  /**
   * A line under the label — what the setting does. body-sm in the muted ink,
   * gap-xs below the label, and part of the hit target (it is inside the
   * <label>). Announced as the input's DESCRIPTION, not its name: the name is
   * pinned to the label text with aria-labelledby, so a long description is
   * not read out as the control's name. With a description the row aligns to
   * the top and the control sits on the label's first line.
   */
  description?: ReactNode;
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
  };

  const state: CheckboxState = isIndeterminate ? "mixed" : checked ? "checked" : "unchecked";

  return (
    <label
      data-slot="checkbox"
      data-state={state}
      data-disabled={isDisabled || undefined}
      className={cn(
        "group gap-sm",
        // `start` is the settings row: full width, label first, the control
        // pinned to the end. Reversed VISUALLY only — the input must stay
        // before the box in the DOM for every peer-* selector below.
        labelPlacement === "start" ? "flex w-full flex-row-reverse justify-between" : "inline-flex",
        // With a description the control sits on the label's FIRST line;
        // without one the row centres, as the comment below explains.
        hasDescription ? "items-start" : "items-center",
        // The visible box is 18px and the text line is 17px, so the row would
        // be a 19px target — under the 24px floor of WCAG 2.5.8. The label is
        // the target and it is padded out to 24px; the box stays 18px.
        //
        // `items-center`, not `items-start`: the 24px minimum was making the
        // 17px label hug the top of the row instead of sitting beside the box,
        // which is what the sheet draws (its row is `align-items: center`).
        // The trade is that a label wrapping to several lines centres against
        // the box rather than aligning to its first line — see knownGaps.
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
        {...rest}
        ref={setRefs}
        type="checkbox"
        data-slot="input"
        {...(hasDescription
          ? {
              // The name stays the label TEXT; the description is announced
              // after it. Wrapping both in the <label> would otherwise make
              // the description part of the name.
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
        data-slot="control"
        aria-hidden="true"
        className={cn(
          BOX,
          "mt-px flex shrink-0 items-center justify-center rounded-sm border",
          "transition-[background-color,border-color,box-shadow]", motionMicro,

          // CHECKED IS DRAWN FROM `:checked`, NOT FROM REACT STATE (#34). A
          // statically rendered page (Astro without `client:*`, SSR before
          // hydration) still toggles the native input on click, and a box
          // painted from `data-state` stayed empty while the form submitted
          // "on". `peer-checked:` follows the input itself, so the control
          // works with no JavaScript at all. Mixed stays render-time: the
          // `indeterminate` property has no HTML attribute, so it cannot
          // exist without JavaScript anyway.
          state === "mixed"
            ? "bg-sunken border-edge-strong text-ink-primary"
            : cn(
                "bg-surface border-edge-control",
                !isDisabled && "peer-checked:bg-accent peer-checked:border-accent peer-checked:text-ink-on-accent",
                // The glyph is always in the DOM and shown by the same
                // selector, so it appears without a re-render.
                "[&>svg]:invisible peer-checked:[&>svg]:visible",
              ),

          // Hover is DERIVED — the sheet draws no hover state. Unchecked
          // deepens its edge; the filled states step to the accent's hover
          // role, mirroring Button. The checked hover carries both variants,
          // so it outranks the unchecked one by specificity, not by order.
          !isDisabled && state !== "mixed" && "group-hover:border-edge-strong",
          !isDisabled &&
            state !== "mixed" &&
            "group-hover:peer-checked:bg-accent-hover group-hover:peer-checked:border-accent-hover",

          isDisabled && "bg-sunken border-edge-subtle text-ink-disabled",

          // The ring is drawn on the box because the real input is clipped.
          // Border colour alone would not clear SC 1.4.11 against the resting
          // edge, so the ring carries the indicator.
          "peer-focus-visible:border-edge-focus peer-focus-visible:shadow-(--ui-focus-ring) peer-focus-visible:forced-colors:outline peer-focus-visible:forced-colors:outline-focus",
        )}
      >
        {state === "mixed" ? (
          <Minus size={GLYPH_PX} aria-hidden="true" />
        ) : (
          <Check size={GLYPH_PX} aria-hidden="true" />
        )}
      </span>

      {hasDescription ? (
        <span data-slot="text" className="flex min-w-0 flex-1 flex-col gap-xs">
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
