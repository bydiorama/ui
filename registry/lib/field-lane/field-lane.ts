/**
 * The field family's TEXT LANE: where a field's label, helper and error text
 * start, so they line up with the text typed inside the control (#59 review,
 * 2026-11-23).
 *
 * The family used to give four answers. Input and Textarea set the label flush
 * with the box edge, so it sat 9.5px left of the typed text. Select,
 * Multiselect and Combobox inset it a fixed 8px (`px-sm`), which was 1.5px
 * short at md and 5.5px short at lg. DatePicker did both, with a flush label
 * over an 8px helper. In a form that mixes them, the labels zig-zag.
 *
 * The lane is the control's own left edge for its content: its border (the
 * hairline) plus its inline padding. That padding is a DENSITY token, so the
 * lane is written as a calc on the same tokens rather than as a spacing step,
 * and it moves with `data-ui-density` and with a brand's stroke exactly as the
 * control does. `px`, not `ps`, so a helper that wraps keeps the same margin
 * at the end.
 *
 * The maps are literal strings on purpose: Tailwind generates only class names
 * it can read in the source, so a template-built class would silently not
 * exist.
 */

export type FieldLaneSize = "lg" | "md" | "sm";

/**
 * Which inline padding the control uses, and so which lane its text follows.
 *
 * - `soft`: the plain field inset, `px-field-inset-*` (Textarea, Select,
 *   DatePicker, and Input or Combobox at shape="soft").
 * - `full`: the capsule, one spacing step wider so text clears the curve
 *   (Input and Combobox at shape="full").
 * - `themed`: Input with no shape given, which follows the brand's
 *   `--ui-field-shape-inset`.
 */
export type FieldLaneKind = "soft" | "full" | "themed";

const LANE = {
  soft: {
    lg: "px-[calc(var(--ui-stroke-hairline)+var(--ui-field-lg-inset))]",
    md: "px-[calc(var(--ui-stroke-hairline)+var(--ui-field-md-inset))]",
    sm: "px-[calc(var(--ui-stroke-hairline)+var(--ui-field-sm-inset))]",
  },
  full: {
    lg: "px-[calc(var(--ui-stroke-hairline)+var(--ui-field-lg-inset)+var(--ui-space-xs))]",
    md: "px-[calc(var(--ui-stroke-hairline)+var(--ui-field-md-inset)+var(--ui-space-xs))]",
    sm: "px-[calc(var(--ui-stroke-hairline)+var(--ui-field-sm-inset)+var(--ui-space-xs))]",
  },
  themed: {
    lg: "px-[calc(var(--ui-stroke-hairline)+var(--ui-field-lg-inset)+var(--ui-field-shape-inset,0px))]",
    md: "px-[calc(var(--ui-stroke-hairline)+var(--ui-field-md-inset)+var(--ui-field-shape-inset,0px))]",
    sm: "px-[calc(var(--ui-stroke-hairline)+var(--ui-field-sm-inset)+var(--ui-field-shape-inset,0px))]",
  },
} as const satisfies Record<FieldLaneKind, Record<FieldLaneSize, string>>;

/** The inline padding that puts a label, helper or error on the control's text lane. */
export function fieldLane(size: FieldLaneSize, kind: FieldLaneKind = "soft"): string {
  return LANE[kind][size];
}
