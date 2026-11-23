/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { ColorPicker, type ColorSwatch } from "./color-picker.tsx";

const SWATCHES: readonly ColorSwatch[] = [
  { value: "#1B6C84", label: "Brand blue" },
  { value: "#FFFFFF", label: "White" },
];

export function Valid() {
  return (
    <>
      <ColorPicker label="Accent colour" />
      <ColorPicker
        label="Accent colour"
        value="#1B6C84"
        onValueChange={(value: string | null) => void value}
        isOpen={false}
        onOpenChange={(isOpen: boolean) => void isOpen}
        variant="swatch"
        size="sm"
        hasAlpha
        swatches={SWATCHES}
        swatchesLabel="Brand palette"
        isPaletteOnly
        placeholder="None"
        helperText="Used for links."
        errorText="Too light for text on white."
        isDisabled
        isLabelHidden
        container={null}
        className="max-w-nav"
      />
      {/* null is a real value — "no colour" — not an omission. */}
      <ColorPicker label="Accent colour" value={null} defaultValue={null} />
    </>
  );
}

export function Invalid() {
  {/* A placeholder is not a label (§10). */}
  /* @ts-expect-error label is required */
  const a = <ColorPicker placeholder="Pick a colour" />;

  {/* §1: open state is always the isOpen/onOpenChange pair. */}
  /* @ts-expect-error there is no onClose — open state is onOpenChange(isOpen) */
  const b = <ColorPicker label="L" onClose={() => {}} />;

  {/* §1: `default*`, never `initial*`. */}
  /* @ts-expect-error the uncontrolled prop is defaultValue */
  const c = <ColorPicker label="L" initialValue="#000000" />;

  {/* Not onChange — a DOM name; the value callback is onValueChange. */}
  /* @ts-expect-error there is no onColorChange */
  const d = <ColorPicker label="L" onColorChange={() => {}} />;

  {/* The value is a hex STRING, not an object in some colour model. */}
  /* @ts-expect-error value is a string */
  const e = <ColorPicker label="L" value={{ r: 0, g: 0, b: 0 }} />;

  {/* Closed unions: no fourth size, no third variant. */}
  /* @ts-expect-error size is lg | md | sm */
  const f = <ColorPicker label="L" size="xl" />;
  /* @ts-expect-error variant is field | swatch */
  const g = <ColorPicker label="L" variant="inline" />;

  {/* A swatch without a name announces nothing a person can use. */}
  /* @ts-expect-error every swatch needs a label */
  const h = <ColorPicker label="L" swatches={[{ value: "#000000" }]} />;

  {/* §1: booleans are is* / has*. */}
  /* @ts-expect-error the prop is hasAlpha */
  const i = <ColorPicker label="L" alpha />;

  return [a, b, c, d, e, f, g, h, i];
}
