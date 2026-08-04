/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { Multiselect } from "./multiselect.tsx";

const ITEMS = [{ value: "a", label: "A" }, { value: "b", label: "B", isDisabled: true }];

export function Valid() {
  return (
    <>
      <Multiselect label="Services" items={ITEMS} />
      <Multiselect label="Services" items={ITEMS} defaultValue={["a"]} isLabelHidden />
      <Multiselect label="Services" items={ITEMS} value={["a"]} onValueChange={(v) => v.join()} />
      <Multiselect label="Services" items={ITEMS} isDisabled emptyMessage="Nothing here" className="w-64" />
    </>
  );
}

export function Invalid() {
  {/* A control with no name. A placeholder is not a label. */}
  /* @ts-expect-error label is required */
  const a = <Multiselect items={ITEMS} />;

  /* @ts-expect-error items is required */
  const b = <Multiselect label="Services" />;

  {/* Selection is keyed by VALUE, so a re-fetched list keeps it. */}
  /* @ts-expect-error value is string[], not the item objects */
  const c = <Multiselect label="Services" items={ITEMS} value={[{ value: "a", label: "A" }]} />;

  /* @ts-expect-error onValueChange receives string[], not item objects */
  const d = <Multiselect label="Services" items={ITEMS} onValueChange={(v: { value: string }[]) => v} />;

  return [a, b, c, d];
}
