import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type ChangeEvent,
  type FieldsetHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { motionMicro } from "@/lib/motion";
import { composeEventHandlers } from "@/lib/compose-event-handlers";
import { useControllableState } from "@/hooks/use-controllable-state";

export type RadioGroupOrientation = "vertical" | "horizontal";

/**
 * Control geometry, transcribed from the sheet.
 *
 * 18px circle with an 8px dot. `size-4.5` resolves through the spacing scale
 * rather than an arbitrary `[18px]`, and it is deliberately the same
 * expression Checkbox uses — the two sit in one column and a 0.5px difference
 * between them is the kind of thing nobody notices and nothing catches.
 */
const CONTROL = "size-4.5";
const DOT = "size-2";

interface RadioGroupShape {
  name: string;
  value: string | undefined;
  setValue: (next: string) => void;
  isDisabled: boolean;
  isInvalid: boolean;
  /**
   * The group's error and helper ids, wired to every INPUT rather than to the
   * fieldset. `aria-describedby` on a fieldset is read inconsistently, and the
   * input is the thing that takes focus — so the message has to hang off the
   * element the reader is standing on.
   */
  describedBy: string | undefined;
}

/**
 * The group is the component and the option is its item.
 *
 * Everything that makes a set of radios a CONTROL belongs to the set: the
 * question being answered, which one is chosen, whether the answer is
 * required, whether the whole thing is disabled. An `<Radio>` on its own is
 * not a control at all — it is one alternative — and an API that lets you
 * render one without a group is an API that lets you ship a radio nobody can
 * name.
 */
const RadioGroupContext = createContext<RadioGroupShape | null>(null);

function useRadioGroup(): RadioGroupShape {
  const shape = useContext(RadioGroupContext);
  if (!shape) {
    throw new Error("<Radio> must be rendered inside a <RadioGroup>. See radio.doc.ts § composition.");
  }
  return shape;
}

interface RadioGroupOwnProps {
  /**
   * The question the set answers, rendered as the `<legend>`. Required, like
   * every field in this library (§10) — a radio group with no legend
   * announces each option with no idea what it is an option FOR.
   */
  label: string;
  /** Keeps the legend for assistive tech and takes it off the screen. */
  isLabelHidden?: boolean;
  /** `<Radio>` items. */
  children: ReactNode;
  /**
   * The shared `name`. Generated if omitted, and the generated one is what
   * makes arrow keys work: same-name radios are one group to the platform, and
   * two groups on a page that both defaulted to "radio" would be one group.
   */
  name?: string;
  /** Controlled selection, by option value. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Horizontal is for two or three short options. A row of long labels makes
   * the reader hunt for which circle belongs to which words, which is why the
   * default is vertical rather than the other way round.
   */
  orientation?: RadioGroupOrientation;
  /** Disables every option in the set. */
  isDisabled?: boolean;
  /**
   * Marks the set invalid. `errorText` implies this, so it is only needed for
   * a group whose error is displayed somewhere else.
   */
  isInvalid?: boolean;
  /** What is wrong, under the last option. Its presence sets `aria-invalid`. */
  errorText?: string;
  /** Constraints or context, under the last option. */
  helperText?: string;
}

export interface RadioGroupProps
  extends RadioGroupOwnProps,
    Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, keyof RadioGroupOwnProps> {}

/**
 * One choice from a set that stays visible.
 *
 * A real `<fieldset>` with a real `<legend>` around real `<input type="radio">`
 * elements, which is the entire reason this component reaches for nothing:
 * the platform already gives a same-`name` set arrow-key navigation, a single
 * tab stop, the roving `tabindex` equivalent, form participation and the
 * legend as part of every option's accessible name. A `role="radiogroup"` of
 * divs re-implements all five, and usually gets the tab stop wrong.
 */
export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(function RadioGroup(
  {
    label,
    isLabelHidden = false,
    children,
    name,
    value,
    defaultValue,
    onValueChange,
    orientation = "vertical",
    isDisabled = false,
    isInvalid = false,
    errorText,
    helperText,
    className,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const groupName = name ?? `radio-${reactId}`;
  const errorId = `${reactId}-error`;
  const helperId = `${reactId}-helper`;

  const [selected, setSelected] = useControllableState<string | undefined>({
    ...(value !== undefined ? { value } : {}),
    defaultValue,
    ...(onValueChange ? { onChange: (next) => next !== undefined && onValueChange(next) } : {}),
  });

  // An error message present without aria-invalid is a group that looks wrong
  // and does not say so. Same derivation Input makes.
  const invalid = isInvalid || Boolean(errorText);

  const describedBy =
    [errorText ? errorId : null, helperText ? helperId : null].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset
      {...rest}
      ref={ref}
      data-slot="radio-group"
      data-orientation={orientation}
      // `min-w-0`: a fieldset's default `min-width: min-content` ignores flex
      // shrinking, so a group of long labels overflows its column instead of
      // wrapping. The one thing a fieldset costs.
      className={cn("flex min-w-0 flex-col gap-md", className)}
      disabled={isDisabled}
    >
      <legend
        data-slot="radio-group-label"
        className={cn(
          "text-label-md font-body font-bold leading-snug tracking-tight text-ink-primary",
          // A legend is not in the flow the way a heading is — it wants the
          // group's gap rather than a margin of its own, and `float-none` is
          // what puts it back in the column in every browser.
          "float-none p-0",
          isLabelHidden && "sr-only",
        )}
      >
        {label}
      </legend>

      <div
        data-slot="radio-group-options"
        className={cn(
          "flex min-w-0",
          orientation === "vertical" ? "flex-col" : "flex-wrap items-center gap-xl",
          // The gap steps from 8 to 12 the moment any option carries a
          // description, because two-line options need the extra separation to
          // still read as rows. Done with `has-*` rather than a prop: the group
          // cannot inspect its children, and asking the caller to declare what
          // their own children look like is a prop whose whole job is to
          // describe the markup underneath it.
          //
          // The two are written as a MUTUALLY EXCLUSIVE pair rather than a base
          // plus an override. `gap-sm` and `has-…:gap-md` carry different
          // modifiers, so tailwind-merge does not see them as conflicting and
          // keeps both — leaving the winner to selector specificity, which
          // happens to be right here and is not something to depend on.
          orientation === "vertical" &&
            "not-has-data-[slot=radio-description]:gap-sm has-data-[slot=radio-description]:gap-md",
        )}
      >
        <RadioGroupContext.Provider
          value={{
            name: groupName,
            value: selected,
            setValue: setSelected,
            isDisabled,
            isInvalid: invalid,
            describedBy,
          }}
        >
          {children}
        </RadioGroupContext.Provider>
      </div>

      {errorText && (
        <p data-slot="radio-group-error" id={errorId} className="text-caption font-body text-danger">
          {errorText}
        </p>
      )}
      {helperText && (
        <p
          data-slot="radio-group-helper"
          id={helperId}
          className="text-caption font-body text-ink-muted"
        >
          {helperText}
        </p>
      )}
    </fieldset>
  );
});

interface RadioOwnProps {
  /** The value this option contributes to the group. Required. */
  value: string;
  /**
   * The label. Required, and it *is* the accessible name — the whole row is
   * one `<label>`, so there is no way to render a nameless radio.
   */
  children: ReactNode;
  /**
   * A second line under the label, for an option whose consequence is not
   * obvious from its name. Adding one switches the row to top alignment and
   * steps the group's gap.
   */
  description?: string;
  /** Disables this option only. The group's `isDisabled` disables all of them. */
  isDisabled?: boolean;
}

export interface RadioProps
  extends RadioOwnProps,
    Omit<
      InputHTMLAttributes<HTMLInputElement>,
      keyof RadioOwnProps | "type" | "checked" | "defaultChecked" | "disabled" | "name" | "size"
    > {}

/**
 * One option inside a `<RadioGroup>`.
 *
 * The whole row is the `<label>`, which makes the words part of the target
 * rather than a separate thing to aim at, and gives the input its accessible
 * name natively — no `aria-label`, nothing to keep in sync. The native input
 * is present and focusable; it is only visually replaced, which is what keeps
 * arrow-key navigation, form participation and `:disabled` for free.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { value, children, description, isDisabled = false, onChange, className, ...rest },
  ref,
) {
  const group = useRadioGroup();
  const checked = group.value === value;
  const disabled = isDisabled || group.isDisabled;
  const hasDescription = Boolean(description);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) group.setValue(value);
  };

  return (
    <label
      data-slot="radio"
      data-state={checked ? "checked" : "unchecked"}
      data-disabled={disabled || undefined}
      className={cn(
        "group inline-flex min-w-0 gap-sm",
        // The visible circle is 18px and the text line is 17px, so the row
        // would be a 19px target — under SC 2.5.8's 24px floor. The label is
        // the target and it is padded out to 24; the circle stays 18.
        "min-h-6",
        // One line centres against the circle. Two lines must not: the circle
        // belongs beside the LABEL, not floating between the label and the
        // description, so a described row aligns to the top instead — where an
        // 18px circle and a 13px/130% first line share a top edge and their
        // centres are half a pixel apart.
        hasDescription ? "items-start" : "items-center",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      {/*
        Visually hidden, NOT `display:none` or `hidden`: the input must stay
        focusable, tabbable and in the form. `sr-only` clips it instead.
      */}
      <input
        {...rest}
        ref={ref}
        type="radio"
        data-slot="input"
        className="peer sr-only"
        name={group.name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-invalid={group.isInvalid || undefined}
        {...(group.describedBy ? { "aria-describedby": group.describedBy } : {})}
        onChange={composeEventHandlers(onChange, handleChange)}
      />

      {/*
        The circle is a DIRECT sibling of the input, and it has to stay one.
        `peer-*` compiles to a general-sibling combinator (`.peer:focus-visible
        ~ &`), so a wrapper around the circle — which is what a described row
        looked like it needed — silently stops the focus ring from ever
        matching. Nothing fails: the classes resolve, the utilities gate passes,
        and the ring simply never paints. The browser test is what found it.

        The wrapper turned out to be unnecessary anyway. With `items-start` the
        18px circle and the 13px/130% first line share a top edge and their
        centres differ by half a pixel, which is the alignment the wrapper was
        being asked to produce.
      */}
      <span
        aria-hidden="true"
        data-slot="control"
        className={cn(
          CONTROL,
          "flex shrink-0 items-center justify-center rounded-full border",
          "transition-[background-color,border-color,box-shadow]",
          motionMicro,

          !checked && "bg-surface border-edge-control",
          checked && "bg-accent border-accent text-ink-on-accent",

          // Hover is DERIVED — no sheet draws one for a radio or a checkbox.
          // Unselected deepens its edge; selected steps to the accent's hover
          // role, so both ramps move one direction.
          !disabled && !checked && "group-hover:border-edge-strong",
          !disabled && checked && "group-hover:bg-accent-hover group-hover:border-accent-hover",

          // Invalid replaces the resting edge rather than adding to it — a
          // second edge on an 18px circle is a smudge. Same role Input uses.
          !disabled && group.isInvalid && !checked && "border-danger",

          disabled && "bg-sunken border-edge-subtle text-ink-disabled",

          // The ring is drawn on the circle because the real input is
          // clipped. Border colour alone would not clear SC 1.4.11 against
          // the resting edge, so the ring carries the indicator.
          "peer-focus-visible:border-edge-focus peer-focus-visible:shadow-(--ui-focus-ring)",
          "peer-focus-visible:forced-colors:outline peer-focus-visible:forced-colors:outline-2",
        )}
      >
        {checked && <span data-slot="dot" className={cn(DOT, "shrink-0 rounded-full bg-current")} />}
      </span>

      <span data-slot="radio-text" className="flex min-w-0 flex-col gap-xs">
        <span
          data-slot="label"
          className={cn(
            "text-label-md font-body font-medium leading-snug tracking-tight",
            disabled ? "text-ink-disabled" : "text-ink-primary",
          )}
        >
          {children}
        </span>
        {description && (
          <span
            data-slot="radio-description"
            className={cn(
              "text-caption font-body leading-normal tracking-tight",
              disabled ? "text-ink-disabled" : "text-ink-muted",
            )}
          >
            {description}
          </span>
        )}
      </span>
    </label>
  );
});
