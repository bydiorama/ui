/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { CardSorting } from "./card-sorting.tsx";

export function Valid() {
  return (
    <>
      <CardSorting label="Brand assets">
        <CardSorting.Item id="a" label="Brand guidelines">Content</CardSorting.Item>
      </CardSorting>
      <CardSorting
        label="Brand assets"
        order={["b", "a"]}
        onOrderChange={(order: string[]) => void order}
        className="max-w-nav"
      >
        <CardSorting.Item id="a" label="Brand guidelines">Content</CardSorting.Item>
        <CardSorting.Item id="b" label="Business cards">Content</CardSorting.Item>
      </CardSorting>
    </>
  );
}

export function Invalid() {
  {/* "list, 4 items" says nothing about what is being sorted. */}
  /* @ts-expect-error label is required */
  const a = <CardSorting><CardSorting.Item id="a" label="A">x</CardSorting.Item></CardSorting>;

  {/* `order` is made of ids, so an item without one cannot be placed. */}
  /* @ts-expect-error id is required on an item */
  const b = <CardSorting label="L"><CardSorting.Item label="A">x</CardSorting.Item></CardSorting>;

  {/* "item 3 moved to position 1" is not a reorder anyone can follow. */}
  /* @ts-expect-error label is required on an item */
  const c = <CardSorting label="L"><CardSorting.Item id="a">x</CardSorting.Item></CardSorting>;

  {/* §1: one callback for the whole change, never onMove/onReorder.
      NOT `onDrop` — that is a real DOM drag event and compiles fine, which is
      itself worth knowing: the root spreads HTMLAttributes. */}
  /* @ts-expect-error there is no onReorder */
  const d = <CardSorting label="L" onReorder={() => {}}><CardSorting.Item id="a" label="A">x</CardSorting.Item></CardSorting>;

  {/* The order is made of ids. */}
  /* @ts-expect-error order is string[], not number[] */
  const e = <CardSorting label="L" order={[0, 1]}><CardSorting.Item id="a" label="A">x</CardSorting.Item></CardSorting>;

  return [a, b, c, d, e];
}
