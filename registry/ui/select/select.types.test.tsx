/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Select, type SelectItem } from "./select.tsx";

const ITEMS: SelectItem[] = [{ value: "a", label: "A" }, { value: "b", label: "B", isDisabled: true }];

export function Valid() {
  return (
    <>
      <Select label="Services" items={ITEMS} />
      <Select
        label="Services"
        isLabelHidden
        items={ITEMS}
        value="a"
        onValueChange={(v: string | null) => void v}
        placeholder="Pick one"
        size="sm"
        isDisabled
        helperText="Choose the closest match"
        errorText="Required"
        container={null}
        className="max-w-nav"
      />
      {/* null is a real selection state, not an omission. */}
      <Select label="Services" items={ITEMS} value={null} />
    </>
  );
}

export function Invalid() {
  {/* A placeholder is not a label — it vanishes on first use. */}
  /* @ts-expect-error label is required */
  const a = <Select items={ITEMS} />;

  /* @ts-expect-error items is required */
  const b = <Select label="Services" />;

  {/* §1: one callback named for the value, never onSelect (a DOM event). */}
  /* @ts-expect-error there is no onPick */
  const c = <Select label="Services" items={ITEMS} onPick={() => {}} />;

  {/* The value is the item's value, not its label object. */}
  /* @ts-expect-error value is string | null */
  const d = <Select label="Services" items={ITEMS} value={ITEMS[0]} />;

  {/* Sizes are Input's three. */}
  /* @ts-expect-error size is a closed union */
  const e = <Select label="Services" items={ITEMS} size="xl" />;

  return [a, b, c, d, e];
}
