/** Compile-time contract tests. `tsc --noEmit` is the runner. */

import { createRef } from "react";
import { Search } from "griddy-icons";

import { Combobox, ComboboxAction, type ComboboxItemGroup } from "./combobox.tsx";

const ITEMS = [{ value: "a", label: "A" }, { value: "b", label: "B", isDisabled: true, href: "/b" }];
const GROUPS: ComboboxItemGroup[] = [{ label: "People", items: ITEMS }];

export function Valid() {
  const ref = createRef<HTMLInputElement>();
  return (
    <>
      <Combobox label="Archive" items={ITEMS} />
      <Combobox label="Archive" items={GROUPS} isLabelHidden />
      <Combobox label="Archive" items={ITEMS} value={null} onValueChange={(v) => v?.toUpperCase()} />
      <Combobox label="Archive" items={ITEMS} defaultValue="a" size="sm" shape="full" surface="chrome" />
      <Combobox
        label="Archive"
        items={[]}
        filter={null}
        inputValue="Jo"
        onInputValueChange={(q) => q.trim()}
        onSubmitText={(text) => text.length}
        isLoading
        loadingMessage="Searching…"
        emptyMessage={(q) => `Nothing for ${q}`}
        listError="Results couldn’t load"
        onRetry={() => {}}
        resultsMessage={(n) => `${n} found`}
        icon={<Search />}
        hasTrigger={false}
        linkRender={<a />}
        errorText="Choose someone"
        helperText="Names only"
        ref={ref}
        action={
          <ComboboxAction icon={<Search />} onAction={(q) => q}>
            {(q) => `Search everything for “${q}”`}
          </ComboboxAction>
        }
      />
      <Combobox label="Archive" items={ITEMS} filter={(item, q) => item.label.startsWith(q)} />
    </>
  );
}

export function Invalid() {
  {/* A control with no name. A placeholder is not a label. */}
  /* @ts-expect-error label is required */
  const a = <Combobox items={ITEMS} />;

  /* @ts-expect-error items is required */
  const b = <Combobox label="Archive" />;

  {/* Committed value is keyed by VALUE, so re-fetched results keep it. */}
  /* @ts-expect-error value is a string, not the item */
  const c = <Combobox label="Archive" items={ITEMS} value={{ value: "a", label: "A" }} />;

  /* @ts-expect-error onValueChange receives string | null, never the item */
  const d = <Combobox label="Archive" items={ITEMS} onValueChange={(v: { value: string }) => v} />;

  {/* Sizes are Input's ladder; there is no xl. */}
  /* @ts-expect-error size is "lg" | "md" | "sm" */
  const e = <Combobox label="Archive" items={ITEMS} size="xl" />;

  {/* An action that does nothing reads as broken. */}
  /* @ts-expect-error onAction is required */
  const f = <ComboboxAction>Search everything</ComboboxAction>;

  {/* Strings are props (§9) — the loading line is a string, not a node. */}
  /* @ts-expect-error loadingMessage is a string */
  const g = <Combobox label="Archive" items={ITEMS} loadingMessage={<b>Searching</b>} />;

  return [a, b, c, d, e, f, g];
}
